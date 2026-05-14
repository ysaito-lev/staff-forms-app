import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      staffId: string;
      isAdmin: boolean;
      /** 認証プロバイダの固定 ID（資格情報ログイン時は `cred:email` 形式）。 */
      googleSub: string;
    };
  }

  interface User {
    staffId?: string;
    isAdmin?: boolean;
    googleSub?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    staffId?: string;
    isAdmin?: boolean;
    /** 認証の subject に相当する固定 ID（資格情報は cred: メールなど） */
    googleSub?: string;
    /** 未使用（将来の互換や外部プロフィール用に残している） */
    hd?: string | null;
    given_name?: string | null;
    family_name?: string | null;
  }
}
