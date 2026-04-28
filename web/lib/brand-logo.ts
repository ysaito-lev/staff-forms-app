/** 公開フォルダ内のロゴファイル名（存在すればこれを優先） */
export const LOCAL_LEVELA_LOGO_FILE = "levela-logo.png";

/** ブラウザ向けパス */
export const LOCAL_LEVELA_LOGO_SRC = `/${LOCAL_LEVELA_LOGO_FILE}`;

const DEFAULT_REMOTE_URL =
  "https://levela.co.jp/wp-content/uploads/2025/12/header-logo%20after.png";

function resolveRemoteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_LEVELA_LOGO_URL?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_REMOTE_URL;
}

/** ローカルが無い・読み込めないときのフォールバック（`NEXT_PUBLIC_LEVELA_LOGO_URL` または既定 URL） */
export const LEVELA_LOGO_REMOTE_URL = resolveRemoteUrl();

/** img / next/image 用の実寸（アスペクト比維持） */
export const LEVELA_LOGO_WIDTH = 459;
export const LEVELA_LOGO_HEIGHT = 59;
