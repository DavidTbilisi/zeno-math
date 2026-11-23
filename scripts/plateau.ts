// The plateau rule (issue #580, src/model/plateau.ts) set on ASSISTments times: the noise of a session's median time,
// the band it gives, and whether a plateau flagged on held-out students is followed by less speeding up than none.
//
//   npm run plateau -- data/skill_builder_data.csv            (the raw 2009–2010 skill-builder file, with assignment_id)
//   --seed 1  --test-share 0.2  --json
import { createReadStream } from "node:fs";
import { assistmentsAttempts, csvRecords } from "../src/model/datasets.ts";
import { usableMs } from "../src/model/elo.ts";
import { splitByStudent } from "../src/model/evaluate.ts";
import { lastGain, PLATEAU_BAND, PLATEAU_RULE, SESSION_MIN } from "../src/model/plateau.ts";

const args = process.argv.slice(2);
const opt = (name: string, fallback: string) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const file = args.find((a) => a.endsWith(".csv"));
if (!file) {
  console.error("usage: npm run plateau -- <skill_builder_data.csv> [--seed 1] [--test-share 0.2] [--json]");
  process.exit(2);
}
const seed = Number(opt("--seed", "1"));
const testShare = Number(opt("--test-share", "0.2"));
const N = PLATEAU_RULE.sessions;

const { attempts } = await assistmentsAttempts(csvRecords(createReadStream(file, { encoding: "latin1" })));
const median = (xs: readonly number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

// The split is by student, as everywhere else (evaluate.ts), on observations carrying the student.
const { train, test } = splitByStudent(attempts.map((a) => ({ ...a, level: 2 as const })), testShare, seed);
const trainStudents = new Set(train.map((o) => o.student));
const testStudents = new Set(test.map((o) => o.student));

// A problem's norm: its median log time, over the training students (the skill's where a problem has fewer than 20).
const byProblem = new Map<string, number[]>();
const bySkill = new Map<string, number[]>();
for (const a of attempts) {
  if (!trainStudents.has(a.student) || !usableMs(a.ms)) continue;
  const y = Math.log(a.ms / 1000);
  (byProblem.get(a.problem) ?? byProblem.set(a.problem, []).get(a.problem)!).push(y);
  (bySkill.get(a.skill) ?? bySkill.set(a.skill, []).get(a.skill)!).push(y);
}
const norm = new Map([...byProblem].filter(([, ys]) => ys.length >= 20).map(([k, ys]) => [k, median(ys)]));
const skillNorm = new Map([...bySkill].map(([k, ys]) => [k, median(ys)]));

// Each student × skill: visits (assignments) in the order first met, from the first that reached three right in a row.
type Visit = { answers: { correct: boolean; rel: number }[] };
const seqs = new Map<string, { student: string; visits: Map<string, Visit> }>();
for (const a of attempts) {
  const k = `${a.student}\u0000${a.skill}`;
  const s = seqs.get(k) ?? seqs.set(k, { student: a.student, visits: new Map() }).get(k)!;
  const v = s.visits.get(a.assignment) ?? s.visits.set(a.assignment, { answers: [] }).get(a.assignment)!;
  const base = norm.get(a.problem) ?? skillNorm.get(a.skill);
  v.answers.push({ correct: a.correct, rel: usableMs(a.ms) && base !== undefined ? Math.log(a.ms / 1000) - base : NaN });
}
const streaked = (v: Visit) => {
  let run = 0;
  for (const x of v.answers) if ((run = x.correct ? run + 1 : 0) >= 3) return true;
  return false;
};
const sequences: { student: string; values: number[] }[] = [];
for (const s of seqs.values()) {
  const visits = [...s.visits.values()];
  const from = visits.findIndex(streaked);
  if (from < 0) continue;
  // The kept visit itself counts as the first session, as Zeno counts the day a skill is kept.
  const values = visits.slice(from).flatMap((v) => {
    const t = v.answers.filter((x) => x.correct && !Number.isNaN(x.rel)).map((x) => x.rel);
    return t.length >= SESSION_MIN ? [median(t)] : [];
  });
  sequences.push({ student: s.student, values });
}

// σ: pooled spread of session medians about each training sequence's own straight line (2N sessions or more).
let ss = 0, dof = 0;
for (const q of sequences) {
  if (!trainStudents.has(q.student) || q.values.length < 2 * N) continue;
  const n = q.values.length;
  const xs = q.values.map((_, i) => i);
  const [mx, my] = [mean(xs), mean(q.values)];
  const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  const b = xs.reduce((a, x, i) => a + (x - mx) * (q.values[i] - my), 0) / sxx;
  for (let i = 0; i < n; i++) ss += (q.values[i] - (my + b * (i - mx))) ** 2;
  dof += n - 2;
}
const sigma = Math.sqrt(ss / Math.max(1, dof));
const band = PLATEAU_RULE.z * sigma * Math.sqrt(2 / N);

// The check on held-out students: at every point with 2N sessions behind and N ahead, was the next N's gain smaller
// after a plateau than after none?
const after = { plateau: [] as number[], none: [] as number[] };
for (const q of sequences) {
  if (!testStudents.has(q.student)) continue;
  for (let end = 2 * N; end + N <= q.values.length; end++) {
    const g = lastGain(q.values.slice(0, end), N)!;
    const next = lastGain(q.values.slice(end - N, end + N), N)!;
    (g < band ? after.plateau : after.none).push(next);
  }
}
const sequencesLong = sequences.filter((q) => q.values.length >= 2 * N).length;
const result = {
  source: file, seed, sessions: N, sequences: sequences.length, sequencesLong, dof, sigma: +sigma.toFixed(4), band: +band.toFixed(4), bandInCode: PLATEAU_BAND,
  judged: after.plateau.length + after.none.length, plateaus: after.plateau.length,
  nextGainPlateau: after.plateau.length ? +mean(after.plateau).toFixed(4) : NaN, nextGainNone: after.none.length ? +mean(after.none).toFixed(4) : NaN,
};
if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`${result.sequences} student × skill sequences from a kept visit; ${sequencesLong} with ${2 * N}+ sessions`);
  console.log(`σ of a session median about its own line: ${result.sigma} (${dof} degrees of freedom) → band ${result.band} log seconds (in code: ${PLATEAU_BAND})`);
  console.log(`held out: ${result.judged} points judged, ${result.plateaus} plateaus`);
  console.log(`gain over the next ${N} sessions: after a plateau ${result.nextGainPlateau}, after none ${result.nextGainNone}`);
}
