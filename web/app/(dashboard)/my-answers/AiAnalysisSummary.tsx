"use client";

import type { StrengthsReport } from "@/lib/strengths-analysis-schema";
import { STRENGTHS_REPORT_UI as UI } from "@/lib/strengths-report-ui";

const CARD =
  "rounded-xl border border-orange-100/50 bg-white p-4 shadow-[0_2px_16px_rgba(255,152,0,0.06)] sm:p-[18px]";

export function AiAnalysisSummary({
  report,
  dataRangeLabel,
  skipMessage,
}: {
  report: StrengthsReport;
  dataRangeLabel: string;
  skipMessage?: string;
}) {
  return (
    <div className="space-y-3 md:space-y-3.5">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold" style={{ color: UI.primary }}>
            AI分析サマリー
          </h2>
        </div>

        <p className="text-xs text-slate-500">対象データ: {dataRangeLabel}</p>
      </div>

      {skipMessage ? (
        <p className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-sm text-amber-950 shadow-sm">
          {skipMessage}
        </p>
      ) : null}

      <div
        className="rounded-xl border border-orange-100/60 p-4 shadow-[0_2px_16px_rgba(255,152,0,0.06)] sm:p-[18px]"
        style={{ backgroundColor: UI.cardCream }}
      >
        <p className="text-xs font-semibold" style={{ color: UI.primaryHover }}>
          あなたのパーソナルブランド
        </p>
        <p className="mt-2 text-base font-bold leading-relaxed text-slate-900">
          {report.personalBrandTagline}
        </p>
      </div>

      <div className={CARD}>
        <h3 className="text-sm font-bold" style={{ color: UI.primary }}>
          総合分析
        </h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
          {report.comprehensiveAnalysis}
        </p>
      </div>

      <div className={CARD}>
        <h3 className="text-sm font-bold" style={{ color: UI.primary }}>
          強みの深掘り分析
        </h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
          {report.deepDiveStrengths}
        </p>
      </div>

      <div
        className="rounded-xl border border-orange-100/60 p-4 shadow-[0_2px_16px_rgba(255,152,0,0.06)] sm:p-[18px]"
        style={{ backgroundColor: UI.cardCream }}
      >
        <h3 className="text-sm font-bold" style={{ color: UI.primaryHover }}>
          具体的な行動提案
        </h3>
        <ol className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3">
          {report.actionProposals.map((line, i) => (
            <li key={i} className="flex gap-3 text-sm text-slate-700">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
                style={{ backgroundColor: UI.primary }}
              >
                {i + 1}
              </span>
              <span className="pt-0.5 leading-relaxed">{line}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className={CARD}>
        <h3 className="text-sm font-bold" style={{ color: UI.secondary }}>
          強みの活かし方
        </h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
          {report.utilizationAdvice}
        </p>
      </div>

      <div className={CARD}>
        <h3 className="text-sm font-bold" style={{ color: UI.primary }}>
          成長のヒント
        </h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
          {report.growthHints}
        </p>
      </div>
    </div>
  );
}
