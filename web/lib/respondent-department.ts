import { nameKeyForMatch } from "@/lib/person-name-match";
import { mainDepartment } from "@/lib/staff-types";
import type { Staff } from "@/lib/staff-types";

/** 回答者氏名からマスタを参照しメイン部署を返す（不一致時は「（不明）」） */
export function respondentDepartmentFromName(
  fromName: string,
  staffList: Staff[]
): string {
  const k = nameKeyForMatch(fromName.trim());
  if (!k) return "（不明）";
  for (const s of staffList) {
    if (nameKeyForMatch(s.name) === k) {
      return mainDepartment(s.department);
    }
  }
  return "（不明）";
}
