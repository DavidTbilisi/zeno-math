// Coordinate geometry: every point, line and length the tool states is checked against the input on random cases.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { renderCoord, type CoordTopic } from "../src/math/coordgeom.ts";

const w = en.coordWords;
const textOf = (svg: string) =>
  [...svg.matchAll(/<text[^>]*>(.*?)<\/text>/g)]
    .map((m) => m[1])
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
const render = (topic: CoordTopic, src: string) => textOf(renderCoord({ topic, src }, w).svg);
let seed = 5;
const rnd = (lo: number, hi: number) => ((seed = (seed * 1103515245 + 12345) % 2147483648), lo + (seed % (hi - lo + 1)));
const nz = (lo: number, hi: number) => {
  for (;;) {
    const v = rnd(lo, hi);
    if (v !== 0) return v;
  }
};
/** "−3/4", "8√5/5", "√13", "2√2" → a number. */
function val(s: string): number {
  const m = /^(−)?(\d*)(?:√(\d+))?(?:\/(\d+))?$/.exec(s.trim());
  assert.ok(m, `not a number: ${s}`);
  const whole = m[2] ? Number(m[2]) : 1;
  return (m[1] ? -1 : 1) * whole * (m[3] ? Math.sqrt(Number(m[3])) : 1) / (m[4] ? Number(m[4]) : 1);
}
const close = (a: number, b: number) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
/** "y = −3/4 x + 7/4", "y = 2x", "x = 3" → a test that (x, y) lies on it. */
function onLine(eq: string): (x: number, y: number) => boolean {
  const s = eq.replace(/\s+/g, "");
  if (s.startsWith("x=")) return (x) => close(x, val(s.slice(2)));
  const m = /^y=(?:(−)?([\d/√]*)x)?(?:([+−])?([\d/√]+))?$/.exec(s);
  assert.ok(m, `not a line: ${eq}`);
  const slope = m[2] === undefined && !s.includes("x") ? 0 : (m[1] ? -1 : 1) * (m[2] ? val(m[2]) : 1);
  const c = m[4] ? (m[3] === "−" ? -1 : 1) * val(m[4]) : 0;
  return (x, y) => close(y, slope * x + c);
}
const sgn = (v: number) => (v < 0 ? `- ${-v}` : `+ ${v}`);

test("points: the midpoint is halfway and the line goes through both points", () => {
  for (let k = 0; k < 150; k++) {
    const [x1, y1, x2, y2] = [rnd(-9, 9), rnd(-9, 9), rnd(-9, 9), rnd(-9, 9)];
    if (x1 === x2 && y1 === y2) continue;
    const shown = render("points", `A(${x1}, ${y1}), B(${x2}, ${y2})`);
    const mid = /M\((\S+), (\S+)\)/.exec(shown)!;
    assert.ok(close(val(mid[1]), (x1 + x2) / 2) && close(val(mid[2]), (y1 + y2) / 2), `${shown}`);
    const line = /The line through A and B: (.+)\.$/.exec(shown)![1];
    const on = onLine(line);
    assert.ok(on(x1, y1) && on(x2, y2), `${line} misses A or B`);
  }
  assert.match(render("points", "A(2, 1), B(8, 10), 1:2"), /P\(4, 4\)/);
  assert.throws(() => renderCoord({ topic: "points", src: "A(1, 1), B(1, 1)" }, w), /the same/);
});

test("lines: every way of giving a line describes the same line", () => {
  for (let k = 0; k < 150; k++) {
    const [x1, y1, x2, y2] = [rnd(-9, 9), rnd(-9, 9), rnd(-9, 9), rnd(-9, 9)];
    if (x1 === x2) continue;
    const m = (y2 - y1) / (x2 - x1);
    const c = y1 - m * x1;
    for (const src of [`(${x1}, ${y1}), (${x2}, ${y2})`, `(${x1}, ${y1}), m = ${y2 - y1}/${x2 - x1}`, `${y2 - y1}x ${sgn(x1 - x2)}y = ${(y2 - y1) * x1 - (x2 - x1) * y1}`]) {
      const shown = render("line", src);
      const g = /Gradient (\S+): .* crosses the y-axis at (\S+?)\./.exec(shown);
      assert.ok(g, `${src}: ${shown.slice(-200)}`);
      assert.ok(close(val(g[1]), m) && close(val(g[2]), c), `${src}: m ${g[1]}, c ${g[2]} vs ${m}, ${c}`);
    }
  }
  assert.match(render("line", "x = 4"), /vertical line/);
  assert.throws(() => renderCoord({ topic: "line", src: "x^2 + y = 1" }, w), /not a straight line/);
});

test("perpendicular: the foot is on the line, at a right angle, and d = |PF|", () => {
  for (let k = 0; k < 150; k++) {
    const [a, b, c] = [rnd(-6, 6), rnd(-6, 6), rnd(-9, 9)];
    if (a === 0 && b === 0) continue;
    const [px, py] = [rnd(-8, 8), rnd(-8, 8)];
    const shown = render("perp", `${a}x ${sgn(b)}y ${sgn(c)} = 0; P(${px}, ${py})`);
    if (a * px + b * py + c === 0) {
      assert.match(shown, /lies on the line/);
      continue;
    }
    const m = /to (?:F)\((\S+), (\S+)\): (\S+?)\.$/.exec(shown);
    assert.ok(m, shown.slice(-200));
    const [fx, fy, d] = [val(m[1]), val(m[2]), val(m[3])];
    assert.ok(Math.abs(a * fx + b * fy + c) < 1e-9, "F on the line");
    assert.ok(Math.abs((px - fx) * -b + (py - fy) * a) < 1e-9, "PF ⟂ the line");
    assert.ok(close(d, Math.hypot(px - fx, py - fy)), `d ${m[3]}`);
    assert.ok(close(d, Math.abs(a * px + b * py + c) / Math.hypot(a, b)), "formula");
  }
});

