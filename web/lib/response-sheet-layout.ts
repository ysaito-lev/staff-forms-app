import {
  MVBE_BLOCKS,
  SOREINE_VALUES,
  normalizeSoreineValueCell,
  type MvbeBlockKey,
  type SoreineValue,
} from "@/lib/form-copy";
import type { Staff } from "@/lib/staff-types";

/**
 * MVBe 回答シート（Web 追記）— 16 列（A ～ P）
 * A–B: タイムスタンプ, 回答者 / C–D: Be better（氏名・理由）
 * E,G,I,K (4,6,8,10): 空
 * F,H,J,L (5,7,9,11): honest / proactive / challenging / authentic の**理由**
 * M–P (12–15): 同上 4 ブロックの**氏名**
 */
export const MVBE_SHEET_COL_COUNT = 16;
/** 旧サイト送信の幅広行（列1=職員ID, 2=氏名, 以降 各ブロック id/name/理由） */
const MVBE_WIDE_COL_COUNT = 3 + MVBE_BLOCKS.length * 3;

/** 管理者 CSV 等の列見出し（`buildMvbeSheetRow` の 16 列レイアウトと一致） */
export const MVBE_EXPORT_COLUMN_HEADERS: readonly string[] = [
  "タイムスタンプ",
  "回答者",
  "Be better 対象者名",
  "Be better 理由",
  "(空欄)",
  "Be honest 理由",
  "(空欄)",
  "Be proactive 理由",
  "(空欄)",
  "Be challenging 理由",
  "(空欄)",
  "Be authentic 理由",
  "Be honest 対象者名",
  "Be proactive 対象者名",
  "Be challenging 対象者名",
  "Be authentic 対象者名",
];

function mvbeWideExportHeaders(): string[] {
  const h: string[] = ["タイムスタンプ", "回答者職員ID", "回答者氏名"];
  for (const b of MVBE_BLOCKS) {
    const label =
      b.heading.replace(/^■/, "").split(/[：:]/)[0]?.trim() ?? b.key;
    h.push(`${label} 職員ID`, `${label} 対象者名`, `${label} 理由`);
  }
  return h;
}

/** MVBe CSV 1 行目。列数はシート上の最大幅に合わせ、16 / 18 列系は意味のある見出しにする */
export function buildMvbeCsvHeaderRow(maxC: number): string[] {
  if (maxC <= 0) return [];
  const standard = MVBE_EXPORT_COLUMN_HEADERS;
  if (maxC >= MVBE_WIDE_COL_COUNT) {
    const wide = mvbeWideExportHeaders();
    if (maxC <= wide.length) return wide.slice(0, maxC);
    return [
      ...wide,
      ...Array.from({ length: maxC - wide.length }, (_, i) => `列${wide.length + i + 1}`),
    ];
  }
  if (maxC <= standard.length) return [...standard].slice(0, maxC);
  return [
    ...standard,
    ...Array.from({ length: maxC - standard.length }, (_, i) => `列${standard.length + i + 1}`),
  ];
}
/** ソレイイネ用：タイムスタンプ・回答者名・賞賛…・value・具体的内容の 5 列 */
export const SOREINE_SHEET_COL_COUNT = 5;

/** 列インデックス（0 始まり） */
export const R = {
  ts: 0,
  respondent: 1,
  betterName: 2,
  betterR1: 3,
  betterR2: 4,
  betterR3: 5,
  betterR4: 6,
  betterR5: 7,
  honest: 8,
  proactive: 9,
  challenging: 10,
  authentic: 11,
} as const;

function cell(s: string | null | undefined): string {
  return s === null || s === undefined ? "" : String(s);
}

function splitNameReason(combined: string): { staffName: string; reason: string } {
  const t = combined.trim();
  const seps = [" / ", "／", " — ", " – "];
  for (const sep of seps) {
    const i = t.indexOf(sep);
    if (i > 0) {
      return {
        staffName: t.slice(0, i).trim(),
        reason: t.slice(i + sep.length).trim(),
      };
    }
  }
  return { staffName: t, reason: "" };
}

