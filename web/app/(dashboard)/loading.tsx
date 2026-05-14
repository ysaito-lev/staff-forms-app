import { LoadingWithMark } from "@/app/components/LoadingWithMark";
import { STRENGTHS_REPORT_UI } from "@/lib/strengths-report-ui";

/**
 * (dashboard) 配下ページの読み込み中（サイドバー・ヘッダーはそのまま）。
 */
export default function DashboardRouteLoading() {
  return (
    <div
      className="relative flex min-h-[min(520px,calc(100dvh-5rem))] flex-col items-center justify-center px-4 py-10"
      aria-busy="true"
      aria-live="polite"
      aria-label="ページを読み込み中"
    >
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden opacity-90"
        style={{ backgroundColor: STRENGTHS_REPORT_UI.pageBg }}
      />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[120%] max-w-xl -translate-x-1/2 rounded-full bg-gradient-to-b from-orange-200/35 via-orange-50/25 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-orange-50/40 to-transparent" />

      <div className="relative flex w-full max-w-md flex-col items-center gap-7">
        <LoadingWithMark
          size="lg"
          title="読み込み中です…"
          description="アンケートや履歴データを並べています。"
          className="max-w-none"
        />

        <div className="flex h-10 items-center gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="inline-block h-2 w-2 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 shadow-sm"
              style={{
                animation: "dashboard-dot-bounce 1.05s ease-in-out infinite",
                animationDelay: `${i * 0.09}s`,
              }}
              aria-hidden
            />
          ))}
        </div>

        <div className="w-full max-w-sm space-y-3 pt-2">
          <div className="h-3 w-3/4 max-w-[16rem] rounded-full bg-zinc-200/90 shadow-inner animate-pulse" />
          <div className="h-3 w-full max-w-md rounded-full bg-orange-50/95 ring-1 ring-orange-200/60 animate-pulse [animation-delay:150ms]" />
          <div className="h-3 w-5/6 max-w-[18rem] rounded-full bg-zinc-100 animate-pulse [animation-delay:300ms]" />
        </div>
      </div>

      <style>{`
        @keyframes dashboard-dot-bounce {
          0%,
          100% {
            transform: translateY(0);
            opacity: 0.55;
          }
          35% {
            transform: translateY(-8px);
            opacity: 1;
          }
          65% {
            transform: translateY(2px);
            opacity: 0.95;
          }
        }
      `}</style>
    </div>
  );
}
