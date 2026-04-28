import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { SOREINE_VALUES, type SoreineValue } from "@/lib/form-copy";
import { getActiveStaff, getStaffByIdMap } from "@/lib/master";
import { nameKeyForMatch } from "@/lib/person-name-match";
import { buildSoreineSheetRow } from "@/lib/response-sheet-layout";
import {
  appendSheetRow,
  batchUpdateCellsInResponsesSpreadsheet,
} from "@/lib/sheets-write";
import { formatResponseSheetTimestampJst } from "@/lib/date-utils";
import { getEnv, getSoreiineSpreadsheetId, sheetsConfigured } from "@/lib/env";
import {
  isSoreineDiscordWebhookConfigured,
  notifySoreineSubmissionToDiscord,
} from "@/lib/soreine-discord";

const soreineValueSchema = z
  .string()
  .refine((v): v is SoreineValue => (SOREINE_VALUES as readonly string[]).includes(v));

const bodySchema = z.object({
  praisedId: z.string().min(1),
  value: soreineValueSchema,
  detail: z.string().trim().min(1),
});

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
    return NextResponse.json(
      { error: "入力内容が不正です。", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { praisedId, value, detail } = parsed.data;
  const respondentId = session.user.staffId;

  const staff = await getActiveStaff();
  const map = getStaffByIdMap(staff);
  const respondent = map.get(respondentId);
  const praised = map.get(praisedId);
  if (!respondent || !praised) {
    return NextResponse.json(
      { error: "選択されたスタッフがマスタに存在しないか、退職済みです。" },
      { status: 400 }
    );
  }

  if (nameKeyForMatch(respondent.name) === nameKeyForMatch(praised.name)) {
    return NextResponse.json(
      { error: "賞賛対象に、自分と同一の氏名の方は選べません。" },
      { status: 400 }
    );
  }

  const submittedAt = formatResponseSheetTimestampJst();
  const e = getEnv();
  const soreineSpreadsheetId = getSoreiineSpreadsheetId();

  const row = buildSoreineSheetRow({
    submittedAt,
    respondent,
    praised,
    value,
    detail,
  });

  let sheetRow: number | null;
  try {
    sheetRow = await appendSheetRow(
      e.SHEET_RESPONSES_SOREINE,
      row,
      soreineSpreadsheetId
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "スプレッドシートへの保存に失敗しました。" },
      { status: 500 }
    );
  }

  if (isSoreineDiscordWebhookConfigured()) {
    try {
      await notifySoreineSubmissionToDiscord({
        respondentName: respondent.name,
        admiredPerson: praised.name,
        valueEmbodied: value,
        detailedContent: detail,
      });
      if (sheetRow) {
        await batchUpdateCellsInResponsesSpreadsheet(
          e.SHEET_RESPONSES_SOREINE,
          [{ row: sheetRow, colLetter: "F", value: "済" }],
          soreineSpreadsheetId
        );
      } else {
        console.warn(
          "append の行番号が取得できなかったため Discord 送信列（済）をスキップしました"
        );
      }
    } catch (err) {
      console.error(err);
      return NextResponse.json(
        { error: "Discord 通知に失敗しました。スプレッドシートには追記済みです。" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    discord: isSoreineDiscordWebhookConfigured() ? "sent" : "deferred",
  });
}
