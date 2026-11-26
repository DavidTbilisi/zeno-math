// Practice: Polynomials. Easy: the remainder theorem; medium: a cubic factorised by the factor theorem; hard: a
// coefficient of (ax + b)ⁿ. #727 added, half the time: easy, a polynomial divided by kx, a quadratic by x with its
// remainder over x, and a quadratic by x + p; medium, a cubic divided by x − a and k found from a factor; hard, a sum
// or difference of cubes and (x + k)³ picked, x⁴ − (p² + q²)x² + p²q² factorised completely, and a quadratic in
// (x + a) factorised by substitution. The powers kept, the numbers not divided, the remainder dropped, the divisor's
// sign kept, f(−a) for f(a), the cube's middle sign wrong, the cube of a difference, the middle terms dropped,
// stopping before the factors are fully factorised and the substitution not undone are slips.
import { fill } from "../chart";
import { parseE, tex } from "../expr";
import { bracket, num, pmul, polyStr, T } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { pickPart } from "../tTails";

const gen: Gen = (r, L, w) => {
  if (r.int(0, 9) >= 5) return more(r, L, w);
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

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
/** A typed polynomial as read: x³ − 2x + 1. */
const readOf = (s: string) => s.replace(/\*/g, "").replace(/\^(\d+)/g, (_, d: string) => [...d].map((c) => SUP[Number(c)]).join("")).replace(/ - /g, " − ").replace(/^-/, "−");
/** x − a or x + a, as read. */
const lin = (a: number) => (a === 0 ? "x" : `x ${a > 0 ? "−" : "+"} ${Math.abs(a)}`);
const nz = (r: Rng, lo: number, hi: number) => {
  let v = 0;
  while (!v) v = r.int(lo, hi);
  return v;
};
/** f divided by (x − a) by synthetic division: the quotient's coefficients (lowest first) and the remainder. */
export function divideLin(cs: number[], a: number): { q: number[]; rem: number } {
  const hi = [...cs].reverse();
  const out: number[] = [];
  let acc = 0;
  for (const c of hi) {
    acc = acc * a + c;
    out.push(acc);
  }
  const rem = out.pop()!;
  return { q: out.reverse(), rem };
}

/** An expression to type in x, with its slips. */
function exprPart(prompt: string, right: string, slips: [Trap["id"], string, Record<string, string | number>][], steps: string[], mode?: "factor"): Part {
  const e = (t: string) => parseE(t, ["x"]);
  const kept = slips.filter(([, t], i) => t !== right && !slips.slice(0, i).some(([, u]) => u === t));
  return {
    prompt, q: "",
    answer: { k: "expr", e: e(right), vars: ["x"], ...(mode ? { mode } : {}), traps: kept.map(([id, t, v]) => ({ id, a: { k: "expr", e: e(t), vars: ["x"] }, vars: v })) },
    show: tex(e(right)), plain: right.replace(/\*/g, ""), format: mode === "factor" ? "factors" : "expr", steps,
  };
}

function more(r: Rng, L: number, w: PracticeWords): Part {
  const W = w.polyD;
  if (L === 1) {
    const t = r.pick(["byX", "byX", "rem", "lin"] as const);
    if (t === "byX") {
      // k·x·(q₂x² + q₁x + q₀) divided by kx.
      const k = r.pick([1, 2, 3]);
      const q = [nz(r, -6, 6), r.int(-6, 6), nz(r, -4, 5)];
      const f = polyStr([0, k * q[0], k * q[1], k * q[2]]);
      const right = polyStr(q);
      const d = k === 1 ? "x" : `${k}x`;
      return exprPart(fill(W.divide, { e: readOf(f), d }), right, [
        ["divisorPowerKept", polyStr([0, ...q]), { d, v: readOf(right) }],
        ...(k > 1 ? [["divisorNumberKept", polyStr(q.map((c) => c * k)), { d, k, v: readOf(right) }] as [Trap["id"], string, Record<string, string | number>]] : []),
      ], [`\\frac{${T(f)}}{${d}} = ${T(right)}`]);
    }
    if (t === "rem") {
      // (ax² + bx + c) ÷ x = ax + b + c/x.
      const [a, b, c] = [nz(r, -5, 6), nz(r, -9, 9), nz(r, -9, 9)];
      const f = polyStr([c, b, a]);
      const q = polyStr([b, a]);
      const right = `${q} ${c < 0 ? "-" : "+"} ${Math.abs(c)}/x`;
      return exprPart(fill(W.withRem, { e: readOf(f) }), right, [["remainderDropped", q, { c: Math.abs(c), v: readOf(right) }]],
        [`\\frac{${T(f)}}{x} = ${T(q)} ${c < 0 ? "-" : "+"} \\frac{${Math.abs(c)}}{x}`]);
    }
    // (x + p)(x + q) ÷ (x + p) = x + q.
    const [p, q] = [nz(r, -7, 7), nz(r, -7, 7)];
    const f = pmul([p, 1], [q, 1]);
    const wrong = divideLin(f, p).q;
    return exprPart(fill(W.divide, { e: readOf(polyStr(f)), d: `(${lin(-p)})` }), polyStr([q, 1]), [
      ["syntheticSignKept", polyStr(wrong), { d: lin(-p), a: String(-p).replace("-", "−"), na: String(p).replace("-", "−"), v: readOf(polyStr([q, 1])) }],
    ], [`${T(polyStr(f))} = (${T(polyStr([p, 1]))})(${T(polyStr([q, 1]))})`]);
  }
  if (L === 2) {
    const a = nz(r, -3, 3);
    if (r.next() < 0.5) {
      // A cubic with the factor (x − a) divided by it: the quadratic left.
      const q = [nz(r, -6, 6), r.int(-5, 5), 1];
      const f = pmul([-a, 1], q);
      const wrong = divideLin(f, -a).q;
      return exprPart(fill(W.factorDiv, { e: readOf(polyStr(f)), d: lin(a) }), polyStr(q), [
        ["syntheticSignKept", polyStr(wrong), { d: lin(a), a: String(a).replace("-", "−"), na: String(-a).replace("-", "−"), v: readOf(polyStr(q)) }],
      ], [`${T(polyStr(f))} = (${T(polyStr([-a, 1]))})(${T(polyStr(q))})`]);
    }
    // k from the factor theorem: f(a) = 0.
    const p = r.int(-4, 4);
    let k = nz(r, -9, 9);
    if (k === -a * a) k += 1;
    const c = -(a ** 3) - p * a * a - k * a;
    const f = `x³${p ? ` ${p < 0 ? "−" : "+"} ${Math.abs(p) === 1 ? "" : Math.abs(p)}x²` : ""} + kx ${c < 0 ? "−" : "+"} ${Math.abs(c)}`;
    return {
      prompt: fill(W.findK, { f, d: lin(a) }), q: "", show: String(k), plain: String(k), format: "number",
      answer: { ...num(k), traps: [{ id: "remainderAtMinusA", a: num(-2 * a * a - k) }] },
      steps: [`f(${a}) = ${a ** 3} ${p * a * a < 0 ? "-" : "+"} ${Math.abs(p * a * a)} ${a < 0 ? "-" : "+"} ${Math.abs(a)}k ${c < 0 ? "-" : "+"} ${Math.abs(c)} = 0`, `k = ${k}`],
    };
  }
  const t = r.pick(["cubes", "cube", "quartic", "sub"] as const);
  const k = r.int(1, 5);
  if (t === "cubes") {
    // x³ ± k³ = (x ± k)(x² ∓ kx + k²).
    const plus = r.next() < 0.5;
    const [s, o] = plus ? ["+", "−"] : ["−", "+"];
    const k2 = k === 1 ? "" : String(k);
    const opts = [`(x ${s} ${k})(x² ${o} ${k2}x + ${k * k})`, `(x ${s} ${k})(x² ${s} ${k2}x + ${k * k})`, `(x ${s} ${k})³`, `(x ${s} ${k})(x² + ${k * k})`];
    const e = `x³ ${s} ${k ** 3}`;
    return pickPart(r, opts, 0, [
      { id: "cubeFactorSign", at: 1, vars: { e, v: opts[0] } },
      { id: "cubeOfDifference", at: 2, vars: { e, v: opts[0] } },
    ], fill(W.equalTo, { e }), [`a^3 ${s === "+" ? "+" : "-"} b^3 = (a ${s === "+" ? "+" : "-"} b)(a^2 ${o === "+" ? "+" : "-"} ab + b^2)`]);
  }
  if (t === "cube") {
    // (x + k)³ expanded.
    const k2 = (n: number) => (n === 1 ? "" : String(n));
    const opts = [`x³ + ${k2(3 * k)}x² + ${k2(3 * k * k)}x + ${k ** 3}`, `x³ + ${k ** 3}`, `x³ + ${k2(2 * k)}x² + ${k2(k * k)}x + ${k ** 3}`, `x³ + ${k2(3 * k)}x² + ${k2(3 * k)}x + ${k ** 3}`];
    if (k === 1) opts[3] = `x³ + x² + x + 1`;
    return pickPart(r, opts, 0, [{ id: "cubeMiddleDropped", at: 1, vars: { e: `(x + ${k})³`, v: opts[0] } }], fill(W.equalTo, { e: `(x + ${k})³` }),
      [`(x + ${k})^3 = x^3 + 3 \\cdot ${k} x^2 + 3 \\cdot ${k}^2 x + ${k}^3`]);
  }
  if (t === "quartic") {
    // x⁴ − (p² + q²)x² + p²q² = (x − p)(x + p)(x − q)(x + q), or x⁴ − p⁴ = (x² + p²)(x − p)(x + p).
    const p = r.int(1, 3);
    let q = r.int(2, 4);
    if (q === p) q += 1;
    const diff = r.next() < 0.35;
    const e = diff ? `x⁴ − ${p ** 4}` : `x⁴ − ${p * p + q * q}x² + ${p * p * q * q}`;
    const opts = diff
      ? [`(x² + ${p * p})(x − ${p})(x + ${p})`, `(x² + ${p * p})(x² − ${p * p})`, `(x − ${p})²(x + ${p})²`, `(x − ${p})(x + ${p})(x − ${p})(x + ${p})`]
      : [`(x − ${p})(x + ${p})(x − ${q})(x + ${q})`, `(x² − ${p * p})(x² − ${q * q})`, `(x − ${p})²(x − ${q})²`, `(x − ${p})(x − ${q})(x − ${p * q})`];
    return pickPart(r, opts, 0, [{ id: "notFullyFactored", at: 1, vars: { f: opts[1], v: opts[0] } }], fill(W.fully, { e }),
      [diff ? `x^4 - ${p ** 4} = (x^2 + ${p * p})(x^2 - ${p * p})` : `u = x^2: \\; u^2 - ${p * p + q * q}u + ${p * p * q * q} = (u - ${p * p})(u - ${q * q})`, tex(parseE(opts[0].replace(/[−]/g, "-").replace(/²/g, "^2"), ["x"]))]);
  }
  // (x + a)² + b(x + a) + c, factorised with u = x + a: (u − m)(u − n), then u put back.
  const a = nz(r, -4, 4);
  let [m, n] = [0, 0];
  // Two different roots in u, neither making a bracket of x alone.
  while (m === n || m === a || n === a) [m, n] = [nz(r, -5, 5), nz(r, -5, 5)];
  const [b, c] = [-(m + n), m * n];
  const u = `(${lin(-a)})`;
  const e = `${u}² ${b < 0 ? "−" : "+"} ${Math.abs(b) === 1 ? "" : Math.abs(b)}${u} ${c < 0 ? "−" : "+"} ${Math.abs(c)}`;
  const right = `${bracket(1, a - m)}${bracket(1, a - n)}`;
  const notBack = `${bracket(1, -m)}${bracket(1, -n)}`;
  const uB = (v: number) => `(u ${v > 0 ? "-" : "+"} ${Math.abs(v)})`;
  return exprPart(fill(W.substitute, { e, u: lin(-a) }), right, [["substituteNotReturned", notBack, { u: lin(-a), x: readOf(notBack), v: readOf(right) }]],
    [`u = ${T(polyStr([a, 1]))}: \\; u^2 ${b < 0 ? "-" : "+"} ${Math.abs(b)}u ${c < 0 ? "-" : "+"} ${Math.abs(c)} = ${uB(m)}${uB(n)}`, T(right)], "factor");
}

export default gen;
