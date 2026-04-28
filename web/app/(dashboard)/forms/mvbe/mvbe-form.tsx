"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Staff } from "@/lib/staff-types";
import {
  MVBE_BLOCKS,
  MVBE_INTRO,
  MVBE_LABEL_RESPONDENT,
  MVBE_NO_NOMINEE_ID,
  MVBE_NO_NOMINEE_LABEL,
  MVBE_TITLE,
  PLACEHOLDER_TEXT,
} from "@/lib/form-copy";
import type { MvbeBlockKey } from "@/lib/form-copy";
import { IntroText } from "@/app/components/IntroText";
import { StaffPicker } from "@/app/components/StaffPicker";
import { nameKeyForMatch } from "@/lib/person-name-match";

type BlockState = { staffId: string | null; reason: string };

type FieldErrors = Record<string, string>;

const emptyBlocks = (): Record<MvbeBlockKey, BlockState> => ({
  better: { staffId: null, reason: "" },
  honest: { staffId: null, reason: "" },
  proactive: { staffId: null, reason: "" },
  challenging: { staffId: null, reason: "" },
  authentic: { staffId: null, reason: "" },
});

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
  const [blocks, setBlocks] = useState(emptyBlocks);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setRespondentId(lockedRespondentId);
  }, [lockedRespondentId]);

  useEffect(() => {
    if (!lockedRespondentId) return;
    const self = initialStaff.find((s) => s.id === lockedRespondentId);
    if (!self) return;
    const nk = nameKeyForMatch(self.name);
    setBlocks((prev) => {
      let touched = false;
      const next = { ...prev };
      for (const b of MVBE_BLOCKS) {
        const sid = prev[b.key].staffId;
        if (!sid || sid === MVBE_NO_NOMINEE_ID) continue;
        const st = initialStaff.find((s) => s.id === sid);
        if (st && nameKeyForMatch(st.name) === nk) {
          next[b.key] = { ...prev[b.key], staffId: null };
          touched = true;
        }
      }
      return touched ? next : prev;
    });
  }, [initialStaff, lockedRespondentId]);

  const refs = {
    respondent: useRef<HTMLDivElement>(null),
    better: useRef<HTMLDivElement>(null),
    honest: useRef<HTMLDivElement>(null),
    proactive: useRef<HTMLDivElement>(null),
    challenging: useRef<HTMLDivElement>(null),
    authentic: useRef<HTMLDivElement>(null),
  };

  const completed = useMemo(() => {
    let n = 0;
    if (respondentId) n += 1;
    for (const b of MVBE_BLOCKS) {
      const st = blocks[b.key];
      if (st.staffId === MVBE_NO_NOMINEE_ID) n += 1;
      else if (st.staffId && st.reason.trim()) n += 1;
    }
    return n;
  }, [respondentId, blocks]);

  const totalSteps = 1 + MVBE_BLOCKS.length;

  const scrollTo = (el: HTMLElement | null) => {
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const setBlock = (key: MvbeBlockKey, patch: Partial<BlockState>) => {
    setBlocks((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const validate = (): { errs: FieldErrors; firstKey: keyof typeof refs | null } => {
    const errs: FieldErrors = {};
    if (!respondentId) errs.respondent = "必須です";
    let firstKey: keyof typeof refs | null = errs.respondent ? "respondent" : null;

    const self = respondentId
      ? initialStaff.find((s) => s.id === respondentId)
      : undefined;
    const selfNk = self ? nameKeyForMatch(self.name) : null;

    for (const b of MVBE_BLOCKS) {
      const st = blocks[b.key];
      if (!st.staffId) {
        errs[b.key] = "必須です";
        if (!firstKey) firstKey = b.key;
      }
      if (
        st.staffId &&
        st.staffId !== MVBE_NO_NOMINEE_ID &&
        selfNk
      ) {
        const nom = initialStaff.find((s) => s.id === st.staffId);
        if (nom && nameKeyForMatch(nom.name) === selfNk) {
          errs[b.key] = "自分と同一の氏名は選べません";
          if (!firstKey) firstKey = b.key;
        }
      }
      if (
        st.staffId &&
        st.staffId !== MVBE_NO_NOMINEE_ID &&
        !st.reason.trim()
      ) {
        errs[`${b.key}Reason` as const] = "必須です";
        if (!firstKey) firstKey = b.key;
      }
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
      const body = {
        blocks: Object.fromEntries(
          MVBE_BLOCKS.map((b) => {
            const st = blocks[b.key];
            return [
              b.key,
              { staffId: st.staffId!, reason: st.reason.trim() },
            ];
          })
        ),
      };
      const res = await fetch("/api/forms/mvbe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  const clear = () => {
    if (!window.confirm("入力内容をすべて消しますか？")) return;
    setRespondentId(lockedRespondentId);
    setBlocks(emptyBlocks());
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
            {MVBE_TITLE}
          </h1>
          <p className="mt-2 text-sm text-teal-900">
            進捗：{completed} / {totalSteps} 完了
          </p>
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
            同一評価期間内での再送信はできません（ウィンドウは月の前半は前月16日〜当月15日、後半は当月16日〜本日まで）。
            内容の確認は{" "}
            <Link href="/my-answers" className="font-medium text-teal-800 underline">
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
        {MVBE_BLOCKS.map((b, i) => (
          <section
            key={b.key}
            ref={refs[b.key]}
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-medium text-zinc-500">
              {i + 1} / {MVBE_BLOCKS.length}
            </p>
            <h2 className="mt-1 text-lg font-bold text-zinc-900">{b.heading}</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{b.description}</p>

            <div className="mt-6">
              <StaffPicker
                label="選出するメンバー"
                staff={initialStaff}
                excludeExecutives
                excludeSameNameAsStaffId={lockedRespondentId}
                noneOption={{
                  id: MVBE_NO_NOMINEE_ID,
                  label: MVBE_NO_NOMINEE_LABEL,
                }}
                valueId={blocks[b.key].staffId}
                onChange={(id) => setBlock(b.key, { staffId: id })}
                error={errors[b.key]}
              />
            </div>

            <div className="mt-6 space-y-2">
              <label
                htmlFor={`mvbe-reason-${b.key}`}
                className="block text-sm font-semibold text-zinc-900"
              >
                {b.reasonLabel}
              </label>
              {blocks[b.key].staffId === MVBE_NO_NOMINEE_ID && (
                <p className="text-xs text-zinc-500">
                  「{MVBE_NO_NOMINEE_LABEL}」の場合、理由の入力は任意です（補足があれば記入ください）。
                </p>
              )}
              <textarea
                id={`mvbe-reason-${b.key}`}
                value={blocks[b.key].reason}
                onChange={(e) => setBlock(b.key, { reason: e.target.value })}
                rows={4}
                placeholder={PLACEHOLDER_TEXT}
                className="w-full min-h-[6rem] resize-y rounded-xl border border-zinc-200 px-4 py-3 text-[15px] leading-relaxed shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/25"
              />
              {errors[`${b.key}Reason`] && (
                <p className="text-sm text-red-600">{errors[`${b.key}Reason`]}</p>
              )}
            </div>
          </section>
        ))}
      </div>

      <footer className="fixed bottom-0 left-0 right-0 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mt-12 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        <div className="mx-auto flex max-w-2xl gap-3">
          <button
            type="button"
            onClick={clear}
            disabled={submitting || alreadySubmittedThisMonth}
            className="flex-1 rounded-xl border border-zinc-300 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            フォームをクリア
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || alreadySubmittedThisMonth}
            className="flex-1 rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
          >
            {submitting ? "送信中…" : "送信"}
          </button>
        </div>
      </footer>
    </div>
  );
}
