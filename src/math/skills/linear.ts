// Practice: Linear equations.
import type { Frac } from "../fraction";
import { bracket, fr, num, plainFrac, polyStr, T } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  let eq: string;
  let x: Frac;
  if (L === 1) {
    const a = r.int(2, 9);
    const xv = r.nz(-9, 9);
    const b = r.nz(-15, 15);
    eq = `${polyStr([b, a])} = ${a * xv + b}`;
    x = fr(xv);
  } else if (L === 2) {
    let a = r.int(2, 9);
    let c = r.int(1, 9);
    while (c === a) c = r.int(1, 9);
    if (r.next() < 0.5) [a, c] = [c, a];
    const xv = r.nz(-9, 9);
    const b = r.int(-12, 12);
    const d = (a - c) * xv + b;
    eq = `${polyStr([b, a])} = ${polyStr([d, c])}`;
    x = fr(xv);
  } else {
    const a = r.int(2, 6);
    const b = r.nz(-6, 6);
    let c = r.int(1, 9);
    while (c === a) c = r.int(1, 9);
    const d = r.int(-12, 12);
    eq = `${a}${bracket(1, b)} = ${polyStr([d, c])}`;
    x = fr(d - a * b, a - c);
  }
  return { prompt: w.prompts.linear, q: T(eq.split("=")[0]) + " = " + T(eq.split("=")[1]), answer: num(x.toNumber()), show: `x = ${x.tex()}`, plain: plainFrac(x), format: "exact", solution: { kind: "algebra", spec: { topic: "linear", eq, method: "factor" } } };
};

export default gen;
