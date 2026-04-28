import {
  inCalendarMonthJst,
  getCurrentYearMonthJst,
  normalizeSheetTimestamp,
} from "@/lib/date-utils";
import {
  MVBE_BLOCKS,
  MVBE_NO_NOMINEE_LABELS_EXCLUDED_IN_RANKING,
  type MvbeBlockKey,
} from "@/lib/form-copy";
import { getEnv, getMvbeSpreadsheetId, sheetsConfigured } from "@/lib/env";
import { getActiveStaff } from "@/lib/master";
import { parseMvbeBlocksForRanking } from "@/lib/response-sheet-layout";
import { nameKeyForMatch, normalizePersonNameForLookup } from "@/lib/person-name-match";
import { getSheetRows } from "@/lib/sheets-read";
import type { Staff } from "@/lib/staff-types";

function isDataRowFirstCell(cell: unknown): boolean {
  const s = String(cell ?? "").trim();
  if (!s) return false;
  return (
    /^\d{4}-\d{2}-\d{2}T/.test(s) ||
    /^\d{4}-\d{2}-\d{2}\s/.test(s) ||
    /^\d{4}\/\d{1,2}\/\d{1,2}/.test(s) ||
    /^\d{4}-\d{1,2}-\d{1,2}/.test(s)
  );
}

function executiveNameSet(staff: Staff[]): Set<string> {
  return new Set(
    staff
      .filter((s) => s.isExecutive)
      .map((s) => nameKeyForMatch(s.name).toLowerCase())
  );
}

function isExcludedNoNomineeNameForRanking(name: string): boolean {
  const k = nameKeyForMatch(name);
  return MVBE_NO_NOMINEE_LABELS_EXCLUDED_IN_RANKING.some(
    (label) => nameKeyForMatch(label) === k
  );
}

function shouldCountMvbeNominee(name: string, execNames: Set<string>): boolean {
  const n = normalizePersonNameForLookup(name);
  if (!n || isExcludedNoNomineeNameForRanking(n)) return false;
  if (execNames.has(nameKeyForMatch(n).toLowerCase())) return false;
  return true;
}

export const RANKING_DISPLAY_TOP_N = 5;

export type RankedEntry = {
  rank: number;
  /** 回答シート上の選出氏名 */
  name: string;
  votes: number;
  /** マスタの主な部署表示（未一致時は空相当の文言） */
  department: string;
  /** あだ名（マスタ未登録なら null） */
  nickname: string | null;
};

type RawRanked = { rank: number; name: string; votes: number };

/** 同点は同順位、次の順位は飛ばす（1,1,3…） */
function toRankedRows(counts: Map<string, number>): RawRanked[] {
  const list = [...counts.entries()]
    .filter(([, v]) => v > 0)
    .map(([name, votes]) => ({ name, votes }))
    .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name, "ja"));
  return list.map((row) => {
    const better = list.filter((x) => x.votes > row.votes).length;
    return { rank: better + 1, name: row.name, votes: row.votes };
  });
}

function staffByNameKeyMap(staff: Staff[]): Map<string, Staff> {
  const m = new Map<string, Staff>();
  for (const s of staff) {
    m.set(nameKeyForMatch(s.name), s);
  }
  return m;
}

function toRankedWithMeta(
  raw: RawRanked[],
  staff: Staff[],
  topN: number
): RankedEntry[] {
  const byKey = staffByNameKeyMap(staff);
  return raw.slice(0, topN).map((r) => {
    const s = byKey.get(r.name);
    const nick = s?.nickname != null ? String(s.nickname).trim() : "";
    return {
      rank: r.rank,
      /** マスタと一致すればマスタ表記。票は nameKey 集計のため r.name はキー（スペースなし）のことあり */
      name: s?.name?.trim() ? s.name.trim() : r.name,
      votes: r.votes,
      department: s?.department?.trim() ? s.department.trim() : "（マスタ未登録）",
      nickname: nick ? nick : null,
    };
  });
}

