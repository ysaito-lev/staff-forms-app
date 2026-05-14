import { ClipboardList } from "lucide-react";

type Size = "sm" | "md" | "lg";

const WRAPPER: Record<Size, string> = {
  sm: "h-11 w-11",
  md: "h-14 w-14",
  lg: "h-[4rem] w-[4rem]",
};

const ROTATE_RING: Record<Size, string> = {
  sm: "rounded-full border-2 border-slate-200/95 border-t-orange-600 shadow-sm",
  md: "rounded-full border-[3px] border-orange-200/90 border-t-orange-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]",
  lg: "rounded-full border-[3px] border-orange-300/80 border-t-orange-600 shadow-[0_2px_12px_rgba(251,146,60,0.2)]",
};

const ICON: Record<Size, string> = {
  sm: "h-5 w-5 text-orange-700 drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]",
  md: "h-7 w-7 text-orange-900/95 drop-shadow-[0_1px_1px_rgba(255,255,255,0.45)]",
  lg: "h-9 w-9 text-orange-950/95 drop-shadow-[0_1px_2px_rgba(255,237,213,0.9)]",
};

type Props = {
  className?: string;
  title?: string;
  description?: string;
  /** `sm`: ログイン待機、`md`: コンテンツ既定、`lg`: ダッシュボード全域ローディング */
  size?: Size;
};

/**
 * アンケート文脈向け読み込み表示（クリップボードマーク + スピナー）。
 * `prefers-reduced-motion` のときはスピナーを外し、アイコンのみ表示。
 */
export function LoadingWithMark({
  className = "",
  title = "読み込み中…",
  description,
  size = "md",
}: Props) {
  const gapClass =
    size === "lg"
      ? "gap-6"
      : size === "sm"
        ? "gap-3"
        : "gap-4";

  const titleClass =
    size === "lg"
      ? "bg-gradient-to-r from-zinc-800 via-orange-950 to-zinc-800 bg-clip-text text-lg font-semibold tracking-tight text-transparent sm:text-xl"
      : "text-[0.9375rem] font-semibold tracking-tight text-zinc-800 sm:text-base";

  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={[
        "flex flex-col items-center justify-center text-center",
        gapClass,
        className,
      ].join(" ")}
    >
      <div
        className={[
          "relative flex shrink-0 items-center justify-center",
          WRAPPER[size],
        ].join(" ")}
      >
        <div
          className={[
            "pointer-events-none absolute inset-0 motion-reduce:hidden",
            ROTATE_RING[size],
            "motion-safe:animate-spin",
          ].join(" ")}
          style={{ animationDuration: size === "lg" ? "0.75s" : "0.82s" }}
          aria-hidden
        />
        <ClipboardList
          className={[
            ICON[size],
            "relative z-[1] shrink-0 motion-safe:animate-pulse motion-reduce:animate-none",
          ].join(" ")}
          strokeWidth={2.25}
          aria-hidden
        />
      </div>
      <div className="max-w-xs space-y-1.5 px-2 sm:max-w-sm">
        <p className={titleClass}>{title}</p>
        {description ? (
          <p className="text-xs leading-relaxed text-zinc-600 sm:text-[15px] sm:leading-snug">
            {description}
          </p>
        ) : size !== "lg" ? (
          <p className="text-xs leading-relaxed text-zinc-500 sm:text-[13px]">
            少しだけお待ちください。
          </p>
        ) : null}
      </div>
    </div>
  );
}
