# スタッフ向け統合フォームサイト

Google フォームで運用していた **ソレイイネ!!** と **MVBe** を、同一の Web アプリ上で利用できるようにしたプロジェクトです。スタッフマスタや回答データは **Google スプレッドシート** を正とし、サーバー側から Google Sheets API で読み書きします。

詳細な要件はリポジトリ直下の [`要件定義書.md`](要件定義書.md) を参照してください。

## 技術スタック

| 区分 | 内容 |
|------|------|
| フレームワーク | [Next.js](https://nextjs.org/) 15（App Router） |
| 言語 | TypeScript |
| 認証 | [Auth.js / next-auth](https://authjs.dev/) v5 — **Google アカウント（OAuth）のみ** |
| データ | Google Sheets API（`googleapis`）、スプレッドシート ID・サービスアカウント JSON は環境変数で指定 |
| UI | React 19、Tailwind CSS 4 |
| ホスティング想定 | Vercel 等（Node ランタイム） |

## ディレクトリ構成（概要）

```
各フォームサイト化/
├── README.md                 … 本ファイル
├── 要件定義書.md             … 機能・非機能要件
└── web/                      … Next.js アプリケーション（メインのコード）
    ├── app/                  … ページ・API ルート・コンポーネント
    ├── lib/                  … スプレッドシート・認証・集計などのロジック
    ├── auth.ts               … NextAuth 設定
    └── middleware.ts         … 認可ミドルウェア
```

## セットアップ

### 前提

- Node.js（LTS 推奨）
- npm または互換のパッケージマネージャ

### 依存関係のインストール

```bash
cd web
npm install
```

`web/.npmrc` で `legacy-peer-deps=true` を有効にしています。`next-auth` がメール送信用に宣言している optional peer（`nodemailer`）をプロジェクトでは直接入れていないため、npm の peer 解決が衝突するのを避けるためです。アプリの認証は Google OAuth のみです。

### 環境変数

`web/.env.local` に設定します（実際の値はチームのポリシーに従ってください）。主要な項目は次のとおりです。

| 変数 | 説明 |
|------|------|
| `AUTH_SECRET` | セッション暗号化用（本番では必須。`NEXTAUTH_SECRET` でも可） |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth クライアント |
| `AUTH_GOOGLE_ALLOWED_HOSTED_DOMAINS` | ログインを許可する Workspace ドメイン（カンマ区切り、`@` なし） |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | サービスアカウント JSON（文字列またはファイルパス運用は実装に準拠） |
| `GOOGLE_SPREADSHEET_ID` | マスタ等に使うスプレッドシート ID |
| `GOOGLE_RESPONSES_*` | フォーム別の回答先ブック／シート（未設定時はフォールバックあり） |
| `ADMIN_NAMES` | 管理者として扱う氏名（カンマ区切り。マスタ氏名と照合） |

その他（Discord Webhook、幹部名、`NEXT_PUBLIC_*` など）は [`web/lib/env.ts`](web/lib/env.ts) のスキーマコメントを参照してください。

## 開発・ビルド

```bash
cd web
npm run dev      # 開発サーバー（Turbopack）
npm run build    # 本番ビルド
npm run start    # 本番サーバー（build 後）
npm run lint     # ESLint
```

ブラウザでは開発時は通常 `http://localhost:3000` です。

## 認証について

- **Google アカウントでのログイン**のみです。メールマジックリンク用の `nodemailer` は使用していません。
- ログイン後、マスタと突き合わせて職員 ID を付与し、マイ回答・管理者機能などに利用します。

## ライセンス・公開範囲

社内向けの前提で開発されている場合が多いため、外部公開時は認証情報・スプレッドシート権限・ホスティング設定を十分に確認してください。
