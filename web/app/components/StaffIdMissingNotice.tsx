import Link from "next/link";

/**
 * `session.user.staffId` が空のとき（マスタ突合なしでログインした切り分け・シート不整合など）
 */
export function StaffIdMissingNotice() {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-left text-sm leading-relaxed text-amber-950">
      <p className="font-semibold">職員IDが取得できていません</p>
      <p className="mt-2">
        ログインセッションに職員ID（スタッフID）が含まれていません。マスタ当月シートで氏名／スタッフID が
        Google の表示名と一致しているか、行が存在するか確認してください。氏名には「齊／斉／斎」など表記ゆれがあるため、ワークスペースメール同一の場合は当月シートに「メール」列へ登録してください。
      </p>
      <p className="mt-3">
        <Link href="/" className="font-medium text-teal-800 underline underline-offset-2">
          サイトトップへ戻る
        </Link>
      </p>
    </div>
  );
}
