// Practice: Long division by a two-digit number. How many times the divisor goes into a number (the estimate from the
// rounded divisor, checked) and a three-digit number divided exactly; then four and five digits, a zero in the
// quotient, the whole quotient and the remainder; then the remainder carried on as a decimal or written as a fraction,
// and stories in which the remainder decides the answer (one more coach, only the full boxes, what is left over). An
// estimate not checked, a zero left out of the quotient, the remainder written after the point, the people left
// behind and the box that is not full are the slips.
import { fill } from "../chart";
import { gcd, mixedTex, num, tidy } from "../practiceKit";
import type { Gen, Part, Trap } from "../practiceTypes";
import { spaced } from "./placeValue";

/** A whole number in LaTeX, in threes. */
const tex = (n: number) => spaced(n).replace(/\u202f/g, "\\,");

/**
 * Divisors whose remainders come out as decimals of one or two places, each with the step its remainders go in:
 * 12 leaves 3, 6 or 9 (quarters), 40 any even number (twentieths).
 */
export const DECIMAL_DIVISORS: readonly (readonly [number, number])[] = [
  [12, 3], [14, 7], [15, 3], [16, 4], [20, 1], [24, 6], [25, 1], [28, 7], [35, 7], [36, 9], [40, 2], [45, 9], [50, 1], [75, 3], [80, 4],
];
/** A quotient with its first zero left out: 102 → 12, 180 → 18. */
export const zeroDropped = (q: number) => Number(String(q).replace("0", ""));

