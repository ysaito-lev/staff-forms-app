/** 要件定義書 5.8 / 5.9 の文言（同一文言要件） */

export const SOREINE_TITLE = "ソレイイネ!!";

export const SOREINE_INTRO = `今週、誰がどの価値を体現してくれたか、一言でも具体的に共有してみませんか。

1. **Be better「よりよくあれ」**: 常により良い状態を目指します。また、そうあろうとする人のサポートをします。
2. **Be honest「正直であれ」**: チーム・顧客・自分に対して嘘をつかない誠実で正直な人になります。
3. **Be proactive「主体的であれ」**: 自分の意思や判断に基づいてMissionを果たすために尽力します。
4. **Be challenging「挑戦者であれ」**: 失敗を恐れず、挑戦します。また、組織・部下・自分の挑戦を賞賛します。
5. **Be authentic「本物であれ」**: 私たちは常に社会に誇れる正真正銘の本物を目指します。`;

export const SOREINE_LABELS = {
  respondent: "回答者名",
  praised: "賞賛したい人は？",
  value: "どのvalueを体現していましたか？",
  detail: "具体的な内容を教えてください！",
} as const;

export const PLACEHOLDER_SELECT = "選択";
export const PLACEHOLDER_TEXT = "回答を入力";

export const SOREINE_VALUES = [
  "Be better「よりよくあれ」",
  "Be honest「正直であれ」",
  "Be proactive「主体的であれ」",
  "Be challenging「挑戦者であれ」",
  "Be authentic「本物であれ」",
] as const;

export type SoreineValue = (typeof SOREINE_VALUES)[number];

/** 以前の表記（「の直前に半角スペース）。既存スプレッドシート行の解釈用 */
const SOREINE_VALUES_LEGACY_BEFORE_JP = [
  "Be better 「よりよくあれ」",
  "Be honest 「正直であれ」",
  "Be proactive 「主体的であれ」",
  "Be challenging 「挑戦者であれ」",
  "Be authentic 「本物であれ」",
] as const;

/** セル上の value 表記を現在の SOREINE_VALUES に正規化（旧行も解釈可能） */
export function normalizeSoreineValueCell(
  v: string
): SoreineValue | null {
  const t = v.trim();
  if ((SOREINE_VALUES as readonly string[]).includes(t)) {
    return t as SoreineValue;
  }
  for (let i = 0; i < SOREINE_VALUES_LEGACY_BEFORE_JP.length; i++) {
    if (SOREINE_VALUES_LEGACY_BEFORE_JP[i] === t) {
      return SOREINE_VALUES[i]!;
    }
  }
  return null;
}

export const MVBE_TITLE = "MVBe";

/** マスタの staff id と衝突しない sentinel（API・クライアント共通） */
export const MVBE_NO_NOMINEE_ID = "__mvbe_no_nominee__";
export const MVBE_NO_NOMINEE_LABEL = "該当者なし";

/** 月間ランキングに票として加算しない「該当なし」表記（氏名欄の文字列を nameKey 正規化して照合） */
export const MVBE_NO_NOMINEE_LABELS_EXCLUDED_IN_RANKING = [
  MVBE_NO_NOMINEE_LABEL,
  "今月は該当者なし",
] as const;

export const MVBE_INTRO = `今月の MVBe を決めるためのアンケートです。
5つの「Be」ごとに、体現していたメンバーを1名ずつ選んでください。同一月（日本時間）の回答はお一人様1回までです。
※幹部は選出の対象外です`;

export const MVBE_LABEL_RESPONDENT = "回答者";

export const MVBE_BLOCKS = [
  {
    key: "better" as const,
    heading: "■Be better：よりよくあれ",
    description:
      "常により良い状態を目指します。また、そうあろうとする人のサポートをします。",
    reasonLabel: "選択した理由を具体的に教えてください！",
  },
  {
    key: "honest" as const,
    heading: "■Be honest：正直であれ",
    description:
      "チーム・顧客・自分に対して嘘をつかない。誠実で正直な人になります。",
    reasonLabel: "選択した理由を具体的に教えてください！",
  },
  {
    key: "proactive" as const,
    heading: "■Be proactive：主体的であれ",
    description:
      "自分の意思や判断に基づいてMissionを果たすために尽力します。",
    reasonLabel: "選択した理由を具体的に教えてください！",
  },
  {
    key: "challenging" as const,
    heading: "■Be challenging：挑戦者であれ",
    description:
      "失敗を恐れず、挑戦します。また、組織・部下・自分の挑戦を賞賛します。",
    reasonLabel: "選択した理由を具体的に教えてください！",
  },
  {
    key: "authentic" as const,
    /** 回答シート列見出し（Googleフォーム等と同じ表記） */
    heading: "■Be authentic: 本物であれ",
    description: "私たちは常に社会に誇れる正真正銘の本物を目指します。",
    reasonLabel: "選択した理由を、具体的に教えてください！",
  },
] as const;

export type MvbeBlockKey = (typeof MVBE_BLOCKS)[number]["key"];
