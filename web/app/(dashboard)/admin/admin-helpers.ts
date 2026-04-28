/** 1-based month m の最終日（ローカル Date の慣用パターン） */
export function lastDayOfCalendarMonth(
  year: number,
  month1to12: number
): number {
  return new Date(year, month1to12, 0).getDate();
}

export function formatYmdJst(
  y: number,
  m: number,
  day: number
): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function firstAndLastYmdOfMonth(
  y: number,
  m: number
): { from: string; to: string } {
  const last = lastDayOfCalendarMonth(y, m);
  return {
    from: formatYmdJst(y, m, 1),
    to: formatYmdJst(y, m, last),
  };
}
