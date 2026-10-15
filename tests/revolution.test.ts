// Solids of revolution: each volume against the textbook answer, the slabs' sum against its own definition, the
// exact kπ only when it is right, and the regions that can't be turned.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { pretty, revCaption, revolve, type RevInput } from "../src/math/revolution.ts";
import { REVOLUTION_PRESETS } from "../src/three/spec.ts";

const w = en.revWords;
const run = (s: Partial<RevInput>) => revolve({ f: "x^2", g: "", a: "0", b: "2", axis: "x", slices: 0, ...s }, w);
const close = (a: number, b: number, tol = 1e-7) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
const PI = Math.PI;

test("discs, washers and shells give the textbook volumes", () => {
  const cases: [Partial<RevInput>, number, string | null, string][] = [
    [{}, (32 * PI) / 5, "32π/5", "disc"],
    [{ f: "x/2", a: "0", b: "4" }, (16 * PI) / 3, "16π/3", "disc"],
    [{ f: "x", g: "x^2", a: "0", b: "1" }, (2 * PI) / 15, "2π/15", "washer"],
    [{ f: "x^2", axis: "y" }, 8 * PI, "8π", "shell"],
    [{ f: "2x - x^2", axis: "y" }, (8 * PI) / 3, "8π/3", "shell"],
    [{ f: "x^2", a: "-2", b: "0", axis: "y" }, 8 * PI, "8π", "shell"],
    [{ f: "x", a: "-1", b: "2" }, 3 * PI, "3π", "disc"],
    [{ f: "1/x", a: "1", b: "8" }, (7 * PI) / 8, null, "disc"],
    [{ f: "sin(x)", a: "0", b: "pi" }, (PI * PI) / 2, null, "disc"],
    [{ f: "3 + sqrt(1 - x^2)", g: "3 - sqrt(1 - x^2)", a: "-1", b: "1" }, 6 * PI * PI, null, "washer"],
  ];
  for (const [s, V, exact, method] of cases) {
    const r = run(s);
    assert.ok(close(r.volume, V, 1e-6), `${JSON.stringify(s)}: ${r.volume} vs ${V}`);
    assert.equal(r.exact, exact, JSON.stringify(s));
    assert.equal(r.method, method);
  }
});

test("the exact value is dropped when the region crosses the axis and f² − g² no longer gives the radii", () => {
  // The band from −1 to 1 sweeps a solid cylinder of radius 1, but f² − g² is 0.
  const r = run({ f: "1", g: "-1", a: "0", b: "1" });
  assert.ok(close(r.volume, PI, 1e-6));
  assert.equal(r.exact, null);
  // Curves that cross: |x − x²|-shaped washers on [0, 2].
  const c = run({ f: "x", g: "x^2", a: "0", b: "2" });
  assert.equal(c.exact, null);
  assert.ok(close(c.volume, PI * (2 / 15 + (32 / 5 - 8 / 3 - (1 / 5 - 1 / 3))), 1e-6));
});

test("numbers too large for exact fractions fall back to the decimal", () => {
  const r = run({ f: "x^9", a: "1/97", b: "1/89" });
  assert.equal(r.exact, null);
  assert.ok(r.volume > 0);
});

test("the slabs are discs at the middle of each slice and tend to the volume", () => {
  const r = run({ slices: 8 });
  assert.equal(r.slabs.length, 8);
  let sum = 0;
  for (let k = 0; k < 8; k++) {
    const m = (k + 0.5) / 4;
    sum += PI * m ** 4 * 0.25;
  }
  assert.ok(close(r.approx, sum));
  assert.deepEqual([r.slabs[0][0].x, r.slabs[0][1].x], [0, 0.25]);
  assert.equal(r.slabs[0][0].hi, r.slabs[0][1].hi);
  const err = (n: number) => Math.abs(run({ slices: n }).approx - r.volume);
  assert.ok(err(40) < err(16) && err(16) < err(4));
  assert.ok(Number.isNaN(run({}).approx));
  // Shells: 2π · middle radius · height · width, the same as π(x₁² − x₀²) · height.
  const s = run({ axis: "y", slices: 2 });
  assert.ok(close(s.approx, 2 * PI * (0.5 * 0.25 + 1.5 * 2.25)));
  // At most MAX_SLICES slabs.
  assert.equal(run({ slices: 500 }).slabs.length, 40);
});

test("limits: in either order, with π, and the reach of the solid", () => {
  const r = run({ a: "2", b: "0" });
  assert.deepEqual([r.a, r.b], [0, 2]);
  assert.equal(r.reach, 4);
  assert.deepEqual(r.along, [0, 2]);
  const y = run({ axis: "y" });
  assert.equal(y.reach, 2);
  assert.deepEqual(y.along, [0, 4]);
  assert.equal(r.columns.length, 161);
  assert.equal(r.columns.at(-1)!.x, 2);
});

test("regions that can't be turned say why", () => {
  assert.throws(() => run({ b: "" }), { message: w.needLimits });
  assert.throws(() => run({ a: "1", b: "1" }), { message: w.needLimits });
  assert.throws(() => run({ a: "x" }), { message: w.needLimits });
  assert.throws(() => run({ a: "ln(0)" }), { message: w.needLimits });
  assert.throws(() => run({ a: "-1", b: "1", axis: "y" }), { message: w.oneSide });
  assert.throws(() => run({ f: "sqrt(x)", a: "-1", b: "1" }), { message: /not defined at x = −1/ });
  assert.throws(() => run({ f: "1/x", a: "0", b: "1" }), { message: /not defined at x = 0/ });
  assert.throws(() => run({ f: "100000" }), { message: w.tooBig });
  assert.throws(() => run({ f: "y + 1" }), { message: w.onlyX });
});

test("the caption names the method, the integral and the slabs' sum", () => {
  const s = { f: "x^2", g: "", a: "0", b: "2", axis: "x" as const, slices: 8 };
  const lines = revCaption(s, revolve(s, w), w);
  assert.equal(lines[0], "f(x) = x², 0 ≤ x ≤ 2");
  assert.match(lines[1], /^V = π∫ f\(x\)² dx = 32π\/5 ≈ 20\.1/);
  assert.match(lines[2], /^Discs, n = 8: V ≈ /);
  const washer = { ...s, f: "x", g: "x^2", b: "1", slices: 0 };
  assert.deepEqual(revCaption(washer, revolve(washer, w), w), ["f(x) = x, g(x) = x², 0 ≤ x ≤ 1", "V = π∫ (R² − r²) dx = 2π/15 ≈ 0.4189"]);
  const shell = { ...s, a: "-2", b: "0", axis: "y" as const, slices: 0 };
  assert.match(revCaption(shell, revolve(shell, w), w)[1], /^V = 2π∫ \|x\| · f\(x\) dx = 8π/);
  const shellG = { ...washer, axis: "y" as const };
  assert.match(revCaption(shellG, revolve(shellG, w), w)[1], /x · \(f\(x\) − g\(x\)\) dx = π\/6/);
  const horn = { ...s, f: "1/x", a: "1", b: "8", slices: 0 };
  assert.match(revCaption(horn, revolve(horn, w), w)[1], /^V = π∫ f\(x\)² dx ≈ 2\.74/);
});

test("pretty prints what is typed", () => {
  assert.equal(pretty(" 2*x**3 - sqrt(pi) "), "2·x³ − √(π)");
});

test("every preset turns", () => {
  for (const p of REVOLUTION_PRESETS) {
    const r = revolve({ ...p.spec, slices: 8 }, w);
    assert.ok(r.volume > 0 && Number.isFinite(r.volume), p.key);
  }
});
