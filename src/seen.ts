// What first-time help has been dismissed in this browser (#872), kept in zeno.seen.v1 apart from achieved.ts, which
// the roadmaps count. A plain module so the tests can run it; the cards are in components/Help.tsx.
import { useSyncExternalStore } from "react";

export const KEY = "zeno.seen.v1";
/** Every card and tour id, all seen: recordings and the e2e tests start with this (#891). A new card id goes here. */
export const ALL_SEEN = JSON.stringify(["teacher", "practice", "boardTour"]);
const listeners = new Set<() => void>();
let cache: string | null | undefined;
let ids = new Set<string>();

function read(): Set<string> {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    /* no storage: nothing has been seen */
  }
  if (raw !== cache) {
    cache = raw;
    try {
      const list: unknown = JSON.parse(raw ?? "[]");
      ids = new Set(Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : []);
    } catch {
      ids = new Set();
    }
  }
  return ids;
}

function write(next: Set<string>) {
  try {
    if (next.size) localStorage.setItem(KEY, JSON.stringify([...next]));
    else localStorage.removeItem(KEY);
  } catch {
    /* not kept: the card still goes away until the page reloads */
  }
  cache = undefined;
  ids = next;
  listeners.forEach((l) => l());
}

export const isSeen = (id: string) => read().has(id);

export function setSeen(id: string, seen: boolean) {
  const next = new Set(read());
  if (seen) next.add(id);
  else next.delete(id);
  write(next);
}

/** Every welcome card shows again (the help page's "Show the welcome cards again"). */
export const forgetSeen = () => write(new Set());

const subscribe = (l: () => void) => (listeners.add(l), () => void listeners.delete(l));

export function useSeen(id: string): [boolean, (seen: boolean) => void] {
  const seen = useSyncExternalStore(subscribe, () => isSeen(id), () => true);
  return [seen, (s) => setSeen(id, s)];
}
