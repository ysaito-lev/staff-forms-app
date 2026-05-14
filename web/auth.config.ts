import type { NextAuthConfig } from "next-auth";

/**
 * Middleware / Edge と API 側で共通の Auth.js 基底設定。
 * プロバイダー本体は Node 側の `auth.ts` でCredentials を追加している（authorize が Dynamo に触れるため）。
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
  /** エラー時もデフォルトの /api/auth/error ではなくログイン画面へ（?error= と併用） */
  pages: { signIn: "/login", error: "/login" },
  /** 実体は `auth.ts` の Credentials。middleware 用の最小設定では空配列では型が通らないためダミーを置く。 */
  providers: [],
} satisfies NextAuthConfig;
