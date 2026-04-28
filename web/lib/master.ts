import { google } from "googleapis";
import { unstable_cache } from "next/cache";
import { EXECUTIVE_DEPARTMENT_NAMES } from "@/lib/departments";
import {
  isExecutiveByNameList,
  parseExecutiveNameKeys,
} from "@/lib/executive-env";
import type { Staff } from "@/lib/staff-types";
import { getEnv, mockMasterEnabled, sheetsConfigured } from "@/lib/env";
import { quoteSheetTab } from "@/lib/sheet-range";

const MOCK_STAFF: Staff[] = [
  {
    id: "山田 太郎",
    name: "山田 太郎",
    department: "営業",
    furigana: "やまだ たろう",
    nickname: "ヤマちゃん",
    isExecutive: false,
  },
  {
    id: "佐藤 花子",
    name: "佐藤 花子",
    department: "講師",
    furigana: "さとう はなこ",
    nickname: null,
    isExecutive: false,
  },
  {
    id: "鈴木 一郎",
    name: "鈴木 一郎",
    department: "CTO室",
    furigana: "すずき いちろう",
    nickname: "スズ",
    isExecutive: true,
  },
  {
    id: "田中 美咲",
    name: "田中 美咲",
    department: "人事",
    furigana: "たなか みさき",
    nickname: "みー",
    isExecutive: false,
  },
];

const REVAL = Math.min(
  3600,
  Math.max(5, Number(process.env.MASTER_CACHE_SECONDS) || 120)
);

function getJstCurrentMonthSheetTitle(): string {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
  });
  const parts = f.formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  if (!y || !m) {
    const d = new Date();
    return `${d.getFullYear()}年${d.getMonth() + 1}月`;
  }
  return `${y}年${m}月`;
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "");
}

function colIndex(headers: string[], ...candidates: string[]): number {
  const norm = headers.map(normalizeHeader);
  for (const c of candidates) {
    const i = norm.indexOf(normalizeHeader(c));
    if (i >= 0) return i;
  }
  return -1;
}

function parseBool(v: string | undefined): boolean {
  if (!v) return false;
  const s = v.trim().toLowerCase();
  return s === "true" || s === "1" || s === "はい" || s === "yes" || s === "y";
}

function isOfflineMemberType(v: string | undefined): boolean {
  if (!v) return false;
  const t = v.replace(/\s/g, "");
  return t.includes("オフライン");
}

function formatDepartmentLine(main: string, sub: string): string {
  if (sub) return `${main}（${sub}）`;
  return main;
}

function getSheets() {
  const e = getEnv();
  const creds = JSON.parse(e.GOOGLE_SERVICE_ACCOUNT_JSON!);
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

async function fetchRetiredNameSet(sheets: ReturnType<typeof getSheets>): Promise<Set<string>> {
  const e = getEnv();
  const tab = quoteSheetTab(e.SHEET_ENROLLMENT);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: e.GOOGLE_SPREADSHEET_ID!,
    range: `${tab}!A1:C50000`,
  });
  const rows = (res.data.values as string[][]) ?? [];
  if (rows.length < 1) return new Set();
  const headers = rows[0].map((h) => String(h ?? "").trim());
  const iName = colIndex(headers, "氏名", "name");
  const iStatus = colIndex(headers, "在籍状況", "status", "在籍");
  const nameCol = iName >= 0 ? iName : 0;
  const statusCol = iStatus >= 0 ? iStatus : 2;
  const out = new Set<string>();
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row?.length) continue;
    const name = String(row[nameCol] ?? "").trim();
    if (!name) continue;
    const st = String(row[statusCol] ?? "").trim();
    if (st.includes("退職済み")) {
      out.add(name);
    }
  }
  return out;
}

