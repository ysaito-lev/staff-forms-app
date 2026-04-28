import type { GoogleOAuthProfile } from "@/lib/google-oauth-allow";
import { buildGoogleDisplayName } from "@/lib/google-oauth-allow";
import { getActiveStaff } from "@/lib/master";
import { findStaffByFlexibleNameMatch } from "@/lib/staff-match";

/**
 * JWT が「初回のみ user/profile を持ち、以後は token」の場合に備えて同一突合入力を組む。
 */
export function googleProfileFromTokenFields(parts: {
  email?: unknown;
  name?: unknown;
  given_name?: unknown;
  family_name?: unknown;
  hd?: unknown;
}): GoogleOAuthProfile | null {
  const email =
    typeof parts.email === "string" ? parts.email.trim() : "";
  if (!email) return null;
  return {
    email,
    email_verified: true,
    name:
      typeof parts.name === "string" && parts.name.trim()
        ? parts.name.trim()
        : null,
    given_name:
      typeof parts.given_name === "string" && parts.given_name.trim()
        ? parts.given_name.trim()
        : null,
    family_name:
      typeof parts.family_name === "string" && parts.family_name.trim()
        ? parts.family_name.trim()
        : null,
    hd:
      typeof parts.hd === "string" && parts.hd.trim() ? parts.hd.trim() : null,
  };
}

/**
 * マスタ照合 Node 側で使用。（Middleware は `@/auth` を import しない）
 * メール列が無いときは姓名のみ、`matchEmail` が取れるときはそれを優先。
 */
export async function resolveStaffIdFromGoogleProfile(
  p: GoogleOAuthProfile
): Promise<string | null> {
  const staff = await getActiveStaff();
  const email = p.email?.trim().toLowerCase();
  if (email) {
    const hit = staff.find(
      (s) => (s.matchEmail ?? "").trim().toLowerCase() === email
    );
    if (hit) return hit.id;
  }
  const displayName = buildGoogleDisplayName(p);
  if (!displayName) return null;
  return findStaffByFlexibleNameMatch(staff, displayName)?.id ?? null;
}
