// Practice: Addition and subtraction. The facts within 20 and the bonds to 10 and 20, then two-digit sums and
// differences in the head and the bonds to 100, then three-digit ones and a number missing from a subtraction.
import { num } from "../practiceKit";
import type { Gen, Part, Trap } from "../practiceTypes";

/** Each column of a and b put through `f`, the results set side by side as the digits of one number. */
const byColumn = (a: number, b: number, f: (x: number, y: number) => number) => {
  let v = 0;
  for (let k = 1; a > 0 || b > 0; a = Math.floor(a / 10), b = Math.floor(b / 10), k *= 10) v += f(a % 10, b % 10) * k;
  return v;
};
/** a + b with every carry left out: 47 + 38 → 75. */
export const noCarry = (a: number, b: number) => byColumn(a, b, (x, y) => (x + y) % 10);
/** a − b with the smaller digit taken from the larger in every column: 52 − 38 → 26. */
export const digitwise = (a: number, b: number) => byColumn(a, b, (x, y) => Math.abs(x - y));

const minus = (n: number) => String(n).replace("-", "−");

const gen: Gen = (r, L, w) => {
  const out = (q: string, v: number, more: Pick<Part, "steps" | "solution"> & { traps?: Trap[]; prompt?: string }): ReturnType<Gen> => ({
    prompt: more.prompt ?? w.prompts.times, q, answer: { ...num(v), traps: more.traps ?? [] }, show: String(v), plain: String(v), format: "number",
    ...(more.solution ? { solution: more.solution } : { steps: more.steps }),
  });
  const model = (spec: object) => ({ kind: "model" as const, spec });
  /** A slip that gives x: the number put in the box and what it makes, then the operation that undoes the one shown. */
  const inverse = (x: number, made: string, c: number, undo: string, v: number): Trap => ({ id: "inverseMissed", a: num(x), vars: { x, check: made, c, undo, v } });
  /** a + b: the tens of b added first, then its ones (hundreds first for three digits). */
  const add = (a: number, b: number) => {
    const big = b >= 100 ? Math.floor(b / 100) * 100 : Math.floor(b / 10) * 10;
    const [rest, v] = [b - big, a + b];
    const traps: Trap[] = noCarry(a, b) !== v ? [{ id: "carryDropped", a: num(noCarry(a, b)), vars: { x: noCarry(a, b), a, b, v } }] : [];
    return out(`${a} + ${b}`, v, { traps, steps: rest ? [`${a} + ${b} = ${a} + ${big} + ${rest}`, `= ${a + big} + ${rest} = ${v}`] : [`${a} + ${b} = ${v}`] });
  };
  const sub = (a: number, b: number) => {
    const big = b >= 100 ? Math.floor(b / 100) * 100 : Math.floor(b / 10) * 10;
    const [rest, v] = [b - big, a - b];
    const traps: Trap[] = digitwise(a, b) !== v ? [{ id: "smallerFromLarger", a: num(digitwise(a, b)), vars: { x: digitwise(a, b), a, b, v } }] : [];
    return out(`${a} - ${b}`, v, { traps, steps: rest ? [`${a} - ${b} = ${a} - ${big} - ${rest}`, `= ${a - big} - ${rest} = ${v}`] : [`${a} - ${b} = ${v}`] });
  };
  /** a + □ = c, drawn as a number bond. */
  const bond = (a: number, c: number, more: Trap[] = []) => {
    const v = c - a;
    return out(`${a} + \\square = ${c}`, v, {
      prompt: w.basics.missing,
      traps: [...more, inverse(a + c, `${a} + ${a + c} = ${2 * a + c}`, c, `${c} − ${a}`, v)],
      solution: model({ type: "bond", whole: String(c), parts: [String(a), String(v)] }),
    });
  };
  const kind = r.int(0, 2);
  if (L === 1) {
    if (kind === 0) {
      const a = r.int(2, 11);
      const b = r.int(2, Math.min(9, 20 - a));
      return out(`${a} + ${b}`, a + b, { solution: model({ type: "addition", style: "counters", a, b, step: 999 }) });
    }
    if (kind === 1) {
      const a = r.int(5, 20);
      const b = r.int(2, Math.min(a - 1, 12));
      return out(`${a} - ${b}`, a - b, { solution: model({ type: "subtraction", style: "takeaway", a, b, step: 999 }) });
    }
    const c = r.pick([10, 10, 20]);
    return bond(r.int(1, c - 1), c);
  }
  if (L === 2) {
    if (kind === 0) {
      const a = r.int(12, 78);
      return add(a, r.int(11, 99 - a));
    }
    if (kind === 1) {
      const a = r.int(31, 99);
      return sub(a, r.int(12, a - 9));
    }
    // A bond to 100: the ones make a ten, so the tens make only 90 (37 + 73 = 110 is the slip).
    const a = r.int(1, 8) * 10 + r.int(1, 9);
    return bond(a, 100, [{ id: "bondTenOver", a: num(110 - a), vars: { a, x: 110 - a, s: 110, v: 100 - a } }]);
  }
  if (kind === 0) {
    const a = r.int(125, 799);
    return add(a, r.int(105, 999 - a));
  }
  if (kind === 1) {
    const a = r.int(300, 999);
    return sub(a, r.int(105, a - 95));
  }
  const b = r.int(105, 480);
  let c = r.int(105, 480);
  if (c === b) c += 7;
  if (r.next() < 0.5) {
    // □ − b = c: the number before the taking away is the two put back together.
    const [v, x] = [b + c, Math.abs(c - b)];
    return out(`\\square - ${b} = ${c}`, v, { prompt: w.basics.missing, traps: [inverse(x, `${x} − ${b} = ${minus(x - b)}`, c, `${c} + ${b}`, v)], steps: [`\\square = ${c} + ${b} = ${v}`] });
  }
  // a − □ = c, with a the larger: what was taken is the difference.
  const a = b + c;
  return out(`${a} - \\square = ${c}`, b, { prompt: w.basics.missing, traps: [inverse(a + c, `${a} − ${a + c} = ${minus(-c)}`, c, `${a} − ${c}`, b)], steps: [`\\square = ${a} - ${c} = ${b}`] });
};

export default gen;