export type MonthlyRanking = {
  year: number;
  month: number;
  /** MVBe ブロック key → ランキング */
  mvbe: Record<MvbeBlockKey, RankedEntry[]>;
};

export async function loadMonthlyRanking(
  year: number,
  month: number
): Promise<MonthlyRanking | null> {
  if (!sheetsConfigured()) {
    return null;
  }
  const e = getEnv();
  const [mvbeRows, staff] = await Promise.all([
    getSheetRows(e.SHEET_RESPONSES_MVBE, getMvbeSpreadsheetId()),
    getActiveStaff(),
  ]);
  const execNames = executiveNameSet(staff);

  const mvbeByBlock: Record<MvbeBlockKey, Map<string, number>> = {
    better: new Map(),
    honest: new Map(),
    proactive: new Map(),
    challenging: new Map(),
    authentic: new Map(),
  };

  for (const row of mvbeRows) {
    if (!isDataRowFirstCell(row[0])) continue;
    const ts = normalizeSheetTimestamp(String(row[0]));
    if (!inCalendarMonthJst(ts, year, month)) continue;
    const blocks = parseMvbeBlocksForRanking(row);
    if (!blocks) continue;
    for (const b of MVBE_BLOCKS) {
      const n = (blocks[b.key]?.staffName ?? "").trim();
      if (!shouldCountMvbeNominee(n, execNames)) continue;
      const key = nameKeyForMatch(n);
      const map = mvbeByBlock[b.key];
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }

  const mvbe: Record<MvbeBlockKey, RankedEntry[]> = {} as Record<
    MvbeBlockKey,
    RankedEntry[]
  >;
  for (const b of MVBE_BLOCKS) {
    mvbe[b.key] = toRankedWithMeta(
      toRankedRows(mvbeByBlock[b.key]),
      staff,
      RANKING_DISPLAY_TOP_N
    );
  }

  return { year, month, mvbe };
}

export { getCurrentYearMonthJst };

export function parseYearMonthParam(ym: string | undefined): {
  year: number;
  month: number;
} | null {
  if (!ym || !/^\d{4}-\d{1,2}$/.test(ym)) return null;
  const [ys, ms] = ym.split("-");
  const year = +ys;
  const month = +ms;
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return null;
  return { year, month };
}

export function formatYearMonthParam(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** 暦月の前後。delta が負なら過去へ */
export function addCalendarMonths(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  const idx = year * 12 + (month - 1) + delta;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

export function compareYearMonth(
  a: { year: number; month: number },
  b: { year: number; month: number }
): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}

/**
 * 一般ユーザーが月間ランキングで閲覧可能な最古の月（JST 暦月）。
 * 今月・先月・先々月（＝2か月前）までの3暦月。
 */
export function getEarliestOpenRankingMonthJst(): { year: number; month: number } {
  const cur = getCurrentYearMonthJst();
  return addCalendarMonths(cur.year, cur.month, -2);
}

const YM_MIN: { year: number; month: number } = { year: 2000, month: 1 };

/**
 * 一般ユーザーが月間ランキングで閲覧可能な**最新**の月（JST 暦月）。
 * 今月・先月は含めず、2か月前の暦月まで。`2000-01` 未満には丸めない（下限は `YM_MIN` との交差で調整する側で行う）。
 */
export function getLatestRankingMonthForGeneralJst(): { year: number; month: number } {
  const cur = getCurrentYearMonthJst();
  return addCalendarMonths(cur.year, cur.month, -2);
}

/** 一般向け `maxYm` 用: 2か月前と `2000-01` の遅い方（常に有効な範囲にする） */
export function getGeneralUserRankingMaxYmBounds(): { year: number; month: number } {
  const cap = getLatestRankingMonthForGeneralJst();
  return compareYearMonth(cap, YM_MIN) < 0 ? YM_MIN : cap;
}