async function fetchMonthMasterRows(
  sheets: ReturnType<typeof getSheets>
): Promise<string[][]> {
  const e = getEnv();
  const monthTitle = getJstCurrentMonthSheetTitle();
  if (e.SHEET_MASTER_DEBUG && e.SHEET_MASTER_DEBUG.length > 0) {
    const tab = quoteSheetTab(e.SHEET_MASTER_DEBUG);
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: e.GOOGLE_SPREADSHEET_ID!,
      range: `${tab}!A1:Z10000`,
    });
    return (res.data.values as string[][]) ?? [];
  }
  const tab = quoteSheetTab(monthTitle);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: e.GOOGLE_SPREADSHEET_ID!,
    range: `${tab}!A1:Z10000`,
  });
  return (res.data.values as string[][]) ?? [];
}

function resolveIsExecutive(
  name: string,
  execKeys: ReturnType<typeof parseExecutiveNameKeys>,
  legacy: () => boolean
): boolean {
  if (execKeys) return isExecutiveByNameList(name, execKeys);
  return legacy();
}

function rowsToStaff(rows: string[][], retired: Set<string>): Staff[] {
  if (rows.length < 2) return [];
  const execKeys = parseExecutiveNameKeys(getEnv().EXECUTIVE_STAFF_NAMES);
  const headers = rows[0].map((h) => String(h ?? "").trim());
  const idxId = colIndex(headers, "スタッフID", "staff_id", "id", "職員id");
  const idxName = colIndex(headers, "氏名", "name", "表示名");
  const idxFuri = colIndex(headers, "ふりがな", "ふりがな（全角）", "フリガナ");
  const idxNick = colIndex(headers, "あだ名", "nickname", "ニックネーム");
  const idxMail = colIndex(
    headers,
    "メール",
    "ワークスペースメール",
    "メールアドレス",
    "email",
    "e-mail"
  );
  const idxMainDep = colIndex(headers, "メイン部署", "部署", "department");
  const idxSubDep = colIndex(headers, "サブ部署", "サブ", "副部署");
  const idxKind = colIndex(headers, "メンバー区分", "区分", "勤務区分");
  const idxExec = colIndex(headers, "幹部", "is_executive", "executive");

  const useNewLayout = idxName >= 0 && idxMainDep >= 0 && idxKind >= 0;

  if (useNewLayout) {
    const out: Staff[] = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row?.length) continue;
      const name = String(row[idxName] ?? "").trim();
      if (!name) continue;
      if (retired.has(name)) continue;
      if (!isOfflineMemberType(String(row[idxKind] ?? ""))) continue;

      const id =
        idxId >= 0 && String(row[idxId] ?? "").trim()
          ? String(row[idxId]).trim()
          : name;
      const furi = idxFuri >= 0 ? String(row[idxFuri] ?? "").trim() : "";
      const mainDep = String(row[idxMainDep] ?? "").trim();
      const subDep = idxSubDep >= 0 ? String(row[idxSubDep] ?? "").trim() : "";
      const department = formatDepartmentLine(mainDep, subDep);
      const rawNick = idxNick >= 0 ? row[idxNick] : undefined;
      const nickname =
        rawNick === undefined || rawNick === ""
          ? null
          : String(rawNick).trim() || null;
      const mailRaw =
        idxMail >= 0 ? String(row[idxMail] ?? "").trim().toLowerCase() : "";
      const matchEmail = mailRaw || null;
      const execFromCol =
        idxExec >= 0 ? parseBool(String(row[idxExec] ?? "")) : null;
      const isExecutive = resolveIsExecutive(name, execKeys, () =>
        execFromCol !== null
          ? execFromCol
          : EXECUTIVE_DEPARTMENT_NAMES.has(mainDep) ||
            EXECUTIVE_DEPARTMENT_NAMES.has(subDep)
      );
      out.push({
        id,
        name,
        matchEmail,
        department,
        furigana: furi,
        nickname,
        isExecutive,
      });
    }
    return out;
  }

  // 旧列レイアウト
  const idxDep = colIndex(headers, "部署", "department", "メイン部署");
  const idxStatus = colIndex(headers, "在籍状態", "在籍状況", "status");
  const idxMailLegacy = colIndex(
    headers,
    "メール",
    "ワークスペースメール",
    "メールアドレス",
    "email",
    "e-mail"
  );

  const fallback =
    idxId < 0 &&
    idxName < 0 &&
    idxDep < 0 &&
    idxNick < 0 &&
    idxStatus < 0;

  const out: Staff[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row?.length) continue;
    const id = fallback
      ? String(row[0] ?? "").trim()
      : String(row[idxId >= 0 ? idxId : 0] ?? "").trim();
    const name = fallback
      ? String(row[1] ?? "").trim()
      : String(row[idxName >= 0 ? idxName : 1] ?? "").trim();
    if (!id || !name) continue;
    if (retired.has(name)) continue;
    const department = fallback
      ? String(row[2] ?? "").trim()
      : String(row[idxDep >= 0 ? idxDep : 2] ?? "").trim();
    const nicknameRaw = fallback ? row[3] : row[idxNick >= 0 ? idxNick : 3];
    const nickname =
      nicknameRaw === undefined || nicknameRaw === ""
        ? null
        : String(nicknameRaw).trim() || null;
    const statusRaw = fallback ? row[5] : row[idxStatus >= 0 ? idxStatus : 5];
    const active = parseStatusActiveLegacy(statusRaw ? String(statusRaw) : undefined);
    if (!active) continue;
    const mailLegacy =
      idxMailLegacy >= 0
        ? String(row[idxMailLegacy] ?? "").trim().toLowerCase()
        : "";
    const matchEmail = mailLegacy || null;
    const idxExecOld = colIndex(headers, "幹部", "is_executive", "executive");
    const execRaw = row[idxExecOld >= 0 ? idxExecOld : 4];
    const isExecutive = resolveIsExecutive(name, execKeys, () =>
      parseBool(execRaw ? String(execRaw) : undefined)
    );
    out.push({
      id,
      name,
      matchEmail,
      department,
      furigana: "",
      nickname,
      isExecutive,
    });
  }
  return out;
}

