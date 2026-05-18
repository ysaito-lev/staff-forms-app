"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** primary: オレンジ（既定）。danger: クリア・削除の確定向け */
  confirmVariant?: "primary" | "danger";
};

export function ConfirmModal({
  open,
  title,
  children,
  confirmLabel = "確定",
  cancelLabel = "キャンセル",
  onConfirm,
  onCancel,
  confirmVariant = "primary",
}: Props) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const confirmClass =
    confirmVariant === "danger"
      ? "border border-red-700/20 bg-red-600 text-white hover:bg-red-700"
      : "bg-orange-600 text-white hover:bg-orange-700";

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="閉じる"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="scrollbar-subtle relative z-[1] max-h-[min(85vh,28rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.22)] ring-1 ring-zinc-200/90"
      >
        <h2 id={titleId} className="text-lg font-bold text-zinc-900">
          {title}
        </h2>
        <div className="mt-3 text-sm leading-relaxed text-zinc-600">{children}</div>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
