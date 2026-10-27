// The grain chosen from the answers, a check made after every result (27 October 2026): which grouping of a skill's
// ideas predicts a class's answers best, from one unit for the whole skill to one unit per idea? A unit is a group of
// ideas tracked as one by BKT on each idea (src/model/ideas.ts): a question needs every unit that holds an idea it
// needs, and a unit is known when all its ideas are, so the conjunctive model, its fit and its mastery rule run on units
// unchanged. The world is the world of ideas on fractions, practised alone, with its ideas known and learnt in clusters
// (one cluster per idea is the world as the thesis ran it, without the skills before fractions to carry from). A
// grouping is chosen on the training learners by splitting ideas off the whole skill and by merging them from one unit
// per idea, each move judged by the log-loss of a held-out quarter of the training learners; optionally, a coarser
// grouping is then kept only if it beats one unit per idea on a further quarter the search never saw.
import { en } from "../locales/en.ts";
import { exercise } from "../math/practice.ts";
import { sigmoid } from "./elo.ts";
import { fitIdeasByLikelihood, ideasOf, ideasRule, type IdeaFit, type IdeaPractice } from "./ideas.ts";
import { conjunctiveStep, gapIdea, IDEA_PRIOR, usesOf } from "./ideaState.ts";
import { cheapestAtPrecision, decide, FINE_THRESHOLDS, fitRules, judge, PRECISION_TARGET } from "./mastery.ts";
import { fixedChoice } from "./policy.ts";
import { rng } from "./random.ts";
import { DEFAULT_SIM } from "./simulate.ts";

/** A grouping of a skill's ideas into units, each unit a list of idea ids. */
export type Grouping = string[][];

const SKILL = "fractions";
/** The ways the world's learners may know the sixteen ideas of fractions: one by one, or in six or three clusters. */
export const CLUSTER_WORLDS = {
  sixteen: ideasOf(SKILL).map((id) => [id]),
  six: [["part", "equivalent", "lowest"], ["commonDenom", "addSub"], ["multiply", "reciprocal", "divide"], ["toImproper", "toMixed"], ["addWhole", "multiplyFacts", "multiplyLong", "divideExact"], ["hcf", "lcm"]],
  three: [["part", "equivalent", "lowest", "commonDenom", "addSub"], ["multiply", "reciprocal", "divide", "toImproper", "toMixed"], ["addWhole", "multiplyFacts", "multiplyLong", "divideExact", "hcf", "lcm"]],
} satisfies Record<string, Grouping>;
export type ClusterWorld = keyof typeof CLUSTER_WORLDS;

/** The world's chance of a slip and of a guess, and of learning per unit of learning rate, as in simulateIdeas. */
const SLIP = 0.1, GUESS = 0.2, LEARN_PER_RATE = 2.5, TRAP_RATE = 0.5;

/**
 * Learners practising fractions alone, every question the generator's own and the levels dealt as the fixed sequence
 * deals them, as simulateIdeas has them, except that an idea is known when its cluster is: each cluster has a
 * difficulty, the learner's ability against it is the chance of knowing it at the start, and a question teaches each
 * unknown cluster it needs with the world's chance. A wrong answer takes the form of a recognised mistake as there.
 */
export function simulateClusters(clusters: Grouping, students: number, length: number, learnRate: number, seed: number): IdeaPractice[] {
  const r = rng(seed), { spread } = DEFAULT_SIM, ids = ideasOf(SKILL);
  const clusterOf = new Map(clusters.flatMap((c, k) => c.map((id) => [id, k] as const)));
  if (clusterOf.size !== ids.length || ids.some((id) => !clusterOf.has(id))) throw new Error("the clusters must hold every idea of fractions once");
  const difficulty = clusters.map(() => r.normal(spread.difficulty));
  const learn = Math.min(1, LEARN_PER_RATE * learnRate), out: IdeaPractice[] = [];
  for (let s = 0; s < students; s++) {
    const ability = r.normal(spread.global) + r.normal(spread.skill);
    const known = clusters.map((_, k) => r.next() < sigmoid(ability - difficulty[k]));
    const has = (id: string) => known[clusterOf.get(id)!];
    const answers = new Uint8Array(length), all = new Uint8Array(length), gap = new Int8Array(length).fill(-1);
    const needs: number[][] = [], ideaKnown = ids.map(() => new Uint8Array(length));
    for (let i = 0; i < length; i++) {
      const ex = exercise(SKILL, fixedChoice([SKILL], i).level, Math.floor(r.next() * 2 ** 31) + 1, en.pracWords);
      const needed = usesOf(ex);
      needs.push(needed.map((n) => ids.indexOf(n)));
      const right = r.next() < (needed.every(has) ? 1 - SLIP : GUESS);
      answers[i] = right ? 1 : 0;
      if (!right) {
        const missing = (ex.answer.traps ?? []).map((t) => gapIdea(t.id)).find((g) => g && needed.includes(g) && !has(g));
        if (missing && r.next() < TRAP_RATE) gap[i] = ids.indexOf(missing);
      }
      for (const k of new Set(needed.map((n) => clusterOf.get(n)!))) if (!known[k] && r.next() < learn) known[k] = true;
      ids.forEach((id, j) => (ideaKnown[j][i] = has(id) ? 1 : 0));
      all[i] = ids.every(has) ? 1 : 0;
    }
    out.push({ student: `sim${s + 1}`, skill: SKILL, answers, known: all, ids, needs, gap, ideaKnown });
  }
  return out;
}

