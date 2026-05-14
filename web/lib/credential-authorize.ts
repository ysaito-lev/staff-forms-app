import { verifyPasswordCredential } from "@/lib/credential-auth";
import { getCredentialUserForLogin } from "@/lib/user-staff-link";
import type { User } from "next-auth";

/**
 * メール／パスワードの authorize（Node の API 経路のみ。middleware へはインポートしない）。
 */
export async function authorizeCredentialUser(
  credentials: Partial<Record<"email" | "password", unknown>> | undefined
): Promise<User | null> {
  const rawEmail =
    typeof credentials?.email === "string" ? credentials.email.trim() : "";
  const rawPassword =
    typeof credentials?.password === "string" ? credentials.password : "";
  if (!rawEmail || !rawPassword) return null;

  const record = await getCredentialUserForLogin(rawEmail.toLowerCase());
  if (
    !record ||
    typeof record.passwordHashB64 !== "string" ||
    typeof record.saltB64 !== "string" ||
    !record.passwordHashB64 ||
    !record.saltB64
  ) {
    return null;
  }

  if (
    !verifyPasswordCredential(rawPassword, record.passwordHashB64, record.saltB64)
  ) {
    return null;
  }

  const sub =
    typeof record.subject === "string" && record.subject.trim()
      ? record.subject.trim()
      : "";

  return {
    id: sub || record.email,
    email: record.email,
    name: record.name?.trim() || undefined,
    staffId: record.staffId,
    googleSub: sub,
  };
}
