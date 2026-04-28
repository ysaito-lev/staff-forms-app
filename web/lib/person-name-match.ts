/**
 * 氏名照合用。`trim` だけだと中の「半角/全角スペース」「連続スペース」で一致しなくなる。
 * 字間の空白系を半角1スペースに揃える。
 */
export function normalizePersonNameForLookup(name: string): string {
  return name
    .trim()
    .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000\uFEFF]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 姓・名の間のスペースの有無を無視して同一人物とみなすキー。
 * 「中村 珠梨」「中村珠梨」「中村　珠梨」を同じにする。
 */
export function nameKeyForMatch(name: string): string {
  return normalizePersonNameForLookup(name).replace(/\s/g, "");
}
