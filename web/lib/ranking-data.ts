import {
  inCalendarMonthJst,
  getCurrentYearMonthJst,
  mvbeCanonicalWindowsOverlappingCalendarMonth,
  normalizeSheetTimestamp,
  soreineSubmissionPeriodsOverlappingCalendarMonth,
} from "@/lib/date-utils";
import {
  MVBE_BLOCKS,
  MVBE_NO_NOMINEE_LABELS_EXCLUDED_IN_RANKING,
  normalizeSoreineValueCell,
  soreineValueToMvbeBlockKey,
  type MvbeBlockKey,
} from "@/lib/form-copy";
import {
  getEnv,
  getReadingHabitSpreadsheetId,
  getSoreiineSpreadsheetId,
  sheetsConfigured,
} from "@/lib/env";
import { getMergedMvbeSheetRowsForRead } from "@/lib/mvbe-sheet-rows";
import { getActiveStaff } from "@/lib/master";
import {
  parseMvbeBlocksForRanking,
  parseMvbeV2Row,
  parseSoreineRowToDisplay,
} from "@/lib/response-sheet-layout";
import {
  findStaffByRespondentCells,
  mvbeRespondentCells,
  soreineRespondentCells,
} from "@/lib/respondent-staff-match";
import { getSheetRows } from "@/lib/sheets-read";
import { nameKeyForMatch, normalizePersonNameForLookup } from "@/lib/person-name-match";
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

export function executiveNameSet(staff: Staff[]): Set<string> {
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

export function shouldCountMvbeNominee(name: string, execNames: Set<string>): boolean {
  const n = normalizePersonNameForLookup(name);
  if (!n || isExcludedNoNomineeNameForRanking(n)) return false;
  if (execNames.has(nameKeyForMatch(n).toLowerCase())) return false;
  return true;
}

const RANKING_DISPLAY_TOP_N = 3;

/** ソレイイネ!! の暦月ランキング加点（1行あたり） */
const SOREINE_RANKING_POINTS_PER_ROW = 0.25;

/** 読書習慣シートが有効なとき、その暦月に提出があれば加算する点（未提出は別途 −1） */
const READING_HABIT_RANKING_BONUS_POINTS = 1;

export type RankedEntry = {
  rank: number;
  /** 回答シート上の選出氏名 */
  name: string;
  /** 総合点（MVBe・ソレイイネ・読書ボーナスおよび提出ペナルティ込み） */
  score: number;
  /** マスタの主な部署表示（未一致時は空相当の文言） */
  department: string;
  /** あだ名（マスタ未登録なら null） */
  nickname: string | null;
};

type RawRanked = { rank: number; name: string; score: number };

/** スコア順で上位 N（同点は同順位）。マイナス・ゼロも含む。 */
function toRankedRowsTopN(counts: Map<string, number>, topN: number): RawRanked[] {
  const list = [...counts.entries()].map(([name, score]) => ({ name, score }));
  list.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "ja"));
  const sliced = list.slice(0, topN);
  return sliced.map((row) => {
    const better = sliced.filter((x) => x.score > row.score).length;
    return { rank: better + 1, name: row.name, score: row.score };
  });
}

/** 同点は同順位、次の順位は飛ばす（1,1,3…） */
function toRankedRows(counts: Map<string, number>): RawRanked[] {
  const list = [...counts.entries()]
    .filter(([, v]) => v > 0)
    .map(([name, score]) => ({ name, score }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "ja"));
  return list.map((row) => {
    const better = list.filter((x) => x.score > row.score).length;
    return { rank: better + 1, name: row.name, score: row.score };
  });
}

/** 集計キーは `nameKeyForMatch`。同点対応で 1 位のキー一覧 */
export function mvbeRankOneNameKeys(counts: Map<string, number>): string[] {
  return toRankedRows(counts)
    .filter((r) => r.rank === 1)
    .map((r) => r.name);
}

