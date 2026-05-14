import type { MvbeReceivedRow, SoreineReceivedRow } from "@/lib/my-responses-data";

/** 届いたコメント集合が変わったか判定（件数＋最新の submittedAt） */
export function computeReceivedCommentsFingerprint(
  soreine: SoreineReceivedRow[],
  mvbe: MvbeReceivedRow[]
): string {
  let maxIso = "";
  for (const r of soreine) {
    if (r.submittedAt > maxIso) maxIso = r.submittedAt;
  }
  for (const r of mvbe) {
    if (r.submittedAt > maxIso) maxIso = r.submittedAt;
  }
  return `${soreine.length + mvbe.length}:${maxIso}`;
}
