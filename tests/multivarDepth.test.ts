// Multivariable calculus (#753): every question of the seven extended skills and of divergence and curl is right with
// its own answer and wrong with each slip, named with its hint filled in; each new slip comes up, and only at the
// level its kind is asked at; the picture kinds carry a picture; the grades stay.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { check, exercise, trapInputs, type SkillId } from "../src/math/practice.ts";

const w = en.pracWords;
/** Each new slip and the levels it may come up at. */
const IDS: Record<string, Record<string, readonly number[]>> = {
  multipleIntegrals: {
    tripleWidthsLeftOut: [1], boundsCurvesSwapped: [2], outerLimitAsHeight: [2], innerVariableMismatch: [2], surfaceOneLeftOut: [3], surfaceAsShadow: [3],
  },
  changeVariables: { areaSignKept: [1], detPlusUsed: [1], jacobianFactorLeftOut: [2], jacobianInverted: [2] },
  lineIntegrals: { dsLeftOut: [2], speedNotRooted: [2] },
  vectorTheorems: { greenCirculationForFlux: [1], cornersBreakCurve: [1], selfCrossingCalledSimple: [1], openCurveCalledClosed: [1], orientationIgnored: [2] },
  partials: { gradientDownhill: [1], gradientAlongLevel: [1], mixedPartialSameLetter: [2], mixedPartialAsProduct: [2] },
  extremaMulti: { hessianMixedDoubled: [2], hessianAtOrigin: [2] },
  chainMulti: { detPlusUsed: [2], detDiagonalOnly: [2] },
  divCurl: {
    inflowOutflowSwapped: [1], flowCalledDivergence: [1], divergenceWrongLetters: [1], divergencePartLeftOut: [1],
    spinDirectionSwapped: [2], shearCalledCurlFree: [2], spreadCalledSpin: [2], divergenceForCurl: [2], curlSignSlip: [2],
    curlMiddleSignFlipped: [3], curlOrderReversed: [3], laplacianFirstDerivatives: [3], laplacianPartLeftOut: [3],
  },
};

for (const [skill, ids] of Object.entries(IDS))
  test(`${skill}: every question is right with its answer and every new slip is named at its level`, () => {
    const seen = new Set<string>();
    for (const level of [1, 2, 3] as const)
      for (let seed = 1; seed <= 400; seed++) {
        const ex = exercise(skill as SkillId, level, seed, w);
        const at = `${level}/${seed} ${ex.prompt}`;
        assert.ok(!/\{\w+\}/.test(ex.prompt), at);
        assert.ok(!/NaN|undefined|Infinity/.test(ex.prompt + ex.q + ex.show + (ex.steps ?? []).join(" ")), at);
        assert.ok(check(ex, ex.plain, w).ok, `${at} ${ex.plain}`);
        for (const t of trapInputs(ex)) {
          if (!(t.id in ids)) continue;
          assert.ok(ids[t.id].includes(level), `${at} ${t.id} at level ${level}`);
          seen.add(t.id);
          const v = check(ex, t.input, w);
          assert.ok(!v.ok, `${at} ${t.id}`);
          assert.equal(v.mistake, t.id, `${at} ${t.input}`);
          assert.ok(v.hint && v.hint.length > 20 && !/\{\w+\}/.test(v.hint), `${at} ${t.id} ${v.hint}`);
        }
      }
    for (const id of Object.keys(ids)) assert.ok(seen.has(id), id);
  });

test("the picture kinds carry a picture of the field, the level lines or the curve", () => {
  const asks = [
    ["divCurl", 1, w.dcK.divPicQ], ["divCurl", 2, w.dcK.curlPicQ], ["partials", 1, w.mvK.gradPicQ], ["vectorTheorems", 1, w.mvK.curveQ],
  ] as const;
  for (const [skill, level, prompt] of asks) {
    let n = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const ex = exercise(skill, level, seed, w);
      if (ex.prompt !== prompt) continue;
      n++;
      assert.ok(ex.pic, `${skill} ${level} #${seed}`);
      const svg = ex.pic.svg(0, 0);
      assert.ok(/<(line|path)/.test(svg) && !/NaN/.test(svg), `${skill} ${level} #${seed}`);
    }
    assert.ok(n > 0, `${skill} ${level} asks ${prompt}`);
  }
});

test("a field that turns anticlockwise has positive curl, and one that spreads has positive divergence", () => {
  const seen = { spin: false, spread: false };
  for (let seed = 1; seed <= 300; seed++) {
    const c = exercise("divCurl", 2, seed, w);
    if (c.prompt === w.dcK.curlPicQ && c.steps?.[0].startsWith("\\mathbf{F} = \\left(-y, \\; x\\right)")) {
      assert.equal(c.plain, w.dcK.ccw);
      seen.spin = true;
    }
    const d = exercise("divCurl", 1, seed, w);
    if (d.prompt === w.dcK.divPicQ && d.steps?.[0].startsWith("\\mathbf{F} = \\left(x, \\; y\\right)")) {
      assert.equal(d.plain, w.dcK.positive);
      seen.spread = true;
    }
  }
  assert.ok(seen.spin && seen.spread);
});

test("the grades stay", () => {
  for (const s of Object.keys(IDS)) assert.deepEqual([1, 2, 3].map((L) => gradeOf(s as SkillId, L as 1 | 2 | 3)), [13, 13, 13], s);
});
