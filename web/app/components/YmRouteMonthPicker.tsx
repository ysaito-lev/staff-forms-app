"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

type Props = {
  value: string;
  minYm: string;
  maxYm: string;
  inputId: string;
  label: string;
  /** クエリなしのパス（例: `/ranking`） */
  pathname: string;
  className?: string;
};

/**
 * `?ym=` 付きで同一ルートへ遷移する type=month 入力。
 * 検索パラメータのみの更新では loading.tsx が出ないことがあるため、useTransition で待機 UI を出す。
 */
export function YmRouteMonthPicker({
  value,
  minYm,
  maxYm,
  inputId,
  label,
  pathname,
  className = "",
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div
      className={["flex flex-col gap-2 sm:items-end", className].filter(Boolean).join(" ")}
      aria-busy={isPending}
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <input
            id={inputId}
            type="month"
            name="ym"
            min={minYm}
            max={maxYm}
            value={value}
            disabled={isPending}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              startTransition(() => {
                router.push(`${pathname}?ym=${encodeURIComponent(v)}`);
              });
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-wait disabled:opacity-70"
          />
          {isPending ? (
            <Loader2
              className="h-5 w-5 shrink-0 text-orange-700 motion-safe:animate-spin motion-reduce:animate-none"
              strokeWidth={2.25}
              aria-hidden
            />
          ) : null}
        </div>
      </div>
      {isPending ? (
        <p
          role="status"
          className="max-w-full rounded-lg border border-orange-200/80 bg-orange-50/95 px-3 py-2 text-xs font-medium text-orange-950 sm:text-sm"
        >
          選択した月のデータを読み込み中です…
        </p>
      ) : null}
    </div>
  );
}
