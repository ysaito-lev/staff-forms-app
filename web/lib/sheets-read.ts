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

/**
 * シートの全行を取得（ヘッダー行含む）
 * @param spreadsheetId 未指定時は `getResponsesSpreadsheetId()`（レガシー単一ブック）
 */
export async function getSheetRows(
  sheetTab: string,
  spreadsheetId?: string
): Promise<string[][]> {
  const id = spreadsheetId ?? getResponsesSpreadsheetId();
  const sheets = google.sheets({ version: "v4", auth: getAuth() });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range: `${quoteSheetTab(sheetTab)}!A1:ZZ50000`,
  });
  return (res.data.values as string[][]) ?? [];
}
