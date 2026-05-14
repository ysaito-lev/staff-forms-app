import { z } from "zod";

const boolish = z
  .string()
  .optional()
  .transform((v) => v === "1" || v?.toLowerCase() === "true");

const envSchema = z.object({
  /** マスタ（氏名・部署等）用スプレッドシート ID */
  GOOGLE_SPREADSHEET_ID: z.string().min(1).optional(),
  /** （レガシー）回答保存先の単一ブック。フォーム別 ID 未指定時のフォールバック */
  GOOGLE_RESPONSES_SPREADSHEET_ID: z.string().min(1).optional(),
  /** ソレイイネ回答（未設定なら GOOGLE_RESPONSES_SPREADSHEET_ID → GOOGLE_SPREADSHEET_ID） */
  GOOGLE_RESPONSES_SOREINE_SPREADSHEET_ID: z.string().min(1).optional(),
  /** MVBe 回答（未設定なら上記と同様のフォールバック） */
  GOOGLE_RESPONSES_MVBE_SPREADSHEET_ID: z.string().min(1).optional(),
  GOOGLE_SERVICE_ACCOUNT_JSON: z.string().min(2).optional(),
  /** 単体テスト・デバッグ用。未使用時は当月（JST）の「yyyy年m月」シートを読む */
  SHEET_MASTER_DEBUG: z.string().optional(),
  /** 在籍管理（列: 氏名・在籍状況 等）のタブ名 */
  SHEET_ENROLLMENT: z.string().default("在籍管理マスタ"),
  /** Google フォーム連携の「フォームの回答 1」等（Code.gs の対象シート名と一致させる） */
  SHEET_RESPONSES_SOREINE: z.string().default("フォームの回答 1"),
  /** MVBe 回答シート（`GOOGLE_RESPONSES_MVBE_SPREADSHEET_ID` ブック内・追記および主たる読み取り） */
  SHEET_RESPONSES_MVBE: z.string().default("フォーム回答_202605以降"),
  /**
   * 同一ブック内の旧 MVBe タブ（任意）。未設定時は `SHEET_RESPONSES_MVBE` のみ。
   * 読み取り（ランキング・マイ回答等）で主タブと結合する。追記はしない。
   */
  SHEET_RESPONSES_MVBE_LEGACY: z.string().optional(),
  /** （レガシー）rogin タブ名。アプリのログイン申請追記は廃止。スプレッドシート上の表は他用途で利用可。 */
  SHEET_REGISTRATION: z.string().default("rogin"),
  /** Discord 表示名 / フォーム上の名 / ユーザーID（Code.gs のメンバー対応表） */
  SHEET_MEMBER_DISCORD_MAP: z.string().default("メンバー対応表"),
  /** ソレイイネの賞賛通知（未設定なら行のみ追記。F 列空のまま＝GAS `checkAndSendResponses` が通知可） */
  DISCORD_SOREINE_WEBHOOK_URL: z.string().optional(),
  /** ギルドメンバー検索用（GAS `searchDiscordMember` 相当。未設定なら表マッチのみ） */
  DISCORD_BOT_TOKEN: z.string().optional(),
  DISCORD_GUILD_ID: z.string().default("1172020927047942154"),
  MASTER_CACHE_SECONDS: z.coerce.number().min(5).max(3600).default(120),
  NEXT_PUBLIC_GOOGLE_FORM_REGISTER_URL: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_FORM_RETIRE_URL: z.string().optional(),
  /**
   * 管理者の氏名（カンマ区切り・複数可）。マスタの氏名と照合（空白差は無視）。
   * 例: `ADMIN_NAMES=山田 太郎,佐藤 花子`
   */
  ADMIN_NAMES: z.string().optional(),
  /**
   * 幹部の氏名（カンマ区切り・複数可）。`isExecutive` の決定に使用（空白差は無視）。
   * 1件以上あるときはこの一覧のみを正とし、マスタの「幹部」列・部署推定は使わない。
   * 未設定または空のときは従来どおりシート列＋幹部相当部署の推定。
   * 例: `EXECUTIVE_STAFF_NAMES=山田 太郎,佐藤 花子`
   */
  EXECUTIVE_STAFF_NAMES: z.string().optional(),
  /** Google OAuth クライアント ID（NextAuth 既定。Auth.js 5 では AUTH_GOOGLE_ID） */
  AUTH_GOOGLE_ID: z.string().min(1).optional(),
  AUTH_GOOGLE_SECRET: z.string().min(1).optional(),
  /**
   * ログインに許可する Google Workspace プライマリドメイン（@なし。カンマ区切りで複数可）。
   * 例: `example.com,other.co.jp`
   */
  AUTH_GOOGLE_ALLOWED_HOSTED_DOMAINS: z.string().optional(),
  /**
   * Google `sub` ↔ 職員 `staffId` の紐づけ（オンデマンドテーブル。パーティションキー `pk` String）。
   * 未設定時は登録 API は 503。JWT は `AUTH_STAFF_LINK_FALLBACK_GOOGLE` のときのみマスタ自動突合を試す。
   */
  DYNAMODB_USER_STAFF_TABLE: z.string().optional(),
  /** 未設定時は `AWS_REGION` または ap-northeast-1 */
  DYNAMODB_REGION: z.string().optional(),
  /**
   * 移行用: Dynamo に行が無いとき、従来どおり Google プロフィールでマスタ突合して staffId を埋める。
   * 本番で Dynamo 運用が安定したら 1/true を外す。
   */
  AUTH_STAFF_LINK_FALLBACK_GOOGLE: boolish,
  /** ロゴのフォールバック URL（`public/levela-logo.png` が無い・読めないとき） */
  NEXT_PUBLIC_LEVELA_LOGO_URL: z.string().optional(),
  NEXT_PUBLIC_USE_MOCK_MASTER: boolish,
  /**
   * MVBe 非最大部署の係数上限（既定 3）。人数階層ごとに [1.5, この値] を等間隔で割り当てる。
   * 実質無上限に近くしたいときは `999` など大きな値を指定。
   */
  MVBE_DEPT_WEIGHT_MAX: z.string().default("3"),
  /** アプリの公開オリジン（リマインドのフォームURL・OAuth callback 等）。例: https://example.com */
  NEXT_PUBLIC_APP_ORIGIN: z.string().optional(),
  /** MVBe 未提出リマインド用 Discord Incoming Webhook */
  DISCORD_MVBE_REMINDER_WEBHOOK_URL: z.string().optional(),
  /**
   * Webhook 投稿先のスレッド ID（任意）。未設定で本文指定もないときは Webhook の親チャンネルへ投稿。
   * Discord API: Execute Webhook に `thread_id` クエリを付与する形。
   */
  DISCORD_MVBE_REMINDER_THREAD_ID: z.string().optional(),
  /** Cron / 手動以外からリマインド API を叩くときの共有シークレット */
  MVBE_REMINDER_CRON_SECRET: z.string().optional(),
  /**
   * 一時確認用: 1 / true のとき、`MVBE_REMINDER_DISCORD_TEST_MESSAGE`（未指定なら `test`）のみを
   * 1 回 Webhook 送信する。メンション・未提出者集計・本文テンプレは使わない。本番前に必ず外す。
   */
  MVBE_REMINDER_DISCORD_TEST_ONLY: boolish,
  /** `MVBE_REMINDER_DISCORD_TEST_ONLY` 時の本文（空なら `test`） */
  MVBE_REMINDER_DISCORD_TEST_MESSAGE: z.string().optional(),
  /** シートが読めないときのリマインド文案（プレースホルダ対応） */
  MVBE_REMINDER_TEMPLATE: z.string().optional(),
  /** マスタ `GOOGLE_SPREADSHEET_ID` 内のテンプレート用シート名 */
  SHEET_MVBE_REMINDER_TEMPLATE: z.string().default("MVBeリマインド"),
  /** テンプレート本文セル（A1 記法） */
  SHEET_MVBE_REMINDER_TEMPLATE_CELL: z.string().default("A1"),

  /** （将来用）メール送信用 SMTP。現状アプリ未使用。 */
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().min(1).max(65535).default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  /** 465 番ポート等で TLS を最初から使う場合 true */
  SMTP_SECURE: boolish,
  /** 送信元 */
  EMAIL_FROM: z.string().optional(),

  /** Google AI (Gemini) — 届いたコメントの強み分析 */
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.0-flash"),
  /** 強みレポート AI キャッシュ（パーティション staffId String、ソート sk String。現状 sk は STRENGTHS#ALL 固定） */
  DYNAMODB_STRENGTHS_SNAPSHOT_TABLE: z.string().optional(),
  /** Cron / 手動以外から強みスナップショット一括生成 API を叩くときの共有シークレット */
  STRENGTHS_CRON_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.warn("環境変数の検証に失敗しました", parsed.error.flatten());
    return envSchema.parse({});
  }
  return parsed.data;
}

