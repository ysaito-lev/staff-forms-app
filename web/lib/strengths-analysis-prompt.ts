import {
  MVBE_BLOCKS,
  SOREINE_VALUES,
  type MvbeBlockKey,
} from "@/lib/form-copy";
import type { MvbeReceivedRow, SoreineReceivedRow } from "@/lib/my-responses-data";

const MAX_SERIALIZED_CHARS = 18_000;

export function axisLabelDisplayForKey(key: MvbeBlockKey): string {
  const i = MVBE_BLOCKS.findIndex((b) => b.key === key);
  const v = i >= 0 ? SOREINE_VALUES[i] : null;
  if (!v) return key;
  return String(v).replace(/「/g, "(").replace(/」/g, ")");
}

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

/** LLM 用: 回答者名・部署は送らない */
export function serializeCommentsForLlm(
  soreine: SoreineReceivedRow[],
  mvbe: MvbeReceivedRow[]
): string {
  const lines: string[] = [];
  for (const r of soreine) {
    lines.push(
      `[ソレイイネ] Value: ${truncate(r.value, 120)} / 内容: ${truncate(r.comment, 800)}`
    );
  }
  for (const r of mvbe) {
    lines.push(
      `[MVBe] ブロック: ${truncate(r.blockHeading, 120)} / 理由: ${truncate(r.reason, 800)}`
    );
  }
  let body = lines.join("\n");
  if (body.length > MAX_SERIALIZED_CHARS) {
    body = `${body.slice(0, MAX_SERIALIZED_CHARS)}\n…（以降省略）`;
  }
  return body;
}

export function buildStrengthsAnalysisPrompt(params: {
  displayName: string;
  dataRangeLabel: string;
  serializedComments: string;
  jsonShapeInstruction: string;
}): string {
  const who =
    params.displayName.trim() ||
    "あなた（氏名はマスタ参照。出力では他者の実名・部署・識別可能な固有名を一切出さない）";
  return `あなたは組織内フィードバックを整理するアシスタントです。入力は「届いた賞賛コメント」のみです。

【対象者の呼び方】出力では「あなた」または「${who}」のどちらかに統一してください（片方に決めて一貫）。他の人物の氏名・部署名・プロジェクト固有名は禁止。コメントに無い具体名を捏造しない。

【対象データ】${params.dataRangeLabel}

【コメント本文（回答者情報は含めない）】
${params.serializedComments}

${params.jsonShapeInstruction}

厳守:
- 根拠のない断定をしない。
- JSON 以外の文字を出力しない（前後に説明文を付けない）。
- actionProposals は 3 件前後。
- fiveAxes は次の5 key をそれぞれちょうど1回ずつ含む: better, honest, proactive, challenging, authentic。scorePercent は 0〜100 の整数または null（根拠がほぼ無いとき null）。blurb は日本語1〜2文。
`;
}

export const LLM_JSON_SHAPE = `次の JSON だけを返してください（キー名を変えない）:
{
  "report": {
    "personalBrandTagline": "（1文。パーソナルブランドのキャッチ）",
    "comprehensiveAnalysis": "（1〜2段落。総合分析）",
    "deepDiveStrengths": "（1〜2段落。強みの深掘り）",
    "actionProposals": ["案1", "案2", "案3"],
    "utilizationAdvice": "（強みの活かし方）",
    "growthHints": "（成長のヒント）"
  },
  "fiveAxes": [
    { "key": "honest", "scorePercent": 0, "blurb": "…" },
    { "key": "challenging", "scorePercent": 0, "blurb": "…" },
    { "key": "proactive", "scorePercent": 0, "blurb": "…" },
    { "key": "authentic", "scorePercent": 0, "blurb": "…" },
    { "key": "better", "scorePercent": 0, "blurb": "…" }
  ]
}`;
