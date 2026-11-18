import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// Password hashing with scrypt (built into Node, no native dependency).
// scrypt is deliberately slow AND memory-hard, so brute-forcing a leaked hash
// on GPUs is expensive. Each password gets its own random salt, so two users
// with the same password get different hashes.
//
// Stored format: "<salt hex>:<hash hex>"

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, keylen: number) => Promise<Buffer>;
const KEY_LEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LEN);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  // Constant-time compare: a normal === leaks how many leading bytes matched
  // through response timing.
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// For logins where there's no password to check (unknown email, or a
// GitHub/Google-only account): verify against a throwaway hash anyway, so the
// response takes the same time and can't reveal which emails have accounts.
let dummy: Promise<string> | undefined;
export function dummyPasswordHash() {
  dummy ??= hashPassword(randomBytes(16).toString("hex"));
  return dummy;
}
