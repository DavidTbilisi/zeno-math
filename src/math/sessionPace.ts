// The pace of a session of free practice (issue #284), without React so the tests can reach it: how many questions a
// session has, kept in this browser, and the stretch of answering that brings the break prompt.

/** The session lengths a student can choose: five for a short start on a hard day, ten otherwise. */
export const LENGTHS = [5, 10] as const;
export type Length = (typeof LENGTHS)[number];
const LENGTH_KEY = "zeno.session.v1";
/** A stored length: only "5" is five, anything else (nothing stored, an old value) is ten. */
export const readLength = (raw: string | null | undefined): Length => (raw === "5" ? 5 : 10);
/** The length chosen in this browser. */
export function sessionLength(): Length {
  try {
    return readLength(localStorage.getItem(LENGTH_KEY));
  } catch {
    return 10;
  }
}
/** Keeps the length in this browser (ten, the default, by forgetting it). */
export function keepLength(n: Length) {
  try {
    if (n === 5) localStorage.setItem(LENGTH_KEY, "5");
    else localStorage.removeItem(LENGTH_KEY);
  } catch {
    // private mode: the choice lasts until the page closes
  }
}

/** Answering this long without a break brings the break prompt. */
export const BREAK_AFTER = 25 * 60_000;
/** A gap this long between two answers was a break already: the next answer starts a new stretch. */
export const AWAY = 5 * 60_000;
/** A stretch of practice without a break: when it began and when the last answer came (ms). */
export type Stretch = { since: number; last: number };
/** The stretch after an answer at `now`. */
export const stretchAfter = (s: Stretch | null, now: number): Stretch =>
  !s || now - s.last > AWAY ? { since: now, last: now } : { since: s.since, last: now };
/** Whether the stretch has run long enough for the break prompt. */
export const breakDue = (s: Stretch | null) => !!s && s.last - s.since >= BREAK_AFTER;
