"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  PLACEHOLDER_TEXT,
  READING_HABIT_INTRO,
  READING_HABIT_LABELS,
  READING_HABIT_TITLE,
} from "@/lib/form-copy";
import { STRENGTHS_REPORT_UI as UI } from "@/lib/strengths-report-ui";
import type { Staff } from "@/lib/staff-types";
import { ConfirmModal } from "@/app/components/ConfirmModal";
import { IntroText } from "@/app/components/IntroText";
import { StaffPicker } from "@/app/components/StaffPicker";

type Errors = Partial<{
  bookTitle: string;
  comment: string;
  application: string;
  rating: string;
  form: string;
}>;

const RATING_OPTIONS = [1, 2, 3, 4, 5] as const;

export function ReadingHabitForm({
  initialStaff,
  lockedRespondentId,
}: {
  initialStaff: Staff[];
  lockedRespondentId: string;
}) {
  const [bookTitle, setBookTitle] = useState("");
  const [comment, setComment] = useState("");
  const [application, setApplication] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);

  const refTitle = useRef<HTMLDivElement>(null);
  const refComment = useRef<HTMLDivElement>(null);
  const refApplication = useRef<HTMLDivElement>(null);
  const refRating = useRef<HTMLFieldSetElement>(null);

  const scrollTo = (el: HTMLElement | null) => {
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (!bookTitle.trim()) e.bookTitle = "必須です";
    if (!comment.trim()) e.comment = "必須です";
    if (!application.trim()) e.application = "必須です";
    if (rating === null || !RATING_OPTIONS.includes(rating as (typeof RATING_OPTIONS)[number])) {
      e.rating = "必須です";
    }
    return e;
  };

  const submit = async () => {
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length) {
      if (v.bookTitle) scrollTo(refTitle.current);
      else if (v.comment) scrollTo(refComment.current);
      else if (v.application) scrollTo(refApplication.current);
      else if (v.rating) scrollTo(refRating.current);
      return;
    }
    setSubmitting(true);
    setErrors({});
    try {
      const res = await fetch("/api/forms/reading-habit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookTitle: bookTitle.trim(),
          comment: comment.trim(),
          application: application.trim(),
          rating,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErrors({ form: data.error ?? "送信に失敗しました。" });
        return;
      }
      window.location.href = "/?submitted=reading-habit";
    } catch {
      setErrors({ form: "通信エラーが発生しました。" });
    } finally {
      setSubmitting(false);
    }
  };

  const performClear = () => {
    setBookTitle("");
    setComment("");
    setApplication("");
    setRating(null);
    setErrors({});
  };

  return (
    <>
    <div className="mx-auto max-w-2xl px-4 py-8 pb-28">
      <div
        className="rounded-2xl p-5 shadow-[0_4px_28px_rgba(255,152,0,0.08)] ring-1 ring-orange-100/45 md:p-6"
        style={{ backgroundColor: UI.sectionCream }}
      >
        <header className="mb-8">
          <Link
            href="/"
            className="text-sm font-medium text-orange-700 hover:text-orange-900"
          >
            ← トップに戻る
          </Link>
          <div className="mt-4">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              {READING_HABIT_TITLE}
            </h1>
          </div>
        </header>

        <section className="mb-10 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <IntroText text={READING_HABIT_INTRO} />
        </section>

        {errors.form && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errors.form}
          </div>
        )}

        <div className="space-y-8">
          <div>
            <StaffPicker
              label={READING_HABIT_LABELS.respondent}
              staff={initialStaff}
              valueId={lockedRespondentId}
              onChange={() => {}}
              disabled
            />
            <p className="mt-1 text-xs text-zinc-500">
              回答者はログイン中のあなたに固定されています。
            </p>
          </div>

          <div ref={refTitle}>
            <label
              htmlFor="reading-book-title"
              className="text-sm font-semibold text-zinc-900"
            >
              {READING_HABIT_LABELS.bookTitle}
            </label>
            <input
              id="reading-book-title"
              type="text"
              autoComplete="off"
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm shadow-sm outline-none ring-orange-500/0 transition focus:border-orange-400 focus:ring-2 focus:ring-orange-500/25"
              placeholder={PLACEHOLDER_TEXT}
              value={bookTitle}
              onChange={(ev) => setBookTitle(ev.target.value)}
              aria-invalid={Boolean(errors.bookTitle)}
            />
            {errors.bookTitle && (
              <p className="mt-1 text-sm text-red-600">{errors.bookTitle}</p>
            )}
          </div>

          <div ref={refComment}>
            <label
              htmlFor="reading-comment"
              className="text-sm font-semibold text-zinc-900"
            >
              {READING_HABIT_LABELS.comment}
            </label>
            <textarea
              id="reading-comment"
              rows={5}
              className="mt-2 w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm shadow-sm outline-none ring-orange-500/0 transition focus:border-orange-400 focus:ring-2 focus:ring-orange-500/25"
              placeholder={PLACEHOLDER_TEXT}
              value={comment}
              onChange={(ev) => setComment(ev.target.value)}
              aria-invalid={Boolean(errors.comment)}
            />
            {errors.comment && (
              <p className="mt-1 text-sm text-red-600">{errors.comment}</p>
            )}
          </div>

          <div ref={refApplication}>
            <label
              htmlFor="reading-application"
              className="text-sm font-semibold text-zinc-900"
            >
              {READING_HABIT_LABELS.application}
            </label>
            <textarea
              id="reading-application"
              rows={4}
              className="mt-2 w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm shadow-sm outline-none ring-orange-500/0 transition focus:border-orange-400 focus:ring-2 focus:ring-orange-500/25"
              placeholder={PLACEHOLDER_TEXT}
              value={application}
              onChange={(ev) => setApplication(ev.target.value)}
              aria-invalid={Boolean(errors.application)}
            />
            {errors.application && (
              <p className="mt-1 text-sm text-red-600">{errors.application}</p>
            )}
          </div>

          <fieldset ref={refRating} className="space-y-3">
            <legend className="text-sm font-semibold text-zinc-900">
              {READING_HABIT_LABELS.rating}（1〜5）
            </legend>
            <div className="flex flex-wrap gap-2">
              {RATING_OPTIONS.map((n) => (
                <label
                  key={n}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm has-[:checked]:border-orange-500 has-[:checked]:ring-2 has-[:checked]:ring-orange-500/20"
                >
                  <input
                    type="radio"
                    name="reading-rating"
                    value={n}
                    checked={rating === n}
                    onChange={() => setRating(n)}
                    className="mt-0.5 text-orange-600"
                  />
                  <span>{n}</span>
                </label>
              ))}
            </div>
            {errors.rating && (
              <p className="text-sm text-red-600">{errors.rating}</p>
            )}
          </fieldset>
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mt-12 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        <div className="mx-auto flex max-w-2xl gap-3">
          <button
            type="button"
            onClick={() => setClearModalOpen(true)}
            disabled={submitting}
            className="flex-1 rounded-xl border border-zinc-300 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            フォームをクリア
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="flex-1 rounded-xl bg-orange-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 disabled:opacity-50"
          >
            {submitting ? "送信中…" : "送信"}
          </button>
        </div>
      </footer>
    </div>

    <ConfirmModal
      open={clearModalOpen}
      title="フォームをクリア"
      cancelLabel="キャンセル"
      confirmLabel="すべて消す"
      confirmVariant="danger"
      onCancel={() => setClearModalOpen(false)}
      onConfirm={() => {
        performClear();
        setClearModalOpen(false);
      }}
    >
      <p>入力内容をすべて消しますか？この操作は取り消せません。</p>
    </ConfirmModal>
    </>
  );
}
