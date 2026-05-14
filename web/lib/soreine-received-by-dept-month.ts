import { isDataRowFirstCell } from "@/lib/admin-stats";
import { inCalendarMonthJst, normalizeSheetTimestamp } from "@/lib/date-utils";
import { getEnv, getSoreiineSpreadsheetId, sheetsConfigured } from "@/lib/env";
import { getActiveStaff } from "@/lib/master";
import {
  soreineFromRespondentName,
} from "@/lib/my-responses-data";
import { nameKeyForMatch } from "@/lib/person-name-match";
import { respondentDepartmentFromName } from "@/lib/respondent-department";
import type { ReceivedByDeptMonthBundle } from "@/lib/received-by-dept-month-types";
import { parseSoreineRowToDisplay } from "@/lib/response-sheet-layout";
import { getSheetRows } from "@/lib/sheets-read";
import type { Staff } from "@/lib/staff-types";

function staffIndexes(staff: Staff[]) {
  const byId = new Map<string, Staff>();
  const byNameKey = new Map<string, Staff>();
  for (const s of staff) {
    byId.set(s.id, s);
    byNameKey.set(nameKeyForMatch(s.name), s);
  }
  return { byId, byNameKey };
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

function bumpDept(
  agg: Map<string, Map<string, { entries: number; points: number }>>,
  staffId: string,
  dept: string
) {
  let inner = agg.get(staffId);
  if (!inner) {
    inner = new Map();
    agg.set(staffId, inner);
  }
  const d = dept.trim() || "（不明）";
  const cur = inner.get(d) ?? { entries: 0, points: 0 };
  cur.entries += 1;
  cur.points += 1;
  inner.set(d, cur);
}

/**
 * JST 暦月のソレイイネ!! について、賞賛されたスタッフごとに
 * 「回答者メイン部署 → 件数」を集計する（1 行＝1 件）。
 */
export async function loadSoreineReceivedByDeptForMonth(
  year: number,
  month: number
): Promise<ReceivedByDeptMonthBundle | null> {
  if (!sheetsConfigured()) return null;
  const e = getEnv();
  const [rows, staff] = await Promise.all([
    getSheetRows(e.SHEET_RESPONSES_SOREINE, getSoreiineSpreadsheetId()),
    getActiveStaff(),
  ]);
  const { byId, byNameKey } = staffIndexes(staff);
  const agg = new Map<string, Map<string, { entries: number; points: number }>>();

  for (const row of rows) {
    if (!isDataRowFirstCell(row[0])) continue;
    const ts = normalizeSheetTimestamp(String(row[0]));
    if (!inCalendarMonthJst(ts, year, month)) continue;

    let praisedId = "";
    let praisedName = "";

    const parsed = parseSoreineRowToDisplay(row);
    if (parsed) {
      praisedName = (parsed.praisedName ?? "").trim();
    } else if (row.length >= 7) {
      praisedId = String(row[3] ?? "").trim();
      praisedName = String(row[4] ?? "").trim();
    } else {
      continue;
    }

    if (!praisedName && !praisedId) continue;

    const sid = resolvePraisedStaffId(byId, byNameKey, praisedId, praisedName);
    if (!sid) continue;

    const fromNm = soreineFromRespondentName(row) || "（不明）";
    const fromDept = respondentDepartmentFromName(fromNm, staff);
    bumpDept(agg, sid, fromDept);
  }

  const staffRows = staff
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
        usesPoints: false,
        byDept,
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "ja"));

  return {
    year,
    month,
    usesPoints: false,
    staff: staffRows,
  };
}
