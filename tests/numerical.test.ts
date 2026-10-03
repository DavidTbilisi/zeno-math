// Numerical methods: a change of sign is reported exactly when f(a) and f(b) differ in sign and f is continuous, and
// breaks, touching roots and hidden pairs of roots are caught; decimal searches, bisection, false position,
// Newton–Raphson, the secant method and fixed-point iteration all land on the true root, rounded correctly, and every
// step follows its formula; failures (flat tangents, cycles, running away) are recognised; the trapezium,
// mid-ordinate and Simpson's rules match their formulas, are exact where theory says, err in the direction f″ says
// and shrink at the right order; difference quotients match theirs; practice answers follow from the tool.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { buildNumerical, type NumTopic } from "../src/math/numerical.ts";
import { check, exercise, LEVELS } from "../src/math/practice.ts";

const w = en.numWords;
const build = (topic: NumTopic, src: string) => buildNumerical({ topic, src }, w).data;

let seed = 7;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648), seed / 2147483648);
const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
const close = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
const round = (v: number, k: number) => Number(v.toFixed(k));
const cubic = ([a, b, c, d]: number[]) => (x: number) => a * x ** 3 + b * x ** 2 + c * x + d;
const cubicSrc = ([a, b, c, d]: number[]) => `${a}x^3 + ${b}x^2 + ${c}x + ${d}`.replace(/\+ -/g, "- ");
/** A root of f in [lo, hi] (a sign change), by plain bisection. */
function rootIn(f: (x: number) => number, lo: number, hi: number): number {
  const s = Math.sign(f(lo));
  for (let i = 0; i < 200; i++) {
    const m = (lo + hi) / 2;
    if (Math.sign(f(m)) === s) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}
/** A random cubic x³ + bx² + cx + d with a sign change on [a, a + 1] away from a rounding boundary at k d.p. */
function cubicWithRoot(k: number): { cs: number[]; a: number; root: number } {
  for (;;) {
    const cs = [1, int(-4, 4), int(-6, 6), int(-9, 9)];
    const f = cubic(cs);
    const a = int(-3, 2);
    if (f(a) * f(a + 1) >= 0) continue;
    const root = rootIn(f, a, a + 1);
    const frac = (root * 10 ** k) % 1;
    if (Math.abs(Math.abs(frac) - 0.5) < 0.02) continue;
    // one root only in [a, a + 1], so every method finds the same one
    const n = Array.from({ length: 400 }, (_, i) => a + i / 400).filter((x) => f(x) * f(x + 1 / 400) < 0).length;
    if (n === 1) return { cs, a, root };
  }
}

test("change of sign: verdicts, decimal search and the bounds check", () => {
  for (let i = 0; i < 25; i++) {
    const k = int(1, 4);
    const { cs, a, root } = cubicWithRoot(k);
    const d = build("sign", `${cubicSrc(cs)}; [${a}, ${a + 1}]; ${k} dp`);
    assert.equal(d.verdict, "root", cubicSrc(cs));
    assert.equal(d.rounded, round(root, k), `${cubicSrc(cs)}: ${d.rounded} vs ${root}`);
    assert.ok(close(d.root!, root, 1e-9));
  }
  assert.equal(build("sign", "1/(x - 2); [1, 3]").verdict, "jump");
  assert.equal(build("sign", "tan x; [1, 2]").verdict, "jump");
  assert.equal(build("sign", "x^2 - 3x + 2; [0, 3]").verdict, "even");
  assert.deepEqual(build("sign", "x^2 - 3x + 2; [0, 3]").roots!.map((r) => round(r, 9)), [1, 2]);
  assert.equal(build("sign", "(x - 1)^2; [0, 2]").verdict, "touch");
  assert.equal(build("sign", "(x - 1.3)^2; [0, 2]").verdict, "touch");
  assert.equal(build("sign", "x^2 + 1; [0, 1]").verdict, "none");
  assert.equal(build("sign", "x^2 - 4; [2, 3]").verdict, "exact");
  assert.equal(build("sign", "e^x = 3 - x; [0, 1]; 3 dp").rounded, 0.792);
  // no interval: whole numbers from −10 to 10
  for (let i = 0; i < 15; i++) {
    const rs = [int(-8, 8) + 0.5, int(-8, 8) + 0.25, int(-8, 8) + 0.75];
    if (new Set(rs.map(Math.floor)).size < 3) continue;
    const src = rs.map((r) => `(x - ${r})`).join("");
    const d = build("sign", src);
    assert.deepEqual(d.intervals, rs.map((r) => [Math.floor(r), Math.floor(r) + 1]).sort((p, q) => p[0] - q[0]), src);
  }
  assert.deepEqual(build("sign", "1/x").intervals, []);
});

test("bisection and false position find the root and keep it bracketed", () => {
  for (let i = 0; i < 25; i++) {
    const k = int(1, 4);
    const { cs, a, root } = cubicWithRoot(k);
    const src = cubicSrc(cs);
    const d = build("bisect", `${src}; [${a}, ${a + 1}]; ${k} dp`);
    assert.equal(d.status, "converged", src);
    assert.equal(d.rounded, round(root, k), `${src}: ${d.rounded} vs ${root}`);
    // each midpoint is the middle of the interval kept so far
    let [lo, hi] = [a, a + 1];
    const f = cubic(cs);
    for (const m of d.values!) {
      assert.ok(close(m, (lo + hi) / 2, 1e-12));
      if (Math.sign(f(m)) === Math.sign(f(lo))) lo = m;
      else hi = m;
      assert.ok(lo <= root + 1e-12 && root <= hi + 1e-12);
    }
    const n = int(3, 8);
    const s = build("bisect", `${src}; [${a}, ${a + 1}]; ${n} steps`);
    assert.equal(s.values!.length, n);
    assert.ok(Math.abs(s.root! - root) <= 1 / 2 ** (n + 1) + 1e-12, "error bound");
    const fp = build("bisect", `${src}; [${a}, ${a + 1}]; false position; ${k} dp`);
    assert.equal(fp.rounded, round(root, k), `false position ${src}`);
  }
  assert.throws(() => build("bisect", "x^2 + 1; [0, 1]"), /same sign/);
  assert.equal(build("bisect", "x^2 - 2; [1, 2]; 3 dp").rounded, 1.414);
});

test("Newton–Raphson and the secant method: every step, the root, and the ways they fail", () => {
  for (let i = 0; i < 25; i++) {
    const k = int(2, 6);
    const { cs, a, root } = cubicWithRoot(k);
    const src = cubicSrc(cs);
    const f = cubic(cs);
    const df = (x: number) => 3 * cs[0] * x * x + 2 * cs[1] * x + cs[2];
    const x0 = root + (rnd() - 0.5) * 0.2;
    const d = build("newton", `${src}; x0 = ${x0}; ${k} dp`);
    if (d.status !== "converged") continue;
    const xs = d.values!;
    for (let j = 0; j + 1 < xs.length; j++) assert.ok(close(xs[j + 1], xs[j] - f(xs[j]) / df(xs[j]), 1e-12), `${src}: step ${j}`);
    assert.ok(Math.abs(f(d.root!)) < 1e-6 * (1 + Math.abs(df(d.root!))));
    assert.equal(d.rounded, round(root, k), `${src} from ${x0}`);
    const sc = build("newton", `${src}; secant; x0 = ${a}; x1 = ${a + 1}`);
    if (sc.status === "converged") assert.ok(close(sc.root!, root, 1e-6), `secant ${src}`);
  }
  const sqrt5 = build("newton", "x^2 - 5; x0 = 2; 4 dp");
  assert.deepEqual(sqrt5.values!.slice(0, 3), [2, 2.25, 2.25 - (2.25 ** 2 - 5) / 4.5]);
  assert.equal(sqrt5.rounded, 2.2361);
  assert.equal(build("newton", "x^3 - 3x + 1; x0 = 1").status, "flat");
  assert.equal(build("newton", "x^3 - 2x + 2; x0 = 0").status, "cycle");
  assert.equal(build("newton", "cbrt(x); x0 = 1; 6 steps").status, "diverge");
  assert.equal(build("newton", "cbrt(x); x0 = 1").status, "diverge");
  assert.equal(build("newton", "ln x; x0 = 3").status, "outside");
  assert.deepEqual(build("newton", "x^2 - 2; x0 = 1; 2 steps").values, [1, 1.5, 1.5 - 0.25 / 3]);
  assert.ok(close(build("newton", "cos x = x; x0 = 1").root!, 0.7390851332, 1e-9));
});

test("fixed-point iteration: the values, the limit and the |g′(α)| < 1 test", () => {
  const d = build("iterate", "x = cbrt(2x + 5); x0 = 2");
  let x = 2;
  for (const v of d.values!.slice(1)) assert.ok(close(v, (x = Math.cbrt(2 * x + 5)), 1e-12));
  assert.equal(d.status, "converged");
  assert.ok(close(d.root!, 2.0945514815, 1e-7));
  assert.equal(d.kind, "staircase");
  assert.ok(close(d.gd!, (2 / 3) * (2 * d.root! + 5) ** (-2 / 3), 1e-9));
  const cw = build("iterate", "x = cos x; x0 = 1; 3 dp");
  assert.equal(cw.kind, "cobweb");
  assert.equal(round(cw.root!, 3), 0.739);
  const bad = build("iterate", "x^3 - 2x - 5 = 0; x = (x^3 - 5)/2; x0 = 2; 6 steps");
  assert.equal(bad.status, "diverge");
  assert.ok(Math.abs(bad.gd!) > 1);
  assert.ok(close(bad.root!, 2.0945514815, 1e-6));
  const nx = build("iterate", "x_(n+1) = 2 + 1/x_n; x0 = 1");
  assert.ok(close(nx.root!, 1 + Math.SQRT2, 1e-6));
  assert.equal(nx.kind, "cobweb");
  assert.deepEqual(build("iterate", "x = (x^2 + 2)/3; x0 = 1.5; 3 steps").values!.length, 4);
  assert.throws(() => build("iterate", "x^3 - 2x - 5 = 0; x0 = 2"), /x = g\(x\)/);
});

test("trapezium, mid-ordinate and Simpson's rules: formulas, exactness, direction and order", () => {
  for (let i = 0; i < 20; i++) {
    const cs = [int(-3, 3), int(-4, 4), int(-5, 5), int(-5, 5)];
    const src = cubicSrc(cs);
    const f = cubic(cs);
    const a = int(-3, 1);
    const b = a + int(1, 4);
    const n = 2 * int(1, 5);
    const d = build("integrate", `${src}; [${a}, ${b}]; n = ${n}; all`);
    const h = (b - a) / n;
    const y = Array.from({ length: n + 1 }, (_, j) => f(a + j * h));
    const T = (h / 2) * (y[0] + y[n] + 2 * y.slice(1, n).reduce((s, v) => s + v, 0));
    const M = h * Array.from({ length: n }, (_, j) => f(a + (j + 0.5) * h)).reduce((s, v) => s + v, 0);
    const exact = [4, 3, 2, 1].reduce((s, p, j) => s + (cs[j] * (b ** p - a ** p)) / p, 0);
    assert.ok(close(d.estimates![`T${n}`], T, 1e-9), `T ${src}`);
    assert.ok(close(d.estimates![`M${n}`], M, 1e-9), `M ${src}`);
    assert.ok(close(d.estimates![`S${n}`], exact, 1e-9), `Simpson is exact for cubics: ${src}`);
    assert.ok(close(d.exact!, exact, 1e-9));
  }
  // the sign of f″ says which way the trapezium rule errs
  for (const [src, lim] of [["e^x", "[0, 2]"], ["ln x", "[1, 4]"], ["sqrt x", "[1, 9]"], ["1/x", "[1, 3]"], ["x^4", "[0, 2]"], ["-x^2", "[0, 1]"]]) {
    const d = build("integrate", `${src}; ${lim}; n = 4; all`);
    const [T, M] = [d.estimates!.T4, d.estimates!.M4];
    if (d.bend === 1) assert.ok(T > d.exact! && M < d.exact!, src);
    else if (d.bend === -1) assert.ok(T < d.exact! && M > d.exact!, src);
    else assert.fail(`${src}: f″ has one sign`);
  }
  assert.equal(build("integrate", "3x + 1; [0, 2]; n = 3; trapezium").estimates!.T3, 8);
  // halving h divides the trapezium error by about 4 and Simpson's by about 16
  const o = build("integrate", "sin x; [0, pi]; n = 4, 8, 16, 32");
  const e = (k: string) => Math.abs(o.estimates![k] - 2);
  assert.ok(Math.abs(e("T8") / e("T16") - 4) < 0.05 && Math.abs(e("T16") / e("T32") - 4) < 0.05);
  assert.ok(Math.abs(e("S8") / e("S16") - 16) < 0.3);
  // a table gives the same answers as the function at those points
  const t = build("integrate", "x: 1, 1.5, 2, 2.5, 3; y: 1, 2.25, 4, 6.25, 9");
  const g = build("integrate", "x^2; [1, 3]; n = 4");
  assert.ok(close(t.estimates!.T4, g.estimates!.T4) && close(t.estimates!.S4, g.estimates!.S4));
  assert.throws(() => build("integrate", "x^2; [0, 1]; n = 3; simpson"), /even/);
  assert.throws(() => build("integrate", "x: 0, 1, 3; y: 1, 2, 3"), /equally spaced/);
  assert.throws(() => build("integrate", "x: 0, 1, 2; y: 1, 2"), /as many/);
});

test("difference quotients for f′(x)", () => {
  for (let i = 0; i < 20; i++) {
    const [p, q] = [int(1, 4), int(-3, 3)];
    const src = `sin(${p}x) + ${q}x^2`;
    const f = (x: number) => Math.sin(p * x) + q * x * x;
    const a = int(-2, 2) / 2;
    const h = [0.1, 0.05, 0.2][int(0, 2)];
    const d = build("diff", `${src}; x = ${a}; h = ${h}`);
    assert.ok(close(d.estimates!.forward, (f(a + h) - f(a)) / h, 1e-9));
    assert.ok(close(d.estimates!.backward, (f(a) - f(a - h)) / h, 1e-9));
    assert.ok(close(d.estimates!.central, (f(a + h) - f(a - h)) / (2 * h), 1e-9));
    assert.ok(close(d.exact!, p * Math.cos(p * a) + 2 * q * a, 1e-12));
  }
  const d = build("diff", "e^x; x = 0; h = 0.1, 0.01, 0.001");
  assert.ok(close(d.estimates!["central 0.01"], (Math.exp(0.01) - Math.exp(-0.01)) / 0.02, 1e-12));
  assert.ok(Math.abs(d.estimates!["central 0.01"] - 1) < Math.abs(d.estimates!["forward 0.01"] - 1) / 100);
  // 1e-8 is a number, not 1·e − 8
  const tiny = build("diff", "ln x; x = 2; h = 1e-8");
  assert.ok(close(tiny.estimates!.forward, (Math.log(2 + 1e-8) - Math.log(2)) / 1e-8, 1e-12));
});

test("friendly messages", () => {
  const cases: [NumTopic, string, string][] = [
    ["sign", "", w.need.sign],
    ["sign", "[1, 2]", w.noFunction],
    ["bisect", "x^2 - 2", w.needInterval],
    ["bisect", "x^2 - 2; [2, 1]", "first number"],
    ["newton", "x^2 - 2", w.needStart],
    ["newton", "x^2 - 2; secant; x0 = 1", w.needSecond],
    ["diff", "sin x; h = 0.1", w.diff.needAt],
    ["diff", "ln x; x = -1", "not defined"],
    ["integrate", "1/x; [0, 1]; n = 4", "not defined"],
    ["integrate", "x; [0, 1]; n = 1000", "At most"],
    ["sign", "x^2 + y; [0, 1]", w.onlyX],
    ["sign", "x^2; [0, 1]; frobnicate", "frobnicate"],
  ];
  for (const [topic, src, msg] of cases) assert.throws(() => build(topic, src), (e: Error) => e.message.includes(msg), `${topic}: ${src}`);
});

test("practice: numerical answers follow from the tool", () => {
  const pw = en.pracWords;
  for (let s = 1; s <= 40; s++)
    for (const level of LEVELS)
      for (const skill of ["numroots", "numint"] as const) {
        const ex = exercise(skill, level, s, pw);
        assert.equal(check(ex, ex.plain, pw).ok, true, `${skill} ${ex.q}: ${ex.plain}`);
        const spec = ex.solution!.spec as { topic: NumTopic; src: string };
        const d = build(spec.topic, spec.src);
        const v = (ex.answer as { v: number }).v;
        const got =
          spec.topic === "integrate" ? Object.values(d.estimates!)[0]
          : spec.topic === "iterate" ? d.values![3]
          : / 1 step$/.test(spec.src) ? d.values![1]
          : d.root!;
        assert.equal(d.status === undefined || ["converged", "steps"].includes(d.status), true, `${spec.src}: ${d.status}`);
        assert.ok(Math.abs(got - v) < 1e-6, `${spec.src}: ${got} vs ${v}`);
      }
});