export const unitName = (unit: readonly string[]) => unit.join("+");

/** The practices with their ideas grouped into units: a question needs every unit holding an idea it needs, a recognised mistake blames its idea's unit, and a unit is known when all its ideas are. */
export function regroup(practices: readonly IdeaPractice[], grouping: Grouping): IdeaPractice[] {
  const unitOf = new Map(grouping.flatMap((u, k) => u.map((id) => [id, k] as const)));
  return practices.map((p) => {
    const map = p.ids.map((id) => unitOf.get(id)!);
    const ideaKnown = grouping.map((u) => {
      const js = u.map((id) => p.ids.indexOf(id));
      return Uint8Array.from(p.answers, (_, i) => (js.every((j) => p.ideaKnown[j][i]) ? 1 : 0));
    });
    return {
      ...p, ids: grouping.map(unitName), needs: p.needs.map((n) => [...new Set(n.map((j) => map[j]))]),
      gap: Int8Array.from(p.gap, (g) => (g < 0 ? -1 : map[g])), ideaKnown, ticked: undefined,
    };
  });
}

// ---------- the search's own fit ----------
// The conjunctive likelihood fitIdeasByLikelihood climbs, on the same grids, but started where the grouping before the
// move left each unit and tuned only on the units the move changed, so that a hundred moves can be judged in seconds.

const INIT_GRID = [0.02, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 0.98];
const LEARN_GRID = [0.005, 0.01, 0.02, 0.03, 0.05, 0.1, 0.15, 0.2, 0.3];
type Question = { guess: number; slip: number };
/** Every answer flattened: where each practice starts, whether each answer is right, and the units it needed. */
type Flat = { units: number; first: number[]; right: Uint8Array; from: number[]; needs: number[] };

function flatten(practices: readonly IdeaPractice[], grouping: Grouping): Flat {
  const unitOf = new Map(grouping.flatMap((u, k) => u.map((id) => [id, k] as const)));
  const first: number[] = [], right: number[] = [], from = [0], needs: number[] = [];
  for (const p of practices) {
    first.push(right.length);
    for (let i = 0; i < p.answers.length; i++) {
      right.push(p.answers[i]);
      for (const k of new Set(p.needs[i].map((j) => unitOf.get(p.ids[j])!))) needs.push(k);
      from.push(needs.length);
    }
  }
  first.push(right.length);
  return { units: grouping.length, first, right: Uint8Array.from(right), from, needs };
}

/** The log-likelihood of the answers, each predicted from the ones before it in its practice, every practice started afresh. */
function likelihood(f: Flat, init: readonly number[], learn: readonly number[], q: Question) {
  const known = new Float64Array(f.units);
  let sum = 0;
  for (let k = 0; k + 1 < f.first.length; k++) {
    for (let g = 0; g < f.units; g++) known[g] = init[g];
    for (let a = f.first[k]; a < f.first[k + 1]; a++) {
      let all = 1;
      for (let x = f.from[a]; x < f.from[a + 1]; x++) all *= known[f.needs[x]];
      const ok = f.right[a] === 1, seen = ok ? all * (1 - q.slip) + (1 - all) * q.guess : all * q.slip + (1 - all) * (1 - q.guess);
      sum += Math.log(seen);
      for (let x = f.from[a]; x < f.from[a + 1]; x++) {
        const g = f.needs[x], joint = ok ? all * (1 - q.slip) + (known[g] - all) * q.guess : all * q.slip + (known[g] - all) * (1 - q.guess);
        const posterior = joint / seen;
        known[g] = posterior + (1 - posterior) * learn[g];
      }
    }
  }
  return sum;
}

