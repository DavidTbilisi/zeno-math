// Word problems by the structure a bar model solves (Singapore Math Challenge Word Problems; Visible Thinking 2A, 3A).
// Easy is one or two steps: one amount less than another, posts along a straight fence, how much more one has when the
// total is known. Medium is two or three: a total and a difference, "k times as many" with a total, trees round a closed
// loop. Hard is three or more: before and after a gift that makes two amounts equal, leftover and shortage, and three
// amounts compared. Each question has its numbers, the answer, the slip its structure invites (the trap), and the steps
// it is worked in, each a question of its own with the answer to that step; the bar models are drawn from these by the
// skill (src/math/skills/barModels.ts), in the learner's language.

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
};

/** The words of the bar-model problems (the locale's `barModels` block). */
export type BarModelWords = {
  /** The three people's names as they label the bars. */
  names: { a: string; b: string; c: string };
  prompt: Record<BarForm, string>;
  step: Record<BarStep["ask"], string>;
  /** A unit of a bar: "1 u". */
  unit: string;
};

type Next = () => number;
const intOf = (next: Next) => (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
const round2 = (v: number) => Math.round(v * 100) / 100;
/** A trap kept only when it is a different, positive answer. */
const trapOf = (id: BarMistake, v: number, answer: number, vars: Record<string, number>) => (v > 0 && Math.abs(v - answer) > 1e-9 ? { id, v: round2(v), vars: { ...vars, x: round2(v) } } : null);

export function barQuestion(form: BarForm, next: Next): BarQuestion {
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
