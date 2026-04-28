import type { Staff } from "@/lib/staff-types";

/** 姓名のスペース（半角・全角・その他の空白）を除いた比較用キー */
export function normalizeStaffNameKey(s: string): string {
  return s.trim().replace(/\s+/gu, "");
}

/**
 * 入力氏名をマスタのスタッフに突合する。
 * 完全一致（id / 氏名）のあと、空白無視で id・氏名のいずれかと一致するものを探す。
 * 空白のみの差で複数ヒットした場合は null（曖昧）。
 */
export function findStaffByFlexibleNameMatch(
  staff: Staff[],
  input: string
): Staff | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const byExactId = staff.find((s) => s.id === trimmed);
  if (byExactId) return byExactId;

  const byExactName = staff.find((s) => s.name === trimmed);
  if (byExactName) return byExactName;

  const normInput = normalizeStaffNameKey(trimmed);
  if (!normInput) return null;

  const hits = staff.filter(
    (s) =>
      normalizeStaffNameKey(s.id) === normInput ||
      normalizeStaffNameKey(s.name) === normInput
  );

  if (hits.length === 1) return hits[0]!;
  return null;
}
