// Functions: every domain, range, composite value, inverse, transformed point and sketched feature the tool states is
// checked against plain floating-point evaluation on random functions — points inside the domain give real values and
// points outside don't, every value lands inside the range, f(f⁻¹(y)) = y, stationary points have f′ = 0, and so on.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { renderFunctions, type FnTopic } from "../src/math/functions.ts";
import { check, exercise, LEVELS } from "../src/math/practice.ts";

const w = en.fnWords;
const textOf = (svg: string) =>
  [...svg.matchAll(/<text[^>]*>(.*?)<\/text>/g)]
    .map((m) => m[1])
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
const render = (topic: FnTopic, src: string) => textOf(renderFunctions({ topic, src }, w).svg);

let seed = 5;
const rnd = (lo: number, hi: number) => ((seed = (seed * 1103515245 + 12345) % 2147483648), lo + (seed % (hi - lo + 1)));
const nz = (lo: number, hi: number) => {
  for (;;) {
    const v = rnd(lo, hi);
    if (v) return v;
  }
};
const close = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
const sg = (n: number) => (n < 0 ? `- ${-n}` : `+ ${n}`);

/** "−3√3/2", "2 − √3", "1/e", "π/2", "∞" → a number. */
function val(s: string): number {
  const t = s
    .trim()
    .replace(/−/g, "-")
    .replace(/∞/g, "Infinity")
    .replace(/(\d)\s*√/g, "$1*√")
    .replace(/√\(([^)]+)\)/g, "Math.sqrt($1)")
    .replace(/√(\d+)/g, "Math.sqrt($1)")
    .replace(/(\d)π/g, "$1*π")
    .replace(/ln\s*\(([^()]+)\)/g, "Math.log(($1))")
    .replace(/ln\s*(\d+(?:\.\d+)?)/g, "Math.log($1)")
    .replace(/π/g, "Math.PI")
    .replace(/\be\^(-?\d+)/g, "Math.E**($1)")
    .replace(/\be\b/g, "Math.E")
    .replace(/(\d)\(/g, "$1*(");
  assert.ok(/^[-+*/().\d\sMathsqrtlogPIEInfinity]+$/.test(t), `not a number: ${s}`);
  try {
    return Function(`return (${t});`)() as number;
  } catch {
    assert.fail(`not a number: ${s} (${t})`);
  }
}
type Iv = { lo: number; hi: number; loIn: boolean; hiIn: boolean };
/** "[−3, 2) ∪ (2, ∞)", "ℝ", "{1}" → intervals. */
function set(s: string): Iv[] {
  if (s.trim() === "ℝ") return [{ lo: -Infinity, hi: Infinity, loIn: false, hiIn: false }];
  if (s.trim() === "∅") return [];
  return s.split(" ∪ ").map((part) => {
    const p = part.trim();
    if (p.startsWith("{")) {
      const v = val(p.slice(1, -1));
      return { lo: v, hi: v, loIn: true, hiIn: true };
    }
    const m = /^([[(])(.+), (.+)([\])])$/.exec(p);
    assert.ok(m, `not an interval: ${p}`);
    return { lo: val(m[2]), hi: val(m[3]), loIn: m[1] === "[", hiIn: m[4] === "]" };
  });
}
const inSet = (s: Iv[], x: number, tol = 0) => s.some((iv) => (x > iv.lo - tol || (iv.loIn && x >= iv.lo - tol)) && (x < iv.hi + tol || (iv.hiIn && x <= iv.hi + tol)) && x >= iv.lo - tol && x <= iv.hi + tol);
const nearEnd = (s: Iv[], x: number) => s.some((iv) => Math.abs(x - iv.lo) < 1e-6 || Math.abs(x - iv.hi) < 1e-6);
/** Every "(x, y)" after a label, with brackets inside x or y allowed. */
function pointsAfter(text: string, re: RegExp): { label: string; x: string; y: string }[] {
  const out: { label: string; x: string; y: string }[] = [];
  for (const m of text.matchAll(new RegExp(re.source + " \\(", "g"))) {
    let depth = 1;
    let i = m.index! + m[0].length;
    const start = i;
    let comma = -1;
    for (; i < text.length && depth; i++) {
      if (text[i] === "(") depth++;
      else if (text[i] === ")") depth--;
      else if (text[i] === "," && depth === 1 && comma < 0) comma = i;
    }
    out.push({ label: m[1] ?? "", x: text.slice(start, comma), y: text.slice(comma + 2, i - 1) });
  }
  return out;
}
function grab(text: string, re: RegExp): RegExpExecArray {
  const m = re.exec(text);
  assert.ok(m, `${re} not in: ${text}`);
  return m;
}

