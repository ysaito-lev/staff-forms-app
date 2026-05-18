import { getJstYearMonthFromIso, normalizeSheetTimestamp } from "@/lib/date-utils";
import {
  MVBE_BLOCKS,
  type MvbeBlockKey,
} from "@/lib/form-copy";
import {
  awardsRegistrySheetConfigured,
  getAwardsRegistrySpreadsheetId,
  getEnv,
  sheetsConfigured,
} from "@/lib/env";
import { getActiveStaff } from "@/lib/master";
import { isMvbePointRankingMonth } from "@/lib/mvbe-dept-weights";
import { getMergedMvbeSheetRowsForRead } from "@/lib/mvbe-sheet-rows";
import { nameKeyForMatch } from "@/lib/person-name-match";
import {
  applyMvbeRankingRowIntoMaps,
  compareYearMonth,
  emptyMvbeBlockVoteMaps,
  executiveNameSet,
  formatYearMonthParam,
  getGeneralUserRankingMaxYmBounds,
  mvbeRankOneNameKeys,
  parseYearMonthParam,
} from "@/lib/ranking-data";
import { getSheetRows } from "@/lib/sheets-read";
import type { Staff } from "@/lib/staff-types";

export type MyAwardMvbeMonthlyFirst = {
  kind: "mvbe_monthly_first";
  ym: string;
  year: number;
  month: number;
  blockKey: MvbeBlockKey;
  blockHeading: string;
  score: number;
  usesPoints: boolean;
};

export type MyAwardExternalSheet = {
  kind: "external_sheet";
  title: string;
  ym?: string;
  note?: string;
};

export type MyAwardDisplay = MyAwardMvbeMonthlyFirst | MyAwardExternalSheet;

type YmMaps = Record<MvbeBlockKey, Map<string, number>>;

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "");
}

function colIndex(headers: string[], ...candidates: string[]): number {
  const norm = headers.map(normalizeHeader);
  for (const c of candidates) {
    const i = norm.indexOf(normalizeHeader(c));
    if (i >= 0) return i;
  }
  return -1;
}

function ymKeyFromParts(year: number, month: number): string {
  return formatYearMonthParam(year, month);
}

function showsOnSiteCell(v: string): boolean {
  const s = v.trim().toLowerCase();
  if (!s) return true;
  if (["0", "false", "no", "n", "hide", "非表示", "しない"].includes(s)) return false;
  return true;
}

