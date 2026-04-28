import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { isDisplayNameAdmin, parseAdminNamesFromEnv } from "@/lib/admin-env";
import {
  isEmailVerifiedForLogin,
  isGoogleAccountAllowed,
  parseGoogleAllowedHostedDomains,
  type GoogleOAuthProfile,
} from "@/lib/google-oauth-allow";

/**
 * `/api/auth` と Server Components が使う設定（マスタ照会など Node 側コールバックを含む）。
 * Middleware は `auth.config` のみを参照すること。
 */

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google" || !profile) return false;
      const p = profile as GoogleOAuthProfile;
      if (!isEmailVerifiedForLogin(p)) return false;
      const allowed = parseGoogleAllowedHostedDomains();
      if (allowed.length === 0) {
        console.error(
          "AUTH_GOOGLE_ALLOWED_HOSTED_DOMAINS が未設定です。職場ドメインをカンマ区切りで設定してください。"
        );
        return false;
      }
      if (!isGoogleAccountAllowed(p, allowed)) return false;
      const { resolveStaffIdFromGoogleProfile } = await import(
        "@/lib/google-staff-resolve"
      );
      const staffId = await resolveStaffIdFromGoogleProfile(p);
      if (!staffId) return false;
      return true;
    },
    async jwt({ token, user, account, profile }) {
      if (user && account?.provider === "google" && profile) {
        const p = profile as GoogleOAuthProfile;
        const { resolveStaffIdFromGoogleProfile } = await import(
          "@/lib/google-staff-resolve"
        );
        token.staffId = (await resolveStaffIdFromGoogleProfile(p)) ?? "";
        /** 管理者は session コールバックで `ADMIN_NAMES` とマスタ氏名を照合して決定 */
        token.isAdmin = false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.staffId = (token.staffId as string) ?? "";
        const adminNames = parseAdminNamesFromEnv(process.env.ADMIN_NAMES);
        let displayName = session.user.name ?? "";
        const sid = session.user.staffId;
        if (sid) {
          try {
            const { getActiveStaff, getStaffByIdMap } = await import(
              "@/lib/master"
            );
            const staff = await getActiveStaff();
            const fromMaster = getStaffByIdMap(staff).get(sid);
            if (fromMaster?.name) {
              session.user.name = fromMaster.name;
              displayName = fromMaster.name;
            }
          } catch {
            // マスタ取得失敗時は Google からの name のまま
          }
        }
        session.user.isAdmin = isDisplayNameAdmin(displayName, adminNames);
      }
      return session;
    },
  },
});
