import {
  getEnv,
  geminiConfigured,
  strengthsSnapshotTableConfigured,
} from "@/lib/env";
import { geminiGenerateJson } from "@/lib/gemini-generate";
import { loadMyResponses } from "@/lib/my-responses-data";
import type { MvbeBlockKey } from "@/lib/form-copy";
import {
  llmStrengthsResponseSchema,
  RADAR_VERTEX_AXIS_ORDER,
  MVBE_AXIS_KEYS,
  type FiveAxisRowPublic,
  type StrengthsSnapshotPublic,
} from "@/lib/strengths-analysis-schema";
import {
  axisLabelDisplayForKey,
  buildStrengthsAnalysisPrompt,
  LLM_JSON_SHAPE,
  serializeCommentsForLlm,
} from "@/lib/strengths-analysis-prompt";
import { computeReceivedCommentsFingerprint } from "@/lib/strengths-comments-fingerprint";
import { getCalendarMonthKeyJst } from "@/lib/date-utils";
import {
  STRENGTHS_DATA_SCOPE_LABEL,
  STRENGTHS_REPORT_MONTH_ALL,
} from "@/lib/strengths-data-scope";
import {
  getStrengthsSnapshotFromStore,
  putStrengthsSnapshotToStore,
} from "@/lib/strengths-snapshot-store";

function nowIso(): string {
  return new Date().toISOString();
}

function emptyFiveAxes(): FiveAxisRowPublic[] {
  return RADAR_VERTEX_AXIS_ORDER.map((key) => ({
    key,
    labelDisplay: axisLabelDisplayForKey(key),
    scorePercent: 0,
    blurb: "",
  }));
}

function baseSnapshotShell(
  model: string,
  fingerprint: string
): Pick<
  StrengthsSnapshotPublic,
  | "reportMonth"
  | "dataRangeLabel"
  | "generatedAt"
  | "geminiModel"
  | "sourceFingerprint"
> {
  return {
    reportMonth: STRENGTHS_REPORT_MONTH_ALL,
    dataRangeLabel: STRENGTHS_DATA_SCOPE_LABEL,
    generatedAt: nowIso(),
    geminiModel: model,
    sourceFingerprint: fingerprint,
  };
}

function normalizeFiveAxes(
  rows: { key: MvbeBlockKey; scorePercent: number | null; blurb: string }[]
): FiveAxisRowPublic[] {
  const map = new Map<MvbeBlockKey, { score: number; blurb: string }>();
  for (const r of rows) {
    const sc =
      r.scorePercent == null || Number.isNaN(r.scorePercent)
        ? 0
        : Math.max(0, Math.min(100, Math.round(r.scorePercent)));
    const prev = map.get(r.key);
    if (!prev || sc > prev.score) {
      map.set(r.key, { score: sc, blurb: r.blurb.trim() });
    }
  }
  return RADAR_VERTEX_AXIS_ORDER.map((key) => {
    const v = map.get(key);
    return {
      key,
      labelDisplay: axisLabelDisplayForKey(key),
      scorePercent: v?.score ?? 0,
      blurb: v?.blurb ?? "",
    };
  });
}

function stampAiMonth(
  snapshot: StrengthsSnapshotPublic,
  monthKey: string
): StrengthsSnapshotPublic {
  return { ...snapshot, aiAnalysisMonthJst: monthKey };
}

