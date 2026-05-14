import { isDataRowFirstCell } from "@/lib/admin-stats";
import { inCalendarMonthJst, normalizeSheetTimestamp } from "@/lib/date-utils";
import {
  MVBE_BLOCKS,
  type MvbeBlockKey,
} from "@/lib/form-copy";
import { sheetsConfigured } from "@/lib/env";
import { getMergedMvbeSheetRowsForRead } from "@/lib/mvbe-sheet-rows";
import { getActiveStaff } from "@/lib/master";
import { nameKeyForMatch } from "@/lib/person-name-match";
import { respondentDepartmentFromName } from "@/lib/respondent-department";
import type { ReceivedByDeptMonthBundle } from "@/lib/received-by-dept-month-types";
import {
  executiveNameSet,
  shouldCountMvbeNominee,
} from "@/lib/ranking-data";
import {
  isMvbeV2Row,
  isWideMvbeWithIdColumns,
  parseMvbeRowFullBlocks,
  parseMvbeV2Row,
} from "@/lib/response-sheet-layout";
import type { Staff } from "@/lib/staff-types";
import { isMvbePointRankingMonth } from "@/lib/mvbe-dept-weights";

function staffIndexes(staff: Staff[]) {
  const byId = new Map<string, Staff>();
  const byNameKey = new Map<string, Staff>();
  for (const s of staff) {
    byId.set(s.id, s);
    byNameKey.set(nameKeyForMatch(s.name), s);
  }
  return { byId, byNameKey };
}

function resolveNomineeStaffId(
  byId: Map<string, Staff>,
  byNk: Map<string, Staff>,
  nomineeId: string,
  nomineeName: string
): string | null {
  const id = nomineeId.trim();
  if (id && byId.has(id)) return id;
  const s = byNk.get(nameKeyForMatch(nomineeName.trim()));
  return s?.id ?? null;
}

function bumpDept(
  agg: Map<string, Map<string, { entries: number; points: number }>>,
  staffId: string,
  dept: string,
  entriesAdd: number,
  pointsAdd: number
) {
  let inner = agg.get(staffId);
  if (!inner) {
    inner = new Map();
    agg.set(staffId, inner);
  }
  const d = dept.trim() || "（不明）";
  const cur = inner.get(d) ?? { entries: 0, points: 0 };
  cur.entries += entriesAdd;
  cur.points += pointsAdd;
  inner.set(d, cur);
}

/**
 * JST 暦月の MVBe について、被評価者（非幹部・ランキング対象）ごとに
 * 「回答者メイン部署 → 件数／ポイント」を集計する。
 */
export async function loadMvbeReceivedByDeptForMonth(
  year: number,
  month: number
): Promise<ReceivedByDeptMonthBundle | null> {
  if (!sheetsConfigured()) return null;
  const usesPoints = isMvbePointRankingMonth(year, month);
  const [rows, staff] = await Promise.all([
    getMergedMvbeSheetRowsForRead(),
    getActiveStaff(),
  ]);
  const execNames = executiveNameSet(staff);
  const { byId, byNameKey } = staffIndexes(staff);
  const agg = new Map<string, Map<string, { entries: number; points: number }>>();

  for (const row of rows) {
    if (!isDataRowFirstCell(row[0])) continue;
    const ts = normalizeSheetTimestamp(String(row[0]));
    if (!inCalendarMonthJst(ts, year, month)) continue;

    if (usesPoints && isMvbeV2Row(row)) {
      const v2 = parseMvbeV2Row(row);
      if (!v2) continue;
      if (!shouldCountMvbeNominee(v2.nomineeName, execNames)) continue;
      const sid = resolveNomineeStaffId(byId, byNameKey, v2.nomineeId, v2.nomineeName);
      if (!sid) continue;
      const dept = (v2.voterDeptMain ?? "").trim() || "（不明）";
      bumpDept(agg, sid, dept, 1, v2.pointsGranted);
      continue;
    }

    const blocks = parseMvbeRowFullBlocks(row);
    if (!blocks) continue;
    const wide = isWideMvbeWithIdColumns(row);
    const fromName = wide
      ? String(row[2] ?? row[1] ?? "").trim()
      : String(row[1] ?? "").trim();
    const fromDept = respondentDepartmentFromName(fromName || "（不明）", staff);

    for (const b of MVBE_BLOCKS) {
      const bl = blocks[b.key as MvbeBlockKey];
      const nn = (bl.staffName ?? "").trim();
      if (!shouldCountMvbeNominee(nn, execNames)) continue;
      const sid = resolveNomineeStaffId(byId, byNameKey, bl.staffId, bl.staffName);
      if (!sid) continue;
      bumpDept(agg, sid, fromDept, 1, usesPoints ? 1 : 1);
    }
  }

  const eligibleStaff = staff.filter((s) => !s.isExecutive);
  const staffRows = eligibleStaff
    .map((s) => {
      const inner = agg.get(s.id);
      const byDept = inner
        ? [...inner.entries()]
            .map(([department, v]) => ({
              department,
              entries: v.entries,
              points: v.points,
            }))
            .sort(
              (a, b) =>
                b.points - a.points ||
                b.entries - a.entries ||
                a.department.localeCompare(b.department, "ja")
            )
        : [];
      const deptLabel = s.department?.trim()
        ? s.department.trim()
        : "（マスタ未登録）";
      return {
        staffId: s.id,
        displayName: s.name.trim(),
        department: deptLabel,
        usesPoints,
        byDept,
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "ja"));

  return { year, month, usesPoints, staff: staffRows };
}
