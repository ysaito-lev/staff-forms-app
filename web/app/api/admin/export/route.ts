import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isDataRowFirstCell } from "@/lib/admin-stats";
import { isIsoInRange, normalizeSheetTimestamp } from "@/lib/date-utils";
import {
  getEnv,
  getMvbeSpreadsheetId,
  getSoreiineSpreadsheetId,
  sheetsConfigured,
} from "@/lib/env";
import { getSheetRows } from "@/lib/sheets-read";
import { buildMvbeCsvHeaderRow } from "@/lib/response-sheet-layout";

function escapeCsvField(v: string): string {
  const s = v.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toJstMidnight(ymd: string): Date | null {
  const m = ymd.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  const y = +m[1]!;
  const mo = +m[2]!;
  const d = +m[3]!;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return new Date(
    `${y.toString().padStart(4, "0")}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}T00:00:00+09:00`
  );
}

/**
 * クエリ: form=soreine|mvbe, from=YYYY-MM-DD, to=YYYY-MM-DD（to は当日を含む・JST）
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "管理者のみ利用できます。" }, { status: 403 });
  }
  if (!sheetsConfigured()) {
    return NextResponse.json(
      { error: "回答スプレッドシートが未設定です。" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const form = searchParams.get("form");
  const fromS = searchParams.get("from");
  const toS = searchParams.get("to");
  if (form !== "soreine" && form !== "mvbe") {
    return NextResponse.json(
      { error: "form には soreine または mvbe を指定してください。" },
      { status: 400 }
    );
  }
  if (!fromS || !toS) {
    return NextResponse.json(
      { error: "from と to に YYYY-MM-DD（JST）を指定してください。" },
      { status: 400 }
    );
  }
  const start = toJstMidnight(fromS);
  const endLastDay = toJstMidnight(toS);
  if (!start || !endLastDay || endLastDay < start) {
    return NextResponse.json(
      { error: "日付の範囲が不正です。" },
      { status: 400 }
    );
  }
  const endExclusive = new Date(endLastDay.getTime() + 864e5);

  const e = getEnv();
  const tab =
    form === "soreine" ? e.SHEET_RESPONSES_SOREINE : e.SHEET_RESPONSES_MVBE;
  const ssid =
    form === "soreine" ? getSoreiineSpreadsheetId() : getMvbeSpreadsheetId();
  const rows = await getSheetRows(tab, ssid);
  const lines: string[] = [];

  if (form === "soreine") {
    lines.push(
      ["タイムスタンプ", "回答者", "賞賛相手", "Value", "内容"]
        .map(escapeCsvField)
        .join(",")
    );
    for (const row of rows) {
      if (!isDataRowFirstCell(row[0])) continue;
      const ts = normalizeSheetTimestamp(String(row[0] ?? ""));
      if (!isIsoInRange(ts, start, endExclusive)) continue;
      const a = (row[0] ?? "").toString();
      const b = (row[1] ?? "").toString();
      const c = (row[2] ?? "").toString();
      const d = (row[3] ?? "").toString();
      const f = (row[4] ?? "").toString();
      lines.push([a, b, c, d, f].map(escapeCsvField).join(","));
    }
  } else {
    const outRows: string[][] = [];
    for (const row of rows) {
      if (!isDataRowFirstCell(row[0])) continue;
      const ts = normalizeSheetTimestamp(String(row[0] ?? ""));
      if (!isIsoInRange(ts, start, endExclusive)) continue;
      outRows.push(row.map((c) => (c == null ? "" : String(c))));
    }
    let maxC = 0;
    for (const r of outRows) maxC = Math.max(maxC, r.length);
    if (maxC === 0) {
      maxC = 12;
    }
    lines.push(buildMvbeCsvHeaderRow(maxC).map(escapeCsvField).join(","));
    for (const r of outRows) {
      const pad = [...r];
      while (pad.length < maxC) pad.push("");
      lines.push(pad.slice(0, maxC).map(escapeCsvField).join(","));
    }
  }

  const fromCompact = fromS.replace(/-/g, "");
  const toCompact = toS.replace(/-/g, "");
  const filename = `${form}_${fromCompact}_${toCompact}.csv`;
  const body = "\uFEFF" + lines.join("\r\n");
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