let cached: Env | null = null;

export function getEnv(): Env {
  if (!cached) cached = parseEnv();
  return cached;
}

export function sheetsConfigured(): boolean {
  const e = getEnv();
  return Boolean(e.GOOGLE_SPREADSHEET_ID && e.GOOGLE_SERVICE_ACCOUNT_JSON);
}

/** レガシー単一ブック用。ソレイイネ／MVBe 専用 ID のフォールバックに使う */
export function getResponsesSpreadsheetId(): string {
  const e = getEnv();
  const r = e.GOOGLE_RESPONSES_SPREADSHEET_ID?.trim();
  if (r) return r;
  return e.GOOGLE_SPREADSHEET_ID ?? "";
}

/** ソレイイネ回答スプレッドシート */
export function getSoreiineSpreadsheetId(): string {
  const e = getEnv();
  const id = e.GOOGLE_RESPONSES_SOREINE_SPREADSHEET_ID?.trim();
  if (id) return id;
  return getResponsesSpreadsheetId();
}

/** MVBe 回答スプレッドシート */
export function getMvbeSpreadsheetId(): string {
  const e = getEnv();
  const id = e.GOOGLE_RESPONSES_MVBE_SPREADSHEET_ID?.trim();
  if (id) return id;
  return getResponsesSpreadsheetId();
}

/** モックマスタ（デモデータ）を使うか。`use` 接頭辞は React のルールと衝突するため付けない */
export function mockMasterEnabled(): boolean {
  const e = getEnv();
  if (e.NEXT_PUBLIC_USE_MOCK_MASTER) return true;
  if (process.env.NODE_ENV === "development" && !sheetsConfigured()) return true;
  return false;
}

export function userStaffLinkTableConfigured(): boolean {
  return Boolean(getEnv().DYNAMODB_USER_STAFF_TABLE?.trim());
}

export function dynamoDbRegion(): string {
  const r = getEnv().DYNAMODB_REGION?.trim();
  if (r) return r;
  const aws = process.env.AWS_REGION?.trim();
  if (aws) return aws;
  return "ap-northeast-1";
}

export function geminiConfigured(): boolean {
  return Boolean(getEnv().GEMINI_API_KEY?.trim());
}

export function strengthsSnapshotTableConfigured(): boolean {
  return Boolean(getEnv().DYNAMODB_STRENGTHS_SNAPSHOT_TABLE?.trim());
}
