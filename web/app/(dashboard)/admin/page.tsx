import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getCurrentYearMonthJst } from "@/lib/date-utils";
import { loadAdminStatsForMonth, loadNonResponders } from "@/lib/admin-stats";
import { formatYearMonthParam, parseYearMonthParam } from "@/lib/ranking-data";
import { sheetsConfigured } from "@/lib/env";
import { getActiveStaff } from "@/lib/master";
import { listMvbeDeptWeights } from "@/lib/mvbe-dept-weights";
import { loadMvbeReceivedByDeptForMonth } from "@/lib/mvbe-received-by-dept-month";
import { loadSoreineReceivedByDeptForMonth } from "@/lib/soreine-received-by-dept-month";
import { AdminMonthPicker } from "./AdminMonthPicker";
import { AdminStatsPanels } from "./AdminStatsPanels";
import { firstAndLastYmdOfMonth } from "./admin-helpers";
import { STRENGTHS_REPORT_UI as UI } from "@/lib/strengths-report-ui";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ ym?: string }> };

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
  const [stats, nonResp, mvbeReceivedByDeptMonth, soreineReceivedByDeptMonth] =
    configured
      ? await Promise.all([
          loadAdminStatsForMonth(year, month),
          loadNonResponders(),
          loadMvbeReceivedByDeptForMonth(year, month),
          loadSoreineReceivedByDeptForMonth(year, month),
        ])
      : [null, null, null, null];
  const staffForMvbeWeights = configured ? await getActiveStaff() : [];
  const mvbeDeptWeights = listMvbeDeptWeights(staffForMvbeWeights);

  const { from: exportFrom, to: exportTo } = firstAndLastYmdOfMonth(
    year,
    month
  );
  const baseExport = `/api/admin/export?from=${exportFrom}&to=${exportTo}`;

  return (
    <div className="px-4 py-8">
      <div
        className="mx-auto max-w-5xl space-y-8 rounded-2xl p-6 shadow-[0_4px_28px_rgba(255,152,0,0.08)] ring-1 ring-orange-100/45 md:p-8"
        style={{ backgroundColor: UI.sectionCream }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">集計（管理者）</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              在籍マスタ人数を母数にした回答率、Value
              別・週次、部門別、前月比・前年同月比、未回答者一覧、CSV
              ダウンロードです。データは回答用スプレッドシートに基づきます（日本時間）。下のタブで表示ブロックを切り替えられます。
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

        <AdminStatsPanels
          year={year}
          month={month}
          stats={stats}
          nonResp={nonResp}
          mvbeDeptWeights={mvbeDeptWeights}
          baseExport={baseExport}
          mvbeReceivedByDeptMonth={mvbeReceivedByDeptMonth}
          soreineReceivedByDeptMonth={soreineReceivedByDeptMonth}
        />
      </div>
    </div>
  );
}
