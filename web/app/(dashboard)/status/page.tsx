import { auth } from "@/auth";
import { MVBE_TITLE, SOREINE_TITLE } from "@/lib/form-copy";
import { loadMyResponses } from "@/lib/my-responses-data";
import { inCurrentSoreineSubmissionPeriod, submissionInMvbeWindowJst } from "@/lib/date-utils";
import { STRENGTHS_REPORT_UI as UI } from "@/lib/strengths-report-ui";

export default async function StatusPage() {
  const session = await auth();
  if (!session?.user?.staffId) {
    return (
      <div className="px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <div
            className="rounded-2xl p-6 shadow-[0_4px_28px_rgba(255,152,0,0.08)] ring-1 ring-orange-100/45"
            style={{ backgroundColor: UI.sectionCream }}
          >
            <div className="rounded-xl border border-amber-200 bg-white px-4 py-4 text-sm text-amber-900">
              職員 ID がセッションに含まれていません。ログアウトしてから再ログインしてください。
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { soreine, mvbe } = await loadMyResponses(session.user.staffId);

  const soreineWeek = soreine.some((r) =>
    inCurrentSoreineSubmissionPeriod(r.submittedAt)
  );
  const mvbeMonth = mvbe.some((r) => submissionInMvbeWindowJst(r.submittedAt));

  const statusCell = (answered: boolean) =>
    answered ? (
      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-900">
        回答済み
      </span>
    ) : (
      <span className="text-slate-500">未回答</span>
    );

  const notApplicableCell = (
    <span className="text-slate-400" aria-label="この列の対象ではありません">
      ―
    </span>
  );

  const Row = ({
    label,
    weekCell,
    monthCell,
  }: {
    label: string;
    weekCell: boolean | "na";
    monthCell: boolean | "na";
  }) => (
    <tr className="border-b border-slate-100">
      <td className="px-4 py-3 pr-2 font-medium text-slate-800">{label}</td>
      <td className="px-2 py-3">
        {weekCell === "na" ? notApplicableCell : statusCell(weekCell)}
      </td>
      <td className="px-2 py-3 pr-4">
        {monthCell === "na" ? notApplicableCell : statusCell(monthCell)}
      </td>
    </tr>
  );

  return (
    <div className="px-4 py-8">
      <div
        className="mx-auto max-w-2xl rounded-2xl p-6 shadow-[0_4px_28px_rgba(255,152,0,0.08)] ring-1 ring-orange-100/45 md:p-8"
        style={{ backgroundColor: UI.sectionCream }}
      >
        <h1 className="text-xl font-bold text-slate-900">回答状況</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          ソレイイネは<strong className="font-medium text-slate-800">毎週月曜 23:59（日本時間）</strong>
          までに提出してください。
        </p>

        <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-600">
                <th className="px-4 py-3">フォーム</th>
                <th className="px-2 py-3">今週の提出期（ソレイイネ）</th>
                <th className="px-2 py-3 pr-4">今月（MVBe）</th>
              </tr>
            </thead>
            <tbody>
              <Row label={SOREINE_TITLE} weekCell={soreineWeek} monthCell="na" />
              <Row label={MVBE_TITLE} weekCell="na" monthCell={mvbeMonth} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
