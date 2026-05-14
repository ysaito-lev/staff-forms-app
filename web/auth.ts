import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { isDisplayNameAdmin, parseAdminNamesFromEnv } from "@/lib/admin-env";
import { getStaffIdByGoogleSub } from "@/lib/user-staff-link";

export const { handlers, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "メールアドレス", type: "email" },
        password: { label: "パスワード", type: "password" },
      },
      authorize: async (credentials) => {
        const { authorizeCredentialUser } = await import(
          "@/lib/credential-authorize"
        );
        return authorizeCredentialUser(
          credentials as Partial<
            Record<"email" | "password", unknown>
          >
        );
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        if (typeof user.email === "string" && user.email.trim()) {
          token.email = user.email.trim();
        }
        if (typeof user.name === "string" && user.name.trim()) {
          token.name = user.name.trim();
        }
        if (typeof user.image === "string" && user.image.trim()) {
          token.picture = user.image.trim();
        }
      }

      if (account?.provider === "credentials" && user) {
        const u = user as { googleSub?: string; staffId?: string };
        const sid =
          typeof u.staffId === "string" && u.staffId.trim()
            ? u.staffId.trim()
            : "";
        const gs =
          typeof u.googleSub === "string" && u.googleSub.trim()
            ? u.googleSub.trim()
            : "";
        token.googleSub = gs;
        token.staffId = sid;
        return token;
      }

      /** セッション更新時: Dynamo 側の変更を反映できるよう staffId を再取得 */
      const sub =
        typeof token.googleSub === "string" && token.googleSub.trim()
          ? token.googleSub.trim()
          : "";
      if (sub) {
        token.googleSub = sub;
        try {
          const fromDb = await getStaffIdByGoogleSub(sub);
          if (fromDb?.trim()) {
            token.staffId = fromDb.trim();
          }
        } catch {
          token.staffId = (token.staffId as string) ?? "";
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.staffId = (token.staffId as string) ?? "";
        session.user.googleSub =
          typeof token.googleSub === "string" ? token.googleSub : "";
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
            // マスタ取得失敗時は登録時の表示名のまま
          }
        }
        session.user.isAdmin = isDisplayNameAdmin(displayName, adminNames);
      }
      return session;
    },
  },
});
