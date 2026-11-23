// Word problems by the structure a bar model solves (Singapore Math Challenge Word Problems; Visible Thinking 2A, 3A).
// Easy is one or two steps: one amount less than another, posts along a straight fence, how much more one has when the
// total is known. Medium is two or three: a total and a difference, "k times as many" with a total, trees round a closed
// loop. Hard is three or more: before and after a gift that makes two amounts equal, leftover and shortage, and three
// amounts compared. Each question has its numbers, the answer, the slip its structure invites (the trap), and the steps
// it is worked in, each a question of its own with the answer to that step; the bar models are drawn from these by the
// skill (src/math/skills/barModels.ts), in the learner's language.
//
// Each structure is told in sentences (BAR_STORY), each saying what it does: names numbers, compares two people, or
// asks. Medium and hard questions may carry a sentence more, with a number the answer doesn't use (the noise). The
// marked version of a question (wordMarks.ts, issue #582) takes every sentence's mark from that: whether the answer,
// worked by the structure's own working (barAnswer), uses the sentence's numbers.
import { markSentences, usesOf, type Clause, type MarkedSentence } from "./wordMarks";

export type BarForm = "less" | "posts" | "howMuchMore" | "sumDiff" | "times" | "loop" | "give" | "leftShort" | "three";
export const BAR_FORMS: Record<1 | 2 | 3, BarForm[]> = {
  1: ["less", "posts", "howMuchMore"],
  2: ["sumDiff", "times", "loop"],
  3: ["give", "leftShort", "three"],
};
export type BarMistake = "moreMeansAdd" | "postsAreGaps" | "oneStepOnly" | "sharedEqually" | "unitsMiscount" | "loopExtraPost" | "givenOnlyOnce" | "leftShortSubtracted";
/** A step on the way: what it asks (the key of its prompt) and its answer. */
export type BarStep = { ask: "benHas" | "twoEqual" | "equalUnits" | "units" | "oneUnit" | "gaps" | "difference" | "moreEach" | "needed"; v: number };
export type BarQuestion = {
  form: BarForm;
  /** The numbers in the question and its working. */
  vars: Record<string, number>;
  v: number;
  /** Whether the amounts are money (written with the language's currency). */
  money: boolean;
  trap: { id: BarMistake; v: number; vars: Record<string, number> } | null;
  /** The steps before the answer, in order. */
  steps: BarStep[];
  /** A sentence with a number z the answer doesn't use, put in before sentence `at`, never first (medium and hard only, not always). */
  noise?: { kind: NoiseKind; z: number; at: number };
};

/** The noise sentences: a person's age, a tree's height, the children's age. */
export type NoiseKind = "age" | "tall" | "ages";

/** The words of the bar-model problems (the locale's `barModels` block). */
export type BarModelWords = {
  /** The three people's names as they label the bars. */
  names: { a: string; b: string; c: string };
  /** Each structure's problem in its sentences, one for each of its clauses (BAR_STORY). */
  prompt: Record<BarForm, readonly string[]>;
  /** The noise sentences, each with its number {z}. */
  noise: Record<NoiseKind, string>;
  step: Record<BarStep["ask"], string>;
  /** A unit of a bar: "1 u". */
  unit: string;
};

/**
 * What each sentence of a structure's problem does, in order: the numbers it names (keys of the question's numbers),
 * the two people it compares (a, b, c: Ann, Ben, Cara), or that it asks.
 */
export const BAR_STORY: Record<BarForm, readonly Clause[]> = {
  less: [{ says: ["a"] }, { compares: ["a", "b"], says: ["d"] }, { asks: true }],
  posts: [{ says: ["g", "L"] }, { asks: true }],
  howMuchMore: [{ says: ["t"] }, { says: ["a"] }, { asks: true }],
  sumDiff: [{ says: ["t"] }, { compares: ["a", "b"], says: ["d"] }, { asks: true }],
  times: [{ compares: ["a", "b"], says: ["k"] }, { says: ["t"] }, { asks: true }],
  loop: [{ says: ["g", "L"] }, { asks: true }],
  give: [{ compares: ["a", "b"], says: ["k"] }, { says: ["g"] }, { asks: true }],
  leftShort: [{ says: ["p", "l"] }, { says: ["q", "s"] }, { asks: true }],
  three: [{ compares: ["a", "b"] }, { compares: ["c", "b"], says: ["d"] }, { says: ["t"] }, { asks: true }],
};
/** The noise sentence each structure can carry, on the medium and hard ones. */
const NOISE: Partial<Record<BarForm, NoiseKind>> = { sumDiff: "age", times: "age", loop: "tall", give: "age", leftShort: "ages", three: "age" };
/** The noise number's range for each kind: ages and heights that read naturally (7 to 15 years is "лет" in Russian). */
const NOISE_RANGE: Record<NoiseKind, [number, number]> = { age: [7, 15], tall: [2, 9], ages: [7, 12] };

