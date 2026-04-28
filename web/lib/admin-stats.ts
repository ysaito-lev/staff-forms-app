import { SOREINE_VALUES, normalizeSoreineValueCell } from "@/lib/form-copy";
import {
  getCalendarMonthRangeJst,
  getJstYearMonthFromIso,
  inThisWeek,
  isIsoInRange,
  normalizeSheetTimestamp,
  startOfIsoWeekJst,
  submissionInMvbeWindowJst,
} from "@/lib/date-utils";
import { getActiveStaff } from "@/lib/master";
import { addCalendarMonths, formatYearMonthParam } from "@/lib/ranking-data";
import { nameKeyForMatch } from "@/lib/person-name-match";
import {
  isWideMvbeWithIdColumns,
  parseSoreineRowToDisplay,
} from "@/lib/response-sheet-layout";
import {
  getEnv,
  getMvbeSpreadsheetId,
  getSoreiineSpreadsheetId,
  sheetsConfigured,
} from "@/lib/env";
import { getSheetRows } from "@/lib/sheets-read";
import { mainDepartment } from "@/lib/staff-types";
import type { Staff } from "@/lib/staff-types";

function weekStartLabelJst(t: Date): string {
  const w = startOfIsoWeekJst(t);
  const a = (() => {
    const d = w;
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(d);
    let y = 0,
      m = 0,
      day = 0;
    for (const p of parts) {
      if (p.type === "year") y = +p.value;
      if (p.type === "month") m = +p.value;
      if (p.type === "day") day = +p.value;
    }
    return { y, m, day };
  })();
  return `${a.m}/${a.day} 始まり週`;
}

export function isDataRowFirstCell(cell: unknown): boolean {
  const s = String(cell ?? "").trim();
  if (!s) return false;
  return (
    /^\d{4}-\d{2}-\d{2}T/.test(s) ||
    /^\d{4}-\d{2}-\d{2}\s/.test(s) ||
    /^\d{4}\/\d{1,2}\/\d{1,2}/.test(s) ||
    /^\d{4}-\d{1,2}-\d{1,2}/.test(s)
  );
}

function findStaffByRespondentCells(
  staffList: Staff[],
  cells: string[]
): Staff | null {
  for (const c of cells) {
    const t = c.trim();
    if (!t) continue;
    for (const s of staffList) {
      if (s.id === t) return s;
    }
  }
  for (const c of cells) {
    const t = c.trim();
    if (!t) continue;
    const k = nameKeyForMatch(t);
    if (!k) continue;
    for (const s of staffList) {
      if (nameKeyForMatch(s.name) === k) return s;
    }
  }
  return null;
}

function soreineRespondentCells(row: string[]): string[] {
  const parsed = parseSoreineRowToDisplay(row);
  if (parsed) {
    return [String(row[1] ?? "").trim()].filter(Boolean);
  }
  if (row.length >= 7) {
    return [String(row[1] ?? "").trim(), String(row[2] ?? "").trim()].filter(
      Boolean
    );
  }
  return [String(row[1] ?? "").trim()].filter(Boolean);
}

function mvbeRespondentCells(row: string[]): string[] {
  if (row.length >= 12 && isWideMvbeWithIdColumns(row)) {
    return [String(row[1] ?? "").trim(), String(row[2] ?? "").trim()].filter(
      Boolean
    );
  }
  return [String(row[1] ?? "").trim()].filter(Boolean);
}

function ratePercent(unique: number, eligible: number): number | null {
  if (eligible <= 0) return null;
  return Math.min(100, Math.round((unique / eligible) * 1000) / 10);
}

export type CountSnapshot = {
  totalRows: number;
  uniqueRespondents: number;
  responseRatePercent: number | null;
};

export type SoreineValueCount = { valueLabel: string; count: number };
export type WeekCount = { weekStartLabel: string; count: number };
export type DeptCount = { department: string; countRows: number; unique: number };

export type AdminStatsBundle = {
  year: number;
  month: number;
  eligibleStaff: number;
  current: {
    soreine: CountSnapshot & {
      byValue: SoreineValueCount[];
      byWeek: WeekCount[];
      byDepartment: DeptCount[];
    };
    mvbe: CountSnapshot & { byDepartment: DeptCount[] };
  };
  previousMonth: { year: number; month: number; soreine: CountSnapshot; mvbe: CountSnapshot };
  yearAgo: { year: number; month: number; soreine: CountSnapshot; mvbe: CountSnapshot };
};

export type NonResponders = {
  soreineNotThisWeek: { id: string; name: string; department: string }[];
  mvbeNotThisMonth: { id: string; name: string; department: string }[];
};

type MonthKey = string;

