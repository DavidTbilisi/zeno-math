// Practice: Written addition and subtraction. Three-digit numbers set out in columns, a ten carried and a ten taken;
// then four and five digits and taking away across zeros (4003 − 1568); then six digits to a million, a digit missing
// from a written sum and a number missing from one. The worked solution is the sum in columns with its trades. A carry
// left out or written in the column, the smaller digit taken from the larger, a ten taken and never paid for, a
// crossed zero left at ten, and the trade forgotten when a digit is missing are the slips.
import { addColumns, subColumns, writtenLayout } from "../addition";
import { num } from "../practiceKit";
import type { MistakeId } from "../mistakes";
import type { Gen, Part, Trap } from "../practiceTypes";
import { digitwise } from "./addSubtract";
import { spaced } from "./placeValue";

/** A whole number in LaTeX, in threes. */
const tex = (n: number) => spaced(n).replace(/\u202f/g, "\\,");
const minus = (n: number) => (n < 0 ? "−" : "") + spaced(Math.abs(n));
const joined = (ds: number[]) => Number([...ds].reverse().join(""));

/** a + b with no column's carry added on; the last column's sum is written whole: 367 + 285 → 542. */
export const carriesDropped = (a: number, b: number) => joined(addColumns(a, b).map((c, j, all) => (j === all.length - 1 ? c.x + c.y : (c.x + c.y) % 10)));
/** a + b with each column's whole sum written in its place: 367 + 285 → 51412. */
export const carryWritten = (a: number, b: number) => joined(addColumns(a, b).map((c) => c.x + c.y));
/** a − b with a ten taken wherever the top digit is too small, and the digit it came from never made less: 523 − 278 → 355. */
export const tradeNotPaid = (a: number, b: number) => joined(subColumns(a, b).map((c) => (c.x - c.y + 10) % 10));
/**
 * a − b with every zero that has to lend left at 10, not 9: 4003 − 1568 → 2545. Null where no zero lends, or where
 * one stands over a 0 (10 − 0 is not a digit, so the slip cannot be written).
 */
export function zeroTradeTen(a: number, b: number): number | null {
  const cols = subColumns(a, b);
  const zeros = cols.flatMap((c, j) => (c.x === 0 && c.lent ? [j] : []));
  if (!zeros.length || zeros.some((j) => cols[j].y === 0)) return null;
  return a - b + zeros.reduce((s, j) => s + 10 ** j, 0);
}