/** The answer from the numbers the problem gives, by the structure's own working (the noise is never one of them). */
export function barAnswer(form: BarForm, v: Record<string, number>): number {
  switch (form) {
    case "less": return v.a - v.d;
    case "posts": return v.L / v.g + 1;
    case "howMuchMore": return v.a - (v.t - v.a);
    case "sumDiff": return (v.t - v.d) / 2;
    case "times": return (v.t / (v.k + 1)) * v.k;
    case "loop": return v.L / v.g;
    case "give": return (v.k * (2 * v.g)) / (v.k - 1);
    case "leftShort": return (v.l + v.s) / (v.q - v.p);
    case "three": return (v.t - v.d) / 4 + v.d;
  }
}

/** Each person's amount (at first, before a gift), on the structures whose sentences compare two of them. */
export function barAmounts(q: BarQuestion): Record<string, number> {
  const v = q.vars;
  switch (q.form) {
    case "less": return { a: v.a, b: v.a - v.d };
    case "sumDiff": return { a: v.b + v.d, b: v.b };
    case "times":
    case "give": return { a: v.k * v.u, b: v.u };
    case "three": return { a: 2 * v.u, b: v.u, c: v.u + v.d };
    default: return {};
  }
}

/**
 * The question's sentences, filled in by `fill` (with its numbers as the learner reads them), the noise sentence in its
 * place, each with its right mark (wordMarks.ts).
 */
export function barSentences(q: BarQuestion, W: BarModelWords, fill: (template: string) => string): MarkedSentence[] {
  const clauses: Clause[] = [...BAR_STORY[q.form]];
  const texts = W.prompt[q.form].map(fill);
  if (q.noise) {
    clauses.splice(q.noise.at, 0, { says: ["z"] });
    texts.splice(q.noise.at, 0, fill(W.noise[q.noise.kind]));
  }
  const vars = q.noise ? { ...q.vars, z: q.noise.z } : q.vars;
  return markSentences(clauses, texts, usesOf((v) => barAnswer(q.form, v), vars), barAmounts(q), W.names);
}

