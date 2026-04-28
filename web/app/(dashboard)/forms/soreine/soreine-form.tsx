"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Staff } from "@/lib/staff-types";
import {
  PLACEHOLDER_TEXT,
  SOREINE_INTRO,
  SOREINE_LABELS,
  SOREINE_TITLE,
  SOREINE_VALUES,
} from "@/lib/form-copy";
import { IntroText } from "@/app/components/IntroText";
import { StaffPicker } from "@/app/components/StaffPicker";
import { nameKeyForMatch } from "@/lib/person-name-match";

type Errors = Partial<{
  respondentId: string;
  praisedId: string;
  value: string;
  detail: string;
  form: string;
}>;

export function SoreineForm({
  initialStaff,
  lockedRespondentId,
}: {
  initialStaff: Staff[];
  /** ログインユーザに固定（回答者） */
  lockedRespondentId: string;
}) {
  const [respondentId, setRespondentId] = useState<string | null>(lockedRespondentId);
  const [praisedId, setPraisedId] = useState<string | null>(null);
  const [value, setValue] = useState<string>("");
  const [detail, setDetail] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setRespondentId(lockedRespondentId);
  }, [lockedRespondentId]);

  useEffect(() => {
    if (!lockedRespondentId || !praisedId) return;
    const self = initialStaff.find((s) => s.id === lockedRespondentId);
    const praised = initialStaff.find((s) => s.id === praisedId);
    if (
      self &&
      praised &&
      nameKeyForMatch(self.name) === nameKeyForMatch(praised.name)
    ) {
      setPraisedId(null);
    }
  }, [initialStaff, lockedRespondentId, praisedId]);

  const refRespondent = useRef<HTMLDivElement>(null);
  const refPraised = useRef<HTMLDivElement>(null);
  const refValue = useRef<HTMLFieldSetElement>(null);
  const refDetail = useRef<HTMLDivElement>(null);

  const scrollTo = (el: HTMLElement | null) => {
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (!respondentId) e.respondentId = "必須です";
    if (!praisedId) e.praisedId = "必須です";
    if (respondentId && praisedId) {
      const self = initialStaff.find((s) => s.id === respondentId);
      const pr = initialStaff.find((s) => s.id === praisedId);
      if (
        self &&
        pr &&
        nameKeyForMatch(self.name) === nameKeyForMatch(pr.name)
      ) {
        e.praisedId = "自分と同一の氏名は選べません";
      }
    }
    if (!value || !(SOREINE_VALUES as readonly string[]).includes(value)) {
      e.value = "必須です";
    }
    if (!detail.trim()) e.detail = "必須です";
    return e;
  };

  const submit = async () => {
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length) {
      if (v.respondentId) scrollTo(refRespondent.current);
      else if (v.praisedId) scrollTo(refPraised.current);
      else if (v.value) scrollTo(refValue.current);
      else if (v.detail) scrollTo(refDetail.current);
      return;
    }
    setSubmitting(true);
    setErrors({});
    try {
      const res = await fetch("/api/forms/soreine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          praisedId,
          value,
          detail: detail.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErrors({ form: data.error ?? "送信に失敗しました。" });
        return;
      }
      window.location.href = "/?submitted=soreine";
    } catch {
      setErrors({ form: "通信エラーが発生しました。" });
    } finally {
      setSubmitting(false);
    }
  };

  const clear = () => {
    if (!window.confirm("入力内容をすべて消しますか？")) return;
    setRespondentId(lockedRespondentId);
    setPraisedId(null);
    setValue("");
    setDetail("");
    setErrors({});
  };

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-8 pb-28">
      <header className="mb-8">
        <Link
          href="/"
          className="text-sm font-medium text-teal-700 hover:text-teal-900"
        >
          ← トップに戻る
        </Link>
        <div className="mt-4">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            {SOREINE_TITLE}
          </h1>
        </div>
      </header>

      <section className="mb-10 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <IntroText text={SOREINE_INTRO} />
      </section>

      {errors.form && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errors.form}
        </div>
      )}

      <div className="space-y-8">
        <div ref={refRespondent}>
          <StaffPicker
            label={SOREINE_LABELS.respondent}
            staff={initialStaff}
            valueId={respondentId}
            onChange={setRespondentId}
            error={errors.respondentId}
            disabled
          />
          <p className="mt-1 text-xs text-zinc-500">回答者はログイン中のあなたに固定されています。</p>
        </div>
        <div ref={refPraised}>
          <StaffPicker
            label={SOREINE_LABELS.praised}
            staff={initialStaff}
            excludeSameNameAsStaffId={lockedRespondentId}
            valueId={praisedId}
            onChange={setPraisedId}
            error={errors.praisedId}
          />
        </div>

        <fieldset ref={refValue} className="space-y-3">
          <legend className="text-sm font-semibold text-zinc-900">
            {SOREINE_LABELS.value}
          </legend>
          <div className="flex flex-col gap-2">
            {SOREINE_VALUES.map((v) => (
              <label
                key={v}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-3 shadow-sm has-[:checked]:border-teal-500 has-[:checked]:ring-2 has-[:checked]:ring-teal-500/20"
              >
                <input
                  type="radio"
                  name="soreine-value"
                  value={v}
                  checked={value === v}
                  onChange={() => setValue(v)}
                  className="mt-1 h-4 w-4 accent-teal-600"
                />
                <span className="text-[15px] leading-snug text-zinc-800">{v}</span>
              </label>
            ))}
          </div>
          {errors.value && <p className="text-sm text-red-600">{errors.value}</p>}
        </fieldset>

        <div ref={refDetail} className="space-y-2">
          <label
            htmlFor="soreine-detail"
            className="block text-sm font-semibold text-zinc-900"
          >
            {SOREINE_LABELS.detail}
          </label>
          <textarea
            id="soreine-detail"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={5}
            placeholder={PLACEHOLDER_TEXT}
            className="w-full min-h-[7.5rem] resize-y rounded-xl border border-zinc-200 px-4 py-3 text-[15px] leading-relaxed shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/25"
          />
          {errors.detail && <p className="text-sm text-red-600">{errors.detail}</p>}
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mt-12 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        <div className="mx-auto flex max-w-2xl gap-3">
          <button
            type="button"
            onClick={clear}
            disabled={submitting}
            className="flex-1 rounded-xl border border-zinc-300 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            フォームをクリア
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="flex-1 rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
          >
            {submitting ? "送信中…" : "送信"}
          </button>
        </div>
      </footer>
    </div>
  );
}
