// What follows an account from device to device (#607), and how two copies of it become one. A learner's progress
// outside class practice is kept by the browser, one localStorage key for each thing: free practice, each game's
// ladder, the dates things were achieved, the first guesses on "predict, then reveal", today's session, the roadmap
// goal. Signed in, the browser sends the keys that changed and the server keeps them for the account's other devices.
//
// Two devices may both have moved on since they last agreed. So the server never just overwrites: it merges by what
// the key holds, and nothing a learner has won on either device is lost.
//
// Here in src/model, and free of the browser, because the server runs it (server/accounts.ts).

/** The most keys an account keeps, and the longest value, in characters: far above what the app writes. */
export const KEYS_MAX = 400;
export const VALUE_MAX = 256 * 1024;

export const PRACTICE_KEY = "zeno.practice.v1";
export const ACHIEVED_KEY = "zeno.achieved.v1";
export const PREDICTIONS_KEY = "zeno.predictions.v1";
export const TODAY_KEY = "zeno.today.v1";
export const GOAL_KEY = "zeno.goal";

/**
 * Keys shaped like progress that stay with the browser: who is signed in and what waits to be sent (the account
 * brings those itself), this device's settings (sound, calm mode, the session's length), and the scratch paper.
 */
const STAYS = new Set([
  "zeno.account.v1", "zeno.student.v1", "zeno.outbox.v1", "zeno.testbox.v1", "zeno.synced.v1", "zeno.classIdeas.v1",
  "zeno.sound.v1", "zeno.feel.v1", "zeno.session.v1", "zeno.scratch.v1",
]);
/**
 * Whether a browser key follows the account: every "zeno.<name>.v1" (so a new game's ladder follows without being
 * listed anywhere) but those that stay, and the roadmap goal.
 */
export const follows = (key: string): boolean => key === GOAL_KEY || (/^zeno\.[A-Za-z0-9]+\.v1$/.test(key) && !STAYS.has(key));
/** Keys that say someone has practised here: any that follows, but the goal and today's plan, which practising doesn't make. */
export const isWork = (key: string): boolean => follows(key) && key !== GOAL_KEY && key !== TODAY_KEY;

/** A short fingerprint of a stored value (FNV-1a with the length), for the browser to see which keys changed since it last sent them. */
export function hashOf(value: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${value.length}:${(h >>> 0).toString(36)}`;
}

type Obj = Record<string, unknown>;
const parse = (s: string): unknown => {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
};
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
/** The larger of two lists of counts, place by place. */
const maxEach = (a: unknown, b: unknown): number[] => {
  const x = list(a), y = list(b);
  return Array.from({ length: Math.max(x.length, y.length) }, (_, i) => Math.max(num(x[i]), num(y[i])));
};

/**
 * A game's ladder (Ladder in src/math/ladder.ts) from two copies: the best stars of each puzzle, everything noticed
 * on either, the best streaks, the most misses counted, and the pace of the copy sent (the other's where it has none).
 */
function mergeLadder(kept: Obj, sent: Obj): Obj {
  const pace = list(sent.pace), other = list(kept.pace);
  return {
    ...kept,
    ...sent,
    stars: maxEach(kept.stars, sent.stars),
    found: [...new Set([...list(sent.found), ...list(kept.found)])],
    best: Math.max(num(kept.best), num(sent.best)),
    runs: maxEach(kept.runs, sent.runs),
    misses: maxEach(kept.misses, sent.misses),
    pace: Array.from({ length: Math.max(pace.length, other.length) }, (_, i) => num(pace[i]) || num(other[i])),
  };
}

/** Every field of both; where both have one, `pick` chooses. */
function union(kept: Obj, sent: Obj, pick: (kept: unknown, sent: unknown) => unknown): Obj {
  const out: Obj = { ...sent };
  for (const [k, v] of Object.entries(kept)) out[k] = k in sent ? pick(v, sent[k]) : v;
  return out;
}

/**
 * One value from two: `kept` is what the server has for the key, `sent` what a browser has just sent. Both are the
 * strings localStorage holds.
 *
 * - achieved dates: every date of both, the earlier where both have one (only the first time counts);
 * - first guesses: every guess of both, the earlier where both made one;
 * - free practice: the copy with more questions answered (its records are one learner model, not to be mixed);
 * - today's session: the later day's, or on one day the copy with more parts done;
 * - a ladder: see mergeLadder;
 * - anything else, or a copy that can't be read: the one sent, which is the newer.
 */
export function mergeState(key: string, kept: string, sent: string): string {
  if (kept === sent) return sent;
  const a = parse(kept), b = parse(sent);
  if (!isObj(a) || !isObj(b)) return sent;
  let merged: Obj;
  if (key === ACHIEVED_KEY) merged = union(a, b, (x, y) => (num(x) && num(y) ? Math.min(num(x), num(y)) : num(x) || num(y)));
  else if (key === PREDICTIONS_KEY) merged = union(a, b, (x, y) => (isObj(x) && isObj(y) ? (num(x.at) <= num(y.at) ? x : y) : (y ?? x)));
  else if (key === PRACTICE_KEY) return num(a.answered) > num(b.answered) ? kept : sent;
  else if (key === TODAY_KEY) {
    const day = String(a.day ?? "").localeCompare(String(b.day ?? ""));
    return day > 0 || (day === 0 && list(a.done).length > list(b.done).length) ? kept : sent;
  } else if (Array.isArray(a.stars) && Array.isArray(b.stars)) merged = mergeLadder(a, b);
  else return sent;
  // When the copy sent already says it all, it is kept as it was sent, so the browser has nothing to take back.
  const text = JSON.stringify(merged);
  return text === JSON.stringify(b) ? sent : text;
}
