// Practice: Times tables. The tables of 2, 3, 4, 5 and 10, then those of 6 to 9 and a missing factor, then 11 and 12
// and multiples of ten (40 × 60). A fact is worked as its array of dots.
import { num } from "../practiceKit";
import type { Gen, Trap } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const array = (a: number, b: number) => ({ kind: "model" as const, spec: { type: "multiply", style: "array", a, b, step: 999 } });
  /** a × b, either way round; the two added instead is the slip. */
  const fact = (x: number, y: number): ReturnType<Gen> => {
    const [a, b] = r.next() < 0.5 ? [x, y] : [y, x];
    const v = a * b;
    const traps: Trap[] = a + b !== v ? [{ id: "addedNotTimes", a: num(a + b), vars: { a, b, x: a + b, v } }] : [];
    return { prompt: w.prompts.times, q: `${a} \\times ${b}`, answer: { ...num(v), traps }, show: String(v), plain: String(v), format: "number", solution: array(a, b) };
  };
  /** a × □ = ab or □ × a = ab. */
  const missing = (a: number, b: number): ReturnType<Gen> => ({
    prompt: w.basics.missing, q: r.next() < 0.5 ? `${a} \\times \\square = ${a * b}` : `\\square \\times ${a} = ${a * b}`,
    answer: num(b), show: String(b), plain: String(b), format: "number", solution: array(a, b),
  });
  if (L === 1) return fact(r.pick([2, 3, 4, 5, 10]), r.int(2, 10));
  if (L === 2) return r.next() < 0.5 ? fact(r.int(6, 9), r.int(3, 9)) : missing(r.int(3, 9), r.int(3, 9));
  const kind = r.int(0, 2);
  if (kind === 0) return fact(r.pick([11, 12]), r.int(3, 12));
  if (kind === 1) return missing(r.int(6, 12), r.int(6, 12));
  // Multiples of ten: the fact, then every zero put back (40 × 60 = 24 × 100).
  const [p, q] = [r.int(2, 9), r.int(2, 9)];
  const [e, g] = [r.int(1, 2), r.int(0, 1)];
  const [a, b, f] = [p * 10 ** e, q * 10 ** g, 10 ** (e + g)];
  const v = a * b;
  return {
    prompt: w.prompts.times, q: `${a} \\times ${b}`,
    answer: { ...num(v), traps: [{ id: "zerosMiscounted", a: num(v / 10), vars: { x: v / 10, p: `${p} × ${q} = ${p * q}`, f, v } }] },
    show: String(v), plain: String(v), format: "number",
    steps: [`${a} \\times ${b} = ${p} \\times ${q} \\times ${f}`, `= ${p * q} \\times ${f} = ${v}`],
  };
};

export default gen;
