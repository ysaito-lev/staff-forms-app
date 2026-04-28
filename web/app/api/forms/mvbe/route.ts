import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  MVBE_BLOCKS,
  MVBE_NO_NOMINEE_ID,
  MVBE_NO_NOMINEE_LABEL,
  type MvbeBlockKey,
} from "@/lib/form-copy";
import { getActiveStaff, getStaffByIdMap } from "@/lib/master";
import { nameKeyForMatch } from "@/lib/person-name-match";
import { buildMvbeSheetRow } from "@/lib/response-sheet-layout";
import { appendSheetRow } from "@/lib/sheets-write";
import { formatResponseSheetTimestampJst } from "@/lib/date-utils";
import { getEnv, getMvbeSpreadsheetId, sheetsConfigured } from "@/lib/env";
import { hasMvbeSubmissionThisCalendarMonthJst } from "@/lib/my-responses-data";

const blockSchema = z
  .object({
    staffId: z.string().min(1),
    reason: z.string().trim(),
  })
  .refine(
    (d) => d.staffId === MVBE_NO_NOMINEE_ID || d.reason.length > 0,
    { message: "理由を入力してください。" }
  );

const bodySchema = z.object({
  blocks: z.object({
    better: blockSchema,
    honest: blockSchema,
    proactive: blockSchema,
    challenging: blockSchema,
    authentic: blockSchema,
  }),
});

const blockKeys = MVBE_BLOCKS.map((b) => b.key);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.staffId) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  if (!sheetsConfigured()) {
    return NextResponse.json(
      { error: "回答の保存先（Googleスプレッドシート）が未設定です。" },
      { status: 503 }
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON が不正です。" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const issues = parsed.error.issues;
    const reasonRuleFailed = issues.some(
      (i) =>
        i.code === "custom" && String(i.message).includes("理由を入力してください")
    );
    const first = issues[0];
    const error =
      reasonRuleFailed
        ? "「選出するメンバー」で人を選んだブロックでは、理由（具体的な内容）の入力が必須です。各ブロックを確認し、空欄がないかもう一度お試しください。（「該当者なし」のみの場合は理由の入力は不要です）"
        : first
          ? first.message
          : "送信内容の形式に問題があります。ページを再読み込みして再度お試しください。";
    return NextResponse.json(
      { error, issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { blocks } = parsed.data;
  const respondentId = session.user.staffId;
  const staff = await getActiveStaff();
  const map = getStaffByIdMap(staff);
  const respondent = map.get(respondentId);
  if (!respondent) {
    return NextResponse.json(
      { error: "回答者がマスタに存在しないか、退職済みです。" },
      { status: 400 }
    );
  }

  const mvbeLocked = await hasMvbeSubmissionThisCalendarMonthJst(respondentId);
  if (mvbeLocked) {
    return NextResponse.json(
      {
        error:
          "今月の MVBe はすでに回答済みです。同じ月に複数回は送信できません。次回は翌月1日（日本時間）以降にお試しください。",
      },
      { status: 409 }
    );
  }

  for (const key of blockKeys) {
    const { staffId, reason } = blocks[key];
    if (staffId === MVBE_NO_NOMINEE_ID) {
      continue;
    }
    const nominee = map.get(staffId);
    if (!nominee) {
      return NextResponse.json(
        { error: `「${key}」で選んだ相手がマスタに存在しないか、退職済みです。` },
        { status: 400 }
      );
    }
    if (nominee.isExecutive) {
      return NextResponse.json(
        { error: `幹部陣はMVBeの選出対象に含められません（${nominee.name}）。` },
        { status: 400 }
      );
    }
    if (nameKeyForMatch(respondent.name) === nameKeyForMatch(nominee.name)) {
      return NextResponse.json(
        { error: "自分と同一の氏名のメンバーは選出できません。" },
        { status: 400 }
      );
    }
    if (!reason.trim()) {
      return NextResponse.json(
        { error: `「${key}」の理由を入力してください。` },
        { status: 400 }
      );
    }
  }

  const submittedAt = formatResponseSheetTimestampJst();
  const e = getEnv();
  const mvbeSpreadsheetId = getMvbeSpreadsheetId();

  const blockPayload = {} as Record<
    MvbeBlockKey,
    { staffName: string; reason: string }
  >;
  for (const key of blockKeys) {
    const { staffId, reason } = blocks[key];
    if (staffId === MVBE_NO_NOMINEE_ID) {
      blockPayload[key] = {
        staffName: MVBE_NO_NOMINEE_LABEL,
        reason: reason,
      };
    } else {
      const nominee = map.get(staffId)!;
      blockPayload[key] = {
        staffName: nominee.name,
        reason: reason,
      };
    }
  }

  try {
    await appendSheetRow(
      e.SHEET_RESPONSES_MVBE,
      buildMvbeSheetRow({ submittedAt, respondent, blocks: blockPayload }),
      mvbeSpreadsheetId
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "スプレッドシートへの保存に失敗しました。" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
