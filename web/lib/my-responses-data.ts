import { getSheetRows } from "@/lib/sheets-read";
import { nameKeyForMatch } from "@/lib/person-name-match";
import {
  getEnv,
  getSoreiineSpreadsheetId,
  sheetsConfigured,
} from "@/lib/env";
import { getMergedMvbeSheetRowsForRead } from "@/lib/mvbe-sheet-rows";
import {
  MVBE_BLOCKS,
  MVBE_NO_NOMINEE_LABEL,
  normalizeSoreineValueCell,
  soreineValueToMvbeBlockKey,
  type MvbeBlockKey,
} from "@/lib/form-copy";
import { getActiveStaff, getStaffByIdMap } from "@/lib/master";
import { normalizeSheetTimestamp, submissionInMvbeWindowJst } from "@/lib/date-utils";
import {
  isMvbeV2Row,
  isWideMvbeWithIdColumns,
  MVBE_V2_I,
  parseMvbeRowFullBlocks,
  parseMvbeRowToDisplay,
  parseMvbeV2Row,
  soreineDiscordMessageUrlFromRow,
  parseSoreineRowToDisplay,
} from "@/lib/response-sheet-layout";
import { respondentDepartmentFromName } from "@/lib/respondent-department";
import type { Staff } from "@/lib/staff-types";

export type SoreineResponseRow = {
  submittedAt: string;
  respondentId: string;
  respondentName: string;
  praisedId: string;
  praisedName: string;
  value: string;
  detail: string;
  /** シート G 列（permalink）。未送信・旧データは undefined */
  discordMessageUrl?: string;
};

export type MvbeResponseRow = {
  submittedAt: string;
  respondentId: string;
  respondentName: string;
  blocks: Record<
    string,
    { staffId: string; staffName: string; reason: string }
  >;
};

/** 他者の回答のうち、賞賛対象が自分の行 */
export type SoreineReceivedRow = {
  submittedAt: string;
  fromRespondentName: string;
  /** 回答者のメイン部署（マスタから推定） */
  fromDepartment: string;
  value: string;
  comment: string;
  discordMessageUrl?: string;
};

export type MvbeReceivedRow = {
  submittedAt: string;
  fromRespondentName: string;
  /** 投票者のメイン部署（レガシーはマスタから推定） */
  fromDepartment: string;
  blockKey: MvbeBlockKey;
  blockHeading: string;
  reason: string;
  /** ポイント制行はシート値、レガシーは 1 */
  points: number;
};

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

function respondentMatches(
  row: string[],
  staffId: string,
  respondentName: string
): boolean {
  const b = String(row[1] ?? "").trim();
  const sid = staffId.trim();
  const rname = respondentName.trim();
  if (b === sid || b === rname) return true;
  const kname = nameKeyForMatch(rname);
  if (kname && nameKeyForMatch(b) === kname) return true;
  return false;
}

export function soreineFromRespondentName(row: string[]): string {
  if (row.length >= 4) {
    const v3 = String(row[3] ?? "").trim();
    if (normalizeSoreineValueCell(v3)) {
      return String(row[1] ?? "").trim();
    }
  }
  if (row.length >= 3) {
    const n2 = String(row[2] ?? "").trim();
    if (n2) return n2;
  }
  return String(row[1] ?? "").trim();
}

function isPraisedSoreineAboutMe(
  praisedName: string,
  praisedId: string,
  myName: string,
  myId: string
): boolean {
  const n = (praisedName ?? "").trim();
  const i = (praisedId ?? "").trim();
  if (i && i === myId) return true;
  if (n && (n === myName || n === myId)) return true;
  /** 送った回答と同様、氏名の空白差で一致しない行を捨てない */
  if (n && myName && nameKeyForMatch(n) === nameKeyForMatch(myName)) {
    return true;
  }
  return false;
}

