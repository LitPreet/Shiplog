// Simple "fixed window" rate limiter: at most `limit` requests per `windowMs`
// for each key (e.g. "submit:<ip>").
//
// LIMITATION: this lives in server memory, so it
// resets on restart and isn't shared between multiple server instances. In
// production you'd move it to Redis (INCR + EXPIRE) so all instances share
// one counter.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();

  // Housekeeping: without this the Map grows forever (one entry per IP).
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }

  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }

  bucket.count++;
  if (bucket.count > limit) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfterSec: 0 };
}

// Best-effort client IP (set by proxies like Vercel / nginx).
export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
