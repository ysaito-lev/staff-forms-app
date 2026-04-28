import { auth } from "@/auth";
import { MVBE_TITLE, SOREINE_TITLE } from "@/lib/form-copy";
import { loadMyResponses } from "@/lib/my-responses-data";
import { inThisMonth, inThisWeek, submissionInMvbeWindowJst } from "@/lib/date-utils";

export default async function StatusPage() {
  const session = await auth();
  if (!session?.user?.staffId) {
    return (
      <div className="px-4 py-8">
        <div className="mx-auto max-w-2xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
          職員 ID がセッションに含まれていません。ログアウトしてから再ログインしてください。
        </div>
      </div>
    );
  }

  const { soreine, mvbe } = await loadMyResponses(session.user.staffId);

  const soreineWeek = soreine.some((r) => inThisWeek(r.submittedAt));
  const soreineMonth = soreine.some((r) => inThisMonth(r.submittedAt));
  const mvbeWeek = mvbe.some((r) => inThisWeek(r.submittedAt));
  const mvbeMonth = mvbe.some((r) => submissionInMvbeWindowJst(r.submittedAt));

  const Row = ({
    label,
    week,
    month,
  }: {
    label: string;
    week: boolean;
    month: boolean;
  }) => (
    <tr className="border-b border-slate-100">
      <td className="px-4 py-3 pr-2 font-medium text-slate-800">{label}</td>
      <td className="px-2 py-3">
        {week ? (
          <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-900">
            回答済み
          </span>
        ) : (
          <span className="text-slate-500">未回答</span>
        )}
      </td>
      <td className="px-2 py-3 pr-4">
        {month ? (
          <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-900">
            回答済み
          </span>
        ) : (
          <span className="text-slate-500">未回答</span>
        )}
      </td>
    </tr>
  );

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-xl font-bold text-slate-900">回答状況</h1>
        <p className="mt-2 text-sm text-slate-600">
          今週は「月曜 0:00」からの集計です。ソレイイネの「今月」は暦の月です。
          <span className="block mt-1">
            MVBe の「今月」は現在の提出ウィンドウ（前半は前月16日〜今月15日、後半は当月16日〜本日まで）です。
          </span>
        </p>

        <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-600">
                <th className="px-4 py-3">フォーム</th>
                <th className="px-2 py-3">今週</th>
                <th className="px-2 py-3 pr-4">今月</th>
              </tr>
            </thead>
            <tbody>
              <Row label={SOREINE_TITLE} week={soreineWeek} month={soreineMonth} />
              <Row label={MVBE_TITLE} week={mvbeWeek} month={mvbeMonth} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
