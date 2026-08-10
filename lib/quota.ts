"use client";

import { localDateKey } from "./date";

export const DAILY_LIMIT = 10;

const STORAGE_KEY = "thurvate.quota.v1";

interface StoredQuota {
  date: string;
  used: number;
}

const listeners = new Set<() => void>();

/**
 * The daily allowance, exposed as an external store so components can read it
 * with `useSyncExternalStore` — localStorage isn't available during the server
 * render, and reading it in a mount effect just causes a cascading render.
 *
 * Counts are keyed by local calendar date, so the allowance resets at the
 * shop's midnight rather than UTC's. The API route enforces the same cap per
 * IP; this copy exists to keep the UI honest, not to be the security boundary.
 */
/**
 * React calls `getSnapshot` on every render — often more than once. Hitting
 * localStorage and running JSON.parse that often is pure waste, so the parsed
 * value is memoised and only recomputed when the day rolls over or something
 * writes. Keyed by date so a shop trading past midnight still resets.
 */
let cache: { date: string; used: number } | null = null;

export function subscribeQuota(listener: () => void): () => void {
  listeners.add(listener);

  // Another tab scanning against the same allowance should move this one's
  // counter — but its write invalidates our cache, so drop it before notifying.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    cache = null;
    listener();
  };

  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Returns a primitive, so identity stability across renders is free. */
export function getUsedSnapshot(): number {
  if (typeof window === "undefined") return 0;

  const today = localDateKey();
  if (cache && cache.date === today) return cache.used;

  const used = readFromStorage(today);
  cache = { date: today, used };
  return used;
}

function readFromStorage(today: string): number {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;

    const parsed = JSON.parse(raw) as Partial<StoredQuota>;
    if (parsed.date !== today || typeof parsed.used !== "number") return 0;

    return clamp(parsed.used);
  } catch {
    return 0;
  }
}

/** Nothing is used yet as far as the server render is concerned. */
export function getUsedServerSnapshot(): number {
  return 0;
}

/** Call only after an extraction succeeds — a failed call is free. */
export function consumeQuota(): number {
  return write(getUsedSnapshot() + 1);
}

/** The API route rejected us on quota; bring the client's view in line. */
export function exhaustQuota(): number {
  return write(DAILY_LIMIT);
}

function write(used: number): number {
  const next = clamp(used);
  const today = localDateKey();

  // Update the memoised value first: storage may be unavailable, and the UI
  // should still reflect the new count for the rest of the session.
  cache = { date: today, used: next };

  if (typeof window !== "undefined") {
    try {
      const payload: StoredQuota = { date: today, used: next };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Private browsing / storage disabled. The server cap still applies.
    }
  }

  listeners.forEach((listener) => listener());
  return next;
}

function clamp(used: number): number {
  return Math.max(0, Math.min(DAILY_LIMIT, Math.floor(used)));
}
