/**
 * 集計基準は Asia/Tokyo。
 * ソレイイネ!! は「締切：毎週月曜 23:59（JST）」→ 実装上 `[火曜 0:00, 翌火曜 0:00)` の7日間で判定。
 */
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

/** 月曜 0:00 JST 始まりの ISO 週の月曜 0:00（ソレイイネの提出期間とは別） */
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

/** アンカーが属するソレイイネ提出期の「締切月曜」（JST 暦日） */
function soreineClosingMondayYmd(anchor: Date): { y: number; m: number; day: number } {
  const ymd = ymdJst(anchor);
  const w = weekdayMon0JstOnCalendarYmd(ymd);
  const daysToClosingMon = w === 0 ? 0 : 7 - w;
  const noon = jstNoonOnCalendarDate(ymd.y, ymd.m, ymd.day);
  const target = new Date(noon.getTime() + daysToClosingMon * 864e5);
  return ymdJst(target);
}

/**
 * ソレイイネ提出期（JST）：火曜 0:00 〜 翌火曜 0:00 未満（締切月曜 23:59 までを含む）。
 */
export function getSoreineSubmissionPeriodBoundsJst(
  anchor: Date
): { start: Date; endExclusive: Date } {
  const close = soreineClosingMondayYmd(anchor);
  const closeNoon = jstNoonOnCalendarDate(close.y, close.m, close.day);
  const tuesdayNoon = new Date(closeNoon.getTime() - 6 * 864e5);
  const tue = ymdJst(tuesdayNoon);
  const start = jstDayStart(tue.y, tue.m, tue.day);
  const endExclusive = startOfNextCalendarDayJst(closeNoon);
  return { start, endExclusive };
}

/** `iso` がアンカー時点の「今回の」ソレイイネ提出期内か（締切：その週の月曜 23:59 JST） */
export function inCurrentSoreineSubmissionPeriod(
  iso: string,
  anchor: Date = new Date()
): boolean {
  const { start, endExclusive } = getSoreineSubmissionPeriodBoundsJst(anchor);
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return false;
  return t >= start && t < endExclusive;
}

/** 暦月と交差するソレイイネ提出期（各 `[火曜0:00, 翌火曜0:00)`）を列挙 */
export function soreineSubmissionPeriodsOverlappingCalendarMonth(
  year: number,
  month: number
): { start: Date; endExclusive: Date }[] {
  const { start: ms, endExclusive: me } = getCalendarMonthRangeJst(year, month);
  const msYmd = ymdJst(ms);
  const w = weekdayMon0JstOnCalendarYmd(msYmd);
  const daysBack = w === 0 ? 6 : w === 1 ? 0 : w - 1;
  const noonMs = jstNoonOnCalendarDate(msYmd.y, msYmd.m, msYmd.day);
  const tuesdayYmd = ymdJst(new Date(noonMs.getTime() - daysBack * 864e5));
  let periodStart = jstDayStart(tuesdayYmd.y, tuesdayYmd.m, tuesdayYmd.day);
  const out: { start: Date; endExclusive: Date }[] = [];
  while (periodStart < me) {
    const periodEndExclusive = new Date(periodStart.getTime() + 7 * 864e5);
    if (periodStart < me && periodEndExclusive > ms) {
      out.push({ start: periodStart, endExclusive: periodEndExclusive });
    }
    periodStart = periodEndExclusive;
  }
  return out;
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

/** リマインド文案用：現在のMVBe提出ウィンドウの説明（JST） */
export function describeMvbeSubmissionWindowJst(anchor: Date = new Date()): string {
  const { y, m, day } = ymdJst(anchor);
  if (day <= 15) {
    const pm = prevCalendarMonth(y, m);
    return `${pm.y}年${pm.m}月16日〜${y}年${m}月15日（日本時間）`;
  }
  return `${y}年${m}月16日〜今日まで（日本時間）`;
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

/** JST: 各月16日0:00開始のMVBe提出ウィンドウ `[start, endExclusive)`（翌月16日0:00まで）。 */
export function mvbeCanonicalWindowFromSixteenth(
  year: number,
  month: number
): { start: Date; endExclusive: Date } {
  const start = jstDayStart(year, month, 16);
  const ny = month === 12 ? year + 1 : year;
  const nm = month === 12 ? 1 : month + 1;
  const endExclusive = jstDayStart(ny, nm, 16);
  return { start, endExclusive };
}

/** 指定暦月（JST）と区間が重なるMVBeウィンドウ一覧（通常1〜2件）。 */
export function mvbeCanonicalWindowsOverlappingCalendarMonth(
  year: number,
  month: number
): { start: Date; endExclusive: Date }[] {
  const { start: ms, endExclusive: me } = getCalendarMonthRangeJst(year, month);
  const out: { start: Date; endExclusive: Date }[] = [];
  for (let delta = -1; delta <= 1; delta++) {
    const idx = year * 12 + (month - 1) + delta;
    const wy = Math.floor(idx / 12);
    const wm = (idx % 12) + 1;
    const w = mvbeCanonicalWindowFromSixteenth(wy, wm);
    if (w.start < me && w.endExclusive > ms) out.push(w);
  }
  return out;
}

/** ISO週（月曜0:00 JST 開始・7日間）で指定暦月と交差するものを列挙。 */
export function isoWeekRangesOverlappingCalendarMonth(
  year: number,
  month: number
): { start: Date; endExclusive: Date }[] {
  const { start: ms, endExclusive: me } = getCalendarMonthRangeJst(year, month);
  const out: { start: Date; endExclusive: Date }[] = [];
  let ws = startOfIsoWeekJst(ms);
  while (ws < me) {
    const we = new Date(ws.getTime() + 7 * 864e5);
    if (ws < me && we > ms) out.push({ start: ws, endExclusive: we });
    ws = we;
  }
  return out;
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

/** 強みレポート AI の「同一月」判定用キー（Asia/Tokyo 暦・`yyyy-mm`） */
export function getCalendarMonthKeyJst(d: Date = new Date()): string {
  const a = ymdJst(d);
  return `${a.y.toString().padStart(4, "0")}-${pad2(a.m)}`;
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
