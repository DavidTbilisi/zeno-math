// Practice: Polynomials.
import { fill } from "../chart";
import { parseE } from "../expr";
import { bracket, num, pmul, polyStr, T } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const sol = (topic: string, src: string) => ({ kind: "polynomials" as const, spec: { topic, src } });
  const sup = (k: number) => String(k).replace(/\d/g, (d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(d)]);
  if (L === 1) {
    // The remainder theorem: dividing by (x − a) leaves f(a).
    const cs = [r.nz(-6, 6), r.int(-5, 5), r.int(-5, 5), r.pick([1, 1, 2, -1, 3])];
    const a = r.nz(-3, 3);
    const p = polyStr(cs);
    const v = cs.reduceRight((acc, c) => acc * a + c, 0);
    const d = `x ${a < 0 ? "+" : "-"} ${Math.abs(a)}`;
    return { prompt: fill(w.prompts.polyRem, { d: `(${d.replace("-", "−")})` }), q: `f(x) = ${T(p)}`, answer: num(v), show: String(v), plain: String(v), format: "number", solution: sol("divide", `(${p}) / (${d})`) };
  }
  if (L === 2) {
    // A cubic with three rational roots, found by the factor theorem.
    const r1 = r.nz(-4, 4);
    let r2 = r.nz(-4, 4);
    while (r2 === r1) r2 = r.nz(-4, 4);
    const b = r.pick([1, 1, 2]);
    let a = b === 2 ? r.pick([-3, -1, 1, 3, 5]) : r.nz(-5, 5);
    while (b === 1 && (a === r1 || a === r2)) a = r.nz(-5, 5);
    const cs = pmul(pmul([-r1, 1], [-r2, 1]), [-a, b]);
    const ex = polyStr(cs);
    const fac = [bracket(1, -r1), bracket(1, -r2), bracket(b, -a)].join("");
    return { prompt: w.prompts.factor, q: T(ex), answer: { k: "expr", e: parseE(ex), mode: "factor" }, show: T(fac), plain: fac, format: "factors", solution: sol("solve", ex) };
  }
  // A coefficient in (ax + b)ⁿ: C(n, k)·aᵏ·bⁿ⁻ᵏ.
  const n = r.int(4, 7);
  const a = r.pick([1, 2, 2, 3]);
  const b = r.nz(-3, 3);
  const k = r.int(1, n - 1);
  let c = 1;
  for (let i = 1; i <= k; i++) c = (c * (n - k + i)) / i;
  const v = Math.round(c) * a ** k * b ** (n - k);
  const src = `(${polyStr([b, a])})^${n}`;
  return {
    prompt: fill(w.prompts.polyCoef, { t: k === 1 ? "x" : `x${sup(k)}` }),
    q: T(src),
    answer: num(v),
    show: String(v),
    plain: String(v),
    format: "number",
    solution: sol("binomial", `${src}, x^${k}`),
  };
};

export default gen;
