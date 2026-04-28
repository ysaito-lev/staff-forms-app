import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const path = req.nextUrl.pathname;
  /** API は各ルートで 401 を返す（fetch が HTML ログインへリダイレクトされないようにする） */
  if (path.startsWith("/api") && !path.startsWith("/api/auth")) {
    return NextResponse.next();
  }
  if (path === "/login" || path.startsWith("/api/auth")) {
    if (path === "/login" && req.auth) {
      return NextResponse.redirect(new URL("/", req.nextUrl.origin));
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
