import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      staffId: string;
      isAdmin: boolean;
    };
  }

  interface User {
    staffId?: string;
    isAdmin?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    staffId?: string;
    isAdmin?: boolean;
    /** Google プロフィールからコピー（JWT の都度スタッフ突合用） */
    hd?: string | null;
    given_name?: string | null;
    family_name?: string | null;
  }
}