/** Random functions with restrictions: as typed, and as JavaScript. */
function randomFn(k: number): [string, (x: number) => number] {
  const [a, b, c] = [rnd(-5, 5), rnd(-5, 5), rnd(1, 9)];
  switch (k % 7) {
    case 0:
      return [`(x ${sg(a)})/((x ${sg(b)})(x ${sg(b + 3)}))`, (x) => (x + a) / ((x + b) * (x + b + 3))];
    case 1:
      return [`sqrt(x ${sg(a)})/(x ${sg(b)})`, (x) => Math.sqrt(x + a) / (x + b)];
    case 2:
      return [`ln(${c} - x^2) + 1`, (x) => Math.log(c - x * x) + 1];
    case 3:
      return [`1/sqrt(x^2 - ${c})`, (x) => 1 / Math.sqrt(x * x - c)];
    case 4:
      return [`sqrt((x ${sg(a)})/(x ${sg(a + 4)}))`, (x) => Math.sqrt((x + a) / (x + a + 4))];
    case 5:
      return [`x^2 ${sg(a)}x ${sg(b)}`, (x) => x * x + a * x + b];
    default:
      return [`(x^2 ${sg(a)})/(x^2 + ${c})`, (x) => (x * x + a) / (x * x + c)];
  }
}

test("domain: every x inside gives a value, every x outside doesn't", () => {
  for (let k = 0; k < 28; k++) {
    const [src, f] = randomFn(k);
    const shown = render("domain", src);
    const dom = set(grab(shown, /Domain: (.+?) Range:/)[1]);
    for (let i = 0; i <= 600; i++) {
      const x = -15 + (30 * i) / 600 + 0.0137;
      if (nearEnd(dom, x)) continue;
      assert.equal(inSet(dom, x), Number.isFinite(f(x)), `${src}: x = ${x}, domain ${JSON.stringify(dom)}`);
    }
  }
});

test("range: every value lands inside, and the ends are reached or approached", () => {
  for (let k = 0; k < 28; k++) {
    const [src, f] = randomFn(k);
    const shown = render("domain", src);
    const range = set(grab(shown, /Range: (.+?)(?: Also|$)/)[1].trim());
    const ends = set(grab(shown, /Domain: (.+?) Range:/)[1]).flatMap((iv) => [iv.loIn ? iv.lo : NaN, iv.hiIn ? iv.hi : NaN]).filter(Number.isFinite);
    let [lo, hi] = [Infinity, -Infinity];
    for (let i = 0; i <= 20000 + ends.length; i++) {
      const x = i > 20000 ? ends[i - 20001] : -30 + (60 * i) / 20000 + 0.00071;
      const y = f(x);
      if (!Number.isFinite(y)) continue;
      assert.ok(inSet(range, y, 1e-7 * Math.max(1, Math.abs(y))), `${src}: f(${x}) = ${y} outside ${JSON.stringify(range)}`);
      [lo, hi] = [Math.min(lo, y), Math.max(hi, y)];
    }
    // A closed end is a value f really takes: the samples come close to it.
    const first = range[0];
    const last = range[range.length - 1];
    if (first.loIn) assert.ok(Math.abs(lo - first.lo) < 1e-2 * Math.max(1, Math.abs(first.lo)), `${src}: lowest ${lo} vs ${first.lo}`);
    if (last.hiIn) assert.ok(Math.abs(hi - last.hi) < 1e-2 * Math.max(1, Math.abs(last.hi)), `${src}: highest ${hi} vs ${last.hi}`);
  }
});

test("composites: fg(a) by hand", () => {
  for (let k = 0; k < 10; k++) {
    const [p, q, s, t, a] = [nz(-5, 5), rnd(-6, 6), nz(-3, 3), rnd(-5, 5), rnd(-4, 4)];
    const shown = render("compose", `f(x) = ${p}x ${sg(q)}; g(x) = ${s}x^2 ${sg(t)}; fg(${a}); gf(${a})`);
    const g = (x: number) => s * x * x + t;
    const f = (x: number) => p * x + q;
    assert.equal(val(grab(shown, new RegExp(`fg\\(${a < 0 ? "−" : ""}${Math.abs(a)}\\) = (\\S+)`))[1]), f(g(a)), shown);
    assert.equal(val(grab(shown, new RegExp(`gf\\(${a < 0 ? "−" : ""}${Math.abs(a)}\\) = (\\S+)`))[1]), g(f(a)), shown);
  }
  assert.match(render("compose", "f(x) = x + 1; g(x) = x - 2"), /fg = gf/);
  assert.match(render("compose", "f(x) = 2x; g(x) = x + 1"), /fg ≠ gf/);
});

