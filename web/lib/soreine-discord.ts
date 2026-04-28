import { getEnv, getSoreiineSpreadsheetId } from "@/lib/env";
import { getSheetRows } from "@/lib/sheets-read";
import { appendSheetRow } from "@/lib/sheets-write";

/** Code.gs の `メンバー対応表` 1 行分 */
export type MemberMapRow = {
  discordName: string;
  formName: string;
  discordId: string;
};

type DiscordUser = {
  id: string;
  username: string;
  global_name?: string | null;
};

type DiscordApiMember = {
  nick?: string | null;
  user: DiscordUser;
};

function normalizeName(name: string): { searchName: string; normalized: string } {
  const searchName = String(name)
    .trim()
    .replace(/さん$/, "");
  const normalized = searchName.replace(/\s+/g, "");
  return { searchName, normalized };
}

export async function loadMemberDiscordMap(): Promise<MemberMapRow[]> {
  const e = getEnv();
  const tab = e.SHEET_MEMBER_DISCORD_MAP;
  const soreineId = getSoreiineSpreadsheetId();
  let rows: string[][];
  try {
    rows = await getSheetRows(tab, soreineId);
  } catch (err) {
    console.error("メンバー対応表の読み込みエラー（メンションなしで続行）", err);
    return [];
  }
  const members: MemberMapRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]!;
    const discordName = String(r[0] ?? "").trim();
    const formName = String(r[1] ?? "").trim();
    const discordId = String(r[2] ?? "").trim();
    if (discordId) {
      members.push({ discordName, formName, discordId });
    }
  }
  return members;
}

async function addToMemberSheet(
  discordName: string,
  formName: string,
  discordId: string
): Promise<void> {
  const e = getEnv();
  const tab = e.SHEET_MEMBER_DISCORD_MAP;
  try {
    await appendSheetRow(
      tab,
      [discordName, formName, discordId],
      getSoreiineSpreadsheetId()
    );
  } catch (err) {
    console.error("メンバー対応表追記エラー", err);
  }
}

/** Code.gs `searchDiscordMember` 相当。ヒット時にメンバー対応表へ追記 */
async function searchDiscordMember(
  name: string,
  botToken: string,
  guildId: string
): Promise<{ discordId: string; displayName: string } | null> {
  const { searchName, normalized } = normalizeName(name);
  const baseUrl = `https://discord.com/api/v10/guilds/${guildId}/members`;
  const allMembers: DiscordApiMember[] = [];
  let after = "0";

  try {
    while (true) {
      const url = `${baseUrl}?limit=1000&after=${after}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bot ${botToken}` },
      });
      if (!response.ok) {
        const t = (await response.text()).slice(0, 200);
        console.error(
          "Discord API呼び出しエラー: " + response.status + " - " + t
        );
        return null;
      }
      const members: DiscordApiMember[] = await response.json();
      if (!members || members.length === 0) break;
      for (const m of members) {
        allMembers.push(m);
      }
      if (members.length < 1000) break;
      after = members[members.length - 1]!.user.id;
    }

    for (const member of allMembers) {
      const nick = (member.nick || "").replace(/\s+/g, "");
      const globalName = (member.user?.global_name || "").replace(
        /\s+/g,
        ""
      );
      if (
        nick.indexOf(normalized) !== -1 ||
        globalName.indexOf(normalized) !== -1
      ) {
        const discordId = member.user.id;
        const displayName =
          member.nick || member.user.global_name || member.user.username;
        await addToMemberSheet(displayName, searchName, discordId);
        return { discordId, displayName };
      }
    }
    return null;
  } catch (e) {
    console.error("Discord API呼び出し例外", e);
    return null;
  }
}

/**
 * Code.gs `findDiscordId` 相当
 * - `members` に API 解決分を追記する（GAS の挙動に合わせる）
 */
async function findDiscordId(
  name: string,
  members: MemberMapRow[],
  botToken: string | undefined,
  guildId: string
): Promise<string | null> {
  const { searchName, normalized } = normalizeName(name);

  for (const m of members) {
    if (m.formName && m.formName.replace(/\s+/g, "") === normalized) {
      return m.discordId;
    }
  }

  const matches: MemberMapRow[] = [];
  for (const m of members) {
    const dn = m.discordName.replace(/\s+/g, "");
    if (dn.indexOf(normalized) !== -1 && normalized.length > 0) {
      matches.push(m);
    }
  }
  if (matches.length === 1) {
    return matches[0]!.discordId;
  }

  if (!botToken) {
    return null;
  }
  const searched = await searchDiscordMember(name, botToken, guildId);
  if (searched) {
    members.push({
      discordName: searched.displayName,
      formName: searchName,
      discordId: searched.discordId,
    });
    return searched.discordId;
  }
  return null;
}

function soreineWebhookUrl(): string | null {
  return getEnv().DISCORD_SOREINE_WEBHOOK_URL?.trim() || null;
}

export function isSoreineDiscordWebhookConfigured(): boolean {
  return Boolean(soreineWebhookUrl());
}

/**
 * Code.gs `checkAndSendResponses` 内の Webhook 本文・メンションと同一の通知
 */
export async function notifySoreineSubmissionToDiscord(params: {
  respondentName: string;
  admiredPerson: string;
  valueEmbodied: string;
  detailedContent: string;
}): Promise<void> {
  const webhook = soreineWebhookUrl();
  if (!webhook) {
    throw new Error("DISCORD_SOREINE_WEBHOOK_URL が未設定です。");
  }
  const e = getEnv();
  const members = await loadMemberDiscordMap();
  let discordUserId: string | null = null;
  try {
    discordUserId = await findDiscordId(
      params.admiredPerson,
      members,
      e.DISCORD_BOT_TOKEN?.trim(),
      e.DISCORD_GUILD_ID
    );
  } catch (err) {
    console.error("ID検索エラー（メンションなしで続行）", err);
  }
  const mentionTag = discordUserId ? `<@${discordUserId}>` : "";

  const messageBody =
    "=================\n\n" +
    "**メンバーから賞賛の声が届いたよ🎉**\n\n" +
    "仕事の息抜きに、メンバーのソレイイネ!!をチェックしてみてね！\n\n" +
    "---\n" +
    "**回答者名**\n" +
    params.respondentName +
    "\n\n" +
    "**賞賛したい人は？**\n" +
    (mentionTag ? mentionTag + "\n" : "") +
    params.admiredPerson +
    "さん\n\n" +
    "**どのvalueを体現していましたか？**\n" +
    params.valueEmbodied +
    "\n\n" +
    "**具体的な内容を教えてください！**\n" +
    params.detailedContent +
    "\n\n";

  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: messageBody,
      tts: false,
      allowed_mentions: { parse: ["users"] },
    }),
  });
  if (!res.ok) {
    const t = (await res.text()).slice(0, 200);
    throw new Error(`Discord Webhook: ${res.status} ${t}`);
  }
}
