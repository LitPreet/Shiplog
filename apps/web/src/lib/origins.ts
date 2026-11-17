import { randomBytes } from "node:crypto";

// Turns whatever the owner typed ("acme.com", "https://acme.com/app/") into
// the exact form browsers send in the Origin header ("https://acme.com").
// Returns null for anything that isn't a valid http(s) origin.
export function normalizeOrigin(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".") && url.hostname !== "localhost") return null;
    return url.origin;
  } catch {
    return null;
  }
}

// Public widget key, e.g. "pk_3f9a...". Random, not derived from the ID, so it
// can be rotated if it ends up somewhere it shouldn't.
export function generatePublicKey() {
  return `pk_${randomBytes(12).toString("hex")}`;
}
