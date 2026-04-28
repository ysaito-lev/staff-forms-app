/** シート名に日本語・スペース等が含まれる場合の A1 記法用クオート */
export function quoteSheetTab(name: string): string {
  const escaped = name.replace(/'/g, "''");
  return `'${escaped}'`;
}
