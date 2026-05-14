import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

export function credentialSubjectFromEmail(email: string): string {
  return `cred:${email.trim().toLowerCase()}`;
}

export function hashPasswordCredential(plain: string): {
  hashB64: string;
  saltB64: string;
} {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, 64, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return {
    saltB64: salt.toString("base64"),
    hashB64: hash.toString("base64"),
  };
}

export function verifyPasswordCredential(
  plain: string,
  hashB64: string,
  saltB64: string
): boolean {
  const expected = Buffer.from(hashB64, "base64");
  if (expected.length === 0) return false;
  const salt = Buffer.from(saltB64, "base64");
  if (salt.length === 0) return false;
  const derived = scryptSync(plain, salt, expected.length, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}
