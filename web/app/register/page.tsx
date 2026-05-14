"use client";

import {
  AuthBrandTitle,
  AuthCard,
  AuthScreenChrome,
} from "@/app/components/auth/AuthScreenChrome";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedName = displayName.trim();
    const em = email.trim().toLowerCase();
    if (!trimmedName || !em || !password) {
      setError("氏名・メール・パスワードを入力してください。");
      return;
    }
    if (password.length < 6) {
      setError("パスワードは 6 文字以上にしてください。");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register-credential", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: trimmedName,
          email: em,
          password,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 503) {
        setError(
          "職員紐づけ用データベースが未設定です。管理者に設定を依頼してください。"
        );
        return;
      }
      if (res.status === 400 && data.error === "no_staff_match") {
        setError(
          "在籍マスタに一致する氏名がありません。職員名簿と同じ表記（漢字フルネーム）かご確認ください。"
        );
        return;
      }
      if (res.status === 409 && data.error === "staff_already_linked") {
        setError(
          "この職員は既に別のアカウントと紐づいています。お手数ですが管理者に連絡してください。"
        );
        return;
      }
      if (res.status === 409 && data.error === "user_already_linked_staff") {
        setError(
          "このメールアドレスは既に別の職員として登録されています。"
        );
        return;
      }
      if (!res.ok) {
        setError(
          data.error?.trim() ||
            "登録に失敗しました。しばらくしてから再度お試しください。"
        );
        return;
      }

      const sign = await signIn("credentials", {
        email: em,
        password,
        redirect: false,
      });
      if (sign?.error) {
        setError(
          "アカウントは作成できましたが、自動ログインに失敗しました。ログイン画面からお試しください。"
        );
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenChrome>
      <AuthCard>
        <AuthBrandTitle />
        <h1 className="mt-5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          アカウント作成
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          在籍マスタと同じ氏名・メールで登録すると、自動的にあなたの職員IDと結びつきます。
        </p>

        {error && (
          <div
            className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm leading-relaxed text-red-900"
            role="alert"
          >
            {error}
          </div>
        )}

        <form onSubmit={submit} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="register-name"
              className="mb-1.5 block text-sm font-semibold text-slate-900"
            >
              名前（本名・フルネーム）
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 shadow-inner ring-offset-white focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/25">
              <User
                className="h-[18px] w-[18px] shrink-0 text-slate-400"
                aria-hidden
              />
              <input
                id="register-name"
                name="displayName"
                type="text"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loading}
                className="min-w-0 flex-1 border-0 bg-transparent py-1.5 text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
                placeholder="例：山田 太郎"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="register-email"
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
                id="register-email"
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
              htmlFor="register-password"
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
                id="register-password"
                name="password"
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="min-w-0 flex-1 border-0 bg-transparent py-1.5 text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
                placeholder="6文字以上"
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
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-lg bg-orange-600 px-3 py-3 text-sm font-semibold text-white transition hover:bg-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {loading ? "登録処理中…" : "アカウントを作成"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm leading-relaxed text-slate-600">
          すでにアカウントをお持ちの方は{" "}
          <Link
            href="/login"
            className="font-semibold text-orange-700 underline-offset-4 hover:text-orange-800 hover:underline"
          >
            ログイン
          </Link>
        </p>
      </AuthCard>
    </AuthScreenChrome>
  );
}