/** Coordinate ascent on the given units' init then learn, each on its grid, until a round changes nothing or after rounds. */
function tune(f: Flat, init: number[], learn: number[], q: Question, units: readonly number[], rounds: number) {
  let top = likelihood(f, init, learn, q);
  for (let round = 0, moved = true; moved && round < rounds; round++) {
    moved = false;
    for (const g of units)
      for (const [values, grid] of [[init, INIT_GRID], [learn, LEARN_GRID]] as const) {
        const was = values[g];
        let best = was;
        for (const v of grid) {
          if (v === was) continue;
          values[g] = v;
          const l = likelihood(f, init, learn, q);
          if (l > top) (top = l), (best = v);
        }
        if (best !== was) moved = true;
        values[g] = best;
      }
  }
}

/** A grouping with its units' fitted parameters and its mean log-loss per answer on the scoring learners. */
type Scored = { grouping: Grouping; init: number[]; learn: number[]; loss: number };

export type Choice = {
  grouping: Grouping;
  /** Mean log-loss per answer on the scoring quarter: the whole skill, the best splits, the best merges, one unit per idea. */
  scores: { coarse: number; split: number; merged: number; fine: number };
  /** With confirmation, and a pick other than one unit per idea: its gain over one unit per idea on the confirming quarter, the bootstrap's 2.5 % point, and whether it was kept. */
  confirmation?: { estimate: number; lower: number; kept: boolean };
};

/**
 * The grouping chosen on the training practices. The training learners are dealt into quarters in order: the fourth
 * scores the moves and the others fit them, or, with confirm, the first is set aside and only the second and third fit
 * them. From the whole skill, the best move splitting one idea off into a unit of its own is taken while it lowers the
 * scoring quarter's log-loss, and from one unit per idea the best move merging two units; each taken move is refitted
 * on every unit and kept so if that scores better. The pick is the best scoring of the whole skill, the splits, the
 * merges and one unit per idea. With confirm, a pick other than one unit per idea is refitted with one unit per idea
 * on all but the first quarter, both are scored on the first, learner by learner, and the pick is kept only if the
 * 2.5 % point of a bootstrap of their difference over those learners (resamples, from seed) is above zero.
 */
