// Polynomials: random divisions satisfy dividend = divisor × quotient + remainder; unknown coefficients come back from
// the conditions they were made from; every root found is a root and no sign change is missed, and inequality
// solutions agree with the sign of f; binomial expansions and series agree with plain arithmetic; the points found for a
// line and a curve lie on both; partial fractions add back up to the fraction; practice answers follow from the question.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { buildPolynomials, type PolyTopic } from "../src/math/polynomials.ts";
import { check, exercise, LEVELS } from "../src/math/practice.ts";

const w = en.polyWords;
const build = (topic: PolyTopic, src: string) => buildPolynomials({ topic, src }, w);

let seed = 7;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648), seed / 2147483648);
const pick = <T>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)];
const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
const nz = (lo: number, hi: number) => {
  for (;;) {
    const v = int(lo, hi);
    if (v) return v;
  }
};
const close = (a: number, b: number, tol = 1e-7) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
const val = (cs: number[], x: number) => cs.reduceRight((acc, c) => acc * x + c, 0);
/** Coefficients from x⁰ up, typed out. */
const typed = (cs: number[], v = "x") =>
  cs
    .map((c, k) => [c, k] as const)
    .filter(([c]) => c !== 0)
    .reverse()
    .map(([c, k], i) => `${c < 0 ? "-" : i ? "+" : ""} ${Math.abs(c)}${k === 0 ? "" : k === 1 ? v : `${v}^${k}`}`)
    .join(" ") || "0";
const pmul = (a: number[], b: number[]) => {
  const out = Array<number>(a.length + b.length - 1).fill(0);
  a.forEach((x, i) => b.forEach((y, j) => (out[i + j] += x * y)));
  return out;
};
const XS = [-2.3, -1.1, -0.4, 0.3, 0.9, 1.7, 2.6];

test("division: dividend = divisor × quotient + remainder, with the remainder of lower degree", () => {
  for (let i = 0; i < 80; i++) {
    const n = int(2, 6);
    const m = int(1, Math.min(3, n));
    const p = Array.from({ length: n + 1 }, (_, k) => (k === n ? nz(-6, 6) : rnd() < 0.2 ? 0 : int(-9, 9)));
    const d = Array.from({ length: m + 1 }, (_, k) => (k === m ? pick([1, 1, 2, -1, 3]) : int(-5, 5)));
    const src = `(${typed(p)}) / (${typed(d)})`;
    const { data } = build("divide", src);
    assert.ok(data.r!.length <= m, `${src}: remainder degree`);
    for (const x of XS) assert.ok(close(val(p, x), val(d, x) * val(data.q!, x) + val(data.r!, x), 1e-9), `${src} at ${x}`);
  }
});

test("factor theorem: unknown coefficients come back from their conditions", () => {
  const L = ["a", "b", "k"];
  let done = 0;
  for (let i = 0; i < 200 && done < 60; i++) {
    const n = int(3, 4);
    const p = Array.from({ length: n + 1 }, (_, k) => (k === n ? pick([1, 1, 2, -1]) : int(-8, 8)));
    const u = int(1, 2);
    const pos: number[] = [];
    while (pos.length < u) {
      const k = int(0, n - 1);
      if (!pos.includes(k)) pos.push(k);
    }
    const xs: number[] = [];
    while (xs.length < u) {
      const x = int(-3, 3);
      if (!xs.includes(x)) xs.push(x);
    }
    // the conditions must fix the unknowns
    const det = u === 1 ? xs[0] ** pos[0] : xs[0] ** pos[0] * xs[1] ** pos[1] - xs[1] ** pos[0] * xs[0] ** pos[1];
    if (det === 0) continue;
    const terms = p
      .map((c, k) => {
        const j = pos.indexOf(k);
        const coef = j >= 0 ? L[j] : String(c);
        return k === 0 ? coef : `${coef}${k === 1 ? "x" : `x^${k}`}`;
      })
      .reverse()
      .join(" + ");
    const conds = xs.map((x) => {
      const v = val(p, x);
      const d = `(x ${x < 0 ? "+" : "-"} ${Math.abs(x)})`;
      return pick([`f(${x}) = ${v}`, v === 0 ? `${d} is a factor` : `remainder ${v} when divided by ${d}`]);
    });
    const src = `f(x) = ${terms}; ${conds.join("; ")}`;
    const { data } = build("theorem", src);
    pos.forEach((k, j) => assert.equal(data.values![L[j]], p[k], `${src}: ${L[j]}`));
    assert.deepEqual(data.poly, p.slice(0, p.length), src);
    done++;
  }
  assert.ok(done >= 50);
  // three unknowns, and conditions that leave them open
  assert.deepEqual(build("theorem", "f(x) = x^3 + ax^2 + bx + c; f(1) = 0; f(2) = 0; f(0) = 6").data.values, { a: 0, b: -7, c: 6 });
  assert.throws(() => build("theorem", "f(x) = x^3 + ax^2 + bx; f(0) = 0; f(1) = 3"), { message: w.theorem.noUnique });
  assert.throws(() => build("theorem", "f(x) = x^3 + ax^2 + bx + 2; f(1) = 0"), { message: /2 unknowns need 2 conditions/ });
});

