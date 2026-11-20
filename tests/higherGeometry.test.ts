// Geometry of a degree in practice: the helpers behind the answers (the helix and the twisted cubic, the curvature of
// a graph, the Gaussian curvature of a quadric, regular tilings, the cross-ratio, the harmonic conjugate, a
// projectivity of the line, the meet of two lines) checked by hand, and every question checked against its own answer
// (right as shown, the named slips wrong and named).
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { check, exercise, trapInputs, type SkillId } from "../src/math/practice.ts";
import type { Level } from "../src/math/practiceTypes.ts";
import { crossRatio, gaussian, graphCurvature, harmonicConjugate, helix, meet, projectivity, quadricAt, tileArea, tilingKind, twistedCubic } from "../src/math/higherGeometry.ts";
import { F } from "../src/math/pdes.ts";

const w = en.pracWords;
const SKILLS: SkillId[] = ["curves", "surfaces", "nonEuclidean", "projective"];

test("curvature and torsion of the helix, the twisted cubic and a graph", () => {
  const h = helix(3, 4);
  assert.equal(h.kappa.tex(), "\\frac{3}{25}");
  assert.equal(h.tau.tex(), "\\frac{4}{25}");
  // (t, t², t³): κ(0) = 2, τ(0) = 3.
  const c = twistedCubic(1, 1, 1);
  assert.equal(c.kappa.toNumber(), 2);
  assert.equal(c.tau.toNumber(), 3);
  // y = x² at x = 0: κ = 2; where y″ = 1 and y′ = 3/4: κ = 1/(25/16)^{3/2} = 64/125.
  assert.equal(graphCurvature(F(2), F(0)).toNumber(), 2);
  assert.equal(graphCurvature(F(1), F(3, 4)).tex(), "\\frac{64}{125}");
  assert.throws(() => graphCurvature(F(1), F(1)));
});

test("the Gaussian curvature of a quadric", () => {
  // z = x² + y² at the origin: K = 4; z = xy: K = −1; the saddle x² − y²: −4.
  const bowl = { a: 1, b: 0, c: 1, p: 0, q: 0, d: 0 };
  assert.equal(gaussian(bowl, 0, 0).toNumber(), 4);
  assert.equal(gaussian({ a: 0, b: 1, c: 0, p: 0, q: 0, d: 0 }, 0, 0).toNumber(), -1);
  assert.equal(gaussian({ a: 1, b: 0, c: -1, p: 0, q: 0, d: 0 }, 0, 0).toNumber(), -4);
  // Away from the origin the slope enters: at (1, 0), f_x = 2, so K = 4/25.
  const at = quadricAt(bowl, 1, 0);
  assert.deepEqual(at, { z: 1, fx: 2, fy: 0 });
  assert.equal(gaussian(bowl, at.fx, at.fy).tex(), "\\frac{4}{25}");
});

test("regular tilings: where they live and the area of a hyperbolic tile", () => {
  assert.equal(tilingKind(3, 5), 0); // icosahedron
  assert.equal(tilingKind(4, 4), 1); // squares
  assert.equal(tilingKind(6, 3), 1); // hexagons
  assert.equal(tilingKind(7, 3), 2);
  // {7, 3}: (7 − 2)π − 7·2π/3 = π/3; {4, 5}: 2π − 8π/5 = 2π/5.
  assert.equal(tileArea(7, 3).tex(), "\\frac{1}{3}");
  assert.equal(tileArea(4, 5).tex(), "\\frac{2}{5}");
  assert.equal(tileArea(4, 4).toNumber(), 0);
});

test("cross-ratio, harmonic conjugates, projectivities and meets", () => {
  // (0, 1; 2, 3) = (2)(2)/((1)(3)) = 4/3, unchanged by x ↦ 2x + 1.
  assert.equal(crossRatio(F(0), F(1), F(2), F(3)).tex(), "\\frac{4}{3}");
  assert.equal(crossRatio(F(1), F(3), F(5), F(7)).tex(), "\\frac{4}{3}");
  // The harmonic conjugate of 2 with respect to 0 and 3 is 6: (0, 3; 2, 6) = −1.
  const d = harmonicConjugate(F(0), F(3), F(2));
  assert.equal(d.toNumber(), 6);
  assert.equal(crossRatio(F(0), F(3), F(2), d).toNumber(), -1);
  // 0, 1, ∞ ↦ 1, 2, 3, and the map keeps cross-ratios.
  const m = projectivity(F(1), F(2), F(3));
  assert.equal(m.at(F(0)).toNumber(), 1);
  assert.equal(m.at(F(1)).toNumber(), 2);
  const pts = [F(2), F(3), F(5), F(7)]; // x ↦ (3x + 1)/(x + 1) is undefined only at −1
  assert.equal(crossRatio(...(pts.map(m.at) as [ReturnType<typeof F>, ReturnType<typeof F>, ReturnType<typeof F>, ReturnType<typeof F>])).tex(), crossRatio(pts[0], pts[1], pts[2], pts[3]).tex());
  // x − y = 0 and x + y − 2 = 0 meet at (1, 1).
  const [X, Y, Z] = meet([1, -1, 0], [1, 1, -2]);
  assert.deepEqual([X / Z, Y / Z], [1, 1]);
});

test("every higher-geometry question accepts its own answer and names its slips", () => {
  for (const skill of SKILLS)
    for (const level of [1, 2, 3] as Level[]) {
      const named = new Set<string>();
      for (let seed = 1; seed <= 200; seed++) {
        const e = exercise(skill, level, seed, w);
        const where = `${skill} ${level} #${seed}: ${e.q} → ${e.plain}`;
        assert.ok(!/NaN|undefined|Infinity|null/.test(e.prompt + e.q + e.show + e.plain + (e.steps ?? []).join(" ")), where);
        assert.ok(!/\{[a-zA-Z0-9]+\}/.test(e.prompt), `${where}: a blank left in the prompt`);
        assert.ok(!/\\text\{/.test((e.steps ?? []).join(" ")), `${where}: words in the steps`);
        assert.equal(check(e, e.plain, w).ok, true, where);
        for (const t of trapInputs(e)) {
          assert.equal(check(e, t.input, w).mistake, t.id, `${where}; ${t.id} ${t.input}`);
          named.add(t.id);
        }
      }
      assert.ok(named.size > 0, `${skill} ${level} names a slip`);
    }
});
