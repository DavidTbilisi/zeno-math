// Vectors: every angle, point and distance the tool states is checked against plain floating-point geometry on random
// cases — the point where lines meet lies on both, a foot is on the line or plane with the gap at right angles, the
// line where planes meet lies in both, and so on.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { renderVectors, type VecTopic } from "../src/math/vectors.ts";

const w = en.vecWords;
const textOf = (svg: string) =>
  [...svg.matchAll(/<text[^>]*>(.*?)<\/text>/g)]
    .map((m) => m[1])
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
const render = (topic: VecTopic, src: string) => textOf(renderVectors({ topic, src }, w).svg);

let seed = 11;
const rnd = (lo: number, hi: number) => ((seed = (seed * 1103515245 + 12345) % 2147483648), lo + (seed % (hi - lo + 1)));
const vec = (n = 3, lo = -5, hi = 5) => Array.from({ length: n }, () => rnd(lo, hi));
const nonzero = (n = 3) => {
  for (;;) {
    const v = vec(n);
    if (v.some((x) => x !== 0)) return v;
  }
};
const s = (v: number[]) => `(${v.join(", ")})`;
const dot = (a: number[], b: number[]) => a.reduce((t, x, i) => t + x * b[i], 0);
const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const sub = (a: number[], b: number[]) => a.map((x, i) => x - b[i]);
const len = (a: number[]) => Math.hypot(...a);
const close = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) < tol * Math.max(1, Math.abs(a), Math.abs(b));

/** "−3/4", "8√5/5", "√13", "2√2", "4√3/3 ≈ 2.309" → a number. */
function val(str: string): number {
  const t = str.split("≈")[0].trim();
  const m = /^(−)?(\d*)(?:√(\d+))?(?:\/(\d+))?$/.exec(t);
  assert.ok(m, `not a number: ${str}`);
  const whole = m[2] ? Number(m[2]) : 1;
  return ((m[1] ? -1 : 1) * whole * (m[3] ? Math.sqrt(Number(m[3])) : 1)) / (m[4] ? Number(m[4]) : 1);
}
const point = (str: string) => str.slice(1, -1).split(", ").map(val);
const grab = (text: string, re: RegExp) => {
  const m = re.exec(text);
  assert.ok(m, `${re} not in: ${text}`);
  return m;
};

test("dot product: the angle and its kind", () => {
  for (let k = 0; k < 50; k++) {
    const [a, b] = [nonzero(), nonzero()];
    if (len(cross(a, b)) < 1e-9) continue;
    const shown = render("dot", `a = ${s(a)}; b = ${s(b)}`);
    const d = dot(a, b);
    if (d === 0) {
      assert.match(shown, /perpendicular/);
      continue;
    }
    const theta = Number(grab(shown, /θ [=≈] ([\d.]+)°/)[1]);
    const want = (Math.acos(d / (len(a) * len(b))) * 180) / Math.PI;
    assert.ok(Math.abs(theta - want) < 0.006, `${s(a)}·${s(b)}: ${theta} vs ${want}`);
    assert.match(shown, d > 0 ? /acute/ : /obtuse/);
    const reach = val(grab(shown, /\(green\) reaches (.+?) along/)[1]);
    assert.ok(close(reach, d / len(b), 1e-3), `projection ${reach} vs ${d / len(b)}`);
  }
  assert.match(render("dot", "a = (1, 1, 0); b = (0, 1, 1)"), /θ = 60°/);
  assert.match(render("dot", "a = (2, 1); b = (-4, -2)"), /opposite way/);
});

test("expressions: 2a − b and a + 3b are worked out right", () => {
  for (let k = 0; k < 30; k++) {
    const [a, b] = [vec(), vec()];
    const [u, v] = [a.map((x, i) => 2 * x - b[i]), a.map((x, i) => x + 3 * b[i])];
    if (!u.some(Boolean) || !v.some(Boolean) || len(cross(u, v)) < 1e-9) continue;
    const shown = render("dot", `a = ${s(a)}; b = ${s(b)}; 2a - b; a + 3b`);
    const d = Number(grab(shown, /3b = (−?\d+)/)[1].replace("−", "-"));
    assert.equal(d, dot(u, v), shown);
  }
  // AB from points, i j k notation, parameters in brackets.
  assert.match(render("dot", "A(1, 2, 0); B(1, 0, 0); C(1, 0, 3)"), /perpendicular/);
  assert.match(render("dot", "a = 3i - 2j + k; b = 2i + 3j"), /perpendicular/);
});

