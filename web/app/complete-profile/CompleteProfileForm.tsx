"use client";

import { SITE_TITLE } from "@/lib/site-brand";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

export function CompleteProfileForm() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("氏名を入力してください。");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (res.status === 503) {
        setError(
          "職員紐づけ用データベースが未設定です。管理者に DYNAMODB_USER_STAFF_TABLE の設定を依頼してください。"
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
          "このログイン情報は既に別の職員として登録済みです。変更が必要な場合は管理者に連絡してください。"
        );
        return;
      }
      if (!res.ok) {
        setError("登録に失敗しました。しばらくしてから再度お試しください。");
        return;
      }
      await update();
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 md:py-14">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-md sm:p-9">
            <h1 className="text-balance text-center text-2xl font-bold text-slate-900">
              職員登録
            </h1>
            <p className="mt-4 text-center text-[15px] leading-relaxed text-slate-600">
              初回のみ、在籍マスタと同じ<strong>氏名（漢字フルネーム）</strong>
              を入力してください。
            </p>
            {session?.user?.email && (
              <p className="mt-2 break-all text-center text-xs text-slate-500">
                ログイン中: {session.user.email}
              </p>
            )}

            {error && (
              <div
                className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm leading-relaxed text-red-900"
                role="alert"
              >
                {error}
              </div>
            )}

            <form onSubmit={submit} className="mt-8 space-y-4">
              <div>
                <label
                  htmlFor="displayName"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  氏名（漢字）
                </label>
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                  placeholder="例: 山田 太郎"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-lg bg-orange-600 px-3 py-3 text-sm font-medium text-white transition hover:bg-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:opacity-60"
              >
                {loading ? "登録中…" : "登録して次へ"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="mt-6 w-full text-center text-sm text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
            >
              別のアカウントでログインし直す
            </button>
          </div>
        </div>
      </main>
      <footer className="py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} {SITE_TITLE}
      </footer>
    </div>
  );
}