export function chooseGrouping(train: readonly IdeaPractice[], confirm = false, seed = 1, resamples = 2000): Choice {
  const ideas = ideasOf(SKILL);
  const students = [...new Set(train.map((p) => p.student))];
  const quarter = new Map(students.map((s, i) => [s, i % 4]));
  const scoring = train.filter((p) => quarter.get(p.student) === 3);
  const fitting = train.filter((p) => quarter.get(p.student) !== 3 && !(confirm && quarter.get(p.student) === 0));
  const q = fitRules(fitting).bkt(SKILL);
  const count = scoring.reduce((s, p) => s + p.answers.length, 0);
  const score = (grouping: Grouping, init: number[], learn: number[], changed: readonly number[], rounds: number): Scored => {
    const i = [...init], l = [...learn];
    tune(flatten(fitting, grouping), i, l, q, changed, rounds);
    return { grouping, init: i, learn: l, loss: -likelihood(flatten(scoring, grouping), i, l, q) / count };
  };
  const everyUnit = (g: Grouping) => g.map((_, k) => k);
  const full = (g: Grouping) => score(g, g.map(() => IDEA_PRIOR.init), g.map(() => IDEA_PRIOR.learn), everyUnit(g), 5);
  // A move's best is refitted on every unit, and that refit kept only if it scores better.
  const settle = (best: Scored) => {
    const again = score(best.grouping, best.init, best.learn, everyUnit(best.grouping), 5);
    return again.loss < best.loss ? again : best;
  };
  const coarse = full([[...ideas]]), fine = full(ideas.map((id) => [id]));

  let split = coarse;
  for (;;) {
    let best: Scored | null = null;
    for (let k = 0; k < split.grouping.length; k++) {
      if (split.grouping[k].length < 2) continue;
      for (const id of split.grouping[k]) {
        const g = [...split.grouping.map((u, j) => (j === k ? u.filter((x) => x !== id) : u)), [id]];
        const s = score(g, [...split.init, split.init[k]], [...split.learn, split.learn[k]], [k, g.length - 1], 2);
        if (s.loss < (best?.loss ?? split.loss)) best = s;
      }
    }
    if (!best) break;
    split = settle(best);
  }

  let merged = fine;
  for (;;) {
    let best: Scored | null = null;
    const m = merged;
    for (let a = 0; a < m.grouping.length; a++)
      for (let b = a + 1; b < m.grouping.length; b++) {
        const keep = everyUnit(m.grouping).filter((k) => k !== a && k !== b);
        const g = [...keep.map((k) => m.grouping[k]), [...m.grouping[a], ...m.grouping[b]]];
        // The merged unit starts known as often as both were, and learnt at the slower of the two.
        const s = score(g, [...keep.map((k) => m.init[k]), m.init[a] * m.init[b]], [...keep.map((k) => m.learn[k]), Math.min(m.learn[a], m.learn[b])], [g.length - 1], 2);
        if (s.loss < (best?.loss ?? m.loss)) best = s;
      }
    if (!best) break;
    merged = settle(best);
  }

  const pick = [coarse, split, merged, fine].reduce((x, y) => (y.loss < x.loss ? y : x));
  const scores = { coarse: coarse.loss, split: split.loss, merged: merged.loss, fine: fine.loss };
  if (!confirm || pick === fine) return { grouping: pick.grouping, scores };
  const confirming = train.filter((p) => quarter.get(p.student) === 0), rest = train.filter((p) => quarter.get(p.student) !== 0);
  const refit = (g: Grouping) => {
    const init = g.map(() => IDEA_PRIOR.init), learn = g.map(() => IDEA_PRIOR.learn);
    tune(flatten(rest, g), init, learn, q, everyUnit(g), 5);
    return confirming.map((p) => -likelihood(flatten([p], g), init, learn, q) / p.answers.length);
  };
  const lf = refit(fine.grouping), lp = refit(pick.grouping);
  const d = lf.map((x, i) => x - lp[i]);
  const r = rng(seed), means: number[] = [];
  for (let b = 0; b < resamples; b++) {
    let sum = 0;
    for (let i = 0; i < d.length; i++) sum += d[Math.floor(r.next() * d.length)];
    means.push(sum / d.length);
  }
  means.sort((a, b) => a - b);
  const lower = means[Math.floor(0.025 * resamples)], kept = lower > 0;
  return { grouping: kept ? pick.grouping : fine.grouping, scores, confirmation: { estimate: d.reduce((a, b) => a + b, 0) / d.length, lower, kept } };
}

// ---------- judging a grouping on the test learners, with the fit the thesis uses ----------

/** Each practice's mean log-loss per answer, each answer predicted from the ones before it. */
export function practiceLosses(fit: IdeaFit, practices: readonly IdeaPractice[]): number[] {
  return practices.map((p) => {
    const known = p.ids.map((id) => fit.idea(id).init), q = fit.question(p.skill);
    let sum = 0;
    for (let i = 0; i < p.answers.length; i++) {
      let all = 1;
      for (const j of p.needs[i]) all *= known[j];
      const right = all * (1 - q.slip) + (1 - all) * q.guess;
      sum -= Math.log(p.answers[i] ? right : 1 - right);
      conjunctiveStep(known, p.needs[i], (j) => fit.idea(p.ids[j]).learn, q, p.answers[i] === 1);
    }
    return sum / p.answers.length;
  });
}

export type GroupingJudgement = {
  units: number;
  /** Each test practice's mean log-loss per answer. */
  losses: number[];
  /** The cheapest BKT threshold on the units right PRECISION_TARGET of the time on the training practices, judged on the test ones (null when none is). */
  cost: number | null;
  precision: number | null;
  /**
   * When the learner is short of exactly one of the world's clusters, the share of the ideas in the unit with the lowest
   * P(known) that are missing, averaged over those moments (null when there are none).
   */
  diagnosis: number | null;
};

