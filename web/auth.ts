import NextAuth from "next-auth";
import { cookies } from "next/headers";
import { authConfig } from "@/auth.config";
import { isDisplayNameAdmin, parseAdminNamesFromEnv } from "@/lib/admin-env";
import {
  buildGoogleDisplayName,
  isEmailVerifiedForLogin,
  isGoogleAccountAllowed,
  parseGoogleAllowedHostedDomains,
  type GoogleOAuthProfile,
} from "@/lib/google-oauth-allow";

/** ビルド時に env が埋め込まれないよう、キーは文字列リテラルで固定しない参照に寄せる */
function envTruthy(key: "AUTH_SIGNIN_DEBUG" | "AUTH_SIGNIN_SKIP_STAFF_MATCH"): boolean {
  const v = process.env[key];
  return v === "1" || v?.toLowerCase() === "true";
}

function signInDebug(message: string, detail?: Record<string, string>) {
  if (!envTruthy("AUTH_SIGNIN_DEBUG")) return;
  console.warn(
    `[auth signIn denied] ${message}`,
    detail ? JSON.stringify(detail) : ""
  );
}

/**
 * signIn で文字列 URL を返す方法は OAuth コールバックでは無視されることがある（AccessDenied のまま）。
 * 代わりに短命 Cookie を付け、`pages.error=/login` と middleware で `?reason=` を付与する。
 */
async function denySignIn(
  reasonCode: string,
  detail?: Record<string, string>
): Promise<false> {
  signInDebug(reasonCode, detail);
  if (envTruthy("AUTH_SIGNIN_DEBUG")) {
    try {
      const jar = await cookies();
      jar.set("auth-signin-debug", reasonCode, {
        path: "/",
        maxAge: 120,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    } catch {
      // build や非リクエスト文脈では cookies() が使えない
    }
  }
  return false;
}

/**
 * `/api/auth` と Server Components が使う設定（マスタ照会など Node 側コールバックを含む）。
 * Middleware は `auth.config` のみを参照すること。
 *
 * 拒否理由の切り分け: `AUTH_SIGNIN_DEBUG=1` のとき `console.warn` に加え、
 * マスタ氏名のみ切り分け: `AUTH_SIGNIN_SKIP_STAFF_MATCH=1` で signIn の突合のみスキップ（原因が分かったら必ず外す）。
 */

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google" || !profile) {
        return await denySignIn("not_google");
      }
      const p = profile as GoogleOAuthProfile;
      if (!isEmailVerifiedForLogin(p)) {
        return await denySignIn("email_unverified", {
          email: p.email ? "(set)" : "(empty)",
        });
      }
      const allowed = parseGoogleAllowedHostedDomains();
      if (allowed.length === 0) {
        console.error(
          "AUTH_GOOGLE_ALLOWED_HOSTED_DOMAINS が未設定です。職場ドメインをカンマ区切りで設定してください。"
        );
        return await denySignIn("allowed_domains_missing");
      }
      if (!isGoogleAccountAllowed(p, allowed)) {
        return await denySignIn("domain_not_allowed", {
          hd: p.hd ?? "",
          emailDomain: p.email?.split("@")[1] ?? "",
          allowedList: allowed.join(","),
        });
      }

      /** 切り分け専用: マスタ照合で弾くかだけを試す。このまま運用しないこと。 */
      if (envTruthy("AUTH_SIGNIN_SKIP_STAFF_MATCH")) {
        console.warn(
          "[auth] AUTH_SIGNIN_SKIP_STAFF_MATCH: signIn のマスタ氏名突合のみスキップ中。確認後、この環境変数を削除してください。"
        );
        signInDebug("skipped_staff_match_by_env");
        return true;
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
        return await denySignIn("no_staff_match", {
          displayName: buildGoogleDisplayName(p),
        });
      }
      return true;
    },
    async jwt({ token, user, account, profile }) {
      const isGoogleOAuth =
        account?.provider === "google" ||
        (typeof token.email === "string" && token.email.trim().length > 0);
      if (!isGoogleOAuth || typeof token.email !== "string" || !token.email.trim()) {
        return token;
      }

      /** マスタ環境変更・氏名ゆれへの追従、および初回のみ user が付く問題の是正 */
      const {
        resolveStaffIdFromGoogleProfile,
        googleProfileFromTokenFields,
      } = await import("@/lib/google-staff-resolve");

      if (user && account?.provider === "google" && profile) {
        const p = profile as GoogleOAuthProfile;
        token.hd = p.hd ?? undefined;
        token.given_name = p.given_name ?? undefined;
        token.family_name = p.family_name ?? undefined;
      }

      let oauthProfile: GoogleOAuthProfile | null =
        profile && typeof profile === "object" && account?.provider === "google"
          ? (profile as GoogleOAuthProfile)
          : googleProfileFromTokenFields(token);
      if (!oauthProfile) {
        oauthProfile = googleProfileFromTokenFields(token);
      }
      if (!oauthProfile) {
        return token;
      }

      const prev = (token.staffId as string) ?? "";
      try {
        token.staffId =
          (await resolveStaffIdFromGoogleProfile(oauthProfile)) ?? "";
      } catch {
        token.staffId = prev || "";
      }
      token.isAdmin = false;
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
