// A plateau (issue #580): a skill the learner has kept (learning stage 2 or more, learningStage.ts) on which they have
// stopped getting faster. Each session on the skill gives one number, the median log seconds of its right first answers
// on the top level; a plateau is when the mean of the last PLATEAU_SESSIONS sessions is no better than the mean of the
// PLATEAU_SESSIONS before them by more than PLATEAU_BAND, the noise of such a difference. Then practice offers a stretch
// (the top level against the learner's own best session as a target, or the skill's game on the clock), and the teacher
// page lists the student beside the stuck list.
//
// N and the band were set on ASSISTments times by `npm run plateau` before the rule was used, as pace.ts's verdict was:
// see PLATEAU_RULE for how, and PLATEAU_CHECK for what came out. Like spacing.ts and learningStage.ts, the state is worked
// out from the answers alone, one at a time in order, so the browser and the server replay agree.
import { usableMs } from "./elo.ts";

/** Sessions on each side of the comparison. */
export const PLATEAU_SESSIONS = 3;
/**
 * How much faster (in log seconds) the last sessions must be than the ones before for it not to be a plateau. Set by
 * PLATEAU_RULE on ASSISTments (npm run plateau): 1.645 standard errors of the difference of two means of
 * PLATEAU_SESSIONS session medians, a session median's noise being the spread of a learner's sessions about their own
 * straight line through them.
 */
export const PLATEAU_BAND = 0.74;
/** A session needs this many timed right first answers for its median to count. */
export const SESSION_MIN = 2;

/**
 * The rule, fixed before `npm run plateau` was first run. On the training students (80 %, split by student), each
 * student × skill's visits (an ASSISTments assignment stands in for a session) after the first visit that reached three
 * right in a row (stand-in for a kept skill) give session medians of the relative time (log time against the problem's
 * median, pace.ts). σ is the pooled standard deviation of those medians about each sequence's own least-squares line,
 * over sequences of at least 2N sessions, and the band is 1.645·σ·√(2/N) with N = 3. On the held-out students it is
 * checked that a flag means something: in sequences with N more sessions after the point judged, the next N sessions'
 * gain over the last N should be smaller after a plateau than after none.
 */
export const PLATEAU_RULE = { sessions: PLATEAU_SESSIONS, z: 1.645 } as const;

/**
 * What `npm run plateau -- data/skill_builder_data.csv` found on ASSISTments 2009–2010 (seed 1), recorded with the rule.
 * Of 16,177 student × skill sequences from a kept visit, only 241 had six sessions or more. A session median is noisy
 * (σ 0.55 log seconds about the learner's own line), so the band is 0.74: the last three sessions must be more than
 * about 2.1 times as fast as the three before for it not to be a plateau. On held-out students only 16 points could be
 * judged, 15 of them plateaus, and the next three sessions sped up more after a plateau (+0.17) than after none (−0.16):
 * the data cannot show that a flagged plateau stays flat (with this little, what it shows is regression to the mean).
 * So the stretch is only offered, never forced, and the teacher sees it as a suggestion, not a finding.
 */
export const PLATEAU_CHECK = {
  sequences: 16177, sequencesLong: 241, sigma: 0.5486, band: 0.7368, judged: 16, plateaus: 15, nextGainPlateau: 0.1671, nextGainNone: -0.16,
} as const;

const median = (xs: readonly number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** The session medians, oldest first, of sessions with enough answers. */
export const sessionValues = (sessions: readonly { times: readonly number[] }[]) =>
  sessions.filter((s) => s.times.length >= SESSION_MIN).map((s) => median(s.times));

/** The gain (earlier mean minus later mean, so positive is faster) of the last n values over the n before them. */
export function lastGain(values: readonly number[], n = PLATEAU_SESSIONS): number | null {
  if (values.length < 2 * n) return null;
  return mean(values.slice(-2 * n, -n)) - mean(values.slice(-n));
}

/** Whether the values end in a plateau: null with too few sessions to say. */
export function isPlateau(values: readonly number[], n = PLATEAU_SESSIONS, band = PLATEAU_BAND): boolean | null {
  const g = lastGain(values, n);
  return g === null ? null : g < band;
}

// ---------- the learner's state ----------

/** One skill's sessions since it was kept (only the last 2N + 1 are kept), each its day and its timed right answers. */
export type PlateauSkill = { sessions: { day: string; times: number[] }[] };
export type Plateaus = Record<string, PlateauSkill>;
export type PlateauAnswer = {
  /** The day of the answer (YYYY-MM-DD in the learner's time): a session is a day's practice of the skill. */
  day: string;
  /** Right at the first try, on the top level. */
  correct: boolean;
  top: boolean;
  /** The learning stage of the skill before this answer (learningStage.ts). */
  stage: number;
  ms?: number;
};

/** Moves `key`'s sessions on by one answer: only right top-level first answers on a kept skill count. */
export function notePlateau(p: Plateaus, key: string, a: PlateauAnswer): void {
  if (a.stage < 2 || !a.top || !a.correct || !usableMs(a.ms)) return;
  const st = (p[key] ??= { sessions: [] });
  const last = st.sessions.at(-1);
  const y = Math.log(a.ms / 1000);
  if (last && last.day === a.day) last.times.push(y);
  else st.sessions.push({ day: a.day, times: [y] });
  if (st.sessions.length > 2 * PLATEAU_SESSIONS + 1) st.sessions.splice(0, st.sessions.length - (2 * PLATEAU_SESSIONS + 1));
}

/** A skill on a plateau and the learner's best session (median seconds) as a target to beat; null when not. */
export function plateauOf(p: Plateaus | undefined, key: string): { best: number } | null {
  const st = p?.[key];
  if (!st) return null;
  // Today's session may be under way: judge the finished ones, and today's only once it has its answers.
  const values = sessionValues(st.sessions);
  if (!isPlateau(values)) return null;
  return { best: Math.exp(Math.min(...values)) };
}
