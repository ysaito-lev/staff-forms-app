import Link from "next/link";
import { MVBE_TITLE, SOREINE_TITLE } from "@/lib/form-copy";
import { SITE_AUDIENCE_LABEL, SITE_TITLE } from "@/lib/site-brand";

type Props = {
  searchParams: Promise<{ submitted?: string }>;
};

export default async function Home({ searchParams }: Props) {
  const sp = await searchParams;
  const ok = sp.submitted;

  return (
    <div className="text-zinc-900">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <header className="mb-10 text-center sm:text-left">
          <p className="text-sm font-medium text-teal-800">{SITE_AUDIENCE_LABEL}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{SITE_TITLE}</h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-zinc-600">
            アンケートの入口を一本化しています。左メニューまたは下のカードからフォームを選べます。
          </p>
        </header>

        {ok === "soreine" && (
          <div
            className="mb-8 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900"
            role="status"
          >
            {SOREINE_TITLE}の送信が完了しました。
          </div>
        )}
        {ok === "mvbe" && (
          <div
            className="mb-8 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900"
            role="status"
          >
            {MVBE_TITLE}の送信が完了しました。
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Link
            href="/forms/soreine"
            className="group flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-teal-400 hover:shadow-md"
          >
            <span className="text-lg font-bold text-zinc-900 group-hover:text-teal-800">
              {SOREINE_TITLE}
            </span>
            <span className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600">
              今週のソレイイネ!! を入力します。
            </span>
            <span className="mt-4 text-sm font-semibold text-teal-700">回答する →</span>
          </Link>
          <Link
            href="/forms/mvbe"
            className="group flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-teal-400 hover:shadow-md"
          >
            <span className="text-lg font-bold text-zinc-900 group-hover:text-teal-800">
              {MVBE_TITLE}
            </span>
            <span className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600">
              今月の MVBe を選出します。
            </span>
            <span className="mt-4 text-sm font-semibold text-teal-700">回答する →</span>
          </Link>
        </div>

        <section className="mt-10 rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-600">
          <p className="font-medium text-slate-800">回答状況（サマリ）</p>
          <p className="mt-2">
            今週・今月の回答状況は{" "}
            <Link href="/status" className="font-medium text-teal-700 hover:underline">
              回答状況
            </Link>{" "}
            ページを参照してください。
          </p>
        </section>
      </main>
    </div>
  );
}
