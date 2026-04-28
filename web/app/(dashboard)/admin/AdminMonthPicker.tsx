"use client";

import { useRouter } from "next/navigation";

type Props = {
  value: string;
  minYm: string;
  maxYm: string;
};

export function AdminMonthPicker({ value, minYm, maxYm }: Props) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-1 sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="admin-ym" className="text-sm font-medium text-slate-700">
          集計月（日本時間・暦月）
        </label>
        <input
          id="admin-ym"
          type="month"
          name="ym"
          min={minYm}
          max={maxYm}
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (v) router.push(`/admin?ym=${v}`);
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}
