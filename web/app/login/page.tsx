"use client";

import { SITE_TITLE } from "@/lib/site-brand";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";

const ERROR_MAP: Record<string, string> = {
  AccessDenied:
    "ログインできませんでした。職場の Google アカウントであること、マスタの氏名と Google プロフィールの名前が一致していることをご確認ください。",
  Configuration:
    "認証の設定に問題があります。管理者に AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET / AUTH_GOOGLE_ALLOWED_HOSTED_DOMAINS をご確認ください。",
  Default:
    "ログインに失敗しました。しばらくしてから再度お試しください。",
};

/** `AUTH_SIGNIN_DEBUG=1` 時に `/login?reason=…` で表示（本番の切り分け用） */
const SIGNIN_DENY_REASON_MAP: Record<string, string> = {
  not_google: "Google 以外のプロバイダー、またはプロフィールが取得できませんでした。",
  email_unverified:
    "メールアドレスが未確認のためログインできません。Google アカウント側でメール確認を済ませてください。",
  allowed_domains_missing:
    "サーバー設定に職場ドメイン（AUTH_GOOGLE_ALLOWED_HOSTED_DOMAINS）がありません。管理者に連絡してください。",
  domain_not_allowed:
    "この Google アカウントのドメインではログインできません（許可リストと異なります）。",
  no_staff_match:
    "マスタの氏名（またはスタッフID）と、Google に表示されている名前が突合できませんでした。スプレッドシート当月シート・同一表示名が複数行ないかご確認ください。",
};

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const error = searchParams.get("error");
  const reason = searchParams.get("reason");
  const denyHint =
    reason &&
    (SIGNIN_DENY_REASON_MAP[reason] ??
      `（デバッグ）拒否コード: ${reason}`);
  const [loading, setLoading] = useState(false);

  const openGoogle = async () => {
    setLoading(true);
    try {
      await signIn("google", { callbackUrl, redirect: true });
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 md:py-14">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-slate-200 border-l-[3px] border-l-teal-500 bg-white p-8 shadow-md sm:p-9">
            <div className="text-center">
              <h1 className="text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-[2.25rem] md:leading-tight">
                {SITE_TITLE}
              </h1>
              <p className="mt-6 text-[15px] leading-relaxed text-slate-600">
                職場の Google アカウントでサインインしてください。
              </p>
            </div>

            {(denyHint || error) && (
              <div
                className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm leading-relaxed text-red-900"
                role="alert"
              >
                {denyHint ??
                  (ERROR_MAP[error!] ?? ERROR_MAP.Default)}
              </div>
            )}

            <button
              type="button"
              onClick={openGoogle}
              disabled={loading}
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-800 transition hover:border-teal-500 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-60"
            >
              {loading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-teal-600"
                    aria-hidden
                  />
                  リダイレクト中…
                </span>
              ) : (
                <>
                  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google でログイン
                </>
              )}
            </button>

            <p className="mt-6 text-center text-xs leading-relaxed text-slate-500">
              ログインすると、アンケート回答・自分の履歴・回答状況などへアクセスできます。
            </p>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} {SITE_TITLE}
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col bg-slate-100">
          <main
            className="flex flex-1 flex-col items-center justify-center gap-3 px-4"
            aria-busy="true"
            aria-label="ログイン画面を読み込み中"
          >
            <span
              className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-teal-600"
              aria-hidden
            />
            <p className="text-sm text-teal-800">読み込み中…</p>
          </main>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
