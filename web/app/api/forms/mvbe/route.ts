import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { normalizeSoreineValueCell } from "@/lib/form-copy";
import { getActiveStaff, getStaffByIdMap } from "@/lib/master";
import { nameKeyForMatch } from "@/lib/person-name-match";
import { buildMvbeSheetRowV2 } from "@/lib/response-sheet-layout";
import { appendSheetRow } from "@/lib/sheets-write";
import { formatResponseSheetTimestampJst } from "@/lib/date-utils";
import { getEnv, getMvbeSpreadsheetId, sheetsConfigured } from "@/lib/env";
import { hasMvbeSubmissionInCurrentWindowJst } from "@/lib/my-responses-data";
import { mainDepartment } from "@/lib/staff-types";
import { computeMvbeVoteWeightForDept } from "@/lib/mvbe-dept-weights";

const bodySchema = z.object({
  nomineeStaffId: z.string().min(1),
  value: z.string().trim().min(1),
  reason: z.string().trim().min(1, "理由を入力してください。"),
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
    const first = parsed.error.issues[0];
    return NextResponse.json(
      {
        error: first?.message ?? "送信内容の形式に問題があります。",
        issues: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const valueNorm = normalizeSoreineValueCell(parsed.data.value);
  if (!valueNorm) {
    return NextResponse.json(
      { error: "Value の選択が不正です。一覧から選び直してください。" },
      { status: 400 }
    );
  }

  const { nomineeStaffId, reason } = parsed.data;
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

  const mvbeLocked = await hasMvbeSubmissionInCurrentWindowJst(respondentId);
  if (mvbeLocked) {
    return NextResponse.json(
      {
        error:
          "現在の評価期間において MVBe はすでに送信済みです。同一提出期間内での再送信はできません。",
      },
      { status: 409 }
    );
  }

  const nominee = map.get(nomineeStaffId);
  if (!nominee) {
    return NextResponse.json(
      { error: "選んだメンバーがマスタに存在しないか、退職済みです。" },
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

  const w = computeMvbeVoteWeightForDept(staff, respondent.department);
  const voterDeptMain =
    w.deptCountNd > 0 ? w.voterDeptMain : mainDepartment(respondent.department);

  const submittedAt = formatResponseSheetTimestampJst();
  const e = getEnv();
  const mvbeSpreadsheetId = getMvbeSpreadsheetId();

  const sheetRow = buildMvbeSheetRowV2({
    submittedAt,
    respondent,
    nominee,
    valueLabel: valueNorm,
    reason,
    voterDeptMain,
    deptCountNd: w.deptCountNd,
    nRef: w.nRef,
    weightApplied: w.weightApplied,
    pointsGranted: w.pointsGranted,
  });

  try {
    await appendSheetRow(e.SHEET_RESPONSES_MVBE, sheetRow, mvbeSpreadsheetId);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "スプレッドシートへの保存に失敗しました。" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
