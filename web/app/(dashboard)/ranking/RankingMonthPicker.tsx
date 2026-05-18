"use client";

import { YmRouteMonthPicker } from "@/app/components/YmRouteMonthPicker";

type Props = {
  value: string;
  minYm: string;
  maxYm: string;
};

export function RankingMonthPicker({ value, minYm, maxYm }: Props) {
  return (
    <YmRouteMonthPicker
      value={value}
      minYm={minYm}
      maxYm={maxYm}
      inputId="ranking-month"
      label="集計月（日本時間・暦月）"
      pathname="/ranking"
      className="max-w-sm"
    />
  );
}
