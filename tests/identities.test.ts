// Trig identities: proofs are found for true identities (built by applying textbook identities to random
// expressions) and refused for false ones; every solution of an equation satisfies it and lies in the interval, and
// no sign change of LHS − RHS is missed; R-forms, exact values and values from given ratios agree with plain
// floating-point trigonometry; practice answers follow from the question.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { buildIdentities, renderIdentities, ID_PRESETS, type IdTopic } from "../src/math/identities.ts";
import { evalE, parseE } from "../src/math/expr.ts";
import { check, exercise, LEVELS } from "../src/math/practice.ts";

const w = en.idWords;
const build = (topic: IdTopic, src: string) => buildIdentities({ topic, src }, w);

let seed = 11;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648), seed / 2147483648);
const pick = <T>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)];
const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
const close = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
const RAD = Math.PI / 180;

/** A side as a function of x in degrees, read the way pupils type it. */
function fnOf(src: string): (xDeg: number) => number {
  const s = src.replace(/cosec/g, "csc").replace(/(\d+(?:\.\d+)?)°/g, "($1*pi/180)");
  const e = parseE(s);
  // Bare numbers inside angles are degrees here only when the question says so; these tests always use ° or π.
  return (x) => evalE(e, x * RAD);
}

test("proofs: textbook identities", () => {
  const ids = [
    "(1 - cos 2x)/sin 2x = tan x",
    "sin 2x/(1 + cos 2x) = tan x",
    "cos x/(1 - sin x) + cos x/(1 + sin x) = 2 sec x",
    "1 + tan^2 x = sec^2 x",
    "1 + cot^2 x = cosec^2 x",
    "sin 3x = 3 sin x - 4 sin^3 x",
    "cos 3x = 4 cos^3 x - 3 cos x",
    "tan(x + 45°) = (1 + tan x)/(1 - tan x)",
    "(sin x + sin 2x)/(1 + cos x + cos 2x) = tan x",
    "cosec x - sin x = cos x cot x",
    "sec x - cos x = sin x tan x",
    "cos^4 x - sin^4 x = cos 2x",
    "tan x + cot x = 2 cosec 2x",
    "(sin x + cos x)^2 = 1 + sin 2x",
    "sin(x + 60°) + sin(x - 60°) = sin x",
    "cos(x + 30°) - cos(x - 30°) = -sin x",
    "tan 2x = 2 tan x/(1 - tan^2 x)",
    "cos 2x/(cos x + sin x) = cos x - sin x",
    "sin x/(1 + cos x) = (1 - cos x)/sin x",
    "2 sin(x/2) cos(x/2) = sin x",
    "cos^2(x/2) = (1 + cos x)/2",
    "sin(-x) cos(-x) = -sin x cos x",
    "tan(pi/4 - x) = (1 - tan x)/(1 + tan x)",
  ];
  for (const src of ids) {
    const b = build("prove", src);
    assert.equal(b.data.identity, true, src);
    assert.ok(b.rows.length >= 2, src);
  }
});

test("proofs: random identities are proved, random non-identities refused", () => {
  const atom = () => `${pick(["sin", "cos", "tan", "sec", "cosec", "cot", "sin", "cos"])}${pick([" x", " 2x", "(x + 30°)", "(x - 45°)", "^2 x", "(-x)"])}`;
  const term = (): string => {
    const r = rnd();
    if (r < 0.45) return `${pick(["", "2", "3", "1/2*"])}${atom()}`;
    if (r < 0.65) return `${atom()} ${atom()}`;
    if (r < 0.85) return `(${atom()} + ${pick(["1", "2", atom()])})/(${pick(["1 + ", "2 + ", "3 "])}${atom()})`;
    return pick(["1", "2", "sqrt(3)"]);
  };
  const expr = () => Array.from({ length: int(1, 3) }, term).join(pick([" + ", " - "]));
  const SUBS: [RegExp, string][] = [
    [/sin 2x/, "(2 sin x cos x)"], [/cos 2x/, "(1 - 2 sin^2 x)"], [/\btan x/, "(sin x/cos x)"], [/\bsec x/, "(1/cos x)"], [/cosec x/, "(1/sin x)"],
    [/\bcot x/, "(cos x/sin x)"], [/sin\^2 x/, "(1 - cos^2 x)"], [/cos\^2 x/, "(1 - sin^2 x)"], [/sin\(x \+ 30°\)/, "(sqrt(3)/2 sin x + 1/2 cos x)"],
    [/cos\(x - 45°\)/, "(sqrt(2)/2 (cos x + sin x))"],
  ];
  for (let i = 0; i < 60; i++) {
    const L = expr();
    let R = L;
    for (const [re, to] of SUBS) if (rnd() < 0.7) R = R.replace(re, to);
    const yes = build("prove", `${L} = ${R}`);
    assert.equal(yes.data.identity, true, `${L} = ${R}`);
    const other = `${R} + ${pick(["sin x", "cos 2x", "1/2", "tan x"])}`;
    const no = build("prove", `${L} = ${other}`);
    assert.equal(no.data.identity, false, `${L} = ${other}`);
  }
});