test("two lines: the meeting point lies on both, or they are parallel", () => {
  for (let k = 0; k < 200; k++) {
    const [a1, b1, c1, a2, b2, c2] = [rnd(-6, 6), rnd(-6, 6), rnd(-9, 9), rnd(-6, 6), rnd(-6, 6), rnd(-9, 9)];
    if ((a1 === 0 && b1 === 0) || (a2 === 0 && b2 === 0)) continue;
    const first = k % 3 === 0 && b1 !== 0 ? `y = ${-a1}/${b1} x ${sgn(c1)}` : `${a1}x ${sgn(b1)}y = ${c1}`;
    const L1 = k % 3 === 0 && b1 !== 0 ? [-a1 / b1, -1, c1] : [a1, b1, -c1]; // as a·x + b·y + c = 0
    const shown = render("meet", `${first}; ${a2}x ${sgn(b2)}y = ${c2}`);
    const det = L1[0] * b2 - a2 * L1[1];
    if (Math.abs(det) < 1e-12) {
      assert.match(shown, /never meet|same line/, first);
      continue;
    }
    const m = /meet at \((\S+), (\S+)\);/.exec(shown);
    assert.ok(m, `${first}: ${shown.slice(-160)}`);
    const [x, y] = [val(m[1]), val(m[2])];
    assert.ok(Math.abs(L1[0] * x + L1[1] * y + L1[2]) < 1e-9 && Math.abs(a2 * x + b2 * y - c2) < 1e-9, `${first}: (${x}, ${y})`);
  }
});

test("circles: centre and radius from any form; a line meets it as often as the distance says", () => {
  for (let k = 0; k < 150; k++) {
    const [a, b, r] = [rnd(-6, 6), rnd(-6, 6), rnd(1, 7)];
    const D = -2 * a;
    const E = -2 * b;
    const F = a * a + b * b - r * r;
    const kk = rnd(1, 3);
    const general = `${kk}x^2 + ${kk}y^2 ${sgn(kk * D)}x ${sgn(kk * E)}y ${sgn(kk * F)} = 0`;
    const [p, q] = [rnd(-3, 3), rnd(-9, 9)];
    const shown = render("circle", `${general}; y = ${p}x ${sgn(q)}`);
    const c = /Centre O\((\S+), (\S+)\), radius (\S+)\./.exec(shown)!;
    assert.ok(c && close(val(c[1]), a) && close(val(c[2]), b) && close(val(c[3]), r), `${general}: ${c?.[0]}`);
    // Distance from the centre to y = px + q against r.
    const dist = Math.abs(p * a - b + q) / Math.hypot(p, 1);
    const want = Math.abs(dist - r) < 1e-9 ? /touches/ : dist < r ? /cuts the circle twice/ : /misses/;
    assert.match(shown, want, `${general}; y = ${p}x + ${q}: d = ${dist}, r = ${r}`);
  }
  assert.match(render("circle", "x^2 + y^2 = 25; Q(3, 4)"), /Q\(3, 4\) is on the circle/);
  assert.match(render("circle", "x^2 + y^2 = 25; Q(1, 1)"), /inside/);
  assert.match(render("circle", "x^2 + y^2 + 2x + 5 = 0"), /no point at all/);
  assert.throws(() => renderCoord({ topic: "circle", src: "x^2 + 2y^2 = 4" }, w), /not a circle/);
});

test("shapes: shoelace area, and squares, rectangles and parallelograms named", () => {
  for (let k = 0; k < 150; k++) {
    const [ax, ay, p, q, s, t] = [rnd(-5, 5), rnd(-5, 5), nz(-4, 4), rnd(-4, 4), nz(-4, 4), nz(-4, 4)];
    // A + u, A + u + v, A + v with v ⟂ u (rectangle) or v = u turned (square) or v anything (parallelogram).
    const kind = k % 3;
    const [vx, vy] = kind === 0 ? [-q, p] : kind === 1 ? [-q * s, p * s] : [s, t];
    const pts = [[ax, ay], [ax + p, ay + q], [ax + p + vx, ay + q + vy], [ax + vx, ay + vy]];
    const area = Math.abs(p * vy - q * vx);
    if (area === 0) continue;
    const shown = render("polygon", pts.map(([x, y]) => `(${x}, ${y})`).join(", "));
    const got = /Area: (\S+?)(?: = \S+)? square units/.exec(shown)!;
    assert.ok(close(val(got[1]), area), `${shown.slice(-80)} vs ${area}`);
    if (kind === 0) assert.match(shown, /Square/);
    if (kind === 1) assert.match(shown, Math.abs(s) === 1 ? /Square/ : /Rectangle/);
    if (kind === 2) assert.match(shown, /Parallelogram|Rectangle|Rhombus|Square/);
  }
  assert.match(render("polygon", "A(0, 0), B(4, 0), C(4, 3)"), /Right-angled scalene triangle/);
  assert.match(render("polygon", "(0, 0), (6, 0), (4, 3), (1, 3)"), /Trapezium/);
  assert.match(render("polygon", "(0, 0), (3, -2), (6, 0), (3, 5)"), /Kite/);
  assert.match(render("polygon", "(0, 0), (1, 1), (2, 2)"), /on one line/);
});
