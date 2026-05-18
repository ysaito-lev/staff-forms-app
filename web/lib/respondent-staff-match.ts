import { nameKeyForMatch } from "@/lib/person-name-match";
import {
  isMvbeV2Row,
  isWideMvbeWithIdColumns,
  MVBE_V2_I,
  parseSoreineRowToDisplay,
} from "@/lib/response-sheet-layout";
import type { Staff } from "@/lib/staff-types";

export function findStaffByRespondentCells(
  staffList: Staff[],
  cells: string[]
): Staff | null {
  for (const c of cells) {
    const t = c.trim();
    if (!t) continue;
    for (const s of staffList) {
      if (s.id === t) return s;
    }
  }
  for (const c of cells) {
    const t = c.trim();
    if (!t) continue;
    const k = nameKeyForMatch(t);
    if (!k) continue;
    for (const s of staffList) {
      if (nameKeyForMatch(s.name) === k) return s;
    }
  }
  return null;
}

export function soreineRespondentCells(row: string[]): string[] {
  const parsed = parseSoreineRowToDisplay(row);
  if (parsed) {
    return [String(row[1] ?? "").trim()].filter(Boolean);
  }
  if (row.length >= 7) {
    return [String(row[1] ?? "").trim(), String(row[2] ?? "").trim()].filter(
      Boolean
    );
  }
  return [String(row[1] ?? "").trim()].filter(Boolean);
}

export function mvbeRespondentCells(row: string[]): string[] {
  if (isMvbeV2Row(row)) {
    return [
      String(row[MVBE_V2_I.respondentId] ?? "").trim(),
      String(row[MVBE_V2_I.respondentName] ?? "").trim(),
    ].filter(Boolean);
  }
  if (row.length >= 12 && isWideMvbeWithIdColumns(row)) {
    return [String(row[1] ?? "").trim(), String(row[2] ?? "").trim()].filter(
      Boolean
    );
  }
  return [String(row[1] ?? "").trim()].filter(Boolean);
}