/** Sign changes of f on [lo, hi] where f is continuous there. */
function signChanges(f: (x: number) => number, lo: number, hi: number): number[] {
  const out: number[] = [];
  const n = 7200;
  for (let i = 0; i < n; i++) {
    const [a, b] = [lo + ((hi - lo) * i) / n, lo + ((hi - lo) * (i + 1)) / n];
    const [fa, fb] = [f(a), f(b)];
    if (Number.isFinite(fa) && Number.isFinite(fb) && fa * fb < 0 && Math.abs(fa - fb) < 1) out.push((a + b) / 2);
  }
  return out;
}

test("equations: every solution checks out and none is missed", () => {
  const ivs: [string, number, number, boolean, boolean][] = [
    ["0 ≤ x < 360", 0, 360, true, false],
    ["-180 ≤ x ≤ 180", -180, 180, true, true],
    ["0 ≤ x ≤ 2pi", 0, 360, true, true],
    ["0 < x < 720", 0, 720, false, false],
  ];
  const makers: (() => string)[] = [
    () => `${int(1, 4)}sin^2 x ${pick(["+", "-"])} ${int(0, 4)}sin x = ${int(-1, 3)}`,
    () => `${int(1, 3)}cos^2 x + ${int(1, 3)}sin x = ${int(1, 3)}`,
    () => `sin 2x = ${pick(["", "2", "1/2*", "-"])}cos x`,
    () => `cos 2x = ${pick(["sin x", "cos x", "-cos x", "3 sin x + 2"])}`,
    () => `${int(1, 3)}tan^2 x ${pick(["+", "-"])} ${int(1, 3)}sec x = ${int(0, 3)}`,
    () => `${int(1, 3)} sin x ${pick(["+", "-"])} ${int(1, 3)} cos x = ${pick(["0", "1", "2", "1/2"])}`,
    () => `${pick(["sin", "cos", "tan"])}(${int(1, 3)}x ${pick(["+", "-"])} ${pick([15, 30, 45, 60])}°) = ${pick(["1/2", "-1/2", "0", "1", "sqrt(3)/2", "0.3", "-0.8"])}`,
    () => `${int(1, 3)}sin^2 x = ${pick(["sin x cos x", "cos^2 x", "3 sin x cos x"])}`,
    () => `tan x = ${pick(["2 sin x", "cot x", "3 cot x", "sin 2x"])}`,
    () => `sec^2 x = ${int(2, 4)} tan x ${pick(["- 1", "+ 0", "- 2"])}`,
  ];
  for (let i = 0; i < 120; i++) {
    const eq = pick(makers)();
    const [ivSrc, lo, hi, loIn, hiIn] = pick(ivs);
    const src = `${eq}, ${ivSrc}`;
    let b;
    try {
      b = build("equation", src);
    } catch (e) {
      assert.fail(`${src} threw ${(e as Error).message}`);
    }
    if (b.data.identity) continue;
    const [l, r] = eq.split("=");
    const [L, R] = [fnOf(l), fnOf(r)];
    const f = (x: number) => L(x) - R(x);
    const sols = b.data.solutions!;
    for (const x of sols) {
      assert.ok((loIn ? x >= lo - 1e-9 : x > lo) && (hiIn ? x <= hi + 1e-9 : x < hi), `${src}: ${x} outside`);
      assert.ok(Math.abs(f(x)) < 1e-6 * (1 + Math.abs(L(x))), `${src}: f(${x}) = ${f(x)}`);
    }
    for (const x of signChanges(f, lo, hi))
      if ((loIn || x - lo > 0.1) && (hiIn || hi - x > 0.1)) assert.ok(sols.some((s) => Math.abs(s - x) < 0.06), `${src}: missed a root near ${x} (got ${sols.join(", ")})`);
  }
});

