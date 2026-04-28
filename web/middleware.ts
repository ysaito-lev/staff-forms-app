import { authConfig } from "@/auth.config";
import NextAuth from "next-auth";
import { NextResponse } from "next/server";

/** Middleware は `auth.ts`（マスタ照会）を import せず、Edge 向けの基底設定のみ使う */
const { auth: middlewareAuth } = NextAuth(authConfig);

export default middlewareAuth((req) => {
  const path = req.nextUrl.pathname;
  /** API は各ルートで 401 を返す（fetch が HTML ログインへリダイレクトされないようにする） */
  if (path.startsWith("/api") && !path.startsWith("/api/auth")) {
    return NextResponse.next();
  }
  if (path === "/login" || path.startsWith("/api/auth")) {
    if (path === "/login") {
      /** `auth-signin-debug` を `?reason=` に付け替え（AUTH_SIGNIN_DEBUG 時の拒否理由表示用） */
      const debugReason = req.cookies.get("auth-signin-debug")?.value;
      if (debugReason && !req.nextUrl.searchParams.has("reason")) {
        const u = req.nextUrl.clone();
        u.searchParams.set("reason", debugReason);
        const res = NextResponse.redirect(u);
        res.cookies.delete("auth-signin-debug");
        return res;
      }
      if (req.auth) {
        return NextResponse.redirect(new URL("/", req.nextUrl.origin));
      }
    }
    return NextResponse.next();
  }
  if (!req.auth) {
    const login = new URL("/login", req.nextUrl.origin);
    if (path !== "/") {
      login.searchParams.set("callbackUrl", path);
    }
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
