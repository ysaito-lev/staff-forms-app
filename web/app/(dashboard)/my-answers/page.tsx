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
import Link from "next/link";
import { LoadingWithMark } from "@/app/components/LoadingWithMark";
import { STRENGTHS_REPORT_UI as UI } from "@/lib/strengths-report-ui";

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

  const mvbeReceivedByDept = useMemo(() => {
    const m = new Map<string, { entries: number; points: number }>();
    for (const r of receivedMvbeF) {
      const dep = r.fromDepartment?.trim() || "（不明）";
      const cur = m.get(dep) ?? { entries: 0, points: 0 };
      cur.entries += 1;
      cur.points += r.points;
      m.set(dep, cur);
    }
    return [...m.entries()].sort(
      (a, b) =>
        b[1].points - a[1].points ||
        b[1].entries - a[1].entries ||
        a[0].localeCompare(b[0], "ja")
    );
  }, [receivedMvbeF]);

  const mvbeReceivedUsesPoints = useMemo(
    () => receivedMvbeF.some((r) => r.points !== 1),
    [receivedMvbeF]
  );

  const soreineReceivedByDept = useMemo(() => {
    const m = new Map<string, { entries: number }>();
    for (const r of receivedSoreineF) {
      const dep = r.fromDepartment?.trim() || "（不明）";
      const cur = m.get(dep) ?? { entries: 0 };
      cur.entries += 1;
      m.set(dep, cur);
    }
    return [...m.entries()].sort(
      (a, b) =>
        b[1].entries - a[1].entries ||
        a[0].localeCompare(b[0], "ja")
    );
  }, [receivedSoreineF]);
  return (
    <div className="px-4 py-8">
      <div
        className="mx-auto max-w-4xl rounded-2xl p-6 shadow-[0_4px_28px_rgba(255,152,0,0.08)] ring-1 ring-orange-100/45 md:p-8"
        style={{ backgroundColor: UI.sectionCream }}
      >
        <h1 className="text-xl font-bold text-slate-900">マイ回答・履歴</h1>
        <p className="mt-2 text-sm text-slate-600">
          {view === "sent"
            ? "あなたが回答者として送信した内容。"
            : (
                <>
                  他の回答者があなたに向けて送った賞賛のコメント。MVBe とソレイイネ!! の届きでは、期間を絞ったうえで回答者の所属部署ごとの集計も表示されます（マスタ照会で推定）。
                  <span className="mt-1 block">
                    <Link href="/strengths-report" className="font-medium text-orange-700 hover:text-orange-900 hover:underline">
                      届いたコメント全体の AI 分析は「強みレポート」へ
                    </Link>
                  </span>
                </>
              )}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setView("sent")}
            className={
              view === "sent"
                ? "rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white"
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
                ? "rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white"
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
          <div className="mt-8">
            <LoadingWithMark
              title="読み込み中です…"
              description="マイ回答と履歴を読み込んでいます。"
            />
          </div>
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
                            const has =
                              (bl.staffName ?? "").trim() !== "" ||
                              (bl.reason ?? "").trim() !== "";
                            if (!has) return null;
                            return (
                              <div key={b.key} className="border-l-2 border-orange-200 pl-3">
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
                  <>
                    {soreineReceivedByDept.length > 0 && (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm">
                        <h3 className="font-semibold text-slate-800">
                          部署別の内訳（届いたソレイイネ!!）
                        </h3>
                        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                          {soreineReceivedByDept.map(([dep, agg]) => (
                            <li
                              key={dep}
                              className="flex justify-between gap-3 rounded-lg bg-white px-3 py-2 shadow-sm"
                            >
                              <span className="font-medium text-slate-800">{dep}</span>
                              <span className="tabular-nums text-slate-600">
                                {agg.entries} 件
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
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
                          <span className="ml-2 text-slate-500">／ 所属：</span>
                          <span className="font-medium">{r.fromDepartment}</span>
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
                  </>
                )}
              </section>
            )}

            {tab !== "soreine" && (
              <section>
                <h2 className="text-sm font-semibold text-slate-800">MVBe</h2>
                {receivedMvbeF.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">該当するコメントがありません。</p>
                ) : (
                  <>
                    {mvbeReceivedByDept.length > 0 && (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm">
                        <h3 className="font-semibold text-slate-800">部署別の内訳（届いたMVBe）</h3>
                        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                          {mvbeReceivedByDept.map(([dep, agg]) => (
                            <li
                              key={dep}
                              className="flex justify-between gap-3 rounded-lg bg-white px-3 py-2 shadow-sm"
                            >
                              <span className="font-medium text-slate-800">{dep}</span>
                              <span className="tabular-nums text-slate-600">
                                {mvbeReceivedUsesPoints ? (
                                  <>
                                    {agg.points.toLocaleString("ja-JP", {
                                      maximumFractionDigits: 1,
                                    })}
                                    pt
                                    <span className="ml-2 text-xs text-slate-400">
                                      （{agg.entries}件）
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    {agg.entries} 票
                                  </>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
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
                          <span className="ml-2 text-slate-500">／ 所属：</span>
                          <span className="font-medium">{r.fromDepartment}</span>
                        </p>
                        <p className="mt-1">
                          <span className="text-slate-500">ブロック：</span>
                          {r.blockHeading}
                          {mvbeReceivedUsesPoints && (
                            <span className="ml-2 text-slate-500">
                              ／ 加重：
                              <span className="font-medium text-slate-800">
                                {r.points.toLocaleString("ja-JP", {
                                  maximumFractionDigits: 1,
                                })}
                                pt
                              </span>
                            </span>
                          )}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-slate-800">
                          <span className="text-slate-500">理由：</span>
                          {r.reason}
                        </p>
                      </li>
                    ))}
                  </ul>
                  </>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
