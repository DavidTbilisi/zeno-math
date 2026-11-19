// Practice: Quadratic equations.
import { sqrtSplit } from "../expr";
import type { Frac } from "../fraction";
import { dp, fr, gcd, plainFrac, pmul, polyStr, surdTex, T } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  if (L < 3) {
    let p: number, q: number, a: number, cs: number[];
    let roots: Frac[];
    if (L === 1) {
      do [p, q] = [r.int(-9, 9), r.int(-9, 9)];
      while (p === q);
      a = 1;
      cs = pmul([-p, 1], [-q, 1]);
      roots = [fr(p), fr(q)];
    } else {
      do [a, p, q] = [r.int(2, 3), r.nz(-7, 7), r.int(-6, 6)];
      while (gcd(a, p) !== 1);
      cs = pmul([-p, a], [-q, 1]);
      roots = [fr(p, a), fr(q)];
    }
    const eq = `${polyStr(cs)} = 0`;
    roots.sort((x, y) => x.toNumber() - y.toNumber());
    return {
      prompt: w.prompts.quadratic,
      q: `${T(polyStr(cs))} = 0`,
      answer: { k: "set", vs: roots.map((x) => x.toNumber()), tol: 1e-9 },
      show: roots.map((x) => `x = ${x.tex()}`).join(", \\; "),
      plain: roots.map(plainFrac).join("; "),
      format: "roots",
      solution: { kind: "algebra", spec: { topic: "quadratic", eq, method: "factor" } },
    };
  }
  let b: number, c: number, D: number;
  do [b, c] = [r.int(-8, 8), r.nz(-10, 10)];
  while ((D = b * b - 4 * c) <= 0 || Number.isInteger(Math.sqrt(D)));
  const { out, s } = sqrtSplit(fr(D));
  const eq = `${polyStr([c, b, 1])} = 0`;
  const vs = [(-b - Math.sqrt(D)) / 2, (-b + Math.sqrt(D)) / 2];
  return {
    prompt: w.prompts.quadratic,
    q: `${T(polyStr([c, b, 1]))} = 0`,
    answer: { k: "set", vs, tol: 0.0051 },
    show: `x = ${surdTex(fr(-b, 2), out.div(fr(2)), s).replace(/ [+-] /, " \\pm ")} \\approx ${dp(vs[0], 2)}, \\; ${dp(vs[1], 2)}`,
    plain: vs.map((v) => dp(v, 3)).join("; "),
    format: "roots",
    solution: { kind: "algebra", spec: { topic: "quadratic", eq, method: "formula" } },
  };
};

export default gen;