async function buildStrengthsSnapshotFresh(params: {
  staffId: string;
  displayName: string;
  /** 呼び出し元で既に load 済みのとき二重取得を避ける */
  preloaded?: Awaited<ReturnType<typeof loadMyResponses>>;
}): Promise<StrengthsSnapshotPublic> {
  const model = getEnv().GEMINI_MODEL?.trim() || "gemini-2.0-flash";
  const dataRangeLabel = STRENGTHS_DATA_SCOPE_LABEL;

  const all = params.preloaded ?? (await loadMyResponses(params.staffId));
  const soreine = all.receivedSoreine;
  const mvbe = all.receivedMvbe;
  const fingerprint = computeReceivedCommentsFingerprint(soreine, mvbe);
  const sourceCommentCount = soreine.length + mvbe.length;

  if (sourceCommentCount === 0) {
    return {
      ...baseSnapshotShell(model, fingerprint),
      sourceCommentCount: 0,
      skippedAi: true,
      skipMessage:
        "届いたコメントがまだありません。ソレイイネ!! や MVBe でコメントを受け取ると、ここに分析が表示されます。",
      report: {
        personalBrandTagline:
          "届いたコメントがないため、パーソナルブランドの要約はありません。",
        comprehensiveAnalysis:
          "分析対象となるコメントが0件でした。コメントが届くと、ここに総合分析が表示されます。",
        deepDiveStrengths: "",
        actionProposals: [
          "コメントが届いたあと、再度このページを開いてください。",
          "ソレイイネ!! や MVBe で具体的な行動を共有してもらうと精度が上がります。",
        ],
        utilizationAdvice: "",
        growthHints: "",
      },
      fiveAxes: emptyFiveAxes(),
    };
  }

  if (!geminiConfigured()) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const serialized = serializeCommentsForLlm(soreine, mvbe);
  const prompt = buildStrengthsAnalysisPrompt({
    displayName: params.displayName.trim(),
    dataRangeLabel,
    serializedComments: serialized,
    jsonShapeInstruction: LLM_JSON_SHAPE,
  });

  const rawJson = await geminiGenerateJson(prompt);
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (e) {
    console.error("[strengths] JSON parse failed", rawJson.slice(0, 500));
    throw e;
  }

  const validated = llmStrengthsResponseSchema.safeParse(parsed);
  if (!validated.success) {
    console.error("[strengths] zod", validated.error.flatten());
    throw new Error("Invalid AI response shape");
  }

  const keysGot = new Set(validated.data.fiveAxes.map((a) => a.key));
  for (const k of MVBE_AXIS_KEYS) {
    if (!keysGot.has(k)) {
      validated.data.fiveAxes.push({ key: k, scorePercent: null, blurb: "" });
    }
  }

  return {
    ...baseSnapshotShell(model, fingerprint),
    sourceCommentCount,
    report: validated.data.report,
    fiveAxes: normalizeFiveAxes(validated.data.fiveAxes),
  };
}

export async function getOrBuildStrengthsSnapshot(params: {
  staffId: string;
  displayName: string;
}): Promise<StrengthsSnapshotPublic> {
  const monthKey = getCalendarMonthKeyJst();
  const [all, cached] = await Promise.all([
    loadMyResponses(params.staffId),
    strengthsSnapshotTableConfigured()
      ? getStrengthsSnapshotFromStore(params.staffId)
      : Promise.resolve<StrengthsSnapshotPublic | null>(null),
  ]);

  const storeOn = strengthsSnapshotTableConfigured();

  // DynamoDB あり: JST 同一暦月はコメント変化があっても AI 抑止（月 1 回まで）
  if (storeOn && cached?.aiAnalysisMonthJst === monthKey) {
    return cached;
  }

  // DynamoDB 未設定時はキャッシュが無いため、従来どおり呼び出しのたびに AI 実行になり得ます。

  const fresh = await buildStrengthsSnapshotFresh({
    ...params,
    preloaded: all,
  });
  const stamped = stampAiMonth(fresh, monthKey);

  if (storeOn) {
    await putStrengthsSnapshotToStore(params.staffId, stamped);
  }

  return stamped;
}

/** Cron / 運用向け: 月次ゲートを無視して再生成し保存（実行時の暦月で aiAnalysisMonthJst を更新） */
export async function refreshStrengthsSnapshotForStaff(params: {
  staffId: string;
  displayName: string;
}): Promise<StrengthsSnapshotPublic> {
  const fresh = await buildStrengthsSnapshotFresh(params);
  const stamped = stampAiMonth(fresh, getCalendarMonthKeyJst());
  if (strengthsSnapshotTableConfigured()) {
    await putStrengthsSnapshotToStore(params.staffId, stamped);
  }
  return stamped;
}
