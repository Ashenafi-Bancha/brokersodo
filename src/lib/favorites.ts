"use client";
import { useSyncExternalStore } from "react";

/** Favourites + recently viewed, stored on the device (no account needed). */
const KEYS = { saved: "bs:saved", recent: "bs:recent" } as const;
type Kind = keyof typeof KEYS;
const MAX = { saved: 100, recent: 20 };
const listeners = new Set<() => void>();
const cache: Record<Kind, { raw: string | null; value: string[] }> = {
  saved: { raw: null, value: [] },
  recent: { raw: null, value: [] },
};

function read(kind: Kind): string[] {
  try {
    const raw = window.localStorage.getItem(KEYS[kind]);
    if (raw === cache[kind].raw) return cache[kind].value;
    const parsed = raw ? JSON.parse(raw) : [];
    const value = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
    cache[kind] = { raw, value };
    return value;
  } catch {
    return cache[kind].value;
  }
}

function write(kind: Kind, ids: string[]) {
  try {
    window.localStorage.setItem(KEYS[kind], JSON.stringify(ids.slice(0, MAX[kind])));
  } catch {
    /* storage full or blocked — ignore */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEYS.saved || e.key === KEYS.recent) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

const EMPTY: string[] = [];

export function useStoredIds(kind: Kind): string[] {
  return useSyncExternalStore(subscribe, () => read(kind), () => EMPTY);
}

export function toggleSaved(id: string): boolean {
  const cur = read("saved");
  const has = cur.includes(id);
  write("saved", has ? cur.filter((x) => x !== id) : [id, ...cur]);
  return !has;
}

export function pushRecent(id: string) {
  const cur = read("recent").filter((x) => x !== id);
  write("recent", [id, ...cur]);
}

export function clearStored(kind: Kind) {
  write(kind, []);
}