test("cross product: areas and volumes", () => {
  for (let k = 0; k < 30; k++) {
    const [a, b, c] = [nonzero(), nonzero(), nonzero()];
    const n = cross(a, b);
    if (len(n) < 1e-9) {
      assert.match(render("cross", `a = ${s(a)}; b = ${s(b)}`), /parallel/);
      continue;
    }
    const shown = render("cross", `a = ${s(a)}; b = ${s(b)}; c = ${s(c)}`);
    const area = val(grab(shown, /its length (.+?) is the area/)[1]);
    assert.ok(close(area, len(n), 1e-3), `${area} vs ${len(n)}`);
    const V = Math.abs(dot(n, c));
    if (V === 0) assert.match(shown, /lie in one plane/);
    else assert.equal(val(grab(shown, /volume (\S+), the tetrahedron/)[1]), V);
  }
  assert.match(render("cross", "A(1, 0, 0); B(0, 2, 0); C(0, 0, 3)"), /triangle ABC has area 7\/2/);
});

test("lines: through a common point, skew, and the distance from a point", () => {
  for (let k = 0; k < 40; k++) {
    // Two lines through X.
    const X = vec();
    const [d1, d2] = [nonzero(), nonzero()];
    if (len(cross(d1, d2)) < 1e-9) continue;
    const [t, u] = [rnd(-3, 3), rnd(-3, 3)];
    const a1 = X.map((x, i) => x - t * d1[i]);
    const a2 = X.map((x, i) => x - u * d2[i]);
    const shown = render("lines", `r = ${s(a1)} + t${s(d1)}; r = ${s(a2)} + s${s(d2)}`);
    assert.deepEqual(point(grab(shown, /meet at (\(.*?\))/)[1]), X, shown);

    // Moving the second line off X along d1 × d2 makes them skew by exactly that much.
    const n = cross(d1, d2);
    const off = rnd(1, 3);
    const b2 = a2.map((x, i) => x + off * n[i]);
    const skew = render("lines", `r = ${s(a1)} + t${s(d1)}; r = ${s(b2)} + s${s(d2)}`);
    assert.ok(close(val(grab(skew, /skew, (.+?) apart/)[1]), off * len(n), 1e-6), skew);

    // A point: the foot is on the line, the gap at right angles.
    const P = vec();
    const pd = render("lines", `r = ${s(a1)} + t${s(d1)}; P${s(P)}`);
    if (/lies on the line/.test(pd)) continue;
    const m = grab(pd, /nearest point to P is (\(.*?\)), at distance (.+?)\./);
    const F = point(m[1]);
    const AF = sub(F, a1);
    assert.ok(len(cross(AF, d1)) < 1e-9, `F ${m[1]} is not on the line`);
    assert.ok(Math.abs(dot(sub(P, F), d1)) < 1e-9, "PF is not perpendicular");
    assert.ok(close(val(m[2]), len(sub(P, F)), 1e-6), `${m[2]} vs ${len(sub(P, F))}`);
  }
  assert.match(render("lines", "A(1, 2, 3); B(3, 4, 5); C(5, 6, 7)"), /lies on the line \(t = 2\)/);
  assert.match(render("lines", "r = (0, 0, 0) + t(1, 2, 2); r = (1, 0, 0) + s(-2, -4, -4)"), /parallel, 2√2\/3 ≈ 0.943 apart/);
  assert.match(render("lines", "r = (0, 1) + t(2, 1); r = (5, 0) + s(-1, 2)"), /meet at \(18\/5, 14\/5\)/);
  assert.match(render("lines", "y = 2x + 1; P(3, 0)"), /nearest point to P is \(1\/5, 7\/5\)/);
});

