import { localDateKey } from "./csv";

export const DAILY_LIMIT = 10;

interface Bucket {
  date: string;
  used: number;
}

/**
 * In-memory, IP-keyed daily counter so the localStorage cap can't be bypassed
 * by clearing site data.
 *
 * Caveat worth knowing before you rely on it: serverless instances are
 * ephemeral and there may be several running at once, so this is a speed bump,
 * not an accounting system. Swap `buckets` for Vercel KV (or any shared store)
 * if the limit ever needs to be exact.
 */
const buckets: Map<string, Bucket> =
  (globalThis as { __thurvateQuota?: Map<string, Bucket> }).__thurvateQuota ??
  ((globalThis as { __thurvateQuota?: Map<string, Bucket> }).__thurvateQuota = new Map());

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

function currentBucket(key: string): Bucket {
  const today = localDateKey();
  const existing = buckets.get(key);

  if (!existing || existing.date !== today) {
    const fresh = { date: today, used: 0 };
    buckets.set(key, fresh);
    return fresh;
  }

  return existing;
}

export function hasQuota(key: string): boolean {
  return currentBucket(key).used < DAILY_LIMIT;
}

export function remainingQuota(key: string): number {
  return Math.max(0, DAILY_LIMIT - currentBucket(key).used);
}

/** Call only after a successful extraction. Failures don't consume the quota. */
export function consumeQuota(key: string): number {
  const bucket = currentBucket(key);
  bucket.used += 1;
  return Math.max(0, DAILY_LIMIT - bucket.used);
}
