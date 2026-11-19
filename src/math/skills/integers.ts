// Practice: Negative numbers.
import { fill } from "../chart";
import { num } from "../practiceKit";
import type { Gen, Trap } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const par = (n: number) => (n < 0 ? `(${n})` : String(n));
  const minus = (n: number) => (n < 0 ? `−${-n}` : String(n));
  /** src: the working as plain text, each number and sign apart, a negative number taken away or added in brackets. */
  const out = (prompt: string, q: string, v: number, steps: string[], src: string, traps: Trap[] = []) => ({
    prompt, q, answer: { ...num(v), traps }, show: String(v), plain: String(v), format: "number" as const, steps, src,
  });
  if (L === 1) {
    const a = r.int(1, 20);
    const kind = r.int(0, 2);
    if (kind === 0) {
      // From below zero: −a ± b.
      const b = r.int(2, 20);
      const plus = r.next() < 0.5;
      const q = `${-a} ${plus ? "+" : "-"} ${b}`;
      return out(w.prompts.times, q, plus ? b - a : -a - b, [`${q} = ${plus ? b - a : -a - b}`], q);
    }
    if (kind === 1) {
      // Past zero: a − b with b > a.
      const b = a + r.int(1, 12);
      return out(w.prompts.times, `${a} - ${b}`, a - b, [`${a} - ${b} = -(${b} - ${a}) = ${a - b}`], `${a} - ${b}`);
    }
    const b = r.int(1, 20);
    return out(w.prompts.times, `${a} + (${-b})`, a - b, [`${a} + (${-b}) = ${a} - ${b} = ${a - b}`], `${a} + (${-b})`);
  }
  if (L === 2) {
    const kind = r.int(0, 2);
    if (kind === 0) {
      const [a, b] = [r.nz(-15, 15), r.int(2, 15)];
      const q = `${a} - (${-b})`;
      return out(w.prompts.times, q, a + b, [`${q} = ${a} + ${b} = ${a + b}`], q, [{ id: "subNeg", a: num(a - b), vars: { b } }]);
    }
    if (kind === 1) {
      const [a, b] = [r.int(-12, 8), r.int(3, 15)];
      const rise = r.next() < 0.5;
      const v = rise ? a + b : a - b;
      return out(fill(rise ? w.prompts.intRise : w.prompts.intFall, { a: minus(a), b }), "", v, [`${a} ${rise ? "+" : "-"} ${b} = ${v}`], `${a} ${rise ? "+" : "-"} ${b}`);
    }
    const [a, b] = [-r.int(2, 15), r.int(1, 20)];
    return out(fill(w.prompts.intDiff, { a: minus(a), b }), "", b - a, [`${b} - (${a}) = ${b} + ${-a} = ${b - a}`], `${b} - (${a})`, [{ id: "subNeg", a: num(b + a), vars: { b: -a } }]);
  }
  const kind = r.int(0, 2);
  let [a, b] = [r.int(2, 12) * r.sign(), r.int(2, 12) * r.sign()];
  if (a > 0 && b > 0) a = -a;
  if (kind === 0) return out(w.prompts.times, `${a} \\times ${par(b)}`, a * b, [`${a} \\times ${par(b)} = ${a * b}`], `${a} * ${par(b)}`);
  if (kind === 1) return out(w.prompts.times, `${a * b} \\div ${par(b)}`, a, [`${a * b} \\div ${par(b)} = ${a}`], `${a * b} / ${par(b)}`);
  [a, b] = [r.int(2, 9) * r.sign(), r.int(2, 9) * r.sign()];
  const c = r.int(2, 15);
  const q = `${a} \\times ${par(b)} - (${-c})`;
  return out(w.prompts.times, q, a * b + c, [`${q} = ${a * b} + ${c} = ${a * b + c}`], `${a} * ${par(b)} - (${-c})`, [{ id: "subNeg", a: num(a * b - c), vars: { b: c } }]);
};

export default gen;