/** Real roots by sign changes and by touching zeros, for checking. */
function signChanges(cs: number[], lo = -30, hi = 30, n = 60000): number[] {
  const out: number[] = [];
  let prev = val(cs, lo);
  for (let i = 1; i <= n; i++) {
    const x = lo + ((hi - lo) * i) / n;
    const v = val(cs, x);
    if (prev === 0 || prev * v < 0) out.push(x);
    prev = v;
  }
  return out;
}

test("solving: every root is a root, no sign change is missed, inequalities match the sign of f", () => {
  for (let i = 0; i < 100; i++) {
    // rational roots, maybe a repeated one, and maybe a quadratic factor with or without real roots
    let cs = [pick([1, 1, 2, -1, 3])];
    const nr = int(1, 3);
    for (let j = 0; j < nr; j++) {
      const b = pick([1, 1, 1, 2, 3]);
      cs = pmul(cs, [-int(-5, 5), b]);
    }
    if (rnd() < 0.5) cs = pmul(cs, [int(-6, 6), int(-4, 4), 1]);
    if (cs.length < 4) cs = pmul(cs, [nz(-3, 3), 1]);
    const rel = pick(["=", "=", ">", "<", ">=", "<="]);
    const src = `${typed(cs)} ${rel} 0`;
    const { data } = build("solve", src);
    for (const r of data.roots!) assert.ok(Math.abs(val(cs, r)) < 1e-6 * Math.max(1, ...cs.map(Math.abs)) * Math.max(1, Math.abs(r) ** (cs.length - 1)), `${src}: ${r}`);
    for (const x of signChanges(cs)) assert.ok(data.roots!.some((r) => Math.abs(r - x) < 2e-3), `${src}: missed a root near ${x}`);
    if (rel !== "=") {
      const set = data.set!;
      const inSet = (x: number) => set.some((g) => (x > g.lo || (x === g.lo && g.loIn)) && (x < g.hi || (x === g.hi && g.hiIn)));
      const want = (x: number) => {
        const v = val(cs, x);
        return rel === ">" ? v > 0 : rel === "<" ? v < 0 : rel === ">=" ? v >= -1e-9 : v <= 1e-9;
      };
      for (let x = -12.05; x < 12; x += 0.1) if (!data.roots!.some((r) => Math.abs(r - x) < 1e-6)) assert.equal(inSet(x), want(x), `${src} at ${x}`);
      for (const r of data.roots!) assert.equal(inSet(r), rel.includes("="), `${src} at the root ${r}`);
    }
  }
  // a hidden quadratic, a cubic with no rational roots, x³ = 4x
  assert.deepEqual(build("solve", "x^4 - 5x^2 + 6 = 0").data.roots!.map((r) => r.toFixed(6)), [-Math.sqrt(3), -Math.sqrt(2), Math.sqrt(2), Math.sqrt(3)].map((r) => r.toFixed(6)));
  assert.equal(build("solve", "x^3 - 3x + 1 = 0").data.roots!.length, 3);
  assert.deepEqual(build("solve", "x^3 = 4x").data.roots, [-2, 0, 2]);
  assert.deepEqual(build("solve", "(x - 1)^2(x + 2) <= 0").data.set, [{ lo: -Infinity, hi: -2, loIn: false, hiIn: true }, { lo: 1, hi: 1, loIn: true, hiIn: true }]);
});

