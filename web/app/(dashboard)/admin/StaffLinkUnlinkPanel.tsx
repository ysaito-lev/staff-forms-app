"use client";

import { useState } from "react";

export function StaffLinkUnlinkPanel() {
  const [staffId, setStaffId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    const sid = staffId.trim();
    if (!sid) {
      setErr("名簿に載っている氏名（またはスタッフ ID）を入力してください。");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/unlink-staff-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: sid }),
      });
      if (res.status === 403) {
        setErr("権限がありません。");
        return;
      }
      if (!res.ok) {
        setErr("解除に失敗しました。");
        return;
      }
      setMsg(`「${sid}」とログイン情報との紐づけを解除しました。`);
      setStaffId("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">
        ログインユーザーとの紐づけ解除
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-slate-600">
        ログインと名簿の氏名の対応が間違っている（別人のアカウントに本人の名前が付いているなど）ときにだけ使ってください。
      </p>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="unlink-staff-id" className="sr-only">
            名簿の氏名またはスタッフ ID
          </label>
          <input
            id="unlink-staff-id"
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            placeholder="名簿の氏名（例: 山田 太郎）"
            disabled={loading}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/25"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-900 hover:bg-red-100 disabled:opacity-60"
        >
          {loading ? "処理中…" : "紐づけを解除"}
        </button>
      </form>
      {msg && (
        <p className="mt-3 text-sm text-orange-800" role="status">
          {msg}
        </p>
      )}
      {err && (
        <p className="mt-3 text-sm text-red-800" role="alert">
          {err}
        </p>
      )}
    </section>
  );
}