function staffByNameKeyMap(staff: Staff[]): Map<string, Staff> {
  const m = new Map<string, Staff>();
  for (const s of staff) {
    m.set(nameKeyForMatch(s.name), s);
  }
  return m;
}

function staffByIdMap(staff: Staff[]): Map<string, Staff> {
  const m = new Map<string, Staff>();
  for (const s of staff) m.set(s.id, s);
  return m;
}

function resolvePraisedStaffId(
  byId: Map<string, Staff>,
  byNk: Map<string, Staff>,
  praisedId: string,
  praisedName: string
): string | null {
  const pid = praisedId.trim();
  if (pid && byId.has(pid)) return pid;
  const s = byNk.get(nameKeyForMatch(praisedName.trim()));
  return s?.id ?? null;
}

function rowTimestampInRange(iso: string, start: Date, endExclusive: Date): boolean {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return false;
  return t >= start && t < endExclusive;
}

/** 月間総合ランキング用: MVBe は選出ごとに常に +1（V2 の付与ポイント列は使わない）。 */
function applyMvbeRankingRowUnifiedNomineePoints(
  row: string[],
  year: number,
  month: number,
  execNames: Set<string>,
  totals: Map<string, number>
): void {
  if (!isDataRowFirstCell(row[0])) return;
  const ts = normalizeSheetTimestamp(String(row[0]));
  if (!inCalendarMonthJst(ts, year, month)) return;

  const v2 = parseMvbeV2Row(row);
  if (v2) {
    const n = v2.nomineeName.trim();
    if (!shouldCountMvbeNominee(n, execNames)) return;
    const valNorm = normalizeSoreineValueCell(v2.valueRaw);
    if (!valNorm) return;
    const key = nameKeyForMatch(n);
    totals.set(key, (totals.get(key) ?? 0) + 1);
    return;
  }
  const blocks = parseMvbeBlocksForRanking(row);
  if (!blocks) return;
  for (const b of MVBE_BLOCKS) {
    const nn = (blocks[b.key]?.staffName ?? "").trim();
    if (!shouldCountMvbeNominee(nn, execNames)) continue;
    const key = nameKeyForMatch(nn);
    totals.set(key, (totals.get(key) ?? 0) + 1);
  }
}

function applySoreineRankingRowUnifiedPoints(
  row: string[],
  year: number,
  month: number,
  staff: Staff[],
  execNames: Set<string>,
  totals: Map<string, number>
): void {
  if (!isDataRowFirstCell(row[0])) return;
  const ts = normalizeSheetTimestamp(String(row[0]));
  if (!inCalendarMonthJst(ts, year, month)) return;

  let praisedId = "";
  let praisedName = "";

  const parsed = parseSoreineRowToDisplay(row);
  if (parsed) {
    praisedName = (parsed.praisedName ?? "").trim();
  } else if (row.length >= 7) {
    praisedId = String(row[3] ?? "").trim();
    praisedName = String(row[4] ?? "").trim();
  } else {
    return;
  }

  if (!praisedName && !praisedId) return;

  const byId = staffByIdMap(staff);
  const byNk = staffByNameKeyMap(staff);
  const sid = resolvePraisedStaffId(byId, byNk, praisedId, praisedName);
  if (!sid) return;
  const person = byId.get(sid);
  if (!person) return;
  if (!shouldCountMvbeNominee(person.name, execNames)) return;

  const key = nameKeyForMatch(person.name);
  totals.set(key, (totals.get(key) ?? 0) + SOREINE_RANKING_POINTS_PER_ROW);
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
      /** マスタと一致すればマスタ表記。集計は nameKey のため r.name はキー（スペースなし）のことあり */
      name: s?.name?.trim() ? s.name.trim() : r.name,
      score: r.score,
      department: s?.department?.trim() ? s.department.trim() : "（マスタ未登録）",
      nickname: nick ? nick : null,
    };
  });
}

