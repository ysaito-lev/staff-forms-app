"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDateTimeForDisplay } from "@/lib/date-utils";
import { MVBE_BLOCKS } from "@/lib/form-copy";
import type {
  MvbeReceivedRow,
  MvbeResponseRow,
  SoreineReceivedRow,
  SoreineResponseRow,
} from "@/lib/my-responses-data";

type Tab = "all" | "soreine" | "mvbe";
type ViewMode = "sent" | "received";

export default function MyAnswersPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [soreine, setSoreine] = useState<SoreineResponseRow[]>([]);
  const [mvbe, setMvbe] = useState<MvbeResponseRow[]>([]);
  const [receivedSoreine, setReceivedSoreine] = useState<SoreineReceivedRow[]>([]);
  const [receivedMvbe, setReceivedMvbe] = useState<MvbeReceivedRow[]>([]);
  const [view, setView] = useState<ViewMode>("sent");
  const [tab, setTab] = useState<Tab>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/my-responses");
      const data = (await res.json()) as {
        error?: string;
        soreine?: SoreineResponseRow[];
        mvbe?: MvbeResponseRow[];
        receivedSoreine?: SoreineReceivedRow[];
        receivedMvbe?: MvbeReceivedRow[];
      };
      if (!res.ok) {
        setError(data.error ?? "取得に失敗しました。");
        return;
      }
      setSoreine(data.soreine ?? []);
      setMvbe(data.mvbe ?? []);
      setReceivedSoreine(data.receivedSoreine ?? []);
      setReceivedMvbe(data.receivedMvbe ?? []);
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const inRange = useCallback((iso: string) => {
    if (!from && !to) return true;
    const d = new Date(iso);
    if (from) {
      const a = new Date(from);
      a.setHours(0, 0, 0, 0);
      if (d < a) return false;
    }
    if (to) {
      const b = new Date(to);
      b.setHours(23, 59, 59, 999);
      if (d > b) return false;
    }
    return true;
  }, [from, to]);

  const soreineF = useMemo(
    () => soreine.filter((r) => (tab === "mvbe" ? false : inRange(r.submittedAt))),
    [soreine, tab, inRange]
  );
  const mvbeF = useMemo(
    () => mvbe.filter((r) => (tab === "soreine" ? false : inRange(r.submittedAt))),
    [mvbe, tab, inRange]
  );
  const receivedSoreineF = useMemo(
    () =>
      receivedSoreine.filter((r) => (tab === "mvbe" ? false : inRange(r.submittedAt))),
    [receivedSoreine, tab, inRange]
  );
  const receivedMvbeF = useMemo(
    () =>
      receivedMvbe.filter((r) => (tab === "soreine" ? false : inRange(r.submittedAt))),
    [receivedMvbe, tab, inRange]
  );

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-xl font-bold text-slate-900">マイ回答・履歴</h1>
        <p className="mt-2 text-sm text-slate-600">
          {view === "sent"
            ? "あなたが回答者として送信した内容。"
            : "他の回答者があなたに向けて送った賞賛のコメント。"}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setView("sent")}
            className={
              view === "sent"
                ? "rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white"
                : "rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            }
          >
            送った回答
          </button>
          <button
            type="button"
            onClick={() => setView("received")}
            className={
              view === "received"
                ? "rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white"
                : "rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            }
          >
            届いたコメント
          </button>
        </div>

        <div className="mt-6 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <label className="block text-xs font-medium text-slate-500">フォーム</label>
            <select
              value={tab}
              onChange={(e) => setTab(e.target.value as Tab)}
              className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="all">すべて</option>
              <option value="soreine">ソレイイネ!! のみ</option>
              <option value="mvbe">MVBe のみ</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">期間（開始）</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">期間（終了）</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            期間クリア
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <p className="mt-8 text-center text-slate-500">読み込み中…</p>
        ) : view === "sent" ? (
          <div className="mt-8 space-y-8">
            {tab !== "mvbe" && (
              <section>
                <h2 className="text-sm font-semibold text-slate-800">ソレイイネ!!</h2>
                {soreineF.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">該当する回答がありません。</p>
                ) : (
                  <ul className="mt-3 space-y-4">
                    {soreineF.map((r, i) => (
                      <li
                        key={`${r.submittedAt}-${i}`}
                        className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm"
                      >
                        <p className="text-xs text-slate-500">
                          {formatDateTimeForDisplay(r.submittedAt)}
                        </p>
                        <p className="mt-2">
                          <span className="text-slate-500">賞賛した人：</span>
                          <span className="font-medium">{r.praisedName}</span>
                        </p>
                        <p className="mt-1">
                          <span className="text-slate-500">Value：</span>
                          {r.value}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-slate-800">
                          <span className="text-slate-500">内容：</span>
                          {r.detail}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {tab !== "soreine" && (
              <section>
                <h2 className="text-sm font-semibold text-slate-800">MVBe</h2>
                {mvbeF.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">該当する回答がありません。</p>
                ) : (
                  <ul className="mt-3 space-y-6">
                    {mvbeF.map((r, i) => (
                      <li
                        key={`${r.submittedAt}-${i}`}
                        className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm"
                      >
                        <p className="text-xs text-slate-500">
                          {formatDateTimeForDisplay(r.submittedAt)}
                        </p>
                        <div className="mt-3 space-y-3">
                          {MVBE_BLOCKS.map((b) => {
                            const bl = r.blocks[b.key];
                            if (!bl) return null;
                            return (
                              <div key={b.key} className="border-l-2 border-teal-200 pl-3">
                                <p className="font-medium text-slate-800">{b.heading}</p>
                                <p className="mt-1">
                                  選んだ人：<span className="font-medium">{bl.staffName}</span>
                                </p>
                                <p className="mt-1 whitespace-pre-wrap text-slate-800">
                                  理由（全文）：{bl.reason}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {tab !== "mvbe" && (
              <section>
                <h2 className="text-sm font-semibold text-slate-800">ソレイイネ!!</h2>
                {receivedSoreineF.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">該当するコメントがありません。</p>
                ) : (
                  <ul className="mt-3 space-y-4">
                    {receivedSoreineF.map((r, i) => (
                      <li
                        key={`${r.submittedAt}-${i}`}
                        className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm"
                      >
                        <p className="text-xs text-slate-500">
                          {formatDateTimeForDisplay(r.submittedAt)}
                        </p>
                        <p className="mt-2">
                          <span className="text-slate-500">回答者：</span>
                          <span className="font-medium">{r.fromRespondentName}</span>
                        </p>
                        <p className="mt-1">
                          <span className="text-slate-500">Value：</span>
                          {r.value}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-slate-800">
                          <span className="text-slate-500">内容：</span>
                          {r.comment}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {tab !== "soreine" && (
              <section>
                <h2 className="text-sm font-semibold text-slate-800">MVBe</h2>
                {receivedMvbeF.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">該当するコメントがありません。</p>
                ) : (
                  <ul className="mt-3 space-y-4">
                    {receivedMvbeF.map((r, i) => (
                      <li
                        key={`${r.submittedAt}-${i}-${r.blockKey}`}
                        className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm"
                      >
                        <p className="text-xs text-slate-500">
                          {formatDateTimeForDisplay(r.submittedAt)}
                        </p>
                        <p className="mt-2">
                          <span className="text-slate-500">回答者：</span>
                          <span className="font-medium">{r.fromRespondentName}</span>
                        </p>
                        <p className="mt-1">
                          <span className="text-slate-500">ブロック：</span>
                          {r.blockHeading}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-slate-800">
                          <span className="text-slate-500">理由：</span>
                          {r.reason}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
