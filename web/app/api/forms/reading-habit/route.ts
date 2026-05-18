import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { formatResponseSheetTimestampJst } from "@/lib/date-utils";
import {
  getEnv,
  getReadingHabitSpreadsheetId,
  readingHabitSpreadsheetConfigured,
} from "@/lib/env";
import { getActiveStaff, getStaffByIdMap } from "@/lib/master";
import {
  isReadingHabitDiscordWebhookConfigured,
  notifyReadingHabitSubmissionToDiscord,
} from "@/lib/reading-habit-discord";
import { buildReadingHabitSheetRow } from "@/lib/response-sheet-layout";
import { appendSheetRow } from "@/lib/sheets-write";

const bodySchema = z.object({
  bookTitle: z.string().trim().min(1).max(500),
  comment: z.string().trim().min(1).max(15000),
  application: z.string().trim().min(1).max(15000),
  rating: z.coerce.number().int().min(1).max(5),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.staffId) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  if (!readingHabitSpreadsheetConfigured()) {
    return NextResponse.json(
      {
        error:
          "読書習慣の保存先（GOOGLE_READING_HABIT_SPREADSHEET_ID 等）が未設定です。",
      },
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

  const { bookTitle, comment, application, rating } = parsed.data;
  const respondentId = session.user.staffId;

  const staff = await getActiveStaff();
  const map = getStaffByIdMap(staff);
  const respondent = map.get(respondentId);
  if (!respondent) {
    return NextResponse.json(
      { error: "ログインユーザがマスタに存在しないか、退職済みです。" },
      { status: 400 }
    );
  }

  const submittedAt = formatResponseSheetTimestampJst();
  const e = getEnv();
  const spreadsheetId = getReadingHabitSpreadsheetId();

  const row = buildReadingHabitSheetRow({
    submittedAt,
    respondentName: respondent.name,
    bookTitle,
    comment,
    application,
    rating,
  });

  try {
    await appendSheetRow(e.SHEET_RESPONSES_READING_HABIT, row, spreadsheetId);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "スプレッドシートへの保存に失敗しました。" },
      { status: 500 }
    );
  }

  if (isReadingHabitDiscordWebhookConfigured()) {
    try {
      await notifyReadingHabitSubmissionToDiscord({
        respondentName: respondent.name,
        bookTitle,
        comment,
        application,
        rating,
      });
    } catch (err) {
      console.error(err);
      return NextResponse.json(
        {
          error:
            "Discord 通知に失敗しました。スプレッドシートには追記済みです。",
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    discord: isReadingHabitDiscordWebhookConfigured() ? "sent" : "skipped",
  });
}
