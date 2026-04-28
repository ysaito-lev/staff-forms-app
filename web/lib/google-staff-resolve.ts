import type { GoogleOAuthProfile } from "@/lib/google-oauth-allow";
import { buildGoogleDisplayName } from "@/lib/google-oauth-allow";
import { getActiveStaff } from "@/lib/master";
import { findStaffByFlexibleNameMatch } from "@/lib/staff-match";

/**
 * マスタ照合 Node 側で使用。（Middleware は `@/auth` を import しない）
 */
export async function resolveStaffIdFromGoogleProfile(
  p: GoogleOAuthProfile
): Promise<string | null> {
  const displayName = buildGoogleDisplayName(p);
  if (!displayName) return null;
  const staff = await getActiveStaff();
  return findStaffByFlexibleNameMatch(staff, displayName)?.id ?? null;
}
