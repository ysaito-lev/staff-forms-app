"use client";

import { useState } from "react";
import type { StrengthsSnapshotPublic } from "@/lib/strengths-analysis-schema";
import { AiAnalysisSummary } from "@/app/(dashboard)/my-answers/AiAnalysisSummary";
import { FiveAxisStrengthPanel } from "@/app/(dashboard)/my-answers/FiveAxisStrengthPanel";
import { STRENGTHS_REPORT_UI as UI } from "@/lib/strengths-report-ui";
import Link from "next/link";

type TabId = "summary" | "axes";

export function StrengthsReportClient({
  initialSnapshot,
  initialError,
}: {
  initialSnapshot: StrengthsSnapshotPublic | null;
  initialError: string | null;
}) {
  const [tab, setTab] = useState<TabId>("summary");

  return (
    <div
      className="min-h-full px-3 py-5 sm:px-5 md:py-6"
      style={{ backgroundColor: UI.pageBg }}
    >
      <div className="mx-auto max-w-4xl">
        <div
          className="rounded-2xl p-5 shadow-[0_4px_28px_rgba(255,152,0,0.08)] ring-1 ring-orange-100/45 sm:p-6"
          style={{ backgroundColor: UI.sectionCream }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold md:text-2xl" style={{ color: UI.primary }}>
              強みレポート
            </h1>
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-slate-800"
              style={{ backgroundColor: UI.peach }}
            >
              AI
            </span>
          </div>
          <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
            ソレイイネ!!・MVBe で
            <strong className="font-semibold text-slate-800">
              これまでにあなたへ届いたコメント全体
            </strong>
            を材料に、AI が強みを整理したページです。
          </p>
          <p className="mt-3">
            <Link
              href="/my-answers"
              className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition hover:brightness-95 active:brightness-90"
              style={{ backgroundColor: UI.primary }}
            >
              マイ回答・履歴へ
            </Link>
          </p>

          {initialError && !initialSnapshot ? (
            <div className="mt-6 rounded-xl border border-amber-200/80 bg-white px-4 py-3 text-sm text-amber-950 shadow-sm">
              {initialError}
            </div>
          ) : initialSnapshot ? (
            <div className="mt-6 space-y-5 border-t border-orange-100/55 pt-6 md:mt-7 md:pt-7">
              <div
                className="flex gap-1 rounded-full bg-white/80 p-1 shadow-sm ring-1 ring-orange-100/60"
                role="tablist"
                aria-label="強みレポートの表示切替"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "summary"}
                  id="strengths-tab-summary"
                  aria-controls="strengths-panel-summary"
                  onClick={() => setTab("summary")}
                  className={[
                    "flex-1 rounded-full px-3 py-2.5 text-center text-sm font-semibold transition sm:px-4",
                    tab === "summary"
                      ? "text-white shadow-md shadow-orange-500/20"
                      : "text-slate-600 hover:bg-orange-50/80 hover:text-slate-800",
                  ].join(" ")}
                  style={
                    tab === "summary" ? { backgroundColor: UI.primary } : undefined
                  }
                >
                  分析サマリー
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "axes"}
                  id="strengths-tab-axes"
                  aria-controls="strengths-panel-axes"
                  onClick={() => setTab("axes")}
                  className={[
                    "flex-1 rounded-full px-3 py-2.5 text-center text-sm font-semibold transition sm:px-4",
                    tab === "axes"
                      ? "text-white shadow-md shadow-orange-500/20"
                      : "text-slate-600 hover:bg-orange-50/80 hover:text-slate-800",
                  ].join(" ")}
                  style={tab === "axes" ? { backgroundColor: UI.primary } : undefined}
                >
                  5軸分析
                </button>
              </div>

              <div
                id="strengths-panel-summary"
                role="tabpanel"
                aria-labelledby="strengths-tab-summary"
                hidden={tab !== "summary"}
              >
                <AiAnalysisSummary
                  report={initialSnapshot.report}
                  dataRangeLabel={initialSnapshot.dataRangeLabel}
                  skipMessage={initialSnapshot.skipMessage}
                />
              </div>

              <div
                id="strengths-panel-axes"
                role="tabpanel"
                aria-labelledby="strengths-tab-axes"
                hidden={tab !== "axes"}
              >
                <FiveAxisStrengthPanel axes={initialSnapshot.fiveAxes} />
              </div>

              <p className="border-t border-orange-100/45 pt-4 text-xs leading-relaxed text-slate-500 md:pt-5">
                免責: 本表示はコメントに基づく AI
                による整理であり、人事評価や査定を構成するものではありません。パーセンテージは参考用の可視化です。
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
