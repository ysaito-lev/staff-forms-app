import type { GoogleOAuthProfile } from "@/lib/google-oauth-allow";
import { buildGoogleDisplayName } from "@/lib/google-oauth-allow";
import { findStaffByFlexibleNameMatch } from "@/lib/staff-match";

/**
 * マスタ照合。`middleware.ts` が読む `@/auth` 経由でグラフに含まれないように、`master`
 *（Google Sheets / googleapis）は動的 import のみとする。
 */
export async function resolveStaffIdFromGoogleProfile(
  p: GoogleOAuthProfile
): Promise<string | null> {
  const displayName = buildGoogleDisplayName(p);
  if (!displayName) return null;
  const { getActiveStaff } = await import("@/lib/master");
  const staff = await getActiveStaff();
  return findStaffByFlexibleNameMatch(staff, displayName)?.id ?? null;
}