function normalizeYmCell(raw: string): string | undefined {
  const s = raw.trim();
  if (!s) return undefined;
  const p = parseYearMonthParam(s.replace(/\//g, "-"));
  if (!p) return undefined;
  return formatYearMonthParam(p.year, p.month);
}

async function loadMvbeFirstPlaceAwardsForStaff(
  staffPerson: Staff,
  generalMax: { year: number; month: number }
): Promise<MyAwardMvbeMonthlyFirst[]> {
  if (!sheetsConfigured()) return [];

  const [mvbeRows, staff] = await Promise.all([
    getMergedMvbeSheetRowsForRead(),
    getActiveStaff(),
  ]);
  const execNames = executiveNameSet(staff);
  const staffKey = nameKeyForMatch(staffPerson.name);

  const byYm = new Map<string, YmMaps>();

  for (const row of mvbeRows) {
    if (!row[0]) continue;
    const ts = normalizeSheetTimestamp(String(row[0]));
    const ymParts = getJstYearMonthFromIso(ts);
    if (!ymParts) continue;

    const k = ymKeyFromParts(ymParts.year, ymParts.month);
    let maps = byYm.get(k);
    if (!maps) {
      maps = emptyMvbeBlockVoteMaps();
      byYm.set(k, maps);
    }

    const usesPoints = isMvbePointRankingMonth(ymParts.year, ymParts.month);
    applyMvbeRankingRowIntoMaps(
      row,
      ymParts.year,
      ymParts.month,
      execNames,
      usesPoints,
      maps
    );
  }

  const list: MyAwardMvbeMonthlyFirst[] = [];

  for (const [ymStr, maps] of byYm) {
    const parsed = parseYearMonthParam(ymStr);
    if (!parsed) continue;
    if (compareYearMonth(parsed, generalMax) > 0) continue;

    const usesPoints = isMvbePointRankingMonth(parsed.year, parsed.month);

    for (const b of MVBE_BLOCKS) {
      const winners = mvbeRankOneNameKeys(maps[b.key]);
      if (!winners.includes(staffKey)) continue;
      list.push({
        kind: "mvbe_monthly_first",
        ym: ymStr,
        year: parsed.year,
        month: parsed.month,
        blockKey: b.key,
        blockHeading: b.heading,
        score: maps[b.key].get(staffKey) ?? 0,
        usesPoints,
      });
    }
  }

  return list;
}

async function loadExternalAwardsRowsForStaffId(
  staffId: string
): Promise<MyAwardExternalSheet[]> {
  if (!awardsRegistrySheetConfigured()) return [];
  const e = getEnv();
  const tab = e.SHEET_MY_AWARDS?.trim();
  if (!tab) return [];

  const rows = await getSheetRows(tab, getAwardsRegistrySpreadsheetId());
  if (!rows.length) return [];

  const header = rows[0]!.map((c) => String(c ?? ""));
  const iStaff = colIndex(header, "staff_id", "staffid", "職員id", "職員ID", "スタッフid");
  const iTitle = colIndex(
    header,
    "award_title",
    "title",
    "賞名",
    "賞の名称",
    "名称"
  );
  const iYm = colIndex(header, "ym", "year_month", "対象月", "年月");
  const iNote = colIndex(header, "note", "メモ", "説明");
  const iShow = colIndex(header, "show", "site", "サイト表示", "公開", "表示");

  const idCol = iStaff >= 0 ? iStaff : 0;
  const titleCol = iTitle >= 0 ? iTitle : 1;

  const out: MyAwardExternalSheet[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const sid = String(row[idCol] ?? "").trim();
    if (sid !== staffId.trim()) continue;
    if (iShow >= 0 && row[iShow] != null && String(row[iShow]).trim()) {
      if (!showsOnSiteCell(String(row[iShow] ?? ""))) continue;
    }

    const title = String(row[titleCol] ?? "").trim();
    if (!title) continue;

    const ymRaw = iYm >= 0 ? String(row[iYm] ?? "").trim() : "";
    const note = iNote >= 0 ? String(row[iNote] ?? "").trim() : "";

    out.push({
      kind: "external_sheet",
      title,
      ym: normalizeYmCell(ymRaw),
      note: note || undefined,
    });
  }

  return out;
}

function compareAwards(a: MyAwardDisplay, b: MyAwardDisplay): number {
  const ymOf = (x: MyAwardDisplay) =>
    x.kind === "mvbe_monthly_first" ? x.ym : (x.ym ?? "0000-00");
  const yma = ymOf(a);
  const ymb = ymOf(b);
  const c = ymb.localeCompare(yma, "en");
  if (c !== 0) return c;

  const kindPrio = (x: MyAwardDisplay) => (x.kind === "mvbe_monthly_first" ? 0 : 1);
  const pk = kindPrio(a) - kindPrio(b);
  if (pk !== 0) return pk;

  if (a.kind === "mvbe_monthly_first" && b.kind === "mvbe_monthly_first") {
    const ia = MVBE_BLOCKS.findIndex((x) => x.key === a.blockKey);
    const ib = MVBE_BLOCKS.findIndex((x) => x.key === b.blockKey);
    return ia - ib;
  }

  if (a.kind === "external_sheet" && b.kind === "external_sheet") {
    return a.title.localeCompare(b.title, "ja");
  }
  return 0;
}

/**
 * ログイン中の職員 ID に紐づく受賞の一覧（本人向け）。
 * MVBe は月間ランキングと同じ確定月上限（`getGeneralUserRankingMaxYmBounds`）まで。
 */
export async function loadMyAwardsForStaffId(
  staffId: string,
  staffPerson: Staff | undefined
): Promise<MyAwardDisplay[]> {
  if (!staffPerson) return [];

  const generalMax = getGeneralUserRankingMaxYmBounds();

  const [mvbeAwards, extAwards] = await Promise.all([
    loadMvbeFirstPlaceAwardsForStaff(staffPerson, generalMax),
    loadExternalAwardsRowsForStaffId(staffId),
  ]);

  const merged = [...mvbeAwards, ...extAwards];
  merged.sort(compareAwards);
  return merged;
}