test("R-forms agree with the expression", () => {
  for (let i = 0; i < 60; i++) {
    const [a, b] = [pick([1, 2, 3, -1, -2, -5, 4, 12]), pick([1, 2, 3, -1, -4, 5, -12, 7])];
    const k = pick([1, 2]);
    const form = pick(["", "; R sin(x + a)", "; R sin(x - a)", "; R cos(x + a)", "; R cos(x - a)"]);
    const src = `${a} sin ${k}x ${b < 0 ? "-" : "+"} ${Math.abs(b)} cos ${k}x${form}`;
    const d = build("rform", src).data;
    const { R, alpha } = d as { R: number; alpha: number };
    assert.ok(close(R, Math.hypot(a, b)), src);
    const g = (x: number) => {
      const t = k * x * RAD;
      const s = d.form!.endsWith("+") ? 1 : -1;
      return R * (d.form!.startsWith("sin") ? Math.sin(t + s * alpha * RAD) : Math.cos(t + s * alpha * RAD));
    };
    for (const x of [0, 17, 95, 222, 301]) assert.ok(close(a * Math.sin(k * x * RAD) + b * Math.cos(k * x * RAD), g(x), 1e-9), `${src} at ${x}`);
    if (form) assert.equal(d.form, form.slice(4, 7) + (form.includes("+") ? "+" : "-"), src);
  }
  // Solving a sin x + b cos x = c.
  for (let i = 0; i < 40; i++) {
    const [a, b, c] = [int(1, 5), pick([-4, -2, 1, 3, 6]), pick([0, 1, 2, -3, 7])];
    const src = `${a} sin x ${b < 0 ? "-" : "+"} ${Math.abs(b)} cos x = ${c}, 0 ≤ x < 360`;
    const sols = build("rform", src).data.solutions ?? [];
    const f = (x: number) => a * Math.sin(x * RAD) + b * Math.cos(x * RAD) - c;
    for (const x of sols) assert.ok(Math.abs(f(x)) < 1e-6 && x >= 0 && x < 360, `${src}: ${x}`);
    for (const x of signChanges(f, 0, 360)) assert.ok(sols.some((s) => Math.abs(s - x) < 0.06), `${src}: missed ${x}`);
  }
});