test("inverses: f(f⁻¹(y)) = y, and f⁻¹ of a value is the x it came from", () => {
  const cases: [string, (x: number) => number, number][] = [];
  for (let k = 0; k < 7; k++) {
    const [a, b, c] = [nz(-4, 4), rnd(-5, 5), nz(1, 4)];
    cases.push(
      [`${a}x ${sg(b)}`, (x) => a * x + b, 1.5],
      [`(${a}x ${sg(b)})/(x ${sg(c)})`, (x) => (a * x + b) / (x + c), 2.5 - c],
      [`${c}sqrt(${c}x ${sg(b)}) ${sg(a)}`, (x) => c * Math.sqrt(c * x + b) + a, (10 - b) / c],
      [`${a}e^(${c}x) ${sg(b)}`, (x) => a * Math.exp(c * x) + b, 0.3],
      [`ln(${c}x ${sg(b)}) ${sg(a)}`, (x) => Math.log(c * x + b) + a, (5 - b) / c],
      [`(x ${sg(b)})^2 ${sg(a)}, x >= ${-b}`, (x) => (x + b) ** 2 + a, -b + 1.7],
      [`${a}x^3 ${sg(b)}`, (x) => a * x ** 3 + b, 1.3],
    );
  }
  for (const [src, f, x0] of cases) {
    const y0 = Math.round(f(x0) * 1000) / 1000;
    const shown = render("compose", `f(x) = ${src}; f^-1(${y0})`);
    assert.match(shown, /Check: f\(f⁻¹\(x\)\) = x/, `${src}: ${shown}`);
    const got = val(grab(shown, /f⁻¹\([^)]*\) [=≈] (.+?) Check:/)[1]);
    assert.ok(close(f(got), y0, 1e-3), `${src}: f⁻¹(${y0}) = ${got}, f of that = ${f(got)}`);
  }
});

test("transformations: the key points land on the new graph", () => {
  const bases: [string, (x: number) => number][] = [
    ["x^2 - 2x", (x) => x * x - 2 * x],
    ["x^3 - 3x", (x) => x ** 3 - 3 * x],
    ["sin(x)", Math.sin],
    ["1/x", (x) => 1 / x],
    ["sqrt(x + 4)", (x) => Math.sqrt(x + 4)],
  ];
  for (let k = 0; k < 15; k++) {
    const [fs, f] = bases[k % bases.length];
    const [A, B, C, D] = [nz(-3, 3), [1, 2, -1, -2, 3][k % 5], rnd(-3, 3), rnd(-4, 4)];
    const g = (x: number) => A * f(B * x + C) + D;
    const shown = render("transform", `f(x) = ${fs}; y = ${A}f(${B}x ${sg(C)}) ${sg(D)}`);
    const list = grab(shown, /Key points: (.+)\./)[1];
    for (const m of list.matchAll(/\(([^,]+), ([^)]+)\) → \(([^,]+), ([^)]+)\)/g)) {
      const [x0, y0, x1, y1] = [val(m[1]), val(m[2]), val(m[3]), val(m[4])];
      assert.ok(close(f(x0), y0, 1e-6), `${fs}: f(${x0}) = ${f(x0)}, said ${y0}`);
      assert.ok(close(g(x1), y1, 1e-6), `${fs}, ${A}f(${B}x + ${C}) + ${D}: point ${x1} → ${g(x1)}, said ${y1}`);
    }
  }
  for (const [y, h] of [["|f(x)|", (v: number) => Math.abs(v)], ["f(|x|)", null]] as const) {
    const shown = render("transform", `f(x) = x^2 - 4x; ${"y = " + y}`);
    for (const m of grab(shown, /Key points: (.+)\./)[1].matchAll(/\(([^,]+), ([^)]+)\) → \(([^,]+), ([^)]+)\)/g)) {
      const [x1, y1] = [val(m[3]), val(m[4])];
      const want = h ? h(x1 * x1 - 4 * x1) : x1 ** 2 - 4 * Math.abs(x1);
      assert.ok(close(want, y1), `${y}: (${x1}, ${y1})`);
    }
  }
});

