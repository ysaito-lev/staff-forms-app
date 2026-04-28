import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { MVBE_TITLE, SOREINE_TITLE } from "@/lib/form-copy";
import { getCurrentYearMonthJst } from "@/lib/date-utils";
import {
  loadAdminStatsForMonth,
  loadNonResponders,
  pctDelta,
} from "@/lib/admin-stats";
import { formatYearMonthParam, parseYearMonthParam } from "@/lib/ranking-data";
import { sheetsConfigured } from "@/lib/env";
import { AdminMonthPicker } from "./AdminMonthPicker";
import { firstAndLastYmdOfMonth } from "./admin-helpers";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ ym?: string }> };

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

export default async function AdminPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user.isAdmin) {
    redirect("/");
  }

  const sp = await searchParams;
  const def = getCurrentYearMonthJst();
  const parsed = parseYearMonthParam(sp.ym);
  const year = parsed?.year ?? def.year;
  const month = parsed?.month ?? def.month;
  const ym = formatYearMonthParam(year, month);
  const minYm = "2000-01";
  const cap = getCurrentYearMonthJst();
  const maxYm = formatYearMonthParam(cap.year, cap.month);
  if (year > cap.year || (year === cap.year && month > cap.month)) {
    redirect(`/admin?ym=${maxYm}`);
  }

  const configured = sheetsConfigured();
  const [stats, nonResp] = configured
    ? await Promise.all([
        loadAdminStatsForMonth(year, month),
        loadNonResponders(),
      ])
    : [null, null];

  const { from: exportFrom, to: exportTo } = firstAndLastYmdOfMonth(
    year,
    month
  );
  const baseExport = `/api/admin/export?from=${exportFrom}&to=${exportTo}`;

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">集計（管理者）</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              在籍マスタ人数を母数にした回答率、Value
              別・週次、部門別、前月比・前年同月比、未回答者一覧、CSV
              ダウンロードです。データは回答用スプレッドシートに基づきます（日本時間）。
            </p>
          </div>
          {configured && stats && (
            <AdminMonthPicker value={ym} minYm={minYm} maxYm={maxYm} />
          )}
        </div>

        {!configured && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            回答スプレッドシート（<code>GOOGLE_RESPONSES_SPREADSHEET_ID</code>{" "}
            等）が未設定のため、集計を表示できません。
          </p>
        )}

        {stats && nonResp && (
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
                  <p className="mt-2 text-2xl font-bold text-teal-800">
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
                  <p className="mt-2 text-2xl font-bold text-teal-800">
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
                          <Td className="font-medium text-slate-800">
                            {label}
                          </Td>
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

            <div className="grid gap-8 lg:grid-cols-2">
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

            <div className="grid gap-8 lg:grid-cols-2">
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
                          <Td className="text-right tabular-nums">
                            {d.countRows}
                          </Td>
                          <Td className="text-right tabular-nums">
                            {d.unique}
                          </Td>
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
                          <Td className="text-right tabular-nums">
                            {d.countRows}
                          </Td>
                          <Td className="text-right tabular-nums">
                            {d.unique}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900">未回答者</h2>
              <p className="mt-1 text-sm text-slate-500">
                今週の {SOREINE_TITLE} 未提出（月曜
                0:00 からの週）・{MVBE_TITLE} は暦月の未提出
              </p>
              <div className="mt-6 grid gap-8 md:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    {SOREINE_TITLE}（今週） {nonResp.soreineNotThisWeek.length} 名
                  </h3>
                  <ul className="mt-2 max-h-64 overflow-y-auto text-sm text-slate-700">
                    {nonResp.soreineNotThisWeek.length === 0 ? (
                      <li className="text-slate-500">いません</li>
                    ) : (
                      nonResp.soreineNotThisWeek.map((p) => (
                        <li
                          key={p.id}
                          className="border-b border-slate-100 py-1.5"
                        >
                          {p.name}
                          <span className="ml-2 text-xs text-slate-500">
                            {p.department}
                          </span>
                        </li>
                      ))
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
                      nonResp.mvbeNotThisMonth.map((p) => (
                        <li
                          key={p.id}
                          className="border-b border-slate-100 py-1.5"
                        >
                          {p.name}
                          <span className="ml-2 text-xs text-slate-500">
                            {p.department}
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-amber-100 bg-amber-50/50 p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900">CSV ダウンロード</h2>
              <p className="mt-1 text-sm text-slate-600">
                選択中の集計月（{year}年{month}月）の1日〜末日（JST）の行を出力します。Excel
                向けに UTF-8（BOM 付き）です。
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href={`${baseExport}&form=soreine`}
                  className="inline-flex rounded-lg border border-teal-200 bg-white px-4 py-2 text-sm font-medium text-teal-900 shadow-sm hover:bg-teal-50"
                >
                  {SOREINE_TITLE}（CSV）
                </a>
                <a
                  href={`${baseExport}&form=mvbe`}
                  className="inline-flex rounded-lg border border-teal-200 bg-white px-4 py-2 text-sm font-medium text-teal-900 shadow-sm hover:bg-teal-50"
                >
                  {MVBE_TITLE}（CSV）
                </a>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
