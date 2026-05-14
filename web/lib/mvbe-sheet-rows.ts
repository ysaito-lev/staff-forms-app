import { getEnv, getMvbeSpreadsheetId } from "@/lib/env";
import { getSheetRows } from "@/lib/sheets-read";

/**
 * MVBe 回答の読み取り用。`SHEET_RESPONSES_MVBE` と、設定されていれば
 * `SHEET_RESPONSES_MVBE_LEGACY`（同一 `getMvbeSpreadsheetId()`）を縦に結合する。
 * `POST /api/forms/mvbe` の追記は常に `SHEET_RESPONSES_MVBE` のみ。
 */
export async function getMergedMvbeSheetRowsForRead(): Promise<string[][]> {
  const e = getEnv();
  const ssid = getMvbeSpreadsheetId();
  const primaryTab = e.SHEET_RESPONSES_MVBE.trim();
  const legacyTab = e.SHEET_RESPONSES_MVBE_LEGACY?.trim();
  const primary = await getSheetRows(primaryTab, ssid);
  if (!legacyTab || legacyTab === primaryTab) {
    return primary;
  }
  const legacy = await getSheetRows(legacyTab, ssid);
  return [...legacy, ...primary];
}
