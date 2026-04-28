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
  SHEET_RESPONSES_MVBE: z.string().default("フォームの回答 1"),
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
  /** ロゴのフォールバック URL（`public/levela-logo.png` が無い・読めないとき） */
  NEXT_PUBLIC_LEVELA_LOGO_URL: z.string().optional(),
  NEXT_PUBLIC_USE_MOCK_MASTER: boolish,
  /** （将来用）メール送信用 SMTP。現状アプリ未使用。 */
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().min(1).max(65535).default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  /** 465 番ポート等で TLS を最初から使う場合 true */
  SMTP_SECURE: boolish,
  /** 送信元 */
  EMAIL_FROM: z.string().optional(),
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

export function smtpConfigured(): boolean {
  const e = getEnv();
  return Boolean(
    e.SMTP_HOST?.trim() &&
      e.SMTP_USER?.trim() &&
      e.SMTP_PASSWORD &&
      e.SMTP_PASSWORD.length > 0 &&
      e.EMAIL_FROM?.trim()
  );
}