function parseStatusActiveLegacy(v: string | undefined): boolean {
  if (!v) return true;
  const s = v.trim().toLowerCase();
  if (s === "退職" || s === "retired" || s === "inactive" || s === "0") {
    return false;
  }
  return s === "在籍" || s === "active" || s === "1" || s === "true" || s === "";
}

async function loadActiveStaffFromSheets(): Promise<Staff[]> {
  const sheets = getSheets();
  const [retired, monthRows] = await Promise.all([
    fetchRetiredNameSet(sheets),
    fetchMonthMasterRows(sheets),
  ]);
  return rowsToStaff(monthRows, retired);
}

function applyExecutiveNamesFromEnv(staff: Staff[]): Staff[] {
  const execKeys = parseExecutiveNameKeys(getEnv().EXECUTIVE_STAFF_NAMES);
  if (!execKeys) return staff;
  return staff.map((s) => ({
    ...s,
    isExecutive: isExecutiveByNameList(s.name, execKeys),
  }));
}

export async function getActiveStaff(): Promise<Staff[]> {
  if (mockMasterEnabled() || !sheetsConfigured()) {
    return applyExecutiveNamesFromEnv([...MOCK_STAFF]);
  }
  try {
    /** キーに含めないと EXECUTIVE_STAFF_NAMES 変更後も古い isExecutive の配列がキャッシュから返る */
    const execSig = getEnv().EXECUTIVE_STAFF_NAMES?.trim() ?? "";
    const cached = unstable_cache(
      () => loadActiveStaffFromSheets(),
      ["active-staff-v3-monthly", execSig],
      { revalidate: REVAL }
    );
    return await cached();
  } catch (err) {
    console.error("マスタシートの取得に失敗しました", err);
    if (process.env.NODE_ENV === "development") {
      return applyExecutiveNamesFromEnv([...MOCK_STAFF]);
    }
    throw err;
  }
}

export function getStaffByIdMap(staff: Staff[]): Map<string, Staff> {
  return new Map(staff.map((s) => [s.id, s]));
}