test("binomial: expansions, single terms and series agree with arithmetic", () => {
  for (let i = 0; i < 50; i++) {
    const n = int(2, 9);
    const [a, b] = [nz(-3, 3), nz(-4, 4)];
    const q = pick([0, 0, -1, 2]);
    const src = `(${a}x ${b < 0 ? "-" : "+"} ${Math.abs(b)}${q === 0 ? "" : q === -1 ? "/x" : "x^2"})^${n}`;
    const { data } = build("binomial", src);
    for (const x of [0.7, 1.3, -1.6]) {
      const want = (a * x + b * x ** q) ** n;
      const got = data.terms!.reduce((s, [p, c]) => s + c * x ** p, 0);
      // the terms may cancel: compare against the size of the terms, not of the sum
      const size = data.terms!.reduce((s, [p, c]) => s + Math.abs(c * x ** p), 0);
      assert.ok(Math.abs(got - want) <= 1e-12 * size, `${src} at ${x}`);
    }
    const k = pick(data.terms!.map(([p]) => p));
    const one = build("binomial", `${src}, x^${k}`).data;
    assert.equal(one.coef, data.terms!.find(([p]) => p === k)![1], `${src}, x^${k}`);
  }
  assert.equal(build("binomial", "(2x - 3)^5, x^6").data.coef, 0);
  // series: the coefficients are n(n − 1)…(n − r + 1)/r! · (b/a)^r · a^n, valid for |x| < |a/b|
  for (const [src, n, a, b] of [["(1 + 2x)^(-1)", -1, 1, 2], ["sqrt(4 + x)", 0.5, 4, 1], ["1/(1 - 3x)^2", -2, 1, -3], ["(9 - 2x)^(-1/2)", -0.5, 9, -2], ["(8 + x)^(1/3)", 1 / 3, 8, 1]] as const) {
    const { data } = build("binomial", `${src}, 5 terms`);
    let c = a ** n;
    data.terms!.forEach(([p, got], r) => {
      assert.equal(p, r);
      assert.ok(close(got, c, 1e-12), `${src}: x^${r}`);
      c = (c * (n - r) * (b / a)) / (r + 1);
    });
    assert.ok(close(data.valid!, Math.abs(a / b)), src);
  }
  assert.throws(() => build("binomial", "(2 + x)^(1/2)"), { message: /not exact/ });
  assert.throws(() => build("binomial", "(x + x^2)^(1/2)"), { message: w.binomial.needConst });
  assert.throws(() => build("binomial", "(1 + x + x^2)^3"), { message: w.binomial.notTwo });
});

test("line and curve: the points lie on both, and their number follows the discriminant", () => {
  for (let i = 0; i < 70; i++) {
    const [A, B, Cc, D, E, F] = [int(-3, 3), int(-2, 2), int(-3, 3), int(-4, 4), int(-4, 4), int(-9, 9)];
    if (A === 0 && B === 0 && Cc === 0) continue;
    const curve = `${A}x^2 + ${B}xy + ${Cc}y^2 + ${D}x + ${E}y + ${F} = 0`.replace(/\+ -/g, "- ");
    const [p, q, r] = [int(-3, 3), int(-3, 3), int(-6, 6)];
    if (p === 0 && q === 0) continue;
    const lineS = `${p}x + ${q}y = ${r}`.replace(/\+ -/g, "- ");
    const g = (x: number, y: number) => A * x * x + B * x * y + Cc * y * y + D * x + E * y + F;
    const src = `${curve}; ${lineS}`;
    let data;
    try {
      data = build("simultaneous", src).data;
    } catch (e) {
      throw new Error(`${src}: ${(e as Error).message}`);
    }
    for (const [x, y] of data.points!) {
      assert.ok(Math.abs(p * x + q * y - r) < 1e-9 * Math.max(1, Math.abs(x), Math.abs(y)), `${src}: line at ${x}, ${y}`);
      assert.ok(Math.abs(g(x, y)) < 1e-7 * Math.max(1, x * x, y * y), `${src}: curve at ${x}, ${y}`);
    }
    // count by parametrising the line: (x, y) = P0 + t·(−q, p)
    const [x0, y0] = q !== 0 ? [0, r / q] : [r / p, 0];
    const h = (t: number) => g(x0 - q * t, y0 + p * t);
    const [c0, c1, c2] = [h(0), (h(1) - h(-1)) / 2, (h(1) + h(-1)) / 2 - h(0)];
    const want = Math.abs(c2) > 1e-9 ? (c1 * c1 - 4 * c2 * c0 > 1e-9 ? 2 : c1 * c1 - 4 * c2 * c0 < -1e-9 ? 0 : 1) : Math.abs(c1) > 1e-9 ? 1 : 0;
    assert.equal(data.points!.length, want, src);
  }
});