/** A grouping fitted on the training practices by fitIdeasByLikelihood, as the thesis fits ideas, and judged on the test practices. */
export function judgeGrouping(train: readonly IdeaPractice[], test: readonly IdeaPractice[], grouping: Grouping, clusters: Grouping): GroupingJudgement {
  const tr = regroup(train, grouping), te = regroup(test, grouping), question = fitRules(train).bkt;
  const fit: IdeaFit = { idea: fitIdeasByLikelihood(tr, question), question };
  const rule = cheapestAtPrecision(FINE_THRESHOLDS.map((t) => ideasRule(fit, t)), tr, PRECISION_TARGET);
  const j = rule ? judge(rule, te, decide(rule, te)) : null;
  let moments = 0, missing = 0;
  te.forEach((p, k) => {
    const raw = test[k], known = p.ids.map((id) => fit.idea(id).init), q = fit.question(p.skill);
    for (let i = 0; i < p.answers.length; i++) {
      conjunctiveStep(known, p.needs[i], (x) => fit.idea(p.ids[x]).learn, q, p.answers[i] === 1);
      const unknown = new Set(raw.ids.filter((_, y) => !raw.ideaKnown[y][i]));
      if (clusters.filter((c) => c.some((id) => unknown.has(id))).length !== 1) continue;
      const lowest = grouping[known.indexOf(Math.min(...known))];
      moments++, (missing += lowest.filter((id) => unknown.has(id)).length / lowest.length);
    }
  });
  return { units: grouping.length, losses: practiceLosses(fit, te), cost: j?.cost ?? null, precision: j?.precision ?? null, diagnosis: moments ? missing / moments : null };
}

/** Of the pairs of ideas a grouping puts in one unit, the share the world's clusters put together too (NaN when it puts none together). */
export function pairsRight(grouping: Grouping, clusters: Grouping): number {
  const together = new Map(clusters.flatMap((c, k) => c.map((id) => [id, k] as const)));
  let pairs = 0, right = 0;
  for (const u of grouping)
    for (let a = 0; a < u.length; a++) for (let b = a + 1; b < u.length; b++) pairs++, (right += together.get(u[a]) === together.get(u[b]) ? 1 : 0);
  return pairs ? right / pairs : NaN;
}

export type GroupingParams = { world: ClusterWorld; seed: number; students: number; length: number; learnRate: number; test: number };
export const DEFAULT_GROUPING: Omit<GroupingParams, "world" | "seed" | "students"> = { length: 30, learnRate: 0.1, test: 400 };
/** The learners made for every class size, so that the test learners are the same whatever the size: the largest class the sweep uses, then the test learners. */
export const LARGEST_CLASS = 200;

export type GroupingRun = GroupingParams & {
  /** The whole skill, one unit per idea, the world's own clusters, and the grouping chosen without and with confirmation. */
  judged: Record<"coarse" | "fine" | "true" | "chosen" | "confirmed", GroupingJudgement>;
  chosen: Choice;
  confirmed: Choice;
};

/**
 * One setting: LARGEST_CLASS (or students, if more) learners and then the test learners, from one seed; the first
 * students learners train, and the last test learners are judged. The confirmation's bootstrap is seeded from the
 * setting.
 */
export function runGrouping(p: GroupingParams): GroupingRun {
  const clusters = CLUSTER_WORLDS[p.world], ideas = ideasOf(SKILL);
  const all = simulateClusters(clusters, Math.max(LARGEST_CLASS, p.students) + p.test, p.length, p.learnRate, p.seed);
  const train = all.slice(0, p.students), test = all.slice(all.length - p.test);
  const chosen = chooseGrouping(train), confirmed = chooseGrouping(train, true, p.seed * 7919 + p.students);
  const judgeOn = (g: Grouping) => judgeGrouping(train, test, g, clusters);
  return {
    ...p, chosen, confirmed,
    judged: {
      coarse: judgeOn([[...ideas]]), fine: judgeOn(ideas.map((id) => [id])), true: judgeOn(clusters),
      chosen: judgeOn(chosen.grouping), confirmed: judgeOn(confirmed.grouping),
    },
  };
}

/**
 * The mean over seeds of the mean over test learners of a paired difference, with a bootstrap interval that resamples
 * the test learners within each seed (resamples, from seed): one array of per-learner differences per seed.
 */
export function pairedOverSeeds(differences: readonly (readonly number[])[], resamples = 2000, seed = 1): { estimate: number; interval: [number, number] } {
  const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const r = rng(seed), means: number[] = [];
  for (let b = 0; b < resamples; b++)
    means.push(mean(differences.map((d) => {
      let sum = 0;
      for (let i = 0; i < d.length; i++) sum += d[Math.floor(r.next() * d.length)];
      return sum / d.length;
    })));
  means.sort((a, b) => a - b);
  return { estimate: mean(differences.map(mean)), interval: [means[Math.floor(0.025 * resamples)], means[Math.ceil(0.975 * resamples) - 1]] };
}
