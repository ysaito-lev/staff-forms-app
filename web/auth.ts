import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { isDisplayNameAdmin, parseAdminNamesFromEnv } from "@/lib/admin-env";
import {
  buildGoogleDisplayName,
  isEmailVerifiedForLogin,
  isGoogleAccountAllowed,
  parseGoogleAllowedHostedDomains,
  type GoogleOAuthProfile,
} from "@/lib/google-oauth-allow";

function signInDebug(message: string, detail?: Record<string, string>) {
  if (process.env.AUTH_SIGNIN_DEBUG !== "1") return;
  console.warn(
    `[auth signIn denied] ${message}`,
    detail ? JSON.stringify(detail) : ""
  );
}

/** `AUTH_SIGNIN_DEBUG=1` のときは CloudWatch なしでもブラウザで理由を出せるよう `/login?reason=` へ飛ばす */
function denySignIn(
  reasonCode: string,
  detail?: Record<string, string>
): false | string {
  signInDebug(reasonCode, detail);
  if (process.env.AUTH_SIGNIN_DEBUG === "1") {
    return `/login?reason=${encodeURIComponent(reasonCode)}`;
  }
  return false;
}

/**
 * `/api/auth` と Server Components が使う設定（マスタ照会など Node 側コールバックを含む）。
 * Middleware は `auth.config` のみを参照すること。
 *
 * 拒否理由の切り分け: `AUTH_SIGNIN_DEBUG=1` のとき `console.warn` に加え、
 * `/login?reason=コード` へリダイレクトする（Amplify で CloudWatch が空でも画面で確認可）。
 */

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google" || !profile) {
        return denySignIn("not_google");
      }
      const p = profile as GoogleOAuthProfile;
      if (!isEmailVerifiedForLogin(p)) {
        return denySignIn("email_unverified", {
          email: p.email ? "(set)" : "(empty)",
        });
      }
      const allowed = parseGoogleAllowedHostedDomains();
      if (allowed.length === 0) {
        console.error(
          "AUTH_GOOGLE_ALLOWED_HOSTED_DOMAINS が未設定です。職場ドメインをカンマ区切りで設定してください。"
        );
        return denySignIn("allowed_domains_missing");
      }
      if (!isGoogleAccountAllowed(p, allowed)) {
        return denySignIn("domain_not_allowed", {
          hd: p.hd ?? "",
          emailDomain: p.email?.split("@")[1] ?? "",
          allowedList: allowed.join(","),
        });
      }
      const { resolveStaffIdFromGoogleProfile } = await import(
        "@/lib/google-staff-resolve"
      );
      let staffId: string | null = null;
      try {
        staffId = await resolveStaffIdFromGoogleProfile(p);
      } catch (e) {
        signInDebug("staff_resolve_threw", {
          error: e instanceof Error ? e.message : String(e),
        });
        throw e;
      }
      if (!staffId) {
        return denySignIn("no_staff_match", {
          displayName: buildGoogleDisplayName(p),
        });
      }
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
