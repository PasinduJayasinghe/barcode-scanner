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

/**
 * Ceiling on distinct clients held in memory. Without one, every new key is a
 * permanent allocation and the process grows until it dies.
 */
const MAX_TRACKED_CLIENTS = 10_000;

/** Long enough for an IPv6 address, short enough that junk can't bloat a key. */
const MAX_KEY_LENGTH = 45;

/**
 * `x-forwarded-for` is a client-appendable list. Reading the *leftmost* entry —
 * the obvious-looking choice — takes a value the caller controls, so anyone
 * could mint a fresh identity per request and walk straight past the daily cap.
 *
 * The rightmost entry is the one appended by the proxy nearest us, which is the
 * only part a client cannot forge. `x-real-ip` is set by the proxy outright, so
 * it is preferred where present.
 */
export function clientKey(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, MAX_KEY_LENGTH);

  const forwarded = request.headers.get("x-forwarded-for");
  const nearest = forwarded?.split(",").pop()?.trim();

  return nearest ? nearest.slice(0, MAX_KEY_LENGTH) : "unknown";
}

/**
 * Drops yesterday's buckets, and if today's alone still exceed the ceiling,
 * the oldest insertions (Map preserves insertion order). Evicting an active
 * client hands back their allowance early — a deliberate trade, since running
 * out of memory would take the whole service down instead.
 */
function evictStale(today: string): void {
  for (const [key, bucket] of buckets) {
    if (bucket.date !== today) buckets.delete(key);
  }

  // +1 so there is room for the entry about to be inserted, keeping the map at
  // MAX_TRACKED_CLIENTS rather than one above it.
  let excess = buckets.size - MAX_TRACKED_CLIENTS + 1;
  if (excess <= 0) return;

  for (const key of buckets.keys()) {
    if (excess-- <= 0) break;
    buckets.delete(key);
  }
}

function currentBucket(key: string): Bucket {
  const today = localDateKey();
  const existing = buckets.get(key);

  if (existing && existing.date === today) return existing;

  // Only sweep when adding would breach the ceiling, so the common path stays
  // O(1) rather than walking the map on every request.
  if (buckets.size >= MAX_TRACKED_CLIENTS) evictStale(today);

  const fresh = { date: today, used: 0 };
  buckets.set(key, fresh);
  return fresh;
}

export function hasQuota(key: string): boolean {
  return currentBucket(key).used < DAILY_LIMIT;
}

/** Call only after a successful extraction. Failures don't consume the quota. */
export function consumeQuota(key: string): number {
  const bucket = currentBucket(key);
  bucket.used += 1;
  return Math.max(0, DAILY_LIMIT - bucket.used);
}