test("compound angles: exact values and values from given ratios", () => {
  for (const f of ["sin", "cos", "tan", "sec", "cosec", "cot"])
    for (let d = 7.5; d < 360; d += 7.5) {
      const v = { sin: Math.sin, cos: Math.cos, tan: Math.tan, sec: (t: number) => 1 / Math.cos(t), cosec: (t: number) => 1 / Math.sin(t), cot: (t: number) => 1 / Math.tan(t) }[f]!(d * RAD);
      if (Math.abs(v) > 1e6) {
        assert.throws(() => build("compound", `${f} ${d}°`), /has no value/, `${f} ${d}`);
        continue;
      }
      assert.ok(close(build("compound", `${f} ${d}°`).data.value!, v, 1e-9), `${f} ${d}°`);
    }
  assert.ok(close(build("compound", "cos(7pi/12)").data.value!, Math.cos((7 * Math.PI) / 12)));
  assert.throws(() => build("compound", "sin 20°"), /not a multiple of 7.5°/);

  const triples = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [1, 1, Math.SQRT2]];
  for (let i = 0; i < 40; i++) {
    const [p, q, h] = pick(triples);
    const angle = (quad: number) => {
      const t = Math.atan2(p, q) / RAD;
      return [t, 180 - t, 180 + t, 360 - t][quad - 1];
    };
    const [qa, qb] = [int(1, 4), int(1, 4)];
    const [A, B] = [angle(qa), angle(qb)];
    const ratio = (f: string, deg: number) => {
      const v = f === "sin" ? Math.sin(deg * RAD) : f === "cos" ? Math.cos(deg * RAD) : Math.tan(deg * RAD);
      return v;
    };
    const fa = pick(["sin", "cos", "tan"]);
    const fb = pick(["sin", "cos", "tan"]);
    const show = (v: number) => {
      // p/h, q/h or p/q with the sign of v; √2 for the 1-1-√2 triangle.
      const r = Math.abs(v);
      const cands: [number, string][] = h === Math.SQRT2 ? [[Math.SQRT1_2, "sqrt(2)/2"], [1, "1"]] : [[p / h, `${p}/${h}`], [q / h, `${q}/${h}`], [p / q, `${p}/${q}`], [q / p, `${q}/${p}`]];
      const c = cands.find(([x]) => Math.abs(x - r) < 1e-9)!;
      return `${v < 0 ? "-" : ""}${c[1]}`;
    };
    const src = `${fa} A = ${show(ratio(fa, A))}, A in quadrant ${qa}; ${fb} B = ${show(ratio(fb, B))}, B in quadrant ${qb}; sin(A + B), cos(A - B), tan(A + B), sin 2A, cos 2B, tan 2A`;
    const want = [Math.sin((A + B) * RAD), Math.cos((A - B) * RAD), Math.tan((A + B) * RAD), Math.sin(2 * A * RAD), Math.cos(2 * B * RAD), Math.tan(2 * A * RAD)];
    const got = build("compound", src).data.values!;
    want.forEach((v, k) => {
      if (Math.abs(v) > 1e6) assert.ok(Number.isNaN(got[k]), `${src} #${k}`);
      else assert.ok(close(got[k], v, 1e-9), `${src} #${k}: ${got[k]} vs ${v}`);
    });
  }
});

test("messages for what can't be done", () => {
  assert.throws(() => build("prove", "sin x + cos x"), /= between the two sides/);
  assert.throws(() => build("prove", "x sin x = sin x"), /only inside sin, cos/);
  assert.throws(() => build("prove", "sin(x^2) = 1"), /multiple of x plus a constant/);
  assert.throws(() => build("prove", "sin(x + 20°) = cos x"), /multiples of 15°/);
  assert.throws(() => build("rform", "3 sin x + 4 cos 2x"), /same angle/);
  assert.throws(() => build("rform", "3 sin x"), /Both a sin x and b cos x/);
  assert.throws(() => build("compound", "sin A = 3/5, A in quadrant 3"), /cannot have this sign/);
  assert.throws(() => build("equation", "sin x = 1/2, 0 ≤ x < -5"), /The interval must be/);
  // An identity typed as an equation, and an equation typed as an identity.
  assert.equal(build("equation", "sin^2 x + cos^2 x = 1").data.identity, true);
  assert.equal(build("prove", "sin x = 1/2").data.identity, false);
});

test("every example renders without stray values", () => {
  for (const [topic, list] of Object.entries(ID_PRESETS))
    for (const p of list) {
      const r = renderIdentities(p.spec, w);
      assert.doesNotMatch(r.svg, /NaN|undefined|Infinity/, `${topic}: ${p.label}`);
    }
});

test("practice: identities answers follow from the question", () => {
  const pw = en.pracWords;
  for (let s = 1; s <= 40; s++)
    for (const level of LEVELS) {
      const ex = exercise("identities", level, s, pw);
      assert.equal(check(ex, ex.plain, pw).ok, true, `${ex.q}: ${ex.plain}`);
      const src = (ex.solution!.spec as { topic: IdTopic; src: string });
      const d = build(src.topic, src.src).data;
      const v = (ex.answer as { v: number }).v;
      if (level === 1) assert.ok(close(d.value!, v, 1e-9), ex.q);
      if (level === 2) assert.ok(close(d.values![0], v, 1e-9), `${src.src}: ${d.values} vs ${v}`);
      if (level === 3) assert.ok(close(d.R!, v, 1e-9), ex.q);
    }
});
