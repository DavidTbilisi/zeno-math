// Arcs, sectors and radians: the answers agree with the formulas, every slip gives another answer, the figures draw,
// and the practice questions read in all three languages.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { rng } from "../src/math/random.ts";
import { degreeQuestion, radianQuestion, renderArc, sectorQuestion, sectorSvg, type ArcQuestion } from "../src/math/arcs.ts";
import { check, exercise, LEVELS } from "../src/math/practice.ts";

const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);
const u = { cm: "cm", rad: "rad" };
const near = (a: number, b: number, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${a} ≠ ${b}`);
const num = (s: string) => parseFloat(s);

function sane(q: ArcQuestion) {
  assert.ok(Number.isFinite(q.v) && q.v > 0);
  for (const t of q.traps) assert.ok(Math.abs(t.v - q.v) > 0.02, `${q.kind}: ${t.id} gives the answer`);
  if (q.fig) {
    assert.ok(q.fig.t > 0 && q.fig.t < 360, `${q.kind}: an angle the circle can show`);
    for (const worked of [false, true]) {
      const pic = sectorSvg(q.fig, worked);
      assert.ok(!/NaN|undefined/.test(pic.body), `${q.kind} draws`);
    }
  }
}

test("degrees: the arc, the area and the perimeter are θ/360 of the circle's", () => {
  const kinds = new Set<string>();
  for (const seed of SEEDS) {
    const q = degreeQuestion(rng(seed), u);
    kinds.add(q.kind);
    sane(q);
    const r = num(q.fig!.r);
    const t = q.fig!.t;
    if (q.kind === "arc") near(q.v, (t / 360) * 2 * Math.PI * r);
    if (q.kind === "sector") near(q.v, (t / 360) * Math.PI * r * r);
    if (q.kind === "perim") near(q.v, (t / 360) * 2 * Math.PI * r + 2 * r);
  }
  assert.deepEqual([...kinds].sort(), ["arc", "perim", "sector"]);
});

test("radians: π rad is 180°, s = rθ and A = ½r²θ agree with the degree formulas", () => {
  const kinds = new Set<string>();
  for (const seed of SEEDS) {
    const q = radianQuestion(rng(seed), u);
    kinds.add(q.kind);
    sane(q);
    if (q.kind === "toDegPi") assert.ok(q.exact && Number.isInteger(q.v) && q.v < 360);
    if (q.kind === "arcRad" || q.kind === "sectorRad") {
      const [r, t] = [num(q.fig!.r), q.fig!.t];
      near(q.v, q.kind === "arcRad" ? (t / 360) * 2 * Math.PI * r : (t / 360) * Math.PI * r * r);
    }
  }
  assert.deepEqual([...kinds].sort(), ["arcRad", "sectorRad", "toDeg", "toDegPi", "toRad"]);
});

test("backwards and the segment: θ = s/r, a whole radius from the area, the sector less the triangle", () => {
  const kinds = new Set<string>();
  for (const seed of SEEDS) {
    const q = sectorQuestion(rng(seed), u);
    kinds.add(q.kind);
    sane(q);
    if (q.kind === "angle") near(q.v, num(q.fig!.s!) / num(q.fig!.r));
    if (q.kind === "radius") {
      assert.ok(Number.isInteger(q.v));
      near(0.5 * q.v ** 2 * (q.fig!.t * Math.PI) / 180, Number(q.vars.a), 0.006);
    }
    if (q.kind === "segment") {
      const [r, th] = [num(q.fig!.r), (q.fig!.t * Math.PI) / 180];
      near(q.v, 0.5 * r * r * th - 0.5 * r * r * Math.sin(th));
      assert.ok(q.v > 0 && q.v < Math.PI * r * r);
    }
  }
  assert.deepEqual([...kinds].sort(), ["angle", "radius", "segment"]);
});

test("practice: right to 2 dp, with a unit or without, and the worked solution draws", () => {
  for (const level of LEVELS)
    for (let seed = 1; seed <= 60; seed++) {
      const ex = exercise("arcs", level, seed, en.pracWords);
      assert.ok(!/\{\w+\}/.test(ex.prompt) && !/ {2}/.test(ex.prompt), ex.prompt);
      assert.equal(check(ex, ex.plain, en.pracWords).ok, true, `${level} #${seed}: ${ex.prompt} ${ex.plain}`);
      const spec = ex.solution!.spec as Parameters<typeof renderArc>[0];
      assert.ok(renderArc(spec, null).svg.startsWith("<svg"));
    }
  const arc = Array.from({ length: 80 }, (_, i) => exercise("arcs", 1, i + 1, en.pracWords)).find((e) => e.prompt.includes("orange arc"))!;
  assert.equal(check(arc, `${arc.plain} cm`, en.pracWords).ok, true);
  const deg = Array.from({ length: 80 }, (_, i) => exercise("arcs", 2, i + 1, en.pracWords)).find((e) => e.prompt === en.pracWords.arcs.toDegPi)!;
  assert.equal(check(deg, `${deg.plain}°`, en.pracWords).ok, true);
  for (const t of [ka, ru])
    for (const level of LEVELS)
      for (const seed of [3, 7, 11]) {
        const ex = exercise("arcs", level, seed, t.pracWords);
        assert.ok(!/\{\w+\}/.test(ex.prompt), ex.prompt);
      }
});
