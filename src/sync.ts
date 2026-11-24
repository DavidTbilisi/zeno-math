// A signed-in learner's progress follows them (#607): this keeps the browser's copy and the account's copy the same.
//
// The app itself goes on reading and writing localStorage, as it always has: every game, free practice and the
// roadmaps stay as they are. This looks at the keys that follow the account (src/model/accountState.ts) every few
// seconds, sends the ones that changed since they were last sent, and writes back whatever another device changed
// meanwhile. The server merges, so two devices never undo each other (a ladder keeps the best stars of both).
//
// A page reads its progress once, as it opens. So when a sync brings something new just as the app starts, or someone
// signs in or out, the pages are opened afresh (the epoch below); later syncs leave the open page alone, and it finds
// the news the next time it opens.
import { useSyncExternalStore } from "react";
import { req } from "./api";
import { follows, hashOf, isWork, VALUE_MAX } from "./model/accountState";

const META_KEY = "zeno.synced.v1";
/** How often changed keys are looked for, and after how many such looks the server is asked for news anyway. */
const TICK_MS = 15_000;
const ASK_EVERY = 20;

/**
 * What this browser and the server last agreed on: whose progress it is, the account's revision then, a fingerprint
 * of each key as it was then, and the keys to replace on the server rather than merge (a progress reset).
 */
type Meta = { owner: string; rev: number; hashes: Record<string, string>; replace: string[] };
type Answer = { rev: number; items: Record<string, string> };

const store = (): Storage | null => {
  try {
    return localStorage;
  } catch {
    return null; // no storage: nothing to keep, nothing to sync
  }
};
function loadMeta(owner: string): Meta {
  try {
    const m = JSON.parse(store()?.getItem(META_KEY) ?? "null") as Meta | null;
    if (m && m.owner === owner && typeof m.rev === "number" && m.hashes && typeof m.hashes === "object") return { ...m, replace: Array.isArray(m.replace) ? m.replace : [] };
  } catch {
    // a broken copy: start from nothing agreed
  }
  return { owner, rev: 0, hashes: {}, replace: [] };
}
function saveMeta(m: Meta) {
  try {
    store()?.setItem(META_KEY, JSON.stringify(m));
  } catch {
    // storage full: the next sync sends everything again, and the server's merge makes that harmless
  }
}

/**
 * The keys that follow the account, as this browser has them now. A value longer than the server takes stays here:
 * sending it would have the whole request refused, and every other key with it.
 */
function localItems(): Record<string, string> {
  const s = store();
  const out: Record<string, string> = {};
  if (!s) return out;
  for (let i = 0; i < s.length; i++) {
    const key = s.key(i);
    const value = key && follows(key) ? s.getItem(key) : null;
    if (key && value !== null && value.length <= VALUE_MAX) out[key] = value;
  }
  return out;
}

/** Whose progress this browser last synced (their email), or null when it never has: a session that ran out leaves it behind. */
export function progressOwner(): string | null {
  try {
    return (JSON.parse(store()?.getItem(META_KEY) ?? "null") as Meta | null)?.owner ?? null;
  } catch {
    return null;
  }
}

/** Whether someone has practised on this browser: a ladder, free practice, anything achieved. */
export const hasWorkHere = (): boolean => Object.keys(localItems()).some(isWork);

/** Takes the progress off this browser: signing out, or signing in where someone else has practised. */
export function clearProgress() {
  const s = store();
  if (!s) return;
  for (const key of Object.keys(localItems())) s.removeItem(key);
  s.removeItem(META_KEY);
}

// ---------- pages opened afresh ----------

let epoch = 0;
const watchers = new Set<() => void>();
/** Counts up whenever the pages should read the browser's progress again. */
export const useEpoch = (): number =>
  useSyncExternalStore((w) => (watchers.add(w), () => watchers.delete(w)), () => epoch);
export function freshPages() {
  epoch++;
  watchers.forEach((w) => w());
}

// ---------- syncing ----------

let owner: string | null = null;
let chain: Promise<unknown> = Promise.resolve();
let timer: ReturnType<typeof setInterval> | undefined;
let ticks = 0;

/** One exchange with the server. ask: go even when nothing changed here. Resolves to whether it changed anything here. */
async function exchange(ask: boolean, keepalive = false): Promise<boolean> {
  const who = owner;
  const s = store();
  if (!who || !s) return false;
  const meta = loadMeta(who);
  const before = localItems();
  const items = Object.fromEntries(Object.entries(before).filter(([key, value]) => meta.hashes[key] !== hashOf(value)));
  const changed = Object.keys(items).length > 0;
  if (!changed && !ask) return false;
  const answer = changed
    ? await req<Answer>("PUT", "/api/account/state", { since: meta.rev, items, replace: meta.replace.filter((k) => k in items) }, keepalive)
    : await req<Answer>("GET", `/api/account/state?since=${meta.rev}`);
  // Someone else may have signed in while the request was on its way: then this answer is nobody's here.
  if (owner !== who) return false;
  let wrote = false;
  for (const key of Object.keys(items)) meta.hashes[key] = hashOf(items[key]);
  for (const [key, value] of Object.entries(answer.items)) {
    const now = s.getItem(key);
    // Changed here again while the request was away: it goes out on the next round, and the server merges the two.
    if (now !== (before[key] ?? null)) continue;
    if (now !== value) {
      try {
        s.setItem(key, value);
        wrote = true;
      } catch {
        continue; // storage full: asked for again next time
      }
    }
    meta.hashes[key] = hashOf(value);
  }
  meta.rev = Math.max(meta.rev, answer.rev);
  meta.replace = meta.replace.filter((k) => !(k in items));
  saveMeta(meta);
  return wrote;
}
/** Exchanges one at a time, in the order asked for. A failed one (offline) is simply tried again later. */
function sync(ask: boolean, keepalive = false): Promise<boolean> {
  const run = () => exchange(ask, keepalive).catch(() => false);
  const next = chain.then(run, run);
  chain = next;
  return next;
}

/** Sends what changed here before the page goes: as the tab is hidden, and before signing out. */
export const flushProgress = (keepalive = false): Promise<boolean> => sync(false, keepalive);

const onVisibility = () => void (document.visibilityState === "hidden" ? sync(false, true) : sync(true));
const onHide = () => void sync(false, true);

/**
 * Starts keeping this browser's progress and the account's the same. Resolves, once the first exchange is over, to
 * whether it brought anything this browser didn't have.
 */
export function startSync(email: string): Promise<boolean> {
  stopSync();
  owner = email;
  ticks = 0;
  timer = setInterval(() => void sync(++ticks % ASK_EVERY === 0), TICK_MS);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", onHide);
  return sync(true);
}
export function stopSync() {
  owner = null;
  clearInterval(timer);
  timer = undefined;
  if (typeof document === "undefined") return;
  document.removeEventListener("visibilitychange", onVisibility);
  window.removeEventListener("pagehide", onHide);
}

/**
 * The next time this key is sent it replaces the account's copy instead of being merged with it: the learner has reset
 * that progress and means it, on every device.
 */
export function replaceOnSync(key: string) {
  if (!owner) return;
  const meta = loadMeta(owner);
  if (!meta.replace.includes(key)) meta.replace.push(key);
  saveMeta(meta);
}