export type MonthlyRanking = {
  year: number;
  month: number;
  /** MVBe・ソレイイネ加点、読書提出 +1／未提出 −1、提出未達ペナルティ等を合算した上位表示 */
  combined: RankedEntry[];
};

export function emptyMvbeBlockVoteMaps(): Record<MvbeBlockKey, Map<string, number>> {
  return {
    better: new Map(),
    honest: new Map(),
    proactive: new Map(),
    challenging: new Map(),
    authentic: new Map(),
  };
}

/**
 * MVBe 回答シートの1データ行を、指定月かつ当月の票数／ポイント方式にだけ紐づけてブロック別集計に加算する。
 */
export function applyMvbeRankingRowIntoMaps(
  row: string[],
  year: number,
  month: number,
  execNames: Set<string>,
  usesPointsForMonth: boolean,
  mvbeByBlock: Record<MvbeBlockKey, Map<string, number>>
): void {
  if (!isDataRowFirstCell(row[0])) return;
  const ts = normalizeSheetTimestamp(String(row[0]));
  if (!inCalendarMonthJst(ts, year, month)) return;

  if (usesPointsForMonth) {
    const v2 = parseMvbeV2Row(row);
    if (v2) {
      const n = v2.nomineeName.trim();
      if (!shouldCountMvbeNominee(n, execNames)) return;
      const valNorm = normalizeSoreineValueCell(v2.valueRaw);
      if (!valNorm) return;
      const bk = soreineValueToMvbeBlockKey(valNorm);
      const key = nameKeyForMatch(n);
      const map = mvbeByBlock[bk];
      map.set(key, (map.get(key) ?? 0) + v2.pointsGranted);
      return;
    }
    const blocks = parseMvbeBlocksForRanking(row);
    if (!blocks) return;
    for (const b of MVBE_BLOCKS) {
      const nn = (blocks[b.key]?.staffName ?? "").trim();
      if (!shouldCountMvbeNominee(nn, execNames)) continue;
      const key = nameKeyForMatch(nn);
      const map = mvbeByBlock[b.key];
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return;
  }

  const v2legacyMonth = parseMvbeV2Row(row);
  if (v2legacyMonth) {
    const n = v2legacyMonth.nomineeName.trim();
    if (!shouldCountMvbeNominee(n, execNames)) return;
    const valNorm = normalizeSoreineValueCell(v2legacyMonth.valueRaw);
    if (!valNorm) return;
    const bk = soreineValueToMvbeBlockKey(valNorm);
    const key = nameKeyForMatch(n);
    const map = mvbeByBlock[bk];
    map.set(key, (map.get(key) ?? 0) + 1);
    return;
  }

  const blocks = parseMvbeBlocksForRanking(row);
  if (!blocks) return;
  for (const b of MVBE_BLOCKS) {
    const nn = (blocks[b.key]?.staffName ?? "").trim();
    if (!shouldCountMvbeNominee(nn, execNames)) continue;
    const key = nameKeyForMatch(nn);
    const map = mvbeByBlock[b.key];
    map.set(key, (map.get(key) ?? 0) + 1);
  }
}

export async function loadMonthlyRanking(
  year: number,
  month: number
): Promise<MonthlyRanking | null> {
  if (!sheetsConfigured()) {
    return null;
  }
  const e = getEnv();
  const [mvbeRows, soreineRows, staff] = await Promise.all([
    getMergedMvbeSheetRowsForRead(),
    getSheetRows(e.SHEET_RESPONSES_SOREINE, getSoreiineSpreadsheetId()),
    getActiveStaff(),
  ]);

  let readingAnsweredStaffIds: Set<string> | null = null;
  const readingBookId = getReadingHabitSpreadsheetId();
  if (readingBookId) {
    try {
      const readingRows = await getSheetRows(
        e.SHEET_RESPONSES_READING_HABIT,
        readingBookId
      );
      readingAnsweredStaffIds = new Set<string>();
      for (const row of readingRows) {
        if (!isDataRowFirstCell(row[0])) continue;
        const ts = normalizeSheetTimestamp(String(row[0]));
        if (!inCalendarMonthJst(ts, year, month)) continue;
        const cells = [String(row[1] ?? "").trim()].filter(Boolean);
        const st = findStaffByRespondentCells(staff, cells);
        if (st) readingAnsweredStaffIds.add(st.id);
      }
    } catch (err) {
      console.warn("[ranking] reading habit sheet unreadable:", err);
      readingAnsweredStaffIds = null;
    }
  }

  const execNames = executiveNameSet(staff);
  const combinedScores = new Map<string, number>();

  for (const row of mvbeRows) {
    applyMvbeRankingRowUnifiedNomineePoints(row, year, month, execNames, combinedScores);
  }
  for (const row of soreineRows) {
    applySoreineRankingRowUnifiedPoints(row, year, month, staff, execNames, combinedScores);
  }

  const mvbeWindows = mvbeCanonicalWindowsOverlappingCalendarMonth(year, month);
  const soreineWeeks = soreineSubmissionPeriodsOverlappingCalendarMonth(year, month);

  for (const s of staff) {
    const k = nameKeyForMatch(s.name);
    let penaltyUnits = 0;

    for (const w of mvbeWindows) {
      let answered = false;
      for (const row of mvbeRows) {
        if (!isDataRowFirstCell(row[0])) continue;
        const ts = normalizeSheetTimestamp(String(row[0]));
        if (!rowTimestampInRange(ts, w.start, w.endExclusive)) continue;
        const r = findStaffByRespondentCells(staff, mvbeRespondentCells(row));
        if (r?.id === s.id) {
          answered = true;
          break;
        }
      }
      if (!answered) penaltyUnits += 1;
    }

    for (const w of soreineWeeks) {
      let answered = false;
      for (const row of soreineRows) {
        if (!isDataRowFirstCell(row[0])) continue;
        const ts = normalizeSheetTimestamp(String(row[0]));
        if (!rowTimestampInRange(ts, w.start, w.endExclusive)) continue;
        const r = findStaffByRespondentCells(staff, soreineRespondentCells(row));
        if (r?.id === s.id) {
          answered = true;
          break;
        }
      }
      if (!answered) penaltyUnits += 1;
    }

    if (readingAnsweredStaffIds !== null && !readingAnsweredStaffIds.has(s.id)) {
      penaltyUnits += 1;
    }

    if (penaltyUnits !== 0) {
      combinedScores.set(k, (combinedScores.get(k) ?? 0) - penaltyUnits);
    }

    if (readingAnsweredStaffIds !== null && readingAnsweredStaffIds.has(s.id)) {
      combinedScores.set(
        k,
        (combinedScores.get(k) ?? 0) + READING_HABIT_RANKING_BONUS_POINTS
      );
    }
  }

  const combined = toRankedWithMeta(
    toRankedRowsTopN(combinedScores, RANKING_DISPLAY_TOP_N),
    staff,
    RANKING_DISPLAY_TOP_N
  );

  return { year, month, combined };
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

const YM_MIN: { year: number; month: number } = { year: 2000, month: 1 };

/**
 * 一般ユーザーが月間ランキングで閲覧可能な**最新**の月（JST 暦月）。
 * 今月・先月は含めず、2か月前の暦月まで。`2000-01` 未満には丸めない（下限は `YM_MIN` との交差で調整する側で行う）。
 */
function getLatestRankingMonthForGeneralJst(): { year: number; month: number } {
  const cur = getCurrentYearMonthJst();
  return addCalendarMonths(cur.year, cur.month, -2);
}

/** 一般向け `maxYm` 用: 2か月前と `2000-01` の遅い方（常に有効な範囲にする） */
export function getGeneralUserRankingMaxYmBounds(): { year: number; month: number } {
  const cap = getLatestRankingMonthForGeneralJst();
  return compareYearMonth(cap, YM_MIN) < 0 ? YM_MIN : cap;
}
