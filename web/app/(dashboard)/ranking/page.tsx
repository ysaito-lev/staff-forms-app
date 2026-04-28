import { MVBE_TITLE, MVBE_BLOCKS } from "@/lib/form-copy";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  compareYearMonth,
  formatYearMonthParam,
  getCurrentYearMonthJst,
  getGeneralUserRankingMaxYmBounds,
  loadMonthlyRanking,
  parseYearMonthParam,
} from "@/lib/ranking-data";
import { sheetsConfigured } from "@/lib/env";
import { RankingMonthPicker } from "./RankingMonthPicker";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ ym?: string }>;
};

function rankCardStyles(rank: number): {
  frame: string;
  badge: string;
  votePill: string;
} {
  if (rank === 1) {
    return {
      frame:
        "border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-amber-50/20 to-white shadow-[0_1px_0_0_rgba(251,191,36,0.12),0_8px_24px_-4px_rgba(146,64,14,0.12)] ring-1 ring-amber-100/80",
      badge:
        "bg-gradient-to-br from-amber-200 to-amber-100 text-amber-950 ring-2 ring-amber-300/60 shadow-sm",
      votePill: "bg-amber-100/80 text-amber-950 ring-1 ring-amber-200/60",
    };
  }
  if (rank === 2) {
    return {
      frame:
        "border-slate-300/80 bg-gradient-to-br from-slate-100/70 via-white to-slate-50/40 shadow-[0_1px_0_0_rgba(148,163,184,0.15),0_8px_20px_-4px_rgba(71,85,105,0.1)] ring-1 ring-slate-200/70",
      badge:
        "bg-gradient-to-br from-slate-200 to-slate-100 text-slate-800 ring-2 ring-slate-300/50 shadow-sm",
      votePill: "bg-slate-100/90 text-slate-800 ring-1 ring-slate-200/80",
    };
  }
  if (rank === 3) {
    return {
      frame:
        "border-orange-200/85 bg-gradient-to-br from-orange-50/80 via-amber-50/25 to-white shadow-[0_1px_0_0_rgba(253,186,116,0.2),0_8px_20px_-4px_rgba(194,65,12,0.1)] ring-1 ring-orange-100/70",
      badge:
        "bg-gradient-to-br from-orange-200 to-amber-100 text-orange-950 ring-2 ring-orange-300/45 shadow-sm",
      votePill: "bg-orange-100/80 text-orange-950 ring-1 ring-orange-200/60",
    };
  }
  return {
    frame:
      "border-teal-200/60 bg-gradient-to-br from-white via-teal-50/30 to-cyan-50/20 shadow-[0_1px_0_0_rgba(45,212,191,0.1),0_8px_20px_-4px_rgba(15,118,110,0.08)] ring-1 ring-teal-100/60",
    badge: "bg-gradient-to-br from-teal-200 to-teal-100 text-teal-900 ring-1 ring-teal-200/50 shadow-sm",
    votePill: "bg-teal-100/80 text-teal-900 ring-1 ring-teal-200/50",
  };
}

function IconBuilding({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z"
      />
    </svg>
  );
}

function IconTag({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
    </svg>
  );
}