/** ソレイイネ「ソレイイネ」シートの列（0 始まり） */
const SR = {
  ts: 0,
  respondent: 1,
  praised: 2,
  value: 3,
  detail: 4,
} as const;

export function buildSoreineSheetRow(params: {
  submittedAt: string;
  respondent: Staff;
  praised: Staff;
  value: SoreineValue;
  detail: string;
}): string[] {
  const row = Array<string>(SOREINE_SHEET_COL_COUNT).fill("");
  const { submittedAt, respondent, praised, value, detail } = params;
  row[SR.ts] = submittedAt;
  row[SR.respondent] = respondent.name;
  row[SR.praised] = praised.name;
  row[SR.value] = value;
  row[SR.detail] = detail.trim();
  return row;
}

export function buildMvbeSheetRow(params: {
  submittedAt: string;
  respondent: Staff;
  blocks: Record<MvbeBlockKey, { staffName: string; reason: string }>;
}): string[] {
  const row = Array<string>(MVBE_SHEET_COL_COUNT).fill("");
  const { submittedAt, respondent, blocks } = params;
  const b = blocks;
  row[0] = submittedAt;
  row[1] = respondent.name;
  row[2] = cell(b.better.staffName);
  row[3] = cell(b.better.reason);
  row[4] = "";
  row[5] = cell(b.honest.reason);
  row[6] = "";
  row[7] = cell(b.proactive.reason);
  row[8] = "";
  row[9] = cell(b.challenging.reason);
  row[10] = "";
  row[11] = cell(b.authentic.reason);
  row[12] = cell(b.honest.staffName);
  row[13] = cell(b.proactive.staffName);
  row[14] = cell(b.challenging.staffName);
  row[15] = cell(b.authentic.staffName);
  return row;
}

/** 旧 16 列系（4〜7列が空で honest 以降が「氏名/理由」結合）か */
function isLegacyMvbeCombinedBlockRow(row: string[]): boolean {
  if (row.length < 12) return false;
  const t = (i: number) => cell(row[i]).trim();
  return !t(4) && !t(5) && !t(6) && !t(7);
}

/**
 * 幅広 18 列（ts, 回答者職員ID, 氏名, 各ブロック id/氏名/理由）
 * 新12列の回答者列は和文氏名のため、列1に漢字・かながあれば幅広ではない
 */
export function isWideMvbeWithIdColumns(row: string[]): boolean {
  if (row.length < 18) return false;
  const r1 = cell(row[1]).trim();
  const r3 = cell(row[3]).trim();
  if (!r1 || !r3) return false;
  if (/[\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}]/u.test(r1)) {
    return false;
  }
  if (r3.length > 200) return false;
  if (/[。\n!]/.test(r3) && r3.length > 30) return false;
  if (/[。！？]/.test(r3) && r3.length > 20) return false;
  return true;
}

export function parseSoreineRowToDisplay(row: string[]): {
  praisedName: string;
  value: string;
  detail: string;
} | null {
  const v3 = cell(row[3]).trim();
  const valueNorm = normalizeSoreineValueCell(v3);
  if (row.length >= 5 && valueNorm) {
    return {
      praisedName: cell(row[2]),
      value: valueNorm,
      detail: cell(row[4]),
    };
  }
  if (row.length < 12) return null;
  const bName = cell(row[R.betterName]);
  const bD1 = cell(row[R.betterR1]);
  if (bName && bD1) {
    return { praisedName: bName, value: SOREINE_VALUES[0], detail: bD1 };
  }
  const rest = [
    { col: R.honest, value: SOREINE_VALUES[1] },
    { col: R.proactive, value: SOREINE_VALUES[2] },
    { col: R.challenging, value: SOREINE_VALUES[3] },
    { col: R.authentic, value: SOREINE_VALUES[4] },
  ] as const;
  for (const { col, value } of rest) {
    const raw = cell(row[col]);
    if (!raw) continue;
    const { staffName, reason } = splitNameReason(raw);
    if (staffName) {
      return { praisedName: staffName, value, detail: reason || raw };
    }
  }
  return null;
}

