/** 前月比・前年同月比の差分とパーセント（表示用） */
export function pctDelta(
  current: number,
  previous: number
): { diff: number; percent: number | null } {
  if (previous === 0) {
    return { diff: current - previous, percent: null };
  }
  const p = ((current - previous) / previous) * 100;
  return { diff: current - previous, percent: Math.round(p * 10) / 10 };
}
