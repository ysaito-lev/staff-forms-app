import { nameKeyForMatch } from "@/lib/person-name-match";

/**
 * `ADMIN_NAMES`（カンマ区切り）を配列にする。前後空白は除去。
 */
export function parseAdminNamesFromEnv(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * 表示名が管理者一覧のいずれかと一致するか（姓・名の空白差は無視）。
 */
export function isDisplayNameAdmin(
  displayName: string | undefined | null,
  adminNames: string[]
): boolean {
  const d = (displayName ?? "").trim();
  if (!d || adminNames.length === 0) return false;
  const kd = nameKeyForMatch(d);
  if (!kd) return false;
  for (const a of adminNames) {
    if (nameKeyForMatch(a) === kd) return true;
  }
  return false;
}
