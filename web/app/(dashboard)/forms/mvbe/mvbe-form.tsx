"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Staff } from "@/lib/staff-types";
import {
  MVBE_INTRO,
  MVBE_LABEL_NOMINEE,
  MVBE_LABEL_REASON,
  MVBE_LABEL_RESPONDENT,
  MVBE_LABEL_VALUE,
  MVBE_TITLE,
  PLACEHOLDER_SELECT,
  PLACEHOLDER_TEXT,
  SOREINE_VALUES,
} from "@/lib/form-copy";
import { STRENGTHS_REPORT_UI as UI } from "@/lib/strengths-report-ui";
import { ConfirmModal } from "@/app/components/ConfirmModal";
import { IntroText } from "@/app/components/IntroText";
import { StaffPicker } from "@/app/components/StaffPicker";
import { nameKeyForMatch } from "@/lib/person-name-match";

type FieldErrors = Record<string, string>;

export function MvbeForm({
  initialStaff,
  lockedRespondentId,
  alreadySubmittedThisMonth = false,
}: {
  initialStaff: Staff[];
  lockedRespondentId: string;
  /** 現在のMVBe提出ウィンドウ（JST）に回答あり。サーバがスプレッドシートから判定 */
  alreadySubmittedThisMonth?: boolean;
}) {
  const [respondentId, setRespondentId] = useState<string | null>(lockedRespondentId);
  const [nomineeId, setNomineeId] = useState<string | null>(null);
  const [value, setValue] = useState<string>("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);

  useEffect(() => {
    setRespondentId(lockedRespondentId);
  }, [lockedRespondentId]);

  useEffect(() => {
    if (!lockedRespondentId || !nomineeId) return;
    const self = initialStaff.find((s) => s.id === lockedRespondentId);
    const nom = initialStaff.find((s) => s.id === nomineeId);
    if (!self || !nom) return;
    if (nameKeyForMatch(self.name) === nameKeyForMatch(nom.name)) {
      setNomineeId(null);
    }
  }, [initialStaff, lockedRespondentId, nomineeId]);

  const refs = {
    respondent: useRef<HTMLDivElement>(null),
    nominee: useRef<HTMLDivElement>(null),
    value: useRef<HTMLDivElement>(null),
    reason: useRef<HTMLDivElement>(null),
  };

  const scrollTo = (el: HTMLElement | null) => {
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const validate = (): { errs: FieldErrors; firstKey: keyof typeof refs | null } => {
    const errs: FieldErrors = {};
    if (!respondentId) errs.respondent = "必須です";
    let firstKey: keyof typeof refs | null = errs.respondent ? "respondent" : null;

    if (!nomineeId) {
      errs.nominee = "必須です";
      if (!firstKey) firstKey = "nominee";
    } else {
      const self = respondentId
        ? initialStaff.find((s) => s.id === respondentId)
        : undefined;
      const nom = initialStaff.find((s) => s.id === nomineeId);
      if (self && nom && nameKeyForMatch(self.name) === nameKeyForMatch(nom.name)) {
        errs.nominee = "自分と同一の氏名は選べません";
        if (!firstKey) firstKey = "nominee";
      }
    }

    if (!value.trim()) {
      errs.value = "必須です";
      if (!firstKey) firstKey = "value";
    }
    if (!reason.trim()) {
      errs.reason = "必須です";
      if (!firstKey) firstKey = "reason";
    }
    return { errs, firstKey };
  };

  const submit = async () => {
    if (alreadySubmittedThisMonth) {
      setErrors({
        form: "現在の評価期間において MVBe はすでに回答済みです。同一提出期間内での再送信はできません。",
      });
      return;
    }
    const { errs, firstKey } = validate();
    setErrors(errs);
    if (Object.keys(errs).length) {
      if (firstKey) scrollTo(refs[firstKey].current);
      return;
    }
    setSubmitting(true);
    setErrors({});
    try {
      const res = await fetch("/api/forms/mvbe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomineeStaffId: nomineeId,
          value,
          reason: reason.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string; issues?: unknown };
      if (!res.ok) {
        setErrors({ form: data.error ?? "送信に失敗しました。" });
        if (process.env.NODE_ENV === "development" && data.issues) {
          console.error("MVBe validation:", data.issues);
        }
        return;
      }
      window.location.href = "/?submitted=mvbe";
    } catch {
      setErrors({ form: "通信エラーが発生しました。" });
    } finally {
      setSubmitting(false);
    }
  };

  const performClear = () => {
    setRespondentId(lockedRespondentId);
    setNomineeId(null);
    setValue("");
    setReason("");
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
            {MVBE_TITLE}
          </h1>
        </div>
      </header>

      <section className="mb-10 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <IntroText text={MVBE_INTRO} />
      </section>

      {alreadySubmittedThisMonth && (
        <div
          className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          <p className="font-medium">現在の提出期において MVBe は回答済みです</p>
          <p className="mt-1 leading-relaxed">
            同一評価期間内での再送信はできません。
            内容の確認は{" "}
            <Link href="/my-answers" className="font-medium text-orange-800 underline">
              マイ回答・履歴
            </Link>
            からどうぞ。
          </p>
        </div>
      )}

      {errors.form && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errors.form}
        </div>
      )}

      <div
        ref={refs.respondent}
        className={`mb-10 ${alreadySubmittedThisMonth ? "pointer-events-none opacity-60" : ""}`}
      >
        <StaffPicker
          label={MVBE_LABEL_RESPONDENT}
          staff={initialStaff}
          valueId={respondentId}
          onChange={setRespondentId}
          error={errors.respondent}
          disabled
        />
        <p className="mt-1 text-xs text-zinc-500">回答者はログイン中のあなたに固定されています。</p>
      </div>

      <div
        className={`space-y-10 ${alreadySubmittedThisMonth ? "pointer-events-none opacity-60" : ""}`}
      >
        <section
          ref={refs.nominee}
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <StaffPicker
            label={MVBE_LABEL_NOMINEE}
            staff={initialStaff}
            excludeExecutives
            excludeSameNameAsStaffId={lockedRespondentId}
            valueId={nomineeId}
            onChange={setNomineeId}
            error={errors.nominee}
          />
        </section>

        <section
          ref={refs.value}
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <div className="space-y-2">
            <label htmlFor="mvbe-value" className="block text-sm font-semibold text-zinc-900">
              {MVBE_LABEL_VALUE}
            </label>
            <select
              id="mvbe-value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-[15px] shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/25"
            >
              <option value="">{PLACEHOLDER_SELECT}</option>
              {SOREINE_VALUES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            {errors.value && <p className="text-sm text-red-600">{errors.value}</p>}
          </div>
        </section>

        <section
          ref={refs.reason}
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <div className="space-y-2">
            <label
              htmlFor="mvbe-reason"
              className="block text-sm font-semibold text-zinc-900"
            >
              {MVBE_LABEL_REASON}
            </label>
            <textarea
              id="mvbe-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              placeholder={PLACEHOLDER_TEXT}
              className="w-full min-h-[7rem] resize-y rounded-xl border border-zinc-200 px-4 py-3 text-[15px] leading-relaxed shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/25"
            />
            {errors.reason && <p className="text-sm text-red-600">{errors.reason}</p>}
          </div>
        </section>
      </div>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mt-12 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        <div className="mx-auto flex max-w-2xl gap-3">
          <button
            type="button"
            onClick={() => setClearModalOpen(true)}
            disabled={submitting || alreadySubmittedThisMonth}
            className="flex-1 rounded-xl border border-zinc-300 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            フォームをクリア
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || alreadySubmittedThisMonth}
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