const gen: Gen = (r, L, w) => {
  type More = { traps?: Trap[]; prompt?: string; solution: Part["solution"]; set?: ReturnType<typeof writtenLayout> };
  const out = (q: string, v: number, more: More): Part => ({
    prompt: more.prompt ?? w.prompts.times, q, answer: { ...num(v), traps: more.traps ?? [] }, show: tex(v), plain: String(v), format: "number", solution: more.solution,
    ...(more.set ? { pic: { svg: (x: number, y: number) => `<g transform="translate(${Math.round(x)} ${Math.round(y)})">${more.set!.body}</g>`, h: more.set.h, w: more.set.w } } : {}),
  });
  /** The sum in columns with every trade shown. */
  const model = (type: "addition" | "subtraction", a: number, b: number) => ({ kind: "model" as const, spec: { type, style: "column", a, b, step: 999 } });
  /** The slips whose answers are numbers, different from the right one and from each other. */
  const slips = (v: number, list: [MistakeId, number | null][], vars: Record<string, string | number>): Trap[] => {
    const seen = new Set([v]);
    return list.flatMap(([id, x]) => {
      if (x === null || seen.has(x)) return [];
      seen.add(x);
      return [{ id, a: num(x), vars: { ...vars, x: spaced(x) } }];
    });
  };
  /** a + b; `set`: set out in columns under the question, as on paper. */
  const add = (a: number, b: number, set = false) => {
    const v = a + b;
    const traps = slips(v, [["carryDropped", carriesDropped(a, b)], ...(set ? [["carryWritten", carryWritten(a, b)] as [MistakeId, number]] : [])], { a: spaced(a), b: spaced(b), v: spaced(v) });
    return out(`${tex(a)} + ${tex(b)}`, v, { traps, solution: model("addition", a, b), set: set ? writtenLayout(String(a), String(b), "+") : undefined });
  };
  const sub = (a: number, b: number, set = false) => {
    const v = a - b;
    const traps = slips(v, [["zeroTradeTen", zeroTradeTen(a, b)], ["smallerFromLarger", digitwise(a, b)], ["tradeNotPaid", tradeNotPaid(a, b)]], { a: spaced(a), b: spaced(b), v: spaced(v) });
    return out(`${tex(a)} - ${tex(b)}`, v, { traps, solution: model("subtraction", a, b), set: set ? writtenLayout(String(a), String(b), "−") : undefined });
  };
  /** A sum that carries at least once, a from aLo to aHi, b at least bLo, the sum at most `max`. */
  const addPair = (aLo: number, aHi: number, bLo: number, max: number): [number, number] => {
    for (;;) {
      const a = r.int(aLo, aHi);
      if (max - a < bLo) continue;
      const b = r.int(bLo, max - a);
      if (addColumns(a, b).some((c) => c.out)) return [a, b];
    }
  };
  /** A difference that takes a ten at least once, the answer at least `least`; `plain`: no zero in the top number. */
  const subPair = (aLo: number, aHi: number, bLo: number, least: number, plain = false): [number, number] => {
    for (;;) {
      const a = r.int(aLo, aHi);
      const b = r.int(bLo, a - least);
      if (subColumns(a, b).some((c) => c.took) && !(plain && String(a).includes("0"))) return [a, b];
    }
  };
  /** A number missing from a sum: □ + b = c or □ − b = c, found by the sum that undoes it, in columns. */
  const missingNumber = (b: number, c: number, plus: boolean) => {
    const [v, x] = plus ? [c - b, c + b] : [c + b, Math.abs(c - b)];
    const made = plus ? `${spaced(x)} + ${spaced(b)} = ${spaced(x + b)}` : `${spaced(x)} − ${spaced(b)} = ${minus(x - b)}`;
    const undo = plus ? `${spaced(c)} − ${spaced(b)}` : `${spaced(c)} + ${spaced(b)}`;
    const traps: Trap[] = [{ id: "inverseMissed", a: num(x), vars: { x: spaced(x), check: made, c: spaced(c), undo, v: spaced(v) } }];
    return out(`\\square ${plus ? "+" : "-"} ${tex(b)} = ${tex(c)}`, v, { prompt: w.basics.missing, traps, solution: plus ? model("subtraction", c, b) : model("addition", c, b) });
  };
  /**
   * A digit missing from a written sum, in a column the one on its right trades with: in an addition a 1 is carried
   * into it, in a subtraction it gave one away. Read without the trade, the digit comes out one more or one less.
   */
  const missingDigit = (a: number, b: number, plus: boolean) => {
    const boxed = (n: number, j: number) => String(n).split("").map((d, i, all) => (i === all.length - 1 - j ? "□" : d)).join("");
    const square = (s: string) => s.replace("□", "\\square ");
    if (plus) {
      const cols = addColumns(a, b);
      const j = r.pick(cols.flatMap((c, i) => (c.in ? [i] : [])));
      const top = r.next() < 0.5;
      const [d, other] = top ? [cols[j].x, cols[j].y] : [cols[j].y, cols[j].x];
      const [sa, sb] = top ? [boxed(a, j), String(b)] : [String(a), boxed(b, j)];
      const before = cols[j - 1];
      const right = `${before.x} + ${before.y}${before.in ? " + 1" : ""} = ${before.x + before.y + before.in}`;
      const traps: Trap[] = [{ id: "digitCarryMissed", a: num((d + 1) % 10), vars: { x: (d + 1) % 10, v: d, y: other, s: d + other + 1, right } }];
      return { ...out(`${square(sa)} + ${square(sb)} = ${a + b}`, d, { prompt: w.written.missingDigit, traps, solution: model("addition", a, b), set: writtenLayout(sa, sb, "+", String(a + b)) }), show: String(d) };
    }
    const cols = subColumns(a, b);
    const j = r.pick(cols.flatMap((c, i) => (c.lent ? [i] : [])));
    const d = cols[j].x;
    const sa = boxed(a, j);
    const traps: Trap[] = [{ id: "digitTradeMissed", a: num((d + 9) % 10), vars: { x: (d + 9) % 10, v: d, a: spaced(a), b: spaced(b), c: spaced(a - b) } }];
    // Adding back what was taken makes the top number again, the missing digit with it.
    return { ...out(`${square(sa)} - ${b} = ${a - b}`, d, { prompt: w.written.missingDigit, traps, solution: model("addition", a - b, b), set: writtenLayout(sa, String(b), "−", String(a - b)) }), show: String(d) };
  };

  if (L === 1) {
    if (r.int(0, 1) === 0) return add(...addPair(125, 799, 105, 999), true);
    return sub(...subPair(311, 999, 105, 95, true), true);
  }
  if (L === 2) {
    const kind = r.int(0, 2);
    const five = r.next() < 0.5;
    if (kind === 0) return five ? add(...addPair(12_000, 79_999, 1_050, 99_999)) : add(...addPair(1_200, 7_999, 1_050, 9_999));
    if (kind === 1) return five ? sub(...subPair(30_000, 99_999, 1_050, 9_500)) : sub(...subPair(3_000, 9_999, 1_050, 950));
    // Across zeros: the top number is a digit, zeros, and a last digit too small to take from (4003, 53 004).
    const len = five ? 5 : 4;
    const top = [r.int(2, 9), ...Array<number>(len - 2).fill(0), r.int(0, 8)];
    if (five && r.next() < 0.5) top[1] = r.int(1, 9);
    const under = Array.from({ length: r.int(len - 1, len) }, () => r.int(1, 9));
    if (under.length === len) under[0] = r.int(1, top[0] - 1);
    under[under.length - 1] = r.int(top[len - 1] + 1, 9);
    return sub(Number(top.join("")), Number(under.join("")));
  }
  const kind = r.int(0, 3);
  if (kind === 0) return add(...addPair(120_000, 799_999, 10_500, 999_999));
  if (kind === 1) return sub(...subPair(300_000, 999_999, 10_500, 95_000));
  if (kind === 2) {
    if (r.next() < 0.5) {
      for (;;) {
        const [a, b] = [r.int(1_200, 8_999), r.int(1_050, 8_999)];
        if (addColumns(a, b).some((c) => c.in)) return missingDigit(a, b, true);
      }
    }
    return missingDigit(...subPair(3_000, 9_999, 1_050, 950), false);
  }
  const [b, c] = [r.int(10_500, 480_000), r.int(10_500, 480_000)];
  return r.next() < 0.5 ? missingNumber(b, b + c, true) : missingNumber(b, b === c ? c + 7 : c, false);
};

export default gen;
