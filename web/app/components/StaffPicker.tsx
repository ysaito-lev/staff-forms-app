"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Staff } from "@/lib/staff-types";
import { nameKeyForMatch } from "@/lib/person-name-match";
import {
  filterStaffSearch,
  groupByDepartment,
  sortedDepartments,
} from "@/lib/staff-types";
import { PLACEHOLDER_SELECT } from "@/lib/form-copy";

export type StaffPickerProps = {
  label: string;
  staff: Staff[];
  /** MVBe で選ぶ相手など、幹部を除く */
  excludeExecutives?: boolean;
  /** 例: MVBe「該当者なし」— モーダル先頭に表示し、id を渡す */
  noneOption?: { id: string; label: string };
  /** この staff の氏名と同一（正規化後）の人を一覧に出さない（賞賛対象・MVBe 選出など） */
  excludeSameNameAsStaffId?: string | null;
  valueId: string | null;
  onChange: (id: string | null) => void;
  error?: string;
  disabled?: boolean;
};

export function StaffPicker({
  label,
  staff,
  excludeExecutives,
  noneOption,
  excludeSameNameAsStaffId,
  valueId,
  onChange,
  error,
  disabled,
}: StaffPickerProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const pool = useMemo(() => {
    let s = staff;
    if (excludeExecutives) s = s.filter((x) => !x.isExecutive);
    if (excludeSameNameAsStaffId) {
      const ref = staff.find((x) => x.id === excludeSameNameAsStaffId);
      if (ref) {
        const nk = nameKeyForMatch(ref.name);
        s = s.filter((x) => nameKeyForMatch(x.name) !== nk);
      } else {
        s = s.filter((x) => x.id !== excludeSameNameAsStaffId);
      }
    }
    return s;
  }, [staff, excludeExecutives, excludeSameNameAsStaffId]);

  const filtered = useMemo(() => filterStaffSearch(pool, q), [pool, q]);
  const grouped = useMemo(() => groupByDepartment(filtered), [filtered]);
  const depts = useMemo(() => sortedDepartments(grouped), [grouped]);

  const selected =
    valueId && (!noneOption || valueId !== noneOption.id)
      ? staff.find((s) => s.id === valueId)
      : undefined;
  const selectedNone = noneOption && valueId === noneOption.id;

  const close = useCallback(() => {
    setOpen(false);
    setQ("");
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const pick = (id: string) => {
    onChange(id);
    close();
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-zinc-900">{label}</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="flex w-full max-w-xl items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-[15px] shadow-sm transition hover:border-teal-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 disabled:opacity-50"
      >
        <span className={selected || selectedNone ? "text-zinc-900" : "text-zinc-400"}>
          {selectedNone
            ? noneOption.label
            : selected
              ? selected.name
              : PLACEHOLDER_SELECT}
        </span>
        <span className="text-zinc-400" aria-hidden>
          ▼
        </span>
      </button>
      {selectedNone && (
        <p className="text-sm text-teal-800">選択中：{noneOption.label}</p>
      )}
      {selected && !selectedNone && (
        <p className="text-sm text-teal-800">
          選択中：{selected.name}（{selected.department}）
          {selected.nickname ? `／${selected.nickname}` : ""}
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="閉じる"
            onClick={close}
          />
          <div
            className="relative flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl sm:max-h-[80vh] sm:rounded-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-picker-title"
          >
            <div className="border-b border-zinc-100 px-4 py-3">
              <h2 id="staff-picker-title" className="text-base font-semibold text-zinc-900">
                {label}
              </h2>
              <p className="mt-1 text-xs text-zinc-500">名前・ふりがな・あだ名で検索できます</p>
              <input
                type="search"
                autoFocus
                placeholder="名前・ふりがな・あだ名で検索"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="mt-3 w-full rounded-lg border border-zinc-200 px-3 py-2 text-[15px] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/25"
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              {noneOption && (
                <div className="mb-2 px-1">
                  <button
                    type="button"
                    onClick={() => pick(noneOption.id)}
                    className="w-full rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-3 text-left text-[15px] font-medium text-zinc-700 hover:border-teal-400 hover:bg-teal-50"
                  >
                    {noneOption.label}
                  </button>
                </div>
              )}
              {depts.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-zinc-500">
                  該当するスタッフがいません
                </p>
              ) : (
                depts.map((dep) => (
                  <details
                    key={dep}
                    className="group mb-1 rounded-lg border border-zinc-100 bg-zinc-50/80 open:bg-white"
                    open={Boolean(q.trim())}
                  >
                    <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-medium text-zinc-800 marker:hidden [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center justify-between">
                        {dep}
                        <span className="text-zinc-400 group-open:rotate-180">▼</span>
                      </span>
                    </summary>
                    <ul className="border-t border-zinc-100 pb-2">
                      {(grouped.get(dep) ?? []).map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => pick(s.id)}
                            className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-[15px] hover:bg-teal-50"
                          >
                            <span className="font-medium text-zinc-900">{s.name}</span>
                            <span className="text-xs text-zinc-500">
                              {s.department}
                              {s.nickname ? ` ・ ${s.nickname}` : ""}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </details>
                ))
              )}
            </div>
            <div className="border-t border-zinc-100 p-3">
              <button
                type="button"
                onClick={close}
                className="w-full rounded-lg bg-zinc-100 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-200"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
