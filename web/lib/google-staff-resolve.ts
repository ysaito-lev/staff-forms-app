import type { GoogleOAuthProfile } from "@/lib/google-oauth-allow";
import { buildGoogleDisplayName } from "@/lib/google-oauth-allow";
import { getActiveStaff } from "@/lib/master";
import { findStaffByFlexibleNameMatch } from "@/lib/staff-match";

/**
 * マスタ照合。Node ルート専用（middleware の Edge バンドルに含めないこと）。
 */
export async function resolveStaffIdFromGoogleProfile(
  p: GoogleOAuthProfile
): Promise<string | null> {
  const displayName = buildGoogleDisplayName(p);
  if (!displayName) return null;
  const staff = await getActiveStaff();
  return findStaffByFlexibleNameMatch(staff, displayName)?.id ?? null;
}