type Agg = {
  soreineRows: number;
  soreineIds: Set<string>;
  valueCounts: Map<string, number>;
  soreineDept: Map<string, { rows: number; ids: Set<string> }>;
  weekCounts: Map<string, { label: string; n: number }>;
  mvbeRows: number;
  mvbeIds: Set<string>;
  mvbeDept: Map<string, { rows: number; ids: Set<string> }>;
};

function emptyAgg(): Agg {
  return {
    soreineRows: 0,
    soreineIds: new Set(),
    valueCounts: new Map(),
    soreineDept: new Map(),
    weekCounts: new Map(),
    mvbeRows: 0,
    mvbeIds: new Set(),
    mvbeDept: new Map(),
  };
}

function bumpDept(
  m: Map<string, { rows: number; ids: Set<string> }>,
  dep: string,
  staffId: string | null
) {
  const d = mainDepartment(dep);
  if (!m.has(d)) m.set(d, { rows: 0, ids: new Set() });
  const x = m.get(d)!;
  x.rows += 1;
  if (staffId) x.ids.add(staffId);
}

function aggToCountSnapshot(agg: Agg, kind: "soreine" | "mvbe", eligible: number): CountSnapshot {
  if (kind === "soreine") {
    return {
      totalRows: agg.soreineRows,
      uniqueRespondents: agg.soreineIds.size,
      responseRatePercent: ratePercent(agg.soreineIds.size, eligible),
    };
  }
  return {
    totalRows: agg.mvbeRows,
    uniqueRespondents: agg.mvbeIds.size,
    responseRatePercent: ratePercent(agg.mvbeIds.size, eligible),
  };
}

function deptMapToList(m: Map<string, { rows: number; ids: Set<string> }>): DeptCount[] {
  return [...m.entries()]
    .map(([department, v]) => ({
      department,
      countRows: v.rows,
      unique: v.ids.size,
    }))
    .sort((a, b) => b.countRows - a.countRows || a.department.localeCompare(b.department, "ja"));
}

/**
 * 管理画面：指定暦月（JST）の KPI ・週次・Value ・部門、および前月・前年同月比較
 */
export async function loadAdminStatsForMonth(
  year: number,
  month: number
): Promise<AdminStatsBundle | null> {
  if (!sheetsConfigured()) return null;
  const e = getEnv();
  const staff = await getActiveStaff();
  const eligible = staff.length;
  const prev = addCalendarMonths(year, month, -1);
  const yAgoY = year - 1;
  const yAgoM = month;

  const kCur = formatYearMonthParam(year, month);
  const kPrev = formatYearMonthParam(prev.year, prev.month);
  const kYoy = formatYearMonthParam(yAgoY, yAgoM);
  const want = new Set<MonthKey>([kCur, kPrev, kYoy]);

  const { start: startCur, endExclusive: endCur } = getCalendarMonthRangeJst(
    year,
    month
  );

  const byMonth = new Map<MonthKey, Agg>();
  for (const k of want) byMonth.set(k, emptyAgg());

  const [soreineRows, mvbeRows] = await Promise.all([
    getSheetRows(e.SHEET_RESPONSES_SOREINE, getSoreiineSpreadsheetId()),
    getSheetRows(e.SHEET_RESPONSES_MVBE, getMvbeSpreadsheetId()),
  ]);

  for (const row of soreineRows) {
    if (!isDataRowFirstCell(row[0])) continue;
    const ts = normalizeSheetTimestamp(String(row[0]));
    const ym = getJstYearMonthFromIso(ts);
    if (!ym) continue;
    const key = formatYearMonthParam(ym.year, ym.month);
    if (!want.has(key)) continue;
    const agg = byMonth.get(key);
    if (!agg) continue;

    const rStaff = findStaffByRespondentCells(staff, soreineRespondentCells(row));
    agg.soreineRows += 1;
    if (rStaff) agg.soreineIds.add(rStaff.id);

    const parsed = parseSoreineRowToDisplay(row);
    const valueNorm = parsed
      ? parsed.value
      : row.length >= 7
        ? normalizeSoreineValueCell(String(row[5] ?? "")) ?? String(row[5] ?? "")
        : "";
    if (valueNorm) {
      agg.valueCounts.set(valueNorm, (agg.valueCounts.get(valueNorm) ?? 0) + 1);
    }

    if (rStaff) {
      bumpDept(agg.soreineDept, rStaff.department, rStaff.id);
    } else {
      bumpDept(agg.soreineDept, "（回答者名がマスタと不一致）", null);
    }

    if (key === kCur && isIsoInRange(ts, startCur, endCur)) {
      const t = new Date(ts);
      if (!Number.isNaN(t.getTime())) {
        const wk = startOfIsoWeekJst(t).toISOString();
        const label = weekStartLabelJst(t);
        const cur = agg.weekCounts.get(wk) ?? { label, n: 0 };
        cur.n += 1;
        cur.label = label;
        agg.weekCounts.set(wk, cur);
      }
    }
  }

  for (const row of mvbeRows) {
    if (!isDataRowFirstCell(row[0])) continue;
    const ts = normalizeSheetTimestamp(String(row[0]));
    const ym = getJstYearMonthFromIso(ts);
    if (!ym) continue;
    const key = formatYearMonthParam(ym.year, ym.month);
    if (!want.has(key)) continue;
    const agg = byMonth.get(key);
    if (!agg) continue;

    const rStaff = findStaffByRespondentCells(staff, mvbeRespondentCells(row));
    agg.mvbeRows += 1;
    if (rStaff) agg.mvbeIds.add(rStaff.id);
    if (rStaff) {
      bumpDept(agg.mvbeDept, rStaff.department, rStaff.id);
    } else {
      bumpDept(agg.mvbeDept, "（回答者名がマスタと不一致）", null);
    }
  }

  const curA = byMonth.get(kCur)!;
  const prevA = byMonth.get(kPrev)!;
  const yoyA = byMonth.get(kYoy)!;

  const byValue: SoreineValueCount[] = SOREINE_VALUES.map((v) => ({
    valueLabel: v,
    count: curA.valueCounts.get(v) ?? 0,
  }));

  const byWeek: WeekCount[] = [...curA.weekCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({ weekStartLabel: v.label, count: v.n }));

  return {
    year,
    month,
    eligibleStaff: eligible,
    current: {
      soreine: {
        ...aggToCountSnapshot(curA, "soreine", eligible),
        byValue,
        byWeek,
        byDepartment: deptMapToList(curA.soreineDept),
      },
      mvbe: {
        ...aggToCountSnapshot(curA, "mvbe", eligible),
        byDepartment: deptMapToList(curA.mvbeDept),
      },
    },
    previousMonth: {
      year: prev.year,
      month: prev.month,
      soreine: aggToCountSnapshot(prevA, "soreine", eligible),
      mvbe: aggToCountSnapshot(prevA, "mvbe", eligible),
    },
    yearAgo: {
      year: yAgoY,
      month: yAgoM,
      soreine: aggToCountSnapshot(yoyA, "soreine", eligible),
      mvbe: aggToCountSnapshot(yoyA, "mvbe", eligible),
    },
  };
}