function parseSoreineMine(
  rows: string[][],
  staffId: string,
  respondentName: string
): SoreineResponseRow[] {
  const out: SoreineResponseRow[] = [];
  for (const row of rows) {
    if (!isDataRowFirstCell(row[0])) continue;
    if (!respondentMatches(row, staffId, respondentName)) continue;

    const parsed = parseSoreineRowToDisplay(row);
    if (parsed) {
      const discordMessageUrl = soreineDiscordMessageUrlFromRow(row);
      out.push({
        submittedAt: normalizeSheetTimestamp(String(row[0])),
        respondentId: staffId,
        respondentName,
        praisedId: "",
        praisedName: parsed.praisedName,
        value: parsed.value,
        detail: parsed.detail,
        ...(discordMessageUrl ? { discordMessageUrl } : {}),
      });
      continue;
    }
    if (row.length < 7) continue;
    const discordLegacy = soreineDiscordMessageUrlFromRow(row);
    out.push({
      submittedAt: normalizeSheetTimestamp(String(row[0])),
      respondentId: row[1] ?? "",
      respondentName: row[2] ?? "",
      praisedId: row[3] ?? "",
      praisedName: row[4] ?? "",
      value: row[5] ?? "",
      detail: row[6] ?? "",
      ...(discordLegacy ? { discordMessageUrl: discordLegacy } : {}),
    });
  }
  return out.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

function parseMvbeMine(
  rows: string[][],
  staffId: string,
  respondentName: string
): MvbeResponseRow[] {
  const keys = MVBE_BLOCKS.map((b) => b.key);
  const needCols = 3 + keys.length * 3;
  const out: MvbeResponseRow[] = [];
  for (const row of rows) {
    if (!isDataRowFirstCell(row[0])) continue;
    if (!respondentMatches(row, staffId, respondentName)) continue;

    if (isMvbeV2Row(row)) {
      const v2 = parseMvbeV2Row(row);
      if (!v2) continue;
      const nv = normalizeSoreineValueCell(v2.valueRaw);
      const bk = nv ? soreineValueToMvbeBlockKey(nv) : ("better" as MvbeBlockKey);
      const blocks: MvbeResponseRow["blocks"] = {};
      for (const b of MVBE_BLOCKS) {
        blocks[b.key] = { staffId: "", staffName: "", reason: "" };
      }
      blocks[bk] = {
        staffId: v2.nomineeId,
        staffName: v2.nomineeName,
        reason: v2.reason,
      };
      out.push({
        submittedAt: normalizeSheetTimestamp(String(row[0])),
        respondentId: String(row[MVBE_V2_I.respondentId] ?? "").trim() || staffId,
        respondentName: String(row[MVBE_V2_I.respondentName] ?? "").trim() || respondentName,
        blocks,
      });
      continue;
    }

    if (row.length >= needCols && isWideMvbeWithIdColumns(row)) {
      const blocks: MvbeResponseRow["blocks"] = {};
      let i = 3;
      for (const k of keys) {
        blocks[k] = {
          staffId: row[i] ?? "",
          staffName: row[i + 1] ?? "",
          reason: row[i + 2] ?? "",
        };
        i += 3;
      }
      out.push({
        submittedAt: normalizeSheetTimestamp(String(row[0])),
        respondentId: String(row[1] ?? ""),
        respondentName: String(row[2] ?? ""),
        blocks,
      });
      continue;
    }

    if (row.length >= 12) {
      const parsed = parseMvbeRowToDisplay(row);
      if (parsed) {
        const hasAny = MVBE_BLOCKS.some(
          (b) =>
            (parsed[b.key as MvbeBlockKey].staffName ?? "").trim() !== "" ||
            (parsed[b.key as MvbeBlockKey].reason ?? "").trim() !== ""
        );
        if (hasAny) {
          const blocks: MvbeResponseRow["blocks"] = {};
          for (const b of MVBE_BLOCKS) {
            const p = parsed[b.key as MvbeBlockKey];
            blocks[b.key] = {
              staffId: "",
              staffName: p.staffName,
              reason: p.reason,
            };
          }
          out.push({
            submittedAt: normalizeSheetTimestamp(String(row[0])),
            respondentId: staffId,
            respondentName,
            blocks,
          });
        }
      }
    }
  }
  return out.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

function parseSoreineReceived(
  rows: string[][],
  myName: string,
  myId: string,
  staffList: Staff[]
): SoreineReceivedRow[] {
  const out: SoreineReceivedRow[] = [];
  for (const row of rows) {
    if (!isDataRowFirstCell(row[0])) continue;
    const parsed = parseSoreineRowToDisplay(row);
    let value: string;
    let comment: string;
    if (parsed) {
      if (!isPraisedSoreineAboutMe(parsed.praisedName, "", myName, myId)) {
        continue;
      }
      value = parsed.value;
      comment = parsed.detail;
    } else if (row.length >= 7) {
      const pId = String(row[3] ?? "").trim();
      const pName = String(row[4] ?? "").trim();
      if (!isPraisedSoreineAboutMe(pName, pId, myName, myId)) continue;
      value = String(row[5] ?? "");
      comment = String(row[6] ?? "");
    } else {
      continue;
    }
    const discordMessageUrl = soreineDiscordMessageUrlFromRow(row);
    const fromNm = soreineFromRespondentName(row) || "（不明）";
    out.push({
      submittedAt: normalizeSheetTimestamp(String(row[0])),
      fromRespondentName: fromNm,
      fromDepartment: respondentDepartmentFromName(fromNm, staffList),
      value,
      comment,
      ...(discordMessageUrl ? { discordMessageUrl } : {}),
    });
  }
  return out.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

function isMvbeBlockAboutMe(
  staffId: string,
  staffName: string,
  myName: string,
  myId: string
): boolean {
  if ((staffId ?? "").trim() === myId) return true;
  const n = (staffName ?? "").trim();
  if (!n || n === MVBE_NO_NOMINEE_LABEL) return false;
  if (n === myName || n === myId) return true;
  if (myName && nameKeyForMatch(n) === nameKeyForMatch(myName)) return true;
  return false;
}

function parseMvbeReceived(
  rows: string[][],
  myName: string,
  myId: string,
  staffList: Staff[]
): MvbeReceivedRow[] {
  const out: MvbeReceivedRow[] = [];
  for (const row of rows) {
    if (!isDataRowFirstCell(row[0])) continue;

    if (isMvbeV2Row(row)) {
      const v2 = parseMvbeV2Row(row);
      if (!v2) continue;
      if (!isMvbeBlockAboutMe(v2.nomineeId, v2.nomineeName, myName, myId)) {
        continue;
      }
      const nv = normalizeSoreineValueCell(v2.valueRaw);
      const bk = nv ? soreineValueToMvbeBlockKey(nv) : ("better" as MvbeBlockKey);
      const meta = MVBE_BLOCKS.find((x) => x.key === bk)!;
      const fromName =
        String(row[MVBE_V2_I.respondentName] ?? "").trim() ||
        String(row[MVBE_V2_I.respondentId] ?? "").trim();
      out.push({
        submittedAt: normalizeSheetTimestamp(String(row[0])),
        fromRespondentName: fromName || "（不明）",
        fromDepartment: (v2.voterDeptMain ?? "").trim() || "（不明）",
        blockKey: bk,
        blockHeading: meta.heading,
        reason: v2.reason,
        points: v2.pointsGranted,
      });
      continue;
    }

    const blocks = parseMvbeRowFullBlocks(row);
    if (!blocks) continue;
    const wide = isWideMvbeWithIdColumns(row);
    const fromName = wide
      ? String(row[2] ?? row[1] ?? "").trim()
      : String(row[1] ?? "").trim();
    const fromDept = respondentDepartmentFromName(fromName || "（不明）", staffList);
    for (const b of MVBE_BLOCKS) {
      const bl = blocks[b.key as MvbeBlockKey];
      if (!isMvbeBlockAboutMe(bl.staffId, bl.staffName, myName, myId)) {
        continue;
      }
      out.push({
        submittedAt: normalizeSheetTimestamp(String(row[0])),
        fromRespondentName: fromName || "（不明）",
        fromDepartment: fromDept,
        blockKey: b.key as MvbeBlockKey,
        blockHeading: b.heading,
        reason: (bl.reason ?? "").trim(),
        points: 1,
      });
    }
  }
  return out.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

/**
 * MVBe シートに、同一回答者の「現在の提出期ウィンドウ（JST・前半クロス／後半は当該日まで）」の行が既にあるか
 */
export async function hasMvbeSubmissionInCurrentWindowJst(
  staffId: string
): Promise<boolean> {
  if (!sheetsConfigured()) {
    return false;
  }
  const staff = await getActiveStaff();
  const me = getStaffByIdMap(staff).get(staffId);
  const respondentName = (me?.name ?? staffId).trim();
  const rows = await getMergedMvbeSheetRowsForRead();
  for (const row of rows) {
    if (!isDataRowFirstCell(row[0])) continue;
    if (!respondentMatches(row, staffId, respondentName)) continue;
    const ts = normalizeSheetTimestamp(String(row[0]));
    if (submissionInMvbeWindowJst(ts)) return true;
  }
  return false;
}

export async function loadMyResponses(staffId: string): Promise<{
  soreine: SoreineResponseRow[];
  mvbe: MvbeResponseRow[];
  receivedSoreine: SoreineReceivedRow[];
  receivedMvbe: MvbeReceivedRow[];
}> {
  if (!sheetsConfigured()) {
    return { soreine: [], mvbe: [], receivedSoreine: [], receivedMvbe: [] };
  }
  const staff = await getActiveStaff();
  const me = getStaffByIdMap(staff).get(staffId);
  const respondentName = (me?.name ?? staffId).trim();
  const e = getEnv();
  const [soreineRows, mvbeRows] = await Promise.all([
    getSheetRows(e.SHEET_RESPONSES_SOREINE, getSoreiineSpreadsheetId()),
    getMergedMvbeSheetRowsForRead(),
  ]);
  return {
    soreine: parseSoreineMine(soreineRows, staffId, respondentName),
    mvbe: parseMvbeMine(mvbeRows, staffId, respondentName),
    receivedSoreine: parseSoreineReceived(
      soreineRows,
      respondentName,
      staffId,
      staff
    ),
    receivedMvbe: parseMvbeReceived(mvbeRows, respondentName, staffId, staff),
  };
}
