import Link from "next/link";

/**
 * `session.user.staffId` が空のとき（マスタ突合なしでログインした切り分け・シート不整合など）
 */
export function StaffIdMissingNotice() {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-left text-sm leading-relaxed text-amber-950">
      <p className="font-semibold">職員IDが取得できていません</p>
      <p className="mt-2">
        ログインセッションに職員ID（スタッフID）が含まれていません。マスタの氏名・ID と
        Google プロフィールの表示名が一致しているか、当月シートに行があるかをご確認ください。
      </p>
      <p className="mt-3">
        <Link href="/" className="font-medium text-teal-800 underline underline-offset-2">
          サイトトップへ戻る
        </Link>
      </p>
    </div>
  );
}
