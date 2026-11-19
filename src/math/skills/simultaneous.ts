// Practice: Simultaneous equations.
import { polyStr } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const x = r.int(-6, 6);
  const y = r.int(-6, 6);
  const big = L === 3 ? 9 : 5;
  let a1: number, b1: number, a2: number, b2: number;
  do {
    [a1, b1, a2, b2] = [r.nz(-big, big), r.nz(-big, big), r.nz(-big, big), r.nz(-big, big)];
    if (L === 1) b2 = r.pick([b1, -b1]);
  } while (a1 * b2 - a2 * b1 === 0);
  const eq = (a: number, b: number) => `${polyStr([0, a])} ${b < 0 ? "-" : "+"} ${Math.abs(b) === 1 ? "" : Math.abs(b)}y = ${a * x + b * y}`;
  const [e1, e2] = [eq(a1, b1), eq(a2, b2)];
  return {
    prompt: w.prompts.simultaneous,
    q: `\\begin{cases} ${e1} \\\\ ${e2} \\end{cases}`,
    answer: { k: "tuple", vs: [x, y], tol: 1e-9 },
    show: `x = ${x}, \\; y = ${y}`,
    plain: `x = ${x}; y = ${y}`,
    format: "point",
    solution: { kind: "coord", spec: { topic: "meet", src: `${e1}; ${e2}` } },
  };
};

export default gen;
