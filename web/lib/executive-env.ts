import { nameKeyForMatch } from "@/lib/person-name-match";

/**
 * `EXECUTIVE_STAFF_NAMES`（カンマ区切り）を照合用キーの Set にする。
 * 1件も無ければ null（マスタの幹部列・部署推定にフォールバック）。
 */
export function parseExecutiveNameKeys(
  raw: string | undefined
): Set<string> | null {
  if (!raw?.trim()) return null;
  const keys = new Set<string>();
  for (const part of raw.split(",")) {
    const t = part.trim();
    if (!t) continue;
    const k = nameKeyForMatch(t);
    if (k) keys.add(k);
  }
  return keys.size > 0 ? keys : null;
}

/** マスタの氏名が幹部リストに含まれるか（姓・名の空白差は無視） */
export function isExecutiveByNameList(
  staffName: string,
  keys: Set<string>
): boolean {
  const k = nameKeyForMatch(staffName);
  return Boolean(k && keys.has(k));
}
