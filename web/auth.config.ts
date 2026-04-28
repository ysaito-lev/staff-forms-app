import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Middleware / Edge と API 側で共通の Auth.js 基底設定。
 * `googleapis` 等 Node 向け処理を含むコールバックは `auth.ts` で追記しないと
 * middleware の Edge バンドルへ引きずられる。
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
    "AUTH_SECRET が未設定です。本番では Amplify の環境変数に AUTH_SECRET（または NEXTAUTH_SECRET）を設定し、ビルド時に .env.production へ渡す（amplify.yml 参照）。"
  );
}

export const authConfig = {
  trustHost: true,
  secret: getAuthSecret(),
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
  providers: [
    Google({
      clientId:
        process.env.AUTH_GOOGLE_ID?.trim() ?? "missing-set-AUTH_GOOGLE_ID",
      clientSecret:
        process.env.AUTH_GOOGLE_SECRET?.trim() ?? "missing-set-AUTH_GOOGLE_SECRET",
    }),
  ],
} satisfies NextAuthConfig;
