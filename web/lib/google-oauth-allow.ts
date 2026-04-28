/**
 * Edge（middleware）安全: master / getEnv に依存しない Google プロフィール用ヘルパー。
 * `process.env` の参照のみ（Next の Edge では許可された環境変数が参照可能）。
 */
export type GoogleOAuthProfile = {
  email?: string | null;
  email_verified?: boolean | string | null;
  /** Google Workspace: hosted domain (例: company.com) */
  hd?: string | null;
  name?: string | null;
  given_name?: string | null;
  family_name?: string | null;
};

export function parseGoogleAllowedHostedDomains(): string[] {
  const raw = process.env.AUTH_GOOGLE_ALLOWED_HOSTED_DOMAINS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * 許可する Workspace プライマリドメイン（@なし。カンマ区切りで複数可）に
 * プロフィールの `hd` またはメールの @以降のいずれかが合致すれば真。
 */
export function isGoogleAccountAllowed(p: GoogleOAuthProfile, allowed: string[]): boolean {
  if (allowed.length === 0) return false;
  const set = new Set(allowed);
  if (p.hd) {
    const h = p.hd.toLowerCase();
    if (set.has(h)) return true;
  }
  const dom = p.email?.split("@")[1]?.toLowerCase();
  if (dom && set.has(dom)) return true;
  return false;
}

export function isEmailVerifiedForLogin(p: GoogleOAuthProfile): boolean {
  if (!p.email?.trim()) return false;
  const v = p.email_verified;
  if (v === true) return true;
  if (typeof v === "string" && v.toLowerCase() === "true") return true;
  return false;
}

export function buildGoogleDisplayName(p: GoogleOAuthProfile): string {
  const n = p.name?.trim();
  if (n) return n;
  return [p.given_name, p.family_name]
    .filter((x) => (x?.trim() ?? "") !== "")
    .map((x) => x!.trim())
    .join(" ");
}
