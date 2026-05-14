"use client";

import { useState } from "react";
import { MVBE_TITLE, SOREINE_TITLE } from "@/lib/form-copy";
import {
  groupNonRespondersByDepartment,
} from "@/lib/non-responder-group";
import type { AdminStatsBundle, NonResponders } from "@/lib/admin-stats";
import { pctDelta } from "@/lib/pct-delta";
import type { MvbeDeptWeightResult } from "@/lib/mvbe-dept-weights";
import type { ReceivedByDeptMonthBundle } from "@/lib/received-by-dept-month-types";
import { MvbeReminderPanel } from "./MvbeReminderPanel";
import { StaffLinkUnlinkPanel } from "./StaffLinkUnlinkPanel";

const TABS = [
  { id: "overview" as const, label: "概要" },
  { id: "breakdown" as const, label: "詳細内訳" },
  { id: "followup" as const, label: "未回答・通知" },
  { id: "mvbeWeights" as const, label: "MVBe 係数" },
  { id: "receivedByDept" as const, label: "部署別・届き" },
  { id: "export" as const, label: "CSV 出力" },
  { id: "unlink" as const, label: "紐づけ解除" },
];

type TabId = (typeof TABS)[number]["id"];

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={
        "border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-600 " +
        className
      }
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={"border-b border-slate-100 px-3 py-2 text-sm " + className}>
      {children}
    </td>
  );
}

type Props = {
  year: number;
  month: number;
  stats: AdminStatsBundle | null;
  nonResp: NonResponders | null;
  mvbeDeptWeights: MvbeDeptWeightResult[];
  baseExport: string;
  mvbeReceivedByDeptMonth: ReceivedByDeptMonthBundle | null;
  soreineReceivedByDeptMonth: ReceivedByDeptMonthBundle | null;
};

function AggregateUnavailable() {
  return (
    <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      回答スプレッドシート（<code>GOOGLE_RESPONSES_SPREADSHEET_ID</code>{" "}
      等）が未設定のため、集計を表示できません。
    </p>
  );
}

