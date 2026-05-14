import { describeMvbeSubmissionWindowJst } from "@/lib/date-utils";
import { getEnv, sheetsConfigured } from "@/lib/env";
import { loadNonResponders } from "@/lib/admin-stats";
import type { NonResponders } from "@/lib/admin-stats";
import {
  loadMemberDiscordMap,
  resolveDiscordIdFromMemberMap,
} from "@/lib/soreine-discord";
import { google } from "googleapis";
import { quoteSheetTab } from "@/lib/sheet-range";

/**
 * Discord Execute Webhook URL に任意で thread_id を付与する。
 * @see https://discord.com/developers/docs/resources/webhook#execute-webhook-query-string-params
 */
export function discordWebhookExecuteUrl(
  webhookUrl: string,
  threadId?: string | null
): string {
  const base = webhookUrl.trim();
  const tid = threadId?.trim();
  if (!tid) return base;
  try {
    const u = new URL(base);
    u.searchParams.set("thread_id", tid);
    return u.toString();
  } catch {
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}thread_id=${encodeURIComponent(tid)}`;
  }
}

export type RunMvbeReminderJobOptions = {
  /** 優先: 画面から指定。空なら `DISCORD_MVBE_REMINDER_THREAD_ID` */
  threadId?: string | null;
};

function getAuth() {
  const e = getEnv();
  const creds = JSON.parse(e.GOOGLE_SERVICE_ACCOUNT_JSON!);
  return new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

const DEFAULT_MVBE_REMINDER_TEMPLATE = `【MVBe 未提出のお知らせ】
未提出人数: {{unsubmittedCount}} 名

{{mentions}}

フォーム: {{formUrl}}

{{namesMultiline}}`;

/** Discord / 画面用: メイン部署ごとにグルーピングした本文（`department` はメイン部署） */
function formatMvbePendingNamesByDepartment(
  pending: { name: string; department: string }[]
): string {
  if (pending.length === 0) return "（該当なし）";
  const byDept = new Map<string, string[]>();
  for (const p of pending) {
    const d = p.department.trim() || "（部署未設定）";
    if (!byDept.has(d)) byDept.set(d, []);
    byDept.get(d)!.push(p.name);
  }
  const depts = [...byDept.keys()].sort((a, b) => a.localeCompare(b, "ja"));
  const lines: string[] = [];
  for (const dept of depts) {
    lines.push(`【${dept}】`);
    const names = [...byDept.get(dept)!].sort((a, b) =>
      a.localeCompare(b, "ja")
    );
    for (const n of names) lines.push(`・${n}`);
  }
  return lines.join("\n");
}

function resolvePublicOrigin(): string {
  const e = getEnv();
  const o = e.NEXT_PUBLIC_APP_ORIGIN?.trim();
  if (o) return o.replace(/\/$/, "");
  const v = process.env.VERCEL_URL?.trim();
  if (v) {
    const host = v.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }
  return "";
}

async function readTemplateFromSheet(): Promise<string | null> {
  const e = getEnv();
  const id = e.GOOGLE_SPREADSHEET_ID?.trim();
  if (!id || !e.GOOGLE_SERVICE_ACCOUNT_JSON) return null;
  const tab = quoteSheetTab(e.SHEET_MVBE_REMINDER_TEMPLATE);
  const cell = (e.SHEET_MVBE_REMINDER_TEMPLATE_CELL ?? "A1").trim() || "A1";
  try {
    const sheets = google.sheets({ version: "v4", auth: getAuth() });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: id,
      range: `${tab}!${cell}`,
    });
    const raw = res.data.values?.[0]?.[0];
    if (typeof raw === "string" && raw.trim()) return raw.trim();
  } catch (err) {
    console.warn("[mvbe-reminder] template sheet read failed", err);
  }
  return null;
}

async function fetchMvbeReminderTemplate(): Promise<string> {
  const e = getEnv();
  const fromEnv = e.MVBE_REMINDER_TEMPLATE?.trim();
  const fromSheet = await readTemplateFromSheet();
  return (fromSheet ?? fromEnv ?? DEFAULT_MVBE_REMINDER_TEMPLATE).trim();
}

function interpolateTemplate(
  template: string,
  vars: Record<string, string>
): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(v);
  }
  return out;
}

/** Discord メッセージを 2000 文字以下に分割（コードブロック無し想定） */
function splitDiscordContent(text: string, maxLen = 1900): string[] {
  const t = text.trim();
  if (t.length <= maxLen) return t ? [t] : [];
  const parts: string[] = [];
  let rest = t;
  while (rest.length > 0) {
    if (rest.length <= maxLen) {
      parts.push(rest);
      break;
    }
    let chunk = rest.slice(0, maxLen);
    const nl = chunk.lastIndexOf("\n");
    if (nl > maxLen * 0.6) {
      chunk = chunk.slice(0, nl);
    }
    parts.push(chunk.trimEnd());
    rest = rest.slice(chunk.length).trimStart();
  }
  return parts.filter(Boolean);
}

type MvbePendingRow = NonResponders["mvbeNotThisMonth"][number];

export type MvbeReminderMentionMember = {
  name: string;
  department: string;
  discordId: string;
};

export type MvbeReminderPreviewData = {
  unsubmittedCount: number;
  mentionMembers: MvbeReminderMentionMember[];
  /** 未提出だが Discord ID が取れず本文上メンションされない想定 */
  pendingWithoutMention: { name: string; department: string }[];
  /** 環境変数でテスト送信のみのとき true（メンション・未提出集計はスキップされる） */
  isTestOnlyWebhook?: boolean;
};

async function buildMvbeMentionResolution(pending: MvbePendingRow[]): Promise<{
  mentionBatches: string[][];
  mentionMemberRows: MvbeReminderMentionMember[];
  pendingWithoutMention: { name: string; department: string }[];
}> {
  const e = getEnv();
  const members = await loadMemberDiscordMap();
  const botToken = e.DISCORD_BOT_TOKEN?.trim();
  const guildId = e.DISCORD_GUILD_ID;
  const mentionIdSet = new Set<string>();
  const mentionMemberRows: MvbeReminderMentionMember[] = [];
  const staffIdsWithMention = new Set<string>();

  for (const p of pending) {
    const keys = p.id !== p.name ? [p.name, p.id] : [p.name];
    let resolved: string | null = null;
    for (const key of keys) {
      try {
        const did = await resolveDiscordIdFromMemberMap(
          key,
          members,
          botToken,
          guildId
        );
        if (did && /^\d{10,30}$/.test(did)) {
          resolved = did;
          break;
        }
      } catch (err) {
        console.warn("[mvbe-reminder] discord resolve failed", key, err);
      }
    }
    if (resolved) {
      staffIdsWithMention.add(p.id);
      if (!mentionIdSet.has(resolved)) {
        mentionIdSet.add(resolved);
        mentionMemberRows.push({
          name: p.name,
          department: p.department,
          discordId: resolved,
        });
      }
    }
  }

  const mentionIds = [...mentionIdSet];
  const mentionBatches: string[][] = [];
  for (let i = 0; i < mentionIds.length; i += 100) {
    mentionBatches.push(mentionIds.slice(i, i + 100));
  }

  const pendingWithoutMention = pending
    .filter((p) => !staffIdsWithMention.has(p.id))
    .map((p) => ({ name: p.name, department: p.department }));

  return { mentionBatches, mentionMemberRows, pendingWithoutMention };
}

/**
 * 管理画面モーダル用: 未提出者・メンション解決結果のプレビュー
 */
export async function loadMvbeReminderPreview(): Promise<
  { ok: true; preview: MvbeReminderPreviewData } | { ok: false; error: string }
> {
  const e = getEnv();
  if (e.MVBE_REMINDER_DISCORD_TEST_ONLY) {
    return {
      ok: true,
      preview: {
        unsubmittedCount: 0,
        mentionMembers: [],
        pendingWithoutMention: [],
        isTestOnlyWebhook: true,
      },
    };
  }
  if (!sheetsConfigured()) {
    return { ok: false, error: "スプレッドシートが未設定です。" };
  }
  const non = await loadNonResponders();
  if (!non) {
    return { ok: false, error: "未提出者一覧の取得に失敗しました。" };
  }
  const pending = non.mvbeNotThisMonth;
  const { mentionMemberRows, pendingWithoutMention } =
    await buildMvbeMentionResolution(pending);
  return {
    ok: true,
    preview: {
      unsubmittedCount: pending.length,
      mentionMembers: mentionMemberRows,
      pendingWithoutMention,
    },
  };
}

export type MvbeReminderResult =
  | { ok: true; messagesSent: number }
  | { ok: false; error: string };

/**
 * MVBe 未提出者へ Discord Webhook でリマインド投稿する。
 */
export async function runMvbeReminderJob(
  options?: RunMvbeReminderJobOptions
): Promise<MvbeReminderResult> {
  const e = getEnv();
  const webhookBase = e.DISCORD_MVBE_REMINDER_WEBHOOK_URL?.trim();
  if (!webhookBase) {
    return { ok: false, error: "DISCORD_MVBE_REMINDER_WEBHOOK_URL が未設定です。" };
  }

  const threadIdEffective =
    options?.threadId?.trim() ||
    e.DISCORD_MVBE_REMINDER_THREAD_ID?.trim() ||
    undefined;
  const webhookUrl = discordWebhookExecuteUrl(webhookBase, threadIdEffective);

  if (e.MVBE_REMINDER_DISCORD_TEST_ONLY) {
    const content = e.MVBE_REMINDER_DISCORD_TEST_MESSAGE?.trim() || "test";
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        allowed_mentions: { parse: [], users: [] },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      return {
        ok: false,
        error: `Discord 送信に失敗しました (${res.status}): ${t.slice(0, 200)}`,
      };
    }
    return { ok: true, messagesSent: 1 };
  }

  if (!sheetsConfigured()) {
    return { ok: false, error: "スプレッドシートが未設定です。" };
  }

  const non = await loadNonResponders();
  if (!non) {
    return { ok: false, error: "未提出者一覧の取得に失敗しました。" };
  }

  const pending = non.mvbeNotThisMonth;

  const { mentionBatches } = await buildMvbeMentionResolution(pending);

  const mentionsStr =
    mentionBatches[0]?.length
      ? mentionBatches[0]!.map((id) => `<@${id}>`).join(" ")
      : pending.length > 0
        ? "（メンバー対応表で名前が特定できない場合はメンションされません）"
        : "";

  const namesMultiline = formatMvbePendingNamesByDepartment(pending);
  const namesFlat =
    pending.length > 0
      ? pending.map((p) => `・${p.name}（${p.department}）`).join("\n")
      : "（該当なし）";

  const origin = resolvePublicOrigin();
  const formUrl = origin
    ? `${origin}/forms/mvbe`
    : "（サーバーに NEXT_PUBLIC_APP_ORIGIN または VERCEL_URL を設定してください）/forms/mvbe";

  const template = await fetchMvbeReminderTemplate();
  let body = interpolateTemplate(template, {
    unsubmittedCount: String(pending.length),
    namesMultiline,
    namesFlat,
    mentions: mentionsStr,
    formUrl,
    periodSummary: describeMvbeSubmissionWindowJst(),
  });

  if (mentionBatches.length > 1) {
    body += `\n\n※ メンションは人数上限のため ${mentionBatches.length} 回に分けて送信されます（続けて投稿されます）。`;
  }

  const chunks = splitDiscordContent(body);
  if (chunks.length === 0) {
    return { ok: false, error: "送信文案が空です。" };
  }

  let sent = 0;

  for (let i = 0; i < chunks.length; i++) {
    const users = i === 0 && mentionBatches[0]!.length ? mentionBatches[0]! : [];
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: chunks[i],
        allowed_mentions: { parse: [], users },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      return {
        ok: false,
        error: `Discord 送信に失敗しました (${res.status}): ${t.slice(0, 200)}`,
      };
    }
    sent += 1;
  }

  for (let b = 1; b < mentionBatches.length; b++) {
    const users = mentionBatches[b]!;
    const extra = users.map((id) => `<@${id}>`).join(" ");
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `（メンション続き・${b + 1}/${mentionBatches.length}）\n${extra}`,
        allowed_mentions: { parse: [], users },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      return {
        ok: false,
        error: `Discord 追加メンション送信に失敗 (${res.status}): ${t.slice(0, 200)}`,
      };
    }
    sent += 1;
  }

  return { ok: true, messagesSent: sent };
}
