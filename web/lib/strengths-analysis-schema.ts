import { z } from "zod";
import type { MvbeBlockKey } from "@/lib/form-copy";

export const MVBE_AXIS_KEYS = [
  "better",
  "honest",
  "proactive",
  "challenging",
  "authentic",
] as const satisfies readonly MvbeBlockKey[];

/** レーダー頂点の時計回り順（上から Be honest） */
export const RADAR_VERTEX_AXIS_ORDER: readonly MvbeBlockKey[] = [
  "honest",
  "challenging",
  "proactive",
  "authentic",
  "better",
];

/** レーダー周辺ラベル（日本語を付けず英語のみ表示する際に使用） */
export const RADAR_AXIS_ENGLISH_LABEL: Record<MvbeBlockKey, string> = {
  better: "Be better",
  honest: "Be honest",
  proactive: "Be proactive",
  challenging: "Be challenging",
  authentic: "Be authentic",
};

const fiveAxisKeySchema = z.enum(MVBE_AXIS_KEYS);

const strengthsReportSchema = z.object({
  personalBrandTagline: z.string(),
  comprehensiveAnalysis: z.string(),
  deepDiveStrengths: z.string(),
  actionProposals: z.array(z.string()).min(0).max(8),
  utilizationAdvice: z.string(),
  growthHints: z.string(),
});

const llmAxisRowSchema = z.object({
  key: fiveAxisKeySchema,
  scorePercent: z.number().min(0).max(100).nullable(),
  blurb: z.string(),
});

export const llmStrengthsResponseSchema = z.object({
  report: strengthsReportSchema,
  fiveAxes: z.array(llmAxisRowSchema).max(12),
});

export type StrengthsReport = z.infer<typeof strengthsReportSchema>;

export type FiveAxisRowPublic = {
  key: MvbeBlockKey;
  /** 例: Be honest (正直であれ) */
  labelDisplay: string;
  scorePercent: number;
  blurb: string;
};

export type StrengthsSnapshotPublic = {
  /** 互換用。全期間レポートでは `"all"` */
  reportMonth: string;
  dataRangeLabel: string;
  sourceCommentCount: number;
  /** 届いたコメント件数・最新日時から計算。DynamoDB 未設定時の再分析判定に使用 */
  sourceFingerprint: string;
  /**
   * AI 分析を実行した JST 暦月（`yyyy-mm`）。DynamoDB 利用時は「同一月は再分析しない」の基準。
   */
  aiAnalysisMonthJst?: string;
  generatedAt: string;
  geminiModel: string;
  report: StrengthsReport;
  fiveAxes: FiveAxisRowPublic[];
  /** コメント0件などで AI 未実行のとき */
  skippedAi?: boolean;
  skipMessage?: string;
};
