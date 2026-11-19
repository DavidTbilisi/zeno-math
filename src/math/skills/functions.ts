// Practice: Functions.
import { fill } from "../chart";
import type { Frac } from "../fraction";
import { fr, num, plainFrac, polyStr, T } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const sol = (src: string) => ({ kind: "functions" as const, spec: { topic: "compose", src } });
  if (L === 1) {
    const [p, q] = [r.nz(-5, 5), r.int(-6, 6)];
    const quad = r.next() < 0.5;
    const [s, t] = [r.nz(-4, 4), r.int(-5, 5)];
    const gs = quad ? polyStr([t, 0, 1]) : polyStr([t, s]);
    const fs = polyStr([q, p]);
    const a = r.int(-4, 4);
    const g = quad ? a * a + t : s * a + t;
    const v = p * g + q;
    return {
      prompt: fill(w.prompts.fnComp, { a }), q: `f(x) = ${T(fs)}, \\quad g(x) = ${T(gs)}`, answer: num(v), show: String(v), plain: String(v), format: "number",
      solution: sol(`f(x) = ${fs}; g(x) = ${gs}; fg(${a})`),
    };
  }
  const a = r.int(-6, 9);
  let fs: string;
  let v: Frac;
  if (L === 2) {
    const [p, q] = [r.pick([2, 3, 4, 5, -2, -3] as const), r.int(-8, 8)];
    fs = polyStr([q, p]);
    v = fr(a - q, p);
  } else {
    // (p x + q)/(x + s): x = (q − s a)/(a − p).
    let p: number, q: number, s: number;
    do [p, q, s] = [r.nz(-4, 4), r.int(-6, 6), r.nz(-5, 5)];
    while (p * s === q || a === p);
    fs = `(${polyStr([q, p])})/(${polyStr([s, 1])})`;
    v = fr(q - s * a, a - p);
  }
  return {
    prompt: fill(w.prompts.fnInv, { a }), q: `f(x) = ${T(fs)}`, answer: num(v.toNumber(), 1e-9, { lowest: true }), show: v.tex(), plain: plainFrac(v),
    format: v.isInt() ? "number" : "fraction", solution: sol(`f(x) = ${fs}; f^-1(${a})`),
  };
};

export default gen;
