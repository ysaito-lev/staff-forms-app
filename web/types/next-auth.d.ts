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
  }
}
