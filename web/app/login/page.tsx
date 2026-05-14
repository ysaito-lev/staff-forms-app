"use client";

import {
  AuthBrandTitle,
  AuthCard,
  AuthScreenChrome,
} from "@/app/components/auth/AuthScreenChrome";
import { LoadingWithMark } from "@/app/components/LoadingWithMark";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense, useState } from "react";

const ERROR_MAP: Record<string, string> = {
  Configuration:
    "認証の設定に問題があります。管理者へお問い合わせください。",
  CredentialsSignin:
    "メールアドレスまたはパスワードが正しくありません。",
  Default:
    "ログインに失敗しました。しばらくしてから再度お試しください。",
};

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const error = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(
    error ? ERROR_MAP[error] ?? ERROR_MAP.Default : null
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const em = email.trim();
    if (!em || !password) {
      setFormError("メールアドレスとパスワードを入力してください。");
      return;
    }
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email: em.toLowerCase(),
        password,
        redirect: false,
        callbackUrl,
      });
      if (res?.error) {
        setFormError(ERROR_MAP.CredentialsSignin);
        return;
      }
      if (res?.url) {
        window.location.href = res.url;
      } else {
        window.location.assign(callbackUrl);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenChrome>
      <AuthCard>
        <AuthBrandTitle />
        <h1 className="mt-5 text-center text-2xl font-bold tracking-tight text-slate-900">
          ログイン
        </h1>
        <p className="mt-2 text-center text-sm leading-relaxed text-slate-600">
          アカウントにログインしてサービスを利用してください。
          <span className="mt-1 block text-xs text-slate-500">
            初めてご利用の方は、アカウント作成で在籍マスタと同じ氏名を登録します。
          </span>
        </p>

        {formError && (
          <div
            className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm leading-relaxed text-red-900"
            role="alert"
          >
            {formError}
          </div>
        )}

        <form onSubmit={submit} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="login-email"
              className="mb-1.5 block text-sm font-semibold text-slate-900"
            >
              メールアドレス
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 shadow-inner ring-offset-white focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/25">
              <Mail
                className="h-[18px] w-[18px] shrink-0 text-slate-400"
                aria-hidden
              />
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="min-w-0 flex-1 border-0 bg-transparent py-1.5 text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-1.5 block text-sm font-semibold text-slate-900"
            >
              パスワード
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 shadow-inner ring-offset-white focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/25">
              <Lock
                className="h-[18px] w-[18px] shrink-0 text-slate-400"
                aria-hidden
              />
              <input
                id="login-password"
                name="password"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="min-w-0 flex-1 border-0 bg-transparent py-1.5 text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
              />
              <button
                type="button"
                aria-label={
                  showPw ? "パスワードを隠す" : "パスワードを表示"
                }
                onClick={() => setShowPw((v) => !v)}
                disabled={loading}
                className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700"
              >
                {showPw ? (
                  <EyeOff className="h-[18px] w-[18px]" aria-hidden />
                ) : (
                  <Eye className="h-[18px] w-[18px]" aria-hidden />
                )}
              </button>
            </div>
            <p className="mt-2 text-right text-xs text-slate-500">
              パスワードを忘れた方は、管理者へ再発行を依頼してください。
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-lg bg-orange-600 px-3 py-3 text-sm font-semibold text-white transition hover:bg-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {loading ? "ログイン処理中…" : "ログイン"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm leading-relaxed text-slate-600">
          アカウントをお持ちでない方は{" "}
          <Link
            href="/register"
            className="font-semibold text-orange-700 underline-offset-4 hover:text-orange-800 hover:underline"
          >
            アカウント作成
          </Link>
        </p>
      </AuthCard>
    </AuthScreenChrome>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthScreenChrome>
          <AuthCard>
            <div aria-label="ログイン画面を読み込み中">
              <LoadingWithMark
                size="sm"
                className="py-10"
                title="画面を準備しています…"
                description="環境によっては数十秒ほどかかることがあります。"
              />
            </div>
          </AuthCard>
        </AuthScreenChrome>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
