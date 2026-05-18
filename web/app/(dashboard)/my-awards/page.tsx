import { auth } from "@/auth";
import { MVBE_TITLE } from "@/lib/form-copy";
import {
  awardsRegistrySheetConfigured,
  sheetsConfigured,
} from "@/lib/env";
import { loadMyAwardsForStaffId } from "@/lib/my-awards-data";
import { getActiveStaff, getStaffByIdMap } from "@/lib/master";
import { STRENGTHS_REPORT_UI as UI } from "@/lib/strengths-report-ui";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MyAwardsPage() {
  const session = await auth();
  if (!session?.user?.staffId?.trim()) {
    redirect("/complete-profile");
  }

  const staffId = session.user.staffId.trim();
  const staff = await getActiveStaff();
  const me = getStaffByIdMap(staff).get(staffId);

  let awards = [] as Awaited<ReturnType<typeof loadMyAwardsForStaffId>>;
  let loadError: string | null = null;

  if (me) {
    try {
      awards = await loadMyAwardsForStaffId(staffId, me);
    } catch (e) {
      console.error("[my-awards]", e);
      loadError =
        "受賞一覧の読み込みに失敗しました。時間をおいて再度お試しください。";
    }
  }

  const mvbeConfigured = sheetsConfigured();
  const extConfigured = awardsRegistrySheetConfigured();

  const displayName =
    (me?.name ?? "").trim() ||
    (session.user.name ?? "").trim() ||
    staffId;

  return (
    <div className="px-4 py-8">
      <div
        className="mx-auto max-w-3xl rounded-2xl p-4 shadow-[0_4px_28px_rgba(255,152,0,0.08)] ring-1 ring-orange-100/45 md:p-6"
        style={{ backgroundColor: UI.sectionCream }}
      >
        <header className="border-b border-slate-200 bg-white px-4 py-4 shadow-sm rounded-t-xl md:rounded-xl">
          <h1 className="text-lg font-semibold text-slate-800">マイ受賞</h1>
          <p className="mt-2 text-sm text-slate-600">{displayName}</p>
        </header>

        <div className="mt-6 space-y-4 px-1 md:px-2">
          {loadError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              {loadError}
            </p>
          )}

          {!me && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              マスタに職員 ID「{staffId}
              」が見つかりません。プロフィールとマスタの紐づけをご確認ください。
            </p>
          )}

          {!mvbeConfigured && (
            <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              MVBe の集計を表示するには、スプレッドシート（
              <code className="text-xs">GOOGLE_SPREADSHEET_ID</code> 等）の設定が必要です。
            </p>
          )}

          {extConfigured ? null : (
            <p className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
              別賞の表示は任意です。「
              <code className="text-xs">GOOGLE_AWARDS_REGISTRY_SPREADSHEET_ID</code>
              」で受賞リスト用ブックを指定すると、このページに読み込みます（タブ名は{" "}
              <code className="text-xs">SHEET_MY_AWARDS</code>、既定「個人受賞一覧」）。
            </p>
          )}

          {me && !loadError && awards.length === 0 && mvbeConfigured && (
            <p className="rounded-lg border border-slate-200 bg-white px-4 py-4 text-center text-sm text-slate-500">
              表示できる受賞記録はまだありません。
            </p>
          )}

          {me && awards.length > 0 && (
            <ul className="space-y-3">
              {awards.map((a, idx) =>
                a.kind === "mvbe_monthly_first" ? (
                  <li key={`mvbe-${a.ym}-${a.blockKey}-${idx}`}>
                    <article
                      className="overflow-hidden rounded-2xl border border-amber-200/85 bg-gradient-to-br from-amber-50/90 via-amber-50/25 to-white p-4 shadow-sm ring-1 ring-amber-100/70"
                      aria-label={`${a.year}年${a.month}月 ${MVBE_TITLE} ${a.blockHeading}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800/90">
                            {MVBE_TITLE} · 部門 1 位
                          </p>
                          <h2 className="mt-1 text-base font-semibold text-slate-900">
                            {a.year}年{a.month}月
                          </h2>
                          <p className="mt-0.5 text-sm text-slate-700">{a.blockHeading}</p>
                        </div>
                        <div className="text-right">
                          <span
                            className="inline-flex items-baseline gap-0.5 rounded-full bg-amber-100/90 px-2.5 py-1 text-sm font-semibold text-amber-950 ring-1 ring-amber-200/70"
                          >
                            <span className="tabular-nums">
                              {a.usesPoints
                                ? a.score.toLocaleString("ja-JP", {
                                    maximumFractionDigits: 1,
                                  })
                                : String(a.score)}
                            </span>
                            <span className="text-xs font-medium opacity-80">
                              {a.usesPoints ? "pt" : "票"}
                            </span>
                          </span>
                        </div>
                      </div>
                      <p className="mt-3 text-right">
                        <Link
                          href={`/ranking?ym=${encodeURIComponent(a.ym)}`}
                          className="text-sm font-medium text-orange-700 underline-offset-4 hover:text-orange-800 hover:underline"
                        >
                          この月のランキングを見る
                        </Link>
                      </p>
                    </article>
                  </li>
                ) : (
                  <li key={`ext-${a.title}-${a.ym ?? "na"}-${idx}`}>
                    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        その他の受賞
                      </p>
                      <h2 className="mt-1 text-base font-semibold text-slate-900">
                        {a.title}
                      </h2>
                      {a.ym ? (
                        <p className="mt-1 text-sm text-slate-600">対象月: {a.ym}</p>
                      ) : null}
                      {a.note ? (
                        <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">
                          {a.note}
                        </p>
                      ) : null}
                    </article>
                  </li>
                )
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
