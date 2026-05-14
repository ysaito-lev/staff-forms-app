import { LoadingWithMark } from "@/app/components/LoadingWithMark";
import { STRENGTHS_REPORT_UI as UI } from "@/lib/strengths-report-ui";

export default function StrengthsReportLoading() {
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
          <div className="h-8 w-48 animate-pulse rounded-lg bg-orange-100/80" />
          <div className="mt-3 h-4 max-w-xl animate-pulse rounded bg-orange-100/60" />
          <div className="mt-2 h-4 max-w-md animate-pulse rounded bg-orange-100/40" />
          <LoadingWithMark
            className="mt-6 border-t border-orange-100/55 pb-2 pt-6 md:mt-7 md:pt-7"
            title="読み込み中です…"
            description="強みレポートやコメント一覧を準備しています。"
          />
          <div className="mx-auto mt-4 max-w-md space-y-3">
            <div className="h-24 animate-pulse rounded-xl bg-white/80 shadow-sm ring-1 ring-orange-100/40" />
            <div className="h-24 animate-pulse rounded-xl bg-white/80 shadow-sm ring-1 ring-orange-100/40" />
            <div className="h-24 animate-pulse rounded-xl bg-white/80 shadow-sm ring-1 ring-orange-100/40" />
          </div>
        </div>
      </div>
    </div>
  );
}
