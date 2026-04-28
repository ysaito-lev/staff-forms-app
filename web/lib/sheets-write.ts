import { google } from "googleapis";
import { getEnv, getResponsesSpreadsheetId } from "@/lib/env";
import { quoteSheetTab } from "@/lib/sheet-range";

function getAuth() {
  const e = getEnv();
  const creds = JSON.parse(e.GOOGLE_SERVICE_ACCOUNT_JSON!);
  return new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

/** A1 範囲（例: `'シート'!A5:E5`）の開始行（1 始まり） */
export function parseA1StartRow(updatedRange: string): number | null {
  const bang = updatedRange.lastIndexOf("!");
  if (bang === -1) return null;
  const after = updatedRange.slice(bang + 1);
  const m = after.match(/^([A-Za-z]+)(\d+)(?::|$)/);
  if (!m) return null;
  return parseInt(m[2]!, 10);
}

/**
 * 最終行に 1 行追記。API が返す `updatedRange` から行番号（1 始まり）を解釈する。
 * 得られなければ null。
 */
export async function appendSheetRow(
  sheetTab: string,
  values: (string | number | boolean | null)[],
  spreadsheetId?: string
): Promise<number | null> {
  const id = spreadsheetId ?? getResponsesSpreadsheetId();
  const sheets = google.sheets({ version: "v4", auth: getAuth() });
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: id,
    range: `${quoteSheetTab(sheetTab)}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [values.map((v) => (v === null || v === undefined ? "" : String(v)))],
    },
  });
  const range = res.data.updates?.updatedRange;
  if (!range) return null;
  return parseA1StartRow(range);
}

/** スプレッドシート内のセルをまとめて更新 */
export async function batchUpdateCellsInResponsesSpreadsheet(
  sheetTab: string,
  cellUpdates: { row: number; colLetter: string; value: string }[],
  spreadsheetId?: string
): Promise<void> {
  if (cellUpdates.length === 0) return;
  const id = spreadsheetId ?? getResponsesSpreadsheetId();
  const sheets = google.sheets({ version: "v4", auth: getAuth() });
  const tab = quoteSheetTab(sheetTab);
  const data = cellUpdates.map((u) => ({
    range: `${tab}!${u.colLetter}${u.row}`,
    values: [[u.value]],
  }));
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: id,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data,
    },
  });
}
