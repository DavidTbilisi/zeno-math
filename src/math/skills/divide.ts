// Practice: Division. The facts of the tables of 2, 3, 4, 5 and 10 turned round, then those of 6 to 9 and a missing
// number, then remainders, quotients past the tables (84 ÷ 6, as long division) and multiples of ten (2400 ÷ 60).
import { fill } from "../chart";
import { num } from "../practiceKit";
import type { Gen, Part, Trap } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const out = (q: string, v: number, more: Pick<Part, "steps" | "solution"> & { traps?: Trap[]; prompt?: string }): ReturnType<Gen> => ({
    prompt: more.prompt ?? w.prompts.times, q, answer: { ...num(v), traps: more.traps ?? [] }, show: String(v), plain: String(v), format: "number",
    ...(more.solution ? { solution: more.solution } : { steps: more.steps }),
  });
  /** ab ÷ a = b, read off the times-table fact. */
  const fact = (a: number, b: number) => out(`${a * b} \\div ${a}`, b, { steps: [`${b} \\times ${a} = ${a * b}`, `${a * b} \\div ${a} = ${b}`] });
  if (L === 1) return fact(r.pick([2, 3, 4, 5, 10]), r.int(2, 10));
  const kind = r.int(0, 2);
  if (L === 2) {
    const [a, b] = [r.int(6, 9), r.int(3, 9)];
    if (kind === 0) return fact(a, b);
    if (kind === 1) return out(`\\square \\div ${a} = ${b}`, a * b, { prompt: w.basics.missing, steps: [`\\square = ${b} \\times ${a} = ${a * b}`] });
    return out(`${a * b} \\div \\square = ${b}`, a, { prompt: w.basics.missing, steps: [`${a} \\times ${b} = ${a * b}`, `\\square = ${a * b} \\div ${b} = ${a}`] });
  }
  if (kind === 0) {
    // A remainder: what is left after the whole groups; the number of groups is the slip.
    const [b, k] = [r.int(3, 9), r.int(3, 11)];
    const rem = r.int(1, b - 1);
    const a = b * k + rem;
    const traps: Trap[] = k !== rem ? [{ id: "quotientForRemainder", a: num(k), vars: { x: k, b, m: b * k, a, v: rem } }] : [];
    return out("", rem, { prompt: fill(w.basics.remainder, { a, b }), traps, steps: [`${b} \\times ${k} = ${b * k}`, `${a} - ${b * k} = ${rem}`] });
  }
  if (kind === 1) {
    const [b, k] = [r.int(3, 9), r.int(11, 29)];
    return out(`${b * k} \\div ${b}`, k, { solution: { kind: "model", spec: { type: "division", style: "bracket", a: b * k, b, decimals: 0, step: 999 } } });
  }
  // Multiples of ten: 2400 ÷ 60 is 240 ÷ 6, read off 24 ÷ 6.
  const [p, k] = [r.int(2, 9), r.int(2, 9)];
  const e = r.int(1, 2);
  const d = r.int(0, 1);
  const [a, b, v] = [p * k * 10 ** e, p * 10 ** d, k * 10 ** (e - d)];
  return out(`${a} \\div ${b}`, v, { steps: [`${p * k} \\div ${p} = ${k}`, ...(d ? [`${a} \\div ${b} = ${a / 10} \\div ${p}`] : []), `${a} \\div ${b} = ${v}`] });
};

export default gen;