export default async function RankingPage({ searchParams }: Props) {
  const sp = await searchParams;
  const session = await auth();
  const isAdmin = Boolean(session?.user?.isAdmin);

  const def = getCurrentYearMonthJst();
  const generalMax = getGeneralUserRankingMaxYmBounds();
  const parsed = parseYearMonthParam(sp.ym);

  let year: number;
  let month: number;
  if (parsed) {
    year = parsed.year;
    month = parsed.month;
  } else if (isAdmin) {
    year = def.year;
    month = def.month;
  } else {
    year = generalMax.year;
    month = generalMax.month;
  }

  if (compareYearMonth({ year, month }, def) > 0) {
    const cap = isAdmin ? def : generalMax;
    redirect(`/ranking?ym=${formatYearMonthParam(cap.year, cap.month)}`);
  }
  if (!isAdmin) {
    if (compareYearMonth({ year, month }, generalMax) > 0) {
      redirect(`/ranking?ym=${formatYearMonthParam(generalMax.year, generalMax.month)}`);
    }
  }

  const ym = formatYearMonthParam(year, month);
  const minYm = "2000-01";
  const maxYm = isAdmin
    ? formatYearMonthParam(def.year, def.month)
    : formatYearMonthParam(generalMax.year, generalMax.month);

  const configured = sheetsConfigured();
  const data = configured ? await loadMonthlyRanking(year, month) : null;

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="border-b border-slate-200 bg-white px-4 py-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">月間ランキング</h1>
            <p className="mt-1 text-sm text-slate-500">{MVBE_TITLE} のみ集計しています。</p>
          </div>
          {configured && (
            <RankingMonthPicker value={ym} minYm={minYm} maxYm={maxYm} />
          )}
        </div>

        {!configured && (
          <p className="mt-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            回答スプレッドシート（<code>GOOGLE_RESPONSES_SPREADSHEET_ID</code> 等）が未設定のため、ランキングを表示できません。環境変数を設定してデプロイ／再起動してください。
          </p>
        )}

        {data && (
          <div className="mt-10">
            <h2 className="mb-5 text-base font-bold text-slate-900">
              {MVBE_TITLE}{" "}
              <span className="text-sm font-normal text-slate-500">
                （{year} 年 {month} 月）
              </span>
            </h2>
            <div className="space-y-8">
              {MVBE_BLOCKS.map((b) => {
                const rows = data.mvbe[b.key] ?? [];
                return (
                  <section
                    key={b.key}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/90 shadow-sm"
                  >
                    <div className="border-b border-teal-100 bg-teal-50/70 px-5 py-3">
                      <h3 className="text-base font-semibold text-slate-900">{b.heading}</h3>
                    </div>
                    <div className="p-4 sm:p-5">
                      {rows.length > 0 ? (
                        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {rows.map((r) => {
                            const s = rankCardStyles(r.rank);
                            return (
                              <li
                                key={r.name}
                                className={`group relative flex flex-col overflow-hidden rounded-2xl border p-3.5 transition duration-200 hover:-translate-y-0.5 sm:p-4 ${s.frame}`}
                              >
                                <div
                                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_-30%,rgba(255,255,255,0.75),transparent)]"
                                  aria-hidden
                                />
                                <div className="relative flex min-h-[2.5rem] items-center gap-2 sm:gap-3">
                                  <div
                                    className={`inline-flex h-9 min-w-[2.75rem] shrink-0 items-center justify-center self-center rounded-lg px-2 text-sm font-bold tabular-nums ${s.badge}`}
                                    title={`${r.rank} 位`}
                                  >
                                    {r.rank}位
                                  </div>
                                  <p className="min-w-0 flex-1 self-center text-sm font-semibold leading-snug tracking-tight text-slate-900 sm:text-base">
                                    {r.name}
                                  </p>
                                  <span
                                    className={`inline-flex shrink-0 items-baseline gap-0.5 self-center rounded-full px-2 py-1 ${s.votePill}`}
                                  >
                                    <span className="text-base font-bold tabular-nums leading-none sm:text-lg">{r.votes}</span>
                                    <span className="text-xs font-semibold leading-none opacity-80">票</span>
                                  </span>
                                </div>
                                <div className="relative mt-2.5 space-y-1.5 text-xs text-slate-600 sm:mt-2">
                                  <p className="flex items-start gap-2">
                                    <IconBuilding className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                    <span className="min-w-0">
                                      <span className="text-slate-500">部署</span>
                                      <span className="mx-1.5 text-slate-300">·</span>
                                      <span className="font-medium text-slate-700">{r.department}</span>
                                    </span>
                                  </p>
                                  <p className="flex items-start gap-2">
                                    <IconTag className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                    <span className="min-w-0">
                                      <span className="text-slate-500">あだ名</span>
                                      <span className="mx-1.5 text-slate-300">·</span>
                                      <span className="font-medium text-slate-700">{r.nickname ?? "—"}</span>
                                    </span>
                                  </p>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="px-1 py-2 text-sm text-slate-500">この月の集計はありません。</p>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
