import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { isDisplayNameAdmin, parseAdminNamesFromEnv } from "@/lib/admin-env";
import {
  isEmailVerifiedForLogin,
  isGoogleAccountAllowed,
  parseGoogleAllowedHostedDomains,
  type GoogleOAuthProfile,
} from "@/lib/google-oauth-allow";

/**
 * JWT 暗号化用。本番では必ず `AUTH_SECRET`（または互換の `NEXTAUTH_SECRET`）を環境変数で設定すること。
 * 開発のみ未設定時に固定文字列で動作させる（チーム共有なら .env.local に同じ値を書くことを推奨）。
 */
function getAuthSecret(): string {
  const fromEnv = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }
  if (process.env.NODE_ENV === "development") {
    return "dev-only-auth-secret-not-for-production-change-with-env";
  }
  throw new Error(
    "AUTH_SECRET が未設定です。本番・プレビューでは Vercel の環境変数などに AUTH_SECRET を設定してください。"
  );
}

function googleClientId(): string {
  return process.env.AUTH_GOOGLE_ID?.trim() ?? "";
}

function googleClientSecret(): string {
  return process.env.AUTH_GOOGLE_SECRET?.trim() ?? "";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: getAuthSecret(),
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
  providers: [
    Google({
      clientId: googleClientId() || "missing-set-AUTH_GOOGLE_ID",
      clientSecret: googleClientSecret() || "missing-set-AUTH_GOOGLE_SECRET",
    }),
  ],
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
        const adminNames = parseAdminNamesFromEnv(
          process.env.ADMIN_NAMES
        );
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