type Next = () => number;
const intOf = (next: Next) => (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
const round2 = (v: number) => Math.round(v * 100) / 100;
/** A trap kept only when it is a different, positive answer. */
const trapOf = (id: BarMistake, v: number, answer: number, vars: Record<string, number>) => (v > 0 && Math.abs(v - answer) > 1e-9 ? { id, v: round2(v), vars: { ...vars, x: round2(v) } } : null);

/**
 * A question of the structure. On the medium and hard ones, half the time, a noise sentence too: drawn after
 * everything else, so the numbers are those the question had without it.
 */
export function barQuestion(form: BarForm, next: Next): BarQuestion {
  const q = barNumbers(form, next);
  const kind = NOISE[form];
  if (!kind || next() < 0.5) return q;
  const int = intOf(next);
  const taken = new Set([...Object.values(q.vars), q.v, ...q.steps.map((s) => s.v)]);
  // A number of its own, so it can't be read as one the answer or a step uses.
  const [lo, hi] = NOISE_RANGE[kind];
  const free = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((n) => !taken.has(n));
  const z = free[int(0, free.length - 1)];
  return { ...q, noise: { kind, z, at: int(1, BAR_STORY[form].length - 1) } };
}

function barNumbers(form: BarForm, next: Next): BarQuestion {
  const int = intOf(next);
  switch (form) {
    case "less": {
      // Ann has a, d more than Ben: Ben has a − d (adding is the slip).
      const [b, d] = [int(15, 80), int(5, 40)];
      const a = b + d;
      return { form, vars: { a, d }, v: b, money: true, trap: trapOf("moreMeansAdd", a + d, b, { a, d, v: b }), steps: [] };
    }
    case "posts": {
      // n gaps of g metres along a straight fence: n + 1 posts with one at each end.
      const g = [2, 3, 4, 5, 6, 8, 10][int(0, 6)];
      const n = int(4, 12);
      return { form, vars: { g, L: g * n, n }, v: n + 1, money: false, trap: trapOf("postsAreGaps", n, n + 1, { n, v: n + 1 }), steps: [{ ask: "gaps", v: n }] };
    }
    case "howMuchMore": {
      // Together t, Ann has a: Ben has t − a, and Ann has a − (t − a) more (stopping at Ben's amount is the slip).
      const b = int(10, 60);
      const a = b + int(5, 40);
      return { form, vars: { t: a + b, a, b }, v: a - b, money: true, trap: trapOf("oneStepOnly", b, a - b, { a, b, v: a - b }), steps: [{ ask: "benHas", v: b }] };
    }
    case "sumDiff": {
      // Together t, Ann has d more: two equal bars make t − d, so Ben has (t − d) ÷ 2 (halving t is the slip).
      const [b, d] = [int(12, 90), int(4, 40)];
      const t = 2 * b + d;
      return { form, vars: { t, d, b }, v: b, money: true, trap: trapOf("sharedEqually", t / 2, b, { t, d, v: b }), steps: [{ ask: "twoEqual", v: t - d }] };
    }
    case "times": {
      // Ann has k times Ben's, together t: k + 1 units make t (k units is the slip).
      // k only up to 4, so "k times" reads the same way in every language (Russian "в 2–4 раза").
      const k = int(2, 4);
      const u = k * int(3, 15);
      const t = u * (k + 1);
      return {
        form,
        vars: { k, t, u },
        v: k * u,
        money: true,
        trap: trapOf("unitsMiscount", t / k, k * u, { n: k, m: k + 1, u, v: k * u }),
        steps: [{ ask: "units", v: k + 1 }, { ask: "oneUnit", v: u }],
      };
    }
    case "loop": {
      // n gaps of g metres round a closed loop: n trees, the last gap ending at the first tree (n + 1 is the slip).
      const g = [2, 3, 4, 5, 6, 10][int(0, 5)];
      const n = int(6, 20);
      return { form, vars: { g, L: g * n, n }, v: n, money: false, trap: trapOf("loopExtraPost", n + 1, n, { n, v: n }), steps: [{ ask: "gaps", v: n }] };
    }
    case "give": {
      // Ann had k times Ben's; after she gives him g they are equal. The difference was 2g = (k − 1) units.
      const k = int(2, 4);
      let u = int(4, 30);
      if (((k - 1) * u) % 2) u += 1;
      const g = ((k - 1) * u) / 2;
      return {
        form,
        vars: { k, g, u, d: 2 * g, k1: k - 1 },
        v: k * u,
        money: true,
        trap: trapOf("givenOnlyOnce", (k * g) / (k - 1), k * u, { k, g, u, d: 2 * g, k1: k - 1, v: k * u }),
        steps: [{ ask: "difference", v: 2 * g }, { ask: "oneUnit", v: u }],
      };
    }
    case "leftShort": {
      // p each leaves l over, q each is s short: going from p to q each uses l + s more, (q − p) per child.
      const p = int(2, 6);
      const e = int(1, 3);
      const n = int(5, 15);
      const l = int(1, e * n - 1);
      const s = e * n - l;
      return {
        form,
        vars: { p, q: p + e, l, s, e, n },
        v: n,
        money: false,
        trap: trapOf("leftShortSubtracted", Math.abs(l - s) / e, n, { l, s, p, q: p + e, e, v: n }),
        steps: [{ ask: "needed", v: l + s }, { ask: "moreEach", v: e }],
      };
    }
    case "three": {
      // Ann has twice Ben's, Cara d more than Ben, together t: 4 units and d make t (3 units is the slip).
      const [u, d] = [int(5, 30), int(3, 20)];
      const t = 4 * u + d;
      return {
        form,
        vars: { t, d, u },
        v: u + d,
        money: true,
        trap: trapOf("unitsMiscount", (t - d) / 3 + d, u + d, { n: 3, m: 4, u, v: u + d }),
        steps: [{ ask: "equalUnits", v: t - d }, { ask: "oneUnit", v: u }],
      };
    }
  }
}

/** A question for a level: one of its three structures. */
export function barLevelQuestion(level: 1 | 2 | 3, next: Next): BarQuestion {
  const forms = BAR_FORMS[level];
  return barQuestion(forms[Math.floor(next() * forms.length)], next);
}
