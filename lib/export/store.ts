"use client";

import { ARONIUM_PROFILE, BUILT_IN_PROFILES } from "./presets";
import { duplicateProfile, type ExportProfile } from "./profile";

const STORAGE_KEY = "thurvate.export.v1";

interface StoredState {
  profiles: ExportProfile[];
  selectedId: string;
}

export interface ExportState {
  /** Built-ins first, then the customer's own. */
  profiles: ExportProfile[];
  selected: ExportProfile;
}

const listeners = new Set<() => void>();

/**
 * Same shape as `lib/quota.ts`: an external store read through
 * `useSyncExternalStore`. The snapshot is memoised because React calls
 * `getSnapshot` on every render — parsing JSON there would be wasted work, and
 * returning a fresh object each call would spin React into a re-render loop.
 */
let cache: ExportState | null = null;

export function subscribeProfiles(listener: () => void): () => void {
  listeners.add(listener);

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

export function getProfilesSnapshot(): ExportState {
  if (cache) return cache;
  cache = read();
  return cache;
}

/** The server render knows only about the built-ins. */
export function getProfilesServerSnapshot(): ExportState {
  return SERVER_STATE;
}

const SERVER_STATE: ExportState = {
  profiles: BUILT_IN_PROFILES,
  selected: ARONIUM_PROFILE,
};

function read(): ExportState {
  if (typeof window === "undefined") return SERVER_STATE;

  let stored: Partial<StoredState> = {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) stored = JSON.parse(raw) as Partial<StoredState>;
  } catch {
    // Corrupt or unavailable storage falls through to the built-ins rather
    // than taking the export screen down with it.
  }

  const custom = Array.isArray(stored.profiles)
    ? stored.profiles.filter(isProfile).map((p) => ({ ...p, builtIn: false }))
    : [];

  // Built-ins are never persisted — they are prepended fresh on every read, so
  // a future correction to the Aronium columns reaches existing customers.
  const profiles = [...BUILT_IN_PROFILES, ...custom];
  const selected =
    profiles.find((p) => p.id === stored.selectedId) ?? ARONIUM_PROFILE;

  return { profiles, selected };
}

function isProfile(value: unknown): value is ExportProfile {
  const p = value as Partial<ExportProfile>;
  return (
    !!p &&
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    Array.isArray(p.columns) &&
    (p.format === "csv" || p.format === "xlsx")
  );
}

function write(profiles: ExportProfile[], selectedId: string): void {
  const custom = profiles.filter((p) => !p.builtIn);
  cache = {
    profiles: [...BUILT_IN_PROFILES, ...custom],
    selected: [...BUILT_IN_PROFILES, ...custom].find((p) => p.id === selectedId) ?? ARONIUM_PROFILE,
  };

  try {
    const payload: StoredState = { profiles: custom, selectedId };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Private browsing. The in-memory cache still serves this session.
  }

  listeners.forEach((listener) => listener());
}

export function selectProfile(id: string): void {
  const { profiles } = getProfilesSnapshot();
  write(profiles, id);
}

/** "Duplicate" — the only way to get an editable copy of a built-in. */
export function createProfileFrom(source: ExportProfile): ExportProfile {
  const { profiles } = getProfilesSnapshot();

  const base = `${source.name} copy`;
  let name = base;
  let n = 2;
  while (profiles.some((p) => p.name === name)) name = `${base} ${n++}`;

  const created = duplicateProfile(source, name);
  write([...profiles, created], created.id);
  return created;
}

export function updateProfile(updated: ExportProfile): void {
  if (updated.builtIn) return; // built-ins are read-only by design
  const { profiles, selected } = getProfilesSnapshot();
  write(
    profiles.map((p) => (p.id === updated.id ? updated : p)),
    selected.id,
  );
}

export function deleteProfile(id: string): void {
  const { profiles, selected } = getProfilesSnapshot();
  const remaining = profiles.filter((p) => p.id !== id);
  write(remaining, selected.id === id ? ARONIUM_PROFILE.id : selected.id);
}