/** 集計用：ブロック別の選出氏名 */
export function parseMvbeBlocksForRanking(
  row: string[]
): Record<MvbeBlockKey, { staffName: string }> | null {
  const parsed = parseMvbeRowToDisplay(row);
  if (!parsed) return null;
  const out = {} as Record<MvbeBlockKey, { staffName: string }>;
  for (const b of MVBE_BLOCKS) {
    out[b.key] = { staffName: (parsed[b.key as MvbeBlockKey]?.staffName ?? "").trim() };
  }
  return out;
}

/**
 * 新16列（F,H,J,L=理由 5,7,9,11 / M–P=氏名 12–15）/ 12列密 / 旧16列（結合8–11）/ 幅広18列+ を解釈
 */
export function parseMvbeRowToDisplay(
  row: string[]
): Record<MvbeBlockKey, { staffName: string; reason: string }> | null {
  if (row.length < 12) return null;
  const out = {} as Record<MvbeBlockKey, { staffName: string; reason: string }>;

  if (row.length >= 16) {
    out.better = {
      staffName: cell(row[2]),
      reason: cell(row[3]),
    };
    out.honest = {
      staffName: cell(row[12]),
      reason: cell(row[5]),
    };
    out.proactive = {
      staffName: cell(row[13]),
      reason: cell(row[7]),
    };
    out.challenging = {
      staffName: cell(row[14]),
      reason: cell(row[9]),
    };
    out.authentic = {
      staffName: cell(row[15]),
      reason: cell(row[11]),
    };
    return out;
  }

  if (isLegacyMvbeCombinedBlockRow(row)) {
    out.better = {
      staffName: cell(row[2]),
      reason: cell(row[3]),
    };
    const tail: [MvbeBlockKey, number][] = [
      ["honest", 8],
      ["proactive", 9],
      ["challenging", 10],
      ["authentic", 11],
    ];
    for (const [k, col] of tail) {
      const raw = cell(row[col]);
      if (!raw) {
        out[k] = { staffName: "", reason: "" };
      } else {
        out[k] = splitNameReason(raw);
      }
    }
    return out;
  }

  if (isWideMvbeWithIdColumns(row)) {
    let i = 3;
    for (const b of MVBE_BLOCKS) {
      out[b.key] = {
        staffName: cell(row[i + 1]),
        reason: cell(row[i + 2]),
      };
      i += 3;
    }
    return out;
  }

  // 従来 12 列: C から 5 ブロックが各 2 列（氏名・理由）連続
  const r = row.length > 12 ? row.slice(0, 12) : row;
  for (let bi = 0; bi < MVBE_BLOCKS.length; bi++) {
    const b = MVBE_BLOCKS[bi]!;
    const s = 2 + bi * 2;
    out[b.key] = {
      staffName: cell(r[s] ?? ""),
      reason: cell(r[s + 1] ?? ""),
    };
  }
  return out;
}

/**
 * 幅広行は各ブロック staffId あり。12列・旧16列は staffId 空
 */
export function parseMvbeRowFullBlocks(
  row: string[]
): Record<
  MvbeBlockKey,
  { staffId: string; staffName: string; reason: string }
> | null {
  if (row.length >= MVBE_WIDE_COL_COUNT && isWideMvbeWithIdColumns(row)) {
    const out = {} as Record<
      MvbeBlockKey,
      { staffId: string; staffName: string; reason: string }
    >;
    const keys = MVBE_BLOCKS.map((b) => b.key) as MvbeBlockKey[];
    let i = 3;
    for (const k of keys) {
      out[k] = {
        staffId: String(row[i] ?? "").trim(),
        staffName: String(row[i + 1] ?? "").trim(),
        reason: String(row[i + 2] ?? "").trim(),
      };
      i += 3;
    }
    return out;
  }
  if (row.length < 12) return null;
  const parsed = parseMvbeRowToDisplay(row);
  if (!parsed) return null;
  const out = {} as Record<
    MvbeBlockKey,
    { staffId: string; staffName: string; reason: string }
  >;
  for (const b of MVBE_BLOCKS) {
    const p = parsed[b.key as MvbeBlockKey];
    out[b.key] = { staffId: "", staffName: p.staffName, reason: p.reason };
  }
  return out;
}