export function pctDelta(
  current: number,
  previous: number
): { diff: number; percent: number | null } {
  if (previous === 0) {
    return { diff: current - previous, percent: null };
  }
  const p = ((current - previous) / previous) * 100;
  return { diff: current - previous, percent: Math.round(p * 10) / 10 };
}

/** 今週のソレイイネ未提出・MVBe 未提出（現在の提出ウィンドウ基準・在籍者ベース） */
export async function loadNonResponders(): Promise<NonResponders | null> {
  if (!sheetsConfigured()) return null;
  const e = getEnv();
  const [staff, soreineRows, mvbeRows] = await Promise.all([
    getActiveStaff(),
    getSheetRows(e.SHEET_RESPONSES_SOREINE, getSoreiineSpreadsheetId()),
    getSheetRows(e.SHEET_RESPONSES_MVBE, getMvbeSpreadsheetId()),
  ]);

  const weekAnswered = new Set<string>();
  for (const row of soreineRows) {
    if (!isDataRowFirstCell(row[0])) continue;
    const ts = normalizeSheetTimestamp(String(row[0]));
    if (!inThisWeek(ts)) continue;
    const st = findStaffByRespondentCells(staff, soreineRespondentCells(row));
    if (st) weekAnswered.add(st.id);
  }

  const monthAnswered = new Set<string>();
  for (const row of mvbeRows) {
    if (!isDataRowFirstCell(row[0])) continue;
    const ts = normalizeSheetTimestamp(String(row[0]));
    if (!submissionInMvbeWindowJst(ts)) continue;
    const st = findStaffByRespondentCells(staff, mvbeRespondentCells(row));
    if (st) monthAnswered.add(st.id);
  }

  function mapStaff(s: Staff) {
    return { id: s.id, name: s.name, department: s.department };
  }
  return {
    soreineNotThisWeek: staff
      .filter((s) => !weekAnswered.has(s.id))
      .map(mapStaff)
      .sort((a, b) => a.name.localeCompare(b.name, "ja")),
    mvbeNotThisMonth: staff
      .filter((s) => !monthAnswered.has(s.id))
      .map(mapStaff)
      .sort((a, b) => a.name.localeCompare(b.name, "ja")),
  };
}

// remove wrong import ymdJst