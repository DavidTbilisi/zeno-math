// Practice: Lebesgue measure. Easy finds the measure of a set made of two intervals, the rationals in an interval and
// a few points (the rationals given their interval's length, an overlap counted twice, named); medium finds what is
// left of, or removed from, [0, L] after n steps of a Cantor-type construction (the middle taken from one interval a
// step, the other quantity, named); hard uses countable additivity on disjoint intervals (n, n + crⁿ) (the series
// summed from n = 0, named) or continuity of measure on a nested sequence (the first set's measure, named).
import { exact } from "../calculusTwo";
import { F, cantorLeft, oneGapRemoved, unionLength } from "../measureTheory";
import type { NumSlip } from "../calculusTwo";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** [a, b] ∪ (c, d) ∪ (ℚ ∩ [e, f]) ∪ {s, t}. */
function setPart(r: Rng, w: PracticeWords): Part {
  const a = r.int(0, 3);
  const b = a + r.int(2, 4);
  const c = r.int(a + 1, b + 2);
  const d = c + r.int(1, 3);
  const e = r.int(0, 4);
  const f = e + r.int(1, 5);
  const s = r.int(-5, -1);
  const t = d + r.int(1, 4);
  const m = unionLength(a, b, c, d);
  const slips: NumSlip[] = [["countableCounted", m + (f - e)]];
  if (c < b) slips.push(["overlapCountedTwice", b - a + (d - c)]);
  return {
    prompt: w.mt.prompt.measure,
    q: `A = [${a}, ${b}] \\cup (${c}, ${d}) \\cup \\left(\\mathbb{Q} \\cap [${e}, ${f}]\\right) \\cup \\{${s}, ${t}\\}`,
    ...exact(F(m), slips),
    steps: [
      `\\lambda\\left(\\mathbb{Q} \\cap [${e}, ${f}]\\right) = 0, \\quad \\lambda\\left(\\{${s}, ${t}\\}\\right) = 0`,
      c < b ? `[${a}, ${b}] \\cup (${c}, ${d}) = [${a}, ${Math.max(b, d)}${d > b ? ")" : "]"}` : `\\lambda\\left([${a}, ${b}] \\cup (${c}, ${d})\\right) = ${b - a} + ${d - c}`,
      `\\lambda(A) = ${m}`,
    ],
  };
}

/** a ± t/n as TeX, the 0 left out. */
const shift = (a: number, sign: "+" | "-", t: string) => (a === 0 ? `${sign === "-" ? "-" : ""}\\tfrac{${t}}{n}` : `${a} ${sign} \\tfrac{${t}}{n}`);

const QS = [F(1, 3), F(1, 2), F(1, 4), F(1, 5)];

/** A Cantor-type set: from every interval of length ℓ left, remove the open middle qℓ. */
function cantorPart(r: Rng, w: PracticeWords): Part {
  const L = r.pick([1, 2, 3, 4, 9]);
  const q = r.pick(QS);
  const n = r.int(2, 4);
  const left = cantorLeft(L, q, n);
  const removed = F(L).sub(left);
  const one = oneGapRemoved(L, q, n);
  const askLeft = r.next() < 0.5;
  const v = askLeft ? left : removed;
  const slips: NumSlip[] = askLeft ? [["oneGapPerStep", F(L).sub(one)], ["remainingForRemoved", removed]] : [["oneGapPerStep", one], ["remainingForRemoved", left]];
  const keep = F(1).sub(q);
  return {
    prompt: fill(askLeft ? w.mt.prompt.cantorLeft : w.mt.prompt.cantorRemoved, { L, n }),
    q: `L = ${L}, \\quad q = ${q.tex()}, \\quad n = ${n}`,
    ...exact(v, slips),
    steps: [
      `${L}\\left(1 - ${q.tex()}\\right)^{${n}} = ${L === 1 ? "" : L}\\left(${keep.tex()}\\right)^{${n}} = ${left.tex()}`,
      ...(askLeft ? [] : [`${L} - ${left.tex()} = ${removed.tex()}`]),
    ],
  };
}

/** Countable additivity: ⋃ (n, n + crⁿ); or continuity of measure on a nested sequence. */
function limitPart(r: Rng, w: PracticeWords): Part {
  const kind = r.int(0, 2);
  if (kind === 0) {
    const [c, rr] = r.pick([[1, F(1, 2)], [1, F(1, 3)], [1, F(1, 4)], [2, F(1, 3)], [2, F(1, 4)], [3, F(1, 4)], [1, F(2, 3)], [1, F(3, 4)]] as const);
    const sum = F(c).mul(rr).div(F(1).sub(rr));
    const fromZero = F(c).div(F(1).sub(rr));
    const piece = c === 1 ? `\\left(${rr.tex()}\\right)^{n}` : `${c}\\left(${rr.tex()}\\right)^{n}`;
    return {
      prompt: w.mt.prompt.measure,
      q: `A = \\bigcup_{n = 1}^{\\infty} \\left(n, \\ n + ${piece}\\right)`,
      ...exact(sum, [["seriesFromZero", fromZero]]),
      steps: [`\\lambda(A) = \\sum_{n = 1}^{\\infty} ${piece} = \\frac{${c === 1 ? "" : `${c} \\cdot `}${rr.tex()}}{1 - ${rr.tex()}} = ${sum.tex()}`],
    };
  }
  const a = r.int(-3, 3);
  if (kind === 1) {
    let b = a + r.int(1, 5);
    if (b === 0) b = 1;
    const c = r.int(1, 3);
    const first = b - a + 1 + c;
    return {
      prompt: w.mt.prompt.measure,
      q: `A = \\bigcap_{n = 1}^{\\infty} \\left[${shift(a, "-", "1")}, \\ ${shift(b, "+", String(c))}\\right]`,
      ...exact(F(b - a), [["firstSetMeasure", first]]),
      steps: [`\\lambda\\left(\\left[${shift(a, "-", "1")}, \\ ${shift(b, "+", String(c))}\\right]\\right) = ${b - a} + \\tfrac{${1 + c}}{n} \\to ${b - a}`, `A = [${a}, ${b}], \\quad \\lambda(A) = ${b - a}`],
    };
  }
  const b = a + r.int(3, 7);
  return {
    prompt: w.mt.prompt.measure,
    q: `A = \\bigcup_{n = 1}^{\\infty} \\left[${shift(a, "+", "1")}, \\ ${shift(b, "-", "1")}\\right]`,
    ...exact(F(b - a), [["firstSetMeasure", b - a - 2]]),
    steps: [`\\lambda\\left(\\left[${shift(a, "+", "1")}, \\ ${shift(b, "-", "1")}\\right]\\right) = ${b - a} - \\tfrac{2}{n} \\to ${b - a}`, `A = (${a}, ${b}), \\quad \\lambda(A) = ${b - a}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? setPart(r, w) : L === 2 ? cantorPart(r, w) : limitPart(r, w));

export default gen;