test("partial fractions add back up to the fraction", () => {
  for (let i = 0; i < 90; i++) {
    let den = [1];
    const used: number[] = [];
    const nf = int(1, 3);
    for (let j = 0; j < nf; j++) {
      let r = int(-4, 4);
      if (rnd() < 0.3 && used.length) r = pick(used);
      used.push(r);
      den = pmul(den, [-r, pick([1, 1, 2])]);
    }
    if (rnd() < 0.35) den = pmul(den, [int(1, 5), pick([0, 0, 1, 2]), 1]);
    const dn = den.length - 1;
    const nn = rnd() < 0.25 ? dn + int(0, 1) : int(0, dn - 1);
    const num = Array.from({ length: nn + 1 }, () => int(-6, 6));
    if (!num.some((c) => c !== 0)) num[0] = 1;
    const src = `(${typed(num)})/(${typed(den)})`;
    let data;
    try {
      data = build("partial", src).data;
    } catch (e) {
      // x² + bx + c with rational roots is split further; only a genuinely quadratic factor may remain
      throw new Error(`${src}: ${(e as Error).message}`);
    }
    for (const x of [-3.7, -0.35, 0.45, 2.9, 5.3]) if (Math.abs(val(den, x)) > 1e-6) assert.ok(close(data.pf!(x), val(num, x) / val(den, x), 1e-8), `${src} at ${x}`);
  }
});

test("error messages", () => {
  assert.throws(() => build("divide", "x^3 + 1"), { message: w.need.divide });
  assert.throws(() => build("divide", "(x + 1) / (x^2 + 1)"), { message: w.divide.lower });
  assert.throws(() => build("divide", "(x^2 + 1) / 3"), { message: w.divide.constDivisor });
  assert.throws(() => build("divide", "(sin x) / (x - 1)"), { message: /not a polynomial/ });
  assert.throws(() => build("theorem", "f(x) = x^3 + abx; f(1) = 0"), { message: w.theorem.nonLinear });
  assert.throws(() => build("theorem", "f(x) = x^3 + ax; (x^2 + 1) is a factor"), { message: w.theorem.needLinear });
  assert.throws(() => build("solve", "3 = 3"), { message: w.noX });
  assert.throws(() => build("simultaneous", "y = x^2"), { message: w.sim.needTwo });
  assert.throws(() => build("simultaneous", "y = x^2; x^2 + y^2 = 4"), { message: w.sim.needLinear });
  assert.throws(() => build("partial", "1/((x^2 + 1)(x^2 + 2))"), { message: w.partial.hardDen });
  assert.throws(() => build("binomial", "(1 + x)^30"), { message: w.binomial.tooBigN });
});

test("practice: polynomial answers follow from the question", () => {
  const pw = en.pracWords;
  for (let s = 1; s <= 40; s++)
    for (const level of LEVELS) {
      const ex = exercise("polynomials", level, s, pw);
      assert.equal(check(ex, ex.plain, pw).ok, true, `${ex.q}: ${ex.plain}`);
      const spec = ex.solution!.spec as { topic: PolyTopic; src: string };
      const d = build(spec.topic, spec.src).data;
      const v = (ex.answer as { v: number }).v;
      if (level === 1) assert.deepEqual(d.r!.length ? d.r : [0], [v], spec.src);
      if (level === 2) assert.equal(d.roots!.length, 3, spec.src);
      if (level === 3) assert.equal(d.coef, v, spec.src);
    }
});
