# スタッフ向け統合フォームサイト

Google フォームで運用していた **ソレイイネ!!** と **MVBe** を、同一の Web アプリ上で利用できるようにしたプロジェクトです。スタッフマスタや回答データは **Google スプレッドシート** を正とし、サーバー側から Google Sheets API で読み書きします。

詳細な要件は別途の社内資料（またはローカルに置いた `要件定義書.md`）を参照してください。当リポジトリには同ファイルは含みません。

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
| `AUTH_GOOGLE_ALLOWED_HOSTED_DOMAINS` | （任意）許可する Workspace ドメインのみに制限するとき。カンマ区切り、`@` なし。**未設定ならドメイン制限なし** |
| `DYNAMODB_USER_STAFF_TABLE` | （推奨）職員と Google `sub` の紐づけ用 DynamoDB テーブル名。パーティションキーは `pk`（String）。未設定時は `AUTH_STAFF_LINK_FALLBACK_GOOGLE` がないとログイン後に職員 ID が付かない |
| `DYNAMODB_REGION` | （任意）DynamoDB リージョン。未指定時は `AWS_REGION` または `ap-northeast-1` |
| `AUTH_STAFF_LINK_FALLBACK_GOOGLE` | （移行用）`1` / `true` のとき、Dynamo に行が無いユーザーは従来どおり Google プロフィールでマスタ突合。本番で Dynamo 運用が安定したら外す |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | サービスアカウント JSON（文字列またはファイルパス運用は実装に準拠） |
| `GOOGLE_SPREADSHEET_ID` | マスタ等に使うスプレッドシート ID |
| `GOOGLE_RESPONSES_*` | フォーム別の回答先ブック／シート（未設定時はフォールバックあり） |
| `ADMIN_NAMES` | 管理者として扱う氏名（カンマ区切り。マスタ氏名と照合） |
| `MVBE_DEPT_WEIGHT_MAX` | MVBe のポイント傾斜の上限（既定 **`3`**）。最大所属人数の部署は **1.0 pt**、それ以外は **非最大に現れる在籍人数の種類を昇順に並べ、その順で [1.5, この値] を等間隔**（同一人数の部署は同じ pt）。**小数第1位で四捨五入**してシートに保存。緩くしたいときは `999` など |
| `NEXT_PUBLIC_APP_ORIGIN` | （推奨）本番のオリジン（例 `https://forms.example.com`）。Discord リマインドのフォーム URL に利用 |
| `DISCORD_MVBE_REMINDER_WEBHOOK_URL` | MVBe 未提出リマインド用 Discord Incoming Webhook |
| `MVBE_REMINDER_CRON_SECRET` | `POST /api/cron/mvbe-reminder` の `Authorization: Bearer …` と一致させるシークレット |
| `MVBE_REMINDER_TEMPLATE` | （フォールバック）リマインド文案。プレースホルダ: `{{unsubmittedCount}}` `{{namesMultiline}}` `{{mentions}}` `{{formUrl}}` `{{periodSummary}}` |
| `SHEET_MVBE_REMINDER_TEMPLATE` / `SHEET_MVBE_REMINDER_TEMPLATE_CELL` | マスタブック内の文案セル（既定: シート `MVBeリマインド` の `A1`） |

MVBe 未提出リマインドのメンションは、ソレイイネと同じ **`メンバー対応表`**（`SHEET_MEMBER_DISCORD_MAP`／ソレイイネ用スプレッドシート）と **`DISCORD_BOT_TOKEN`** のギルド検索で名前から解決します。MVBe 回答は **`GOOGLE_RESPONSES_MVBE_SPREADSHEET_ID`** のブック内タブ（既定 **`フォーム回答_202605以降`**、`SHEET_RESPONSES_MVBE` で変更可）に **13列・末尾 `MVBE_V2`** の行として追記されます。ポイント傾斜は **回答者のメイン部署の在籍人数** に基づき、最大人数の部署は **1.0**、それ以外は **人数の階層（ユニークな headcount）ごとに [1.5, `MVBE_DEPT_WEIGHT_MAX`（既定 3）] を等間隔割り当て**し、**係数・付与ポイントは小数第1位で四捨五入**します。

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

- **Google アカウントでのログイン**のみです。初回は `/complete-profile` で在籍マスタと同じ氏名（漢字）を登録し、DynamoDB に `USER#<googleSub>` と `STAFF#<staffId>` を保存します（1 職員につき 1 Google アカウント）。誤登録時は管理者画面から紐づけを解除できます。
- **`AUTH_GOOGLE_ALLOWED_HOSTED_DOMAINS`** を設定した場合のみ、該当ドメインの Google アカウントに制限されます。
- 移行中のみ **`AUTH_STAFF_LINK_FALLBACK_GOOGLE`** を有効にすると、Dynamo 未登録ユーザーは従来の Google 表示名でのマスタ自動突合が残ります。

## ライセンス・公開範囲

社内向けの前提で開発されている場合が多いため、外部公開時は認証情報・スプレッドシート権限・ホスティング設定を十分に確認してください。