test("planes: distance, a line through it, two planes", () => {
  for (let k = 0; k < 35; k++) {
    const n = nonzero();
    const d = rnd(-9, 9);
    const plane = `${n[0]}x + ${n[1]}y + ${n[2]}z = ${d}`.replace(/\+ -/g, "- ");
    const on = (p: number[], tol = 1e-9) => Math.abs(dot(n, p) - d) < tol * Math.max(1, Math.abs(d));

    const P = vec();
    const shown = render("planes", `${plane}; P${s(P)}`);
    if (!/lies on the plane/.test(shown)) {
      const m = grab(shown, /nearest point to P is (\(.*?\)), at distance (.+?)\./);
      const F = point(m[1]);
      assert.ok(on(F), `${plane}: F ${m[1]} is off the plane`);
      assert.ok(len(cross(sub(P, F), n)) < 1e-9, "PF is not along n");
      assert.ok(close(val(m[2]), Math.abs(dot(n, P) - d) / len(n), 1e-6));
    }

    const [A, dir] = [vec(), nonzero()];
    const ln = render("planes", `${plane}; r = ${s(A)} + t${s(dir)}`);
    if (dot(n, dir) === 0) assert.match(ln, /parallel to the plane|lies in the plane/);
    else {
      const X = point(grab(ln, /crosses the plane at (\(.*?\))/)[1]);
      assert.ok(on(X), "X is off the plane");
      assert.ok(len(cross(sub(X, A), dir)) < 1e-9, "X is off the line");
    }

    const n2 = nonzero();
    const d2 = rnd(-9, 9);
    const two = render("planes", `${plane}; ${n2[0]}x + ${n2[1]}y + ${n2[2]}z = ${d2}`.replace(/\+ -/g, "- "));
    if (len(cross(n, n2)) < 1e-9) assert.match(two, /parallel|same plane/);
    else {
      const m = grab(two, /line through (\(.*?\)) along (\(.*?\))/);
      const [Q, L] = [point(m[1]), point(m[2])];
      assert.ok(on(Q) && Math.abs(dot(n2, Q) - d2) < 1e-9, "the point is not on both planes");
      assert.ok(dot(n, L) === 0 && dot(n2, L) === 0, "the direction is not in both planes");
    }
  }
  // Three points, a point and a normal, two directions: the same plane x + 2y + 3z = 6 in three ways.
  for (const src of ["A(6, 0, 0); B(0, 3, 0); C(0, 0, 2); P(0, 0, 0)", "A(6, 0, 0); n = (1, 2, 3); P(0, 0, 0)", "r = (6, 0, 0) + s(-6, 3, 0) + t(-6, 0, 2); P(0, 0, 0)"])
    assert.match(render("planes", src), /P is \(3\/7, 6\/7, 9\/7\), at distance 3√14\/7/, src);
  assert.match(render("planes", "x + y + z = 1; 2x + 2y + 2z = 5"), /parallel, √3\/2 ≈ 0.866 apart/);
  assert.match(render("planes", "x + y + z = 6"), /axes at x = 6, y = 6, z = 6/);
});

test("errors say what is wrong", () => {
  const err = (topic: VecTopic, src: string, re: RegExp) => assert.throws(() => renderVectors({ topic, src }, w), re, src);
  err("basics", "2a - b", /“a” is not defined/);
  err("basics", "a = (1, 2); b = (1, 2, 3)", /“a = \(1, 2\)” does not have 3 components/);
  err("planes", "A(1, 2); B(3, 4); C(5, 1)", /Planes live in 3D/);
  err("dot", "a = (0, 0, 0); b = (1, 2, 3)", /zero vector/);
  err("lines", "r = (1, 2, 3)", /needs a parameter/);
  err("basics", "a = (1, 2); b = (3, 4); a*b", /Dot product or Cross product/);
  err("lines", "r = (1, 2, 3) + t*t*(1, 0, 0)", /multiplied by something that is not a number/);
  err("dot", "a = (1, 2)", /Type two vectors/);
});