test("sketching: stationary points, asymptotes and signs", () => {
  for (let k = 0; k < 16; k++) {
    const [a, b, c] = [rnd(-4, 4), nz(-4, 4), rnd(-4, 4)];
    const [src, f] =
      k % 4 === 0
        ? [`(x^2 ${sg(a)})/(x ${sg(b)})`, (x: number) => (x * x + a) / (x + b)]
        : k % 4 === 1
          ? [`x/(x^2 ${sg(-(b * b))})`, (x: number) => x / (x * x - b * b)]
          : k % 4 === 2
            ? [`x^3 ${sg(a)}x^2 ${sg(c)}x`, (x: number) => x ** 3 + a * x * x + c * x]
            : [`(x ${sg(a)})/(x^2 + ${Math.abs(b)})`, (x: number) => (x + a) / (x * x + Math.abs(b))];
    const shown = render("sketch", src);
    const d = (x: number) => (f(x + 1e-6) - f(x - 1e-6)) / 2e-6;
    for (const p of pointsAfter(shown, /(maximum|minimum|stationary inflection) at/)) {
      const m = [p.label, p.label, p.x, p.y];
      const [x, y] = [val(m[2]), val(m[3])];
      assert.ok(close(f(x), y, 1e-6), `${src}: f(${x}) = ${f(x)}, said ${y}`);
      assert.ok(Math.abs(d(x)) < 1e-4 * Math.max(1, Math.abs(y)), `${src}: f′(${x}) = ${d(x)}`);
      const [l, r] = [d(x - 1e-3), d(x + 1e-3)];
      if (m[1] === "maximum") assert.ok(l > 0 && r < 0, `${src}: not a maximum at ${x}`);
      if (m[1] === "minimum") assert.ok(l < 0 && r > 0, `${src}: not a minimum at ${x}`);
    }
    for (const m of shown.matchAll(/Near x = ([^:]+): f → ([+−]∞) on the left, ([+−]∞) on the right/g)) {
      const p = val(m[1]);
      const [l, r] = [f(p - 1e-7), f(p + 1e-7)];
      assert.ok(Math.abs(l) > 1e4 && Math.abs(r) > 1e4, `${src}: no asymptote at ${p}`);
      assert.equal(Math.sign(l), m[2] === "+∞" ? 1 : -1, `${src}: left of ${p}`);
      assert.equal(Math.sign(r), m[3] === "+∞" ? 1 : -1, `${src}: right of ${p}`);
    }
    const signs = /f > 0 on (.+?); f < 0 on (.+?)\.(?: |$)/.exec(shown);
    if (signs) {
      for (const [part, want] of [[signs[1], 1], [signs[2], -1]] as const)
        for (const iv of set(part)) {
          const x = !Number.isFinite(iv.lo) ? (Number.isFinite(iv.hi) ? iv.hi - 0.37 : 0.37) : !Number.isFinite(iv.hi) ? iv.lo + 0.37 : (iv.lo + iv.hi) / 2;
          assert.equal(Math.sign(f(x)), want, `${src}: sign at ${x}`);
        }
    }
  }
});

test("errors say what is wrong", () => {
  assert.throws(() => render("compose", "f(x) = x^2"), /not one-to-one.*x ≥ 0/);
  assert.throws(() => render("domain", "sqrt(-1 - x^2)"), /domain is empty/);
  assert.throws(() => render("transform", "f(x) = x^2; y = f(x)^2"), /Write the new graph/);
  assert.throws(() => render("compose", "f(x) = x; h(2)"), /h is not defined/);
  assert.throws(() => render("compose", "f(x) = x + sin(x)"), /Can't solve/);
});

test("practice: function answers follow from the question", () => {
  const pw = en.pracWords;
  for (let s = 1; s <= 40; s++)
    for (const level of LEVELS) {
      const ex = exercise("functions", level, s, pw);
      assert.equal(check(ex, ex.plain, pw).ok, true, ex.prompt);
      const a = Number(/\((−?-?\d+)\)/.exec(ex.prompt)![1].replace("−", "-"));
      const [top, bottom] = ex.plain.split("/").map(Number);
      const v = top / (bottom ?? 1);
      // The function from the solution's input.
      const src = (ex.solution!.spec as { src: string }).src;
      const f = new Function("x", `return ${src.split(";")[0].replace(/^f\(x\) = /, "").replace(/(\d)x/g, "$1*x").replace(/(\d)\(/g, "$1*(").replace(/\^/g, "**")};`) as (x: number) => number;
      if (level === 1) {
        const g = new Function("x", `return ${src.split(";")[1].replace(/^\s*g\(x\) = /, "").replace(/(\d)x/g, "$1*x").replace(/\^/g, "**")};`) as (x: number) => number;
        assert.equal(v, f(g(a)), `${src}: ${ex.plain}`);
      } else assert.ok(close(f(v), a, 1e-9), `${src}: f(${v}) = ${f(v)}, want ${a}`);
    }
});