const gen: Gen = (r, L, w) => {
  const W = w.written;
  /** The division set out under its bracket, carried `decimals` places past the point. */
  const bracket = (a: number, b: number, decimals = 0) => ({ kind: "model" as const, spec: { type: "division", style: "bracket", a, b, decimals, step: 999 } });
  const whole = (prompt: string, q: string, v: number, more: { traps?: Trap[] } & Pick<Part, "steps" | "solution">): Part => ({
    prompt, q, answer: { ...num(v), traps: more.traps ?? [] }, show: tex(v), plain: String(v), format: "number",
    ...(more.solution ? { solution: more.solution } : { steps: more.steps }),
  });
  /** A zero left out of the quotient q of a ÷ b, where it has one. */
  const zeroTrap = (a: number, b: number, q: number): Trap[] => {
    const x = zeroDropped(q);
    return x === q ? [] : [{ id: "quotientZeroDropped", a: num(x), vars: { x, b, m: spaced(b * x), a: spaced(a), v: q } }];
  };
  /**
   * How many whole times b goes into a, the quotient one digit: the step long division takes again and again. The
   * estimate from b rounded to a ten, taken without checking it against b itself, is the slip, too big or too small.
   */
  const fits = (a: number, b: number): Part => {
    const q = Math.floor(a / b);
    const rem = a - b * q;
    const rb = Math.round(b / 10) * 10;
    const e = Math.floor(a / rb);
    const vars = { x: e, rb, b, m: b * e, a, v: q, mv: b * q, rem };
    const traps: Trap[] = e > q ? [{ id: "estimateTooBig", a: num(e), vars }] : e < q && e > 0 ? [{ id: "estimateTooSmall", a: num(e), vars: { ...vars, left: a - b * e } }] : [];
    return whole(fill(W.fits, { a, b }), "", q, { traps, steps: [`${b} \\times ${q} = ${b * q} \\le ${a}`, `${b} \\times ${q + 1} = ${b * (q + 1)} > ${a}`, `${a} - ${b * q} = ${rem} < ${b}`] });
  };
  /** bq ÷ b, exactly. */
  const exact = (b: number, q: number) => whole(w.prompts.times, `${tex(b * q)} \\div ${b}`, q, { traps: zeroTrap(b * q, b, q), solution: bracket(b * q, b) });

  /** A two-digit divisor from `lo` tens to `hi` tens that is not a whole ten (dividing by 20 is dividing by 2). */
  const divisor = (lo: number, hi: number) => r.int(lo, hi) * 10 + r.int(1, 9);
  const kind = r.int(0, 2);
  if (L === 1) {
    if (kind === 0) {
      const b = divisor(1, 8);
      return fits(b * r.int(2, 9) + r.int(0, b - 1), b);
    }
    const b = divisor(1, 3);
    return exact(b, r.int(11, Math.floor(999 / b)));
  }
  if (L === 2) {
    if (kind === 0) {
      // A zero in the quotient: in the middle (102), where the divisor doesn't go into what is brought down, or at the end (180).
      const q = r.next() < 0.5 ? 100 * r.int(1, 9) + r.int(1, 9) : 10 * (10 * r.int(1, 9) + r.int(1, 9));
      return exact(divisor(1, 2), q);
    }
    if (kind === 1) return exact(divisor(1, 5), r.int(101, 399));
    const [b, q] = [divisor(1, 5), r.int(21, 199)];
    const rem = r.int(1, b - 1);
    const a = b * q + rem;
    if (r.next() < 0.5) return whole(fill(W.fits, { a: spaced(a), b }), "", q, { traps: zeroTrap(a, b, q), solution: bracket(a, b) });
    const traps: Trap[] = q !== rem ? [{ id: "quotientForRemainder", a: num(q), vars: { x: q, b, m: spaced(b * q), a: spaced(a), v: rem } }] : [];
    return whole(fill(w.basics.remainder, { a: spaced(a), b }), "", rem, { traps, solution: bracket(a, b) });
  }
  /** q.rem: the remainder written after the point as if it were the decimal part. */
  const afterPoint = (q: number, rem: number, b: number, v: number, shown: string): Trap[] => {
    const x = Number(`${q}.${rem}`);
    return Math.abs(x - v) < 1e-9 ? [] : [{ id: "remainderAfterPoint", a: num(x), vars: { x: `${q}.${rem}`, r: rem, b, v: shown } }];
  };
  if (kind === 0) {
    // The division carried on past the point: the remainder is shared out too, in tenths and hundredths.
    const [b, step] = r.pick(DECIMAL_DIVISORS);
    const [q, rem] = [r.int(12, 99), step * r.int(1, b / step - 1)];
    const a = b * q + rem;
    const v = Number((a / b).toFixed(2));
    return {
      prompt: W.asDecimal, q: `${tex(a)} \\div ${b}`, answer: { ...num(v, 1e-9, { form: "decimal" }), traps: afterPoint(q, rem, b, v, tidy(v)) },
      show: tidy(v), plain: tidy(v), format: "number", solution: bracket(a, b, 3),
    };
  }
  if (kind === 1) {
    // The remainder as a fraction of the divisor: so many out of b, in lowest terms.
    const [b, q] = [r.int(12, 48), r.int(12, 99)];
    const rem = r.int(1, b - 1);
    const a = b * q + rem;
    const g = gcd(rem, b);
    const plain = `${q} ${rem / g}/${b / g}`;
    return {
      prompt: W.asMixed, q: `${tex(a)} \\div ${b}`, answer: { ...num(a / b, 1e-9, { lowest: true, form: "mixed" }), traps: afterPoint(q, rem, b, a / b, plain) },
      show: mixedTex(q, rem / g, b / g), plain, format: "fraction",
      steps: [`${tex(a)} = ${b} \\times ${q} + ${rem}`, `${tex(a)} \\div ${b} = ${mixedTex(q, rem, b)}${g > 1 ? ` = ${mixedTex(q, rem / g, b / g)}` : ""}`],
    };
  }
  // A story: the division is the same, and what the question asks decides what the remainder does to the answer.
  const [b, q] = [r.int(12, 48), r.int(6, 40)];
  const rem = r.int(1, b - 1);
  const n = b * q + rem;
  const vars = { b, m: b * q, n, r: rem };
  const lines = [`${b} \\times ${q} = ${b * q}`, `${n} - ${b * q} = ${rem}`];
  const story = r.int(0, 2);
  if (story === 0) return whole(fill(W.coaches, { n, b }), "", q + 1, { traps: [{ id: "remainderLeftBehind", a: num(q), vars: { ...vars, x: q, v: q + 1 } }], steps: [...lines, `${q} + 1 = ${q + 1}`] });
  if (story === 1) return whole(fill(W.boxes, { n, b }), "", q, { traps: [{ id: "partGroupCounted", a: num(q + 1), vars: { ...vars, x: q + 1, v: q } }], steps: lines });
  const traps: Trap[] = q !== rem ? [{ id: "quotientForRemainder", a: num(q), vars: { x: q, b, m: b * q, a: n, v: rem } }] : [];
  return whole(fill(W.left, { n, b }), "", rem, { traps, steps: lines });
};

export default gen;
