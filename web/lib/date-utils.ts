/** 集計基準: 月曜0:00・暦月（本文は status 画面と同じ。計算は Asia/Tokyo） */
const REPORT_TZ = "Asia/Tokyo";

function jstNoonOnCalendarDate(y: number, m: number, day: number): Date {
  const p = (n: number) => n.toString().padStart(2, "0");
  return new Date(
    `${y.toString().padStart(4, "0")}-${p(m)}-${p(day)}T12:00:00+09:00`
  );
}

function ymdJst(d: Date): { y: number; m: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: REPORT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  let y = 0,
    m = 0,
    day = 0;
  for (const p of parts) {
    if (p.type === "year") y = +p.value;
    if (p.type === "month") m = +p.value;
    if (p.type === "day") day = +p.value;
  }
  return { y, m, day };
}

/** 月曜=0 … 日曜=6（Asia/Tokyo の暦上の日付基準） */
function weekdayMon0JstOnCalendarYmd(ymd: { y: number; m: number; day: number }): number {
  const t = jstNoonOnCalendarDate(ymd.y, ymd.m, ymd.day);
  const wk = t.toLocaleString("en-US", { timeZone: REPORT_TZ, weekday: "short" });
  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  return map[wk] ?? 0;
}

/** 月曜 0:00 JST 始まりの週区切り（「今週」判定等と同じ定義） */
export function startOfIsoWeekJst(anchor: Date): Date {
  const ymd = ymdJst(anchor);
  const mid = jstNoonOnCalendarDate(ymd.y, ymd.m, ymd.day);
  const w = weekdayMon0JstOnCalendarYmd(ymd);
  const d0 = new Date(mid.getTime() - w * 864e5);
  const mon = ymdJst(d0);
  return new Date(
    `${mon.y.toString().padStart(4, "0")}-${mon.m.toString().padStart(2, "0")}-${mon.day.toString().padStart(2, "0")}T00:00:00+09:00`
  );
}

export function inThisWeek(iso: string): boolean {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return false;
  const start = startOfIsoWeekJst(new Date());
  const end = new Date(start.getTime() + 7 * 864e5);
  return t >= start && t < end;
}

export function inThisMonth(iso: string): boolean {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return false;
  const a = ymdJst(t);
  const b = ymdJst(new Date());
  return a.y === b.y && a.m === b.m;
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

/** JST 暦日の 0:00（その日の始まり）。 */
function jstDayStart(y: number, m: number, day: number): Date {
  return new Date(
    `${y.toString().padStart(4, "0")}-${pad2(m)}-${pad2(day)}T00:00:00+09:00`
  );
}

function prevCalendarMonth(y: number, m: number): { y: number; m: number } {
  if (m <= 1) return { y: y - 1, m: 12 };
  return { y, m: m - 1 };
}

/** anchor を JST とみなした「翌日」の 0:00 JST。 */
function startOfNextCalendarDayJst(anchor: Date): Date {
  const { y, m, day } = ymdJst(anchor);
  const noon = jstNoonOnCalendarDate(y, m, day);
  const plus = new Date(noon.getTime() + 864e5);
  const n = ymdJst(plus);
  return jstDayStart(n.y, n.m, n.day);
}

/**
 * MVBe「回答済み／同一提出期」のウィンドウ（JST）。
 * - 本日が 1〜15 日: [前月16日0:00, 今月16日0:00)
 * - 本日が 16 日以降: [今月16日0:00, 明日0:00)
 */
export function submissionInMvbeWindowJst(
  iso: string,
  anchor: Date = new Date()
): boolean {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return false;
  const { y: cy, m: cm, day: cday } = ymdJst(anchor);

  if (cday <= 15) {
    const { y: py, m: pm } = prevCalendarMonth(cy, cm);
    const start = jstDayStart(py, pm, 16);
    const endExclusive = jstDayStart(cy, cm, 16);
    return t >= start && t < endExclusive;
  }

  const start = jstDayStart(cy, cm, 16);
  const endExclusive = startOfNextCalendarDayJst(anchor);
  return t >= start && t < endExclusive;
}

/** 日時が指定した暦月（Asia/Tokyo）に含まれるか */
export function inCalendarMonthJst(
  iso: string,
  year: number,
  month: number
): boolean {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return false;
  const a = ymdJst(t);
  return a.y === year && a.m === month;
}

/** ISO 文字列（normalize 後可）の暦年・月（Asia/Tokyo） */
export function getJstYearMonthFromIso(
  iso: string
): { year: number; month: number } | null {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return null;
  const a = ymdJst(t);
  return { year: a.y, month: a.m };
}

/**
 * 指定暦月（JST）の [開始, 終了) 。終了は翌月1日0:00 JST 未満。
 */
export function getCalendarMonthRangeJst(
  year: number,
  month: number
): { start: Date; endExclusive: Date } {
  const p = (n: number) => n.toString().padStart(2, "0");
  const start = new Date(
    `${year.toString().padStart(4, "0")}-${p(month)}-01T00:00:00+09:00`
  );
  const nextY = month === 12 ? year + 1 : year;
  const nextM = month === 12 ? 1 : month + 1;
  const endExclusive = new Date(
    `${nextY.toString().padStart(4, "0")}-${p(nextM)}-01T00:00:00+09:00`
  );
  return { start, endExclusive };
}

/** 日時が [start, endExclusive) を満たすか（JST 暦月境界と組み合わせて利用） */
export function isIsoInRange(
  iso: string,
  start: Date,
  endExclusive: Date
): boolean {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return false;
  return t >= start && t < endExclusive;
}

export function getCurrentYearMonthJst(): { year: number; month: number } {
  const a = ymdJst(new Date());
  return { year: a.y, month: a.m };
}

/**
 * 回答スプレッドシート1列目の保存形式。日本時間（Asia/Tokyo）。
 * 例: 2026/01/05 7:35:06
 */
export function formatResponseSheetTimestampJst(d: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: REPORT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const y = get("year");
  const mo = get("month").padStart(2, "0");
  const day = get("day").padStart(2, "0");
  const hour = String(parseInt(get("hour") || "0", 10));
  const min = get("minute").padStart(2, "0");
  const sec = get("second").padStart(2, "0");
  return `${y}/${mo}/${day} ${hour}:${min}:${sec}`;
}

/**
 * 画面表示用：ISO 等の日時を、日本（Asia/Tokyo）で読みやすい形式にする
 * 例: 2026年4月22日 18:48
 */
export function formatDateTimeForDisplay(iso: string): string {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: REPORT_TZ,
    dateStyle: "long",
    timeStyle: "short",
  }).format(t);
}

/**
 * スプレッドシートの1列目の日時を、比較・ソート用に正規化（可能なら ISO へ）
 * `formatResponseSheetTimestampJst` 形式（JST）および従来の ISO 等を解釈する
 */
export function normalizeSheetTimestamp(raw: string): string {
  const s = raw.trim();
  if (!s) return s;
  const slash = s.match(
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2}):(\d{2})$/
  );
  if (slash) {
    const [, y, mo, d, h, min, sec] = slash;
    const iso = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}T${h.padStart(2, "0")}:${min}:${sec}+09:00`;
    const t = new Date(iso);
    if (!Number.isNaN(t.getTime())) return t.toISOString();
  }
  const t = new Date(s);
  if (Number.isNaN(t.getTime())) return s;
  return t.toISOString();
}