function ReceivedByDeptTabPanel({
  year,
  month,
  mvbe,
  soreine,
}: {
  year: number;
  month: number;
  mvbe: ReceivedByDeptMonthBundle | null;
  soreine: ReceivedByDeptMonthBundle | null;
}) {
  const [whichForm, setWhichForm] = useState<"mvbe" | "soreine">("mvbe");

  if (!mvbe && !soreine) {
    return <AggregateUnavailable />;
  }

  const bundle = whichForm === "mvbe" ? mvbe : soreine;
  const usesPoints = bundle?.usesPoints ?? false;

  return (
    <div className="space-y-6" role="tabpanel">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">部署別・届き</h2>
        <p className="mt-1 text-sm text-slate-600">
          {year}年{month}月（JST・タイムスタンプがこの暦月に入る行のみ）。回答者の所属部署はマスタから推定します（MVBe
          のみポイント制の月は pt と件数を併記）。
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={
              whichForm === "mvbe"
                ? "rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white"
                : "rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            }
            onClick={() => setWhichForm("mvbe")}
          >
            {MVBE_TITLE}
          </button>
          <button
            type="button"
            className={
              whichForm === "soreine"
                ? "rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white"
                : "rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            }
            onClick={() => setWhichForm("soreine")}
          >
            {SOREINE_TITLE}
          </button>
        </div>

        {!bundle ? (
          <p className="mt-4 text-sm text-slate-500">このフォームのデータを読み込めません。</p>
        ) : (
          <div className="mt-6 max-h-[min(70vh,520px)] space-y-2 overflow-y-auto pr-1">
            {bundle.staff.map((s) => {
              const totalEntries = s.byDept.reduce((a, d) => a + d.entries, 0);
              const totalPts = s.byDept.reduce((a, d) => a + d.points, 0);
              return (
                <details
                  key={s.staffId}
                  className="rounded-lg border border-slate-200 bg-slate-50/50"
                >
                  <summary className="cursor-pointer list-none px-3 py-2.5 [&::-webkit-details-marker]:hidden">
                    <span className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium text-slate-900">
                        {s.displayName}
                        <span className="ml-2 text-xs font-normal text-slate-500">
                          {s.department}
                        </span>
                      </span>
                      <span className="tabular-nums text-sm text-slate-600">
                        {s.byDept.length === 0 ? (
                          <span className="text-slate-400">届きなし</span>
                        ) : usesPoints ? (
                          <>
                            {totalPts.toLocaleString("ja-JP", {
                              maximumFractionDigits: 1,
                            })}
                            pt
                            <span className="ml-2 text-xs text-slate-400">
                              （{totalEntries}件）
                            </span>
                          </>
                        ) : (
                          <>{totalEntries} 件</>
                        )}
                      </span>
                    </span>
                  </summary>
                  {s.byDept.length > 0 && (
                    <ul className="border-t border-slate-200 bg-white px-3 py-2 text-sm">
                      {s.byDept.map((d) => (
                        <li
                          key={d.department}
                          className="flex justify-between gap-3 py-1.5"
                        >
                          <span className="text-slate-800">{d.department}</span>
                          <span className="tabular-nums text-slate-600">
                            {usesPoints ? (
                              <>
                                {d.points.toLocaleString("ja-JP", {
                                  maximumFractionDigits: 1,
                                })}
                                pt
                                <span className="ml-2 text-xs text-slate-400">
                                  （{d.entries}件）
                                </span>
                              </>
                            ) : (
                              <>{d.entries} 件</>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </details>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export function AdminStatsPanels({
  year,
  month,
  stats,
  nonResp,
  mvbeDeptWeights,
  baseExport,
  mvbeReceivedByDeptMonth,
  soreineReceivedByDeptMonth,
}: Props) {
  const aggregateReady = stats != null && nonResp != null;
  const [tab, setTab] = useState<TabId>(() =>
    aggregateReady ? "overview" : "unlink"
  );

  return (
    <div className="space-y-6">
      <div className="-mx-1 flex overflow-x-auto pb-1">
        <div
          className="flex min-w-min gap-1 rounded-xl border border-slate-200 bg-slate-100/90 p-1.5"
          role="tablist"
          aria-label="管理者の表示カテゴリ"
        >
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={[
                  "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition sm:px-4",
                  active
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
                    : "text-slate-600 hover:bg-white/70 hover:text-slate-900",
                ].join(" ")}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "overview" && (
        <div className="space-y-6" role="tabpanel">
          {!aggregateReady ? (
            <AggregateUnavailable />
          ) : (
            <>
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">KPI サマリ</h2>
            <p className="mt-1 text-sm text-slate-500">
              {year}年{month}月・在籍 {stats.eligibleStaff} 名を母数
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-4">
                <h3 className="text-sm font-semibold text-slate-800">
                  {SOREINE_TITLE}
                </h3>
                <p className="mt-2 text-2xl font-bold text-orange-800">
                  {stats.current.soreine.totalRows}
                  <span className="ml-1 text-sm font-normal text-slate-500">
                    件
                  </span>
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  回答者（ユニーク）{" "}
                  <span className="font-medium">
                    {stats.current.soreine.uniqueRespondents} 名
                  </span>
                  {stats.current.soreine.responseRatePercent != null && (
                    <span>
                      ・ 回答率{" "}
                      <span className="font-medium">
                        {stats.current.soreine.responseRatePercent}%
                      </span>
                    </span>
                  )}
                </p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-4">
                <h3 className="text-sm font-semibold text-slate-800">
                  {MVBE_TITLE}
                </h3>
                <p className="mt-2 text-2xl font-bold text-orange-800">
                  {stats.current.mvbe.totalRows}
                  <span className="ml-1 text-sm font-normal text-slate-500">
                    行
                  </span>
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  回答者（ユニーク）{" "}
                  <span className="font-medium">
                    {stats.current.mvbe.uniqueRespondents} 名
                  </span>
                  {stats.current.mvbe.responseRatePercent != null && (
                    <span>
                      ・ 回答率{" "}
                      <span className="font-medium">
                        {stats.current.mvbe.responseRatePercent}%
                      </span>
                    </span>
                  )}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">
              前月比・前年同月比
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              比較対象：件数（行）とユニーク回答者数
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-sm">
                <thead>
                  <tr>
                    <Th>指標</Th>
                    <Th className="text-right">今月</Th>
                    <Th className="text-right">前月</Th>
                    <Th className="text-right">前月比</Th>
                    <Th className="text-right">前年同月</Th>
                    <Th className="text-right">前年同月比</Th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      [
                        `${SOREINE_TITLE} 件数`,
                        stats.current.soreine.totalRows,
                        stats.previousMonth.soreine.totalRows,
                        stats.yearAgo.soreine.totalRows,
                      ],
                      [
                        `${SOREINE_TITLE} 回答者(名)`,
                        stats.current.soreine.uniqueRespondents,
                        stats.previousMonth.soreine.uniqueRespondents,
                        stats.yearAgo.soreine.uniqueRespondents,
                      ],
                      [
                        "MVBe 行数",
                        stats.current.mvbe.totalRows,
                        stats.previousMonth.mvbe.totalRows,
                        stats.yearAgo.mvbe.totalRows,
                      ],
                      [
                        "MVBe 回答者(名)",
                        stats.current.mvbe.uniqueRespondents,
                        stats.previousMonth.mvbe.uniqueRespondents,
                        stats.yearAgo.mvbe.uniqueRespondents,
                      ],
                    ] as const
                  ).map(([label, cur, prev, yoy]) => {
                    const d1 = pctDelta(cur, prev);
                    const d2 = pctDelta(cur, yoy);
                    return (
                      <tr key={String(label)}>
                        <Td className="font-medium text-slate-800">{label}</Td>
                        <Td className="text-right tabular-nums">{cur}</Td>
                        <Td className="text-right tabular-nums text-slate-600">
                          {prev}
                        </Td>
                        <Td className="text-right text-slate-700">
                          {d1.percent != null
                            ? `${d1.percent >= 0 ? "+" : ""}${d1.percent}%`
                            : "—"}
                          <span className="ml-1 text-xs text-slate-400">
                            ({d1.diff >= 0 ? "+" : ""}
                            {d1.diff})
                          </span>
                        </Td>
                        <Td className="text-right tabular-nums text-slate-600">
                          {yoy}
                        </Td>
                        <Td className="text-right text-slate-700">
                          {d2.percent != null
                            ? `${d2.percent >= 0 ? "+" : ""}${d2.percent}%`
                            : "—"}
                          <span className="ml-1 text-xs text-slate-400">
                            ({d2.diff >= 0 ? "+" : ""}
                            {d2.diff})
                          </span>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
            </>
          )}
        </div>
      )}

      {tab === "breakdown" && (
        <div className="space-y-6" role="tabpanel">
          {!aggregateReady ? (
            <AggregateUnavailable />
          ) : (
            <>
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900">
                ソレイイネ Value 別
              </h2>
              <ul className="mt-4 space-y-2 text-sm">
                {stats.current.soreine.byValue.map((v) => (
                  <li
                    key={v.valueLabel}
                    className="flex justify-between border-b border-slate-100 py-1.5"
                  >
                    <span className="pr-2 text-slate-700">{v.valueLabel}</span>
                    <span className="shrink-0 font-medium tabular-nums text-slate-900">
                      {v.count} 件
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900">
                ソレイイネ 週次（当該月内）
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                月曜 0:00 始まりの週（回答状況画面と同定義）
              </p>
              {stats.current.soreine.byWeek.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">該当件数なし</p>
              ) : (
                <ul className="mt-4 space-y-2 text-sm">
                  {stats.current.soreine.byWeek.map((w) => (
                    <li
                      key={w.weekStartLabel}
                      className="flex justify-between border-b border-slate-100 py-1.5"
                    >
                      <span className="text-slate-700">{w.weekStartLabel}</span>
                      <span className="font-medium tabular-nums text-slate-900">
                        {w.count} 件
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900">
                部門別（{SOREINE_TITLE}）
              </h2>
              <p className="mt-1 text-xs text-slate-500">メイン部署で集計</p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[280px] border-collapse text-sm">
                  <thead>
                    <tr>
                      <Th>部署</Th>
                      <Th className="text-right">件数</Th>
                      <Th className="text-right">ユニーク</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.current.soreine.byDepartment.map((d) => (
                      <tr key={d.department}>
                        <Td>{d.department}</Td>
                        <Td className="text-right tabular-nums">{d.countRows}</Td>
                        <Td className="text-right tabular-nums">{d.unique}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900">
                部門別（{MVBE_TITLE}）
              </h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[280px] border-collapse text-sm">
                  <thead>
                    <tr>
                      <Th>部署</Th>
                      <Th className="text-right">行数</Th>
                      <Th className="text-right">ユニーク</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.current.mvbe.byDepartment.map((d) => (
                      <tr key={d.department}>
                        <Td>{d.department}</Td>
                        <Td className="text-right tabular-nums">{d.countRows}</Td>
                        <Td className="text-right tabular-nums">{d.unique}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
            </>
          )}
        </div>
      )}

      {tab === "followup" && (
        <div className="space-y-6" role="tabpanel">
          {!aggregateReady ? (
            <AggregateUnavailable />
          ) : (
          <>
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">未回答者</h2>
            <p className="mt-1 text-sm text-slate-500">
              今週の {SOREINE_TITLE} 未提出（月曜
              0:00 からの週）・{MVBE_TITLE} は暦月の未提出。一覧はマスタのメイン部署でまとめています。
            </p>
            <div className="mt-6 grid gap-8 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  {SOREINE_TITLE}（今週） {nonResp.soreineNotThisWeek.length}{" "}
                  名
                </h3>
                <ul className="mt-2 max-h-64 overflow-y-auto text-sm text-slate-700">
                  {nonResp.soreineNotThisWeek.length === 0 ? (
                    <li className="text-slate-500">いません</li>
                  ) : (
                    groupNonRespondersByDepartment(nonResp.soreineNotThisWeek).map(
                      (g) => (
                        <li
                          key={g.department}
                          className="border-b border-slate-100 py-2"
                        >
                          <div className="text-xs font-semibold text-slate-600">
                            {g.department}
                          </div>
                          <ul className="mt-1 space-y-1 pl-2">
                            {g.members.map((p) => (
                              <li key={p.id} className="text-slate-700">
                                {p.name}
                              </li>
                            ))}
                          </ul>
                        </li>
                      )
                    )
                  )}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  {MVBE_TITLE}（今月） {nonResp.mvbeNotThisMonth.length} 名
                </h3>
                <ul className="mt-2 max-h-64 overflow-y-auto text-sm text-slate-700">
                  {nonResp.mvbeNotThisMonth.length === 0 ? (
                    <li className="text-slate-500">いません</li>
                  ) : (
                    groupNonRespondersByDepartment(nonResp.mvbeNotThisMonth).map(
                      (g) => (
                        <li
                          key={g.department}
                          className="border-b border-slate-100 py-2"
                        >
                          <div className="text-xs font-semibold text-slate-600">
                            {g.department}
                          </div>
                          <ul className="mt-1 space-y-1 pl-2">
                            {g.members.map((p) => (
                              <li key={p.id} className="text-slate-700">
                                {p.name}
                              </li>
                            ))}
                          </ul>
                        </li>
                      )
                    )
                  )}
                </ul>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">
              {MVBE_TITLE} 未提出の Discord リマインド
            </h2>
            <MvbeReminderPanel />
          </section>
          </>
          )}
        </div>
      )}

      {tab === "mvbeWeights" && (
        <div className="space-y-6" role="tabpanel">
          {!aggregateReady ? (
            <AggregateUnavailable />
          ) : (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">
              {MVBE_TITLE}：部署別 1票あたりのポイント（現在のマスタ）
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              メイン部署ごとの在籍人数から算出します。最大人数の部署は{" "}
              <strong className="font-medium text-slate-700">1.0 pt</strong>
              、それ以外は{" "}
              <strong className="font-medium text-slate-700">
                非最大に現れる人数の種類を昇順に並べ、その順で [1.5, 上限（環境変数・既定 3）] を等間隔
              </strong>
              に割り当てます（小規模部署が多くても段が均等。**小数第1位で四捨五入**して保存。マスタキャッシュの反映遅延があります）。
              各行の回答には送信時点の人数・係数が記録されます。
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[320px] border-collapse text-sm">
                <thead>
                  <tr>
                    <Th>メイン部署</Th>
                    <Th className="text-right">在籍人数</Th>
                    <Th className="text-right">基準 N_ref</Th>
                    <Th className="text-right">1票あたり pt</Th>
                  </tr>
                </thead>
                <tbody>
                  {mvbeDeptWeights.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="border-b border-slate-100 px-3 py-2 text-sm text-slate-500"
                      >
                        マスタに在籍データがありません。
                      </td>
                    </tr>
                  ) : (
                    mvbeDeptWeights.map((row) => (
                      <tr key={row.voterDeptMain}>
                        <Td>{row.voterDeptMain}</Td>
                        <Td className="text-right tabular-nums">
                          {row.deptCountNd}
                        </Td>
                        <Td className="text-right tabular-nums">{row.nRef}</Td>
                        <Td className="text-right tabular-nums">
                          {row.weightApplied.toLocaleString("ja-JP", {
                            maximumFractionDigits: 1,
                          })}
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
          )}
        </div>
      )}

      {tab === "receivedByDept" && (
        <ReceivedByDeptTabPanel
          year={year}
          month={month}
          mvbe={mvbeReceivedByDeptMonth}
          soreine={soreineReceivedByDeptMonth}
        />
      )}

      {tab === "export" && (
        <div className="space-y-6" role="tabpanel">
          {!aggregateReady ? (
            <AggregateUnavailable />
          ) : (
          <section className="rounded-xl border border-amber-100 bg-amber-50/50 p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">
              CSV ダウンロード
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              選択中の集計月（{year}年{month}
              月）の1日〜末日（JST）の行を出力します。Excel 向けに UTF-8（BOM
              付き）です。
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href={`${baseExport}&form=soreine`}
                className="inline-flex rounded-lg border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-900 shadow-sm hover:bg-orange-50"
              >
                {SOREINE_TITLE}（CSV）
              </a>
              <a
                href={`${baseExport}&form=mvbe`}
                className="inline-flex rounded-lg border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-900 shadow-sm hover:bg-orange-50"
              >
                {MVBE_TITLE}（CSV）
              </a>
            </div>
          </section>
          )}
        </div>
      )}

      {tab === "unlink" && (
        <div className="space-y-6" role="tabpanel">
          <StaffLinkUnlinkPanel />
        </div>
      )}
    </div>
  );
}
