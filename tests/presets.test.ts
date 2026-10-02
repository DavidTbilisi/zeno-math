// Every example chip in every tool renders in every language: no exception, no NaN / undefined in the picture.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ru } from "../src/locales/ru.ts";
import { ka } from "../src/locales/ka.ts";
import type { Dict } from "../src/locales/en.ts";
import type { RenderedSvg } from "../src/math/latex.ts";
import { ALGO_PRESETS, renderAlgo } from "../src/math/algo.ts";
import { ANALYSIS_PRESETS, renderAnalysis } from "../src/math/analysis.ts";
import { COMB_PRESETS, renderComb } from "../src/math/combinatorics.ts";
import { CX_PRESETS, renderComplex } from "../src/math/complex.ts";
import { GEO_PRESETS, renderGeometry } from "../src/math/geometry.ts";
import { GT_PRESETS, renderGt } from "../src/math/graphtheory.ts";
import { INT_PRESETS, renderIntegral } from "../src/math/integration.ts";
import { LOGIC_PRESETS, renderLogic } from "../src/math/logic.ts";
import { PRESETS as MODEL_PRESETS, renderModel } from "../src/math/models.ts";
import { NT_PRESETS, renderNt } from "../src/math/numtheory.ts";
import { ODE_PRESETS, renderOde } from "../src/math/ode.ts";
import { STAT_PRESETS, renderStatistics } from "../src/math/statistics.ts";
import { TRIG_PRESETS, renderTrig } from "../src/math/trig.ts";
import { DEFAULT_SPACE, renderSpace, SPACE_PRESETS } from "../src/math/vectorspace.ts";
import { MENTAL_PRESETS, renderMental } from "../src/math/mental.ts";
import { renderTactics, TACTICS_PRESETS } from "../src/math/tactics.ts";
import { ALGEBRA_PRESETS, renderAlgebra } from "../src/math/algebra.ts";
import { POWERS_PRESETS, renderPowers } from "../src/math/powers.ts";
import { COORD_PRESETS, renderCoord } from "../src/math/coordgeom.ts";
import { DERIV_PRESETS, renderDeriv } from "../src/math/derive.ts";
import { APP_PRESETS, renderApplied } from "../src/math/applied.ts";
import { INF_PRESETS, renderInference } from "../src/math/inference.ts";
import { PRACTICE_PRESETS, renderPractice } from "../src/math/practice.ts";

// Presets come as a list or as { topic: list }, of specs or of { label, spec }.
function specs(presets: unknown): any[] {
  const list = Array.isArray(presets) ? presets : Object.values(presets as object).flat();
  return list.map((p: any) => p.spec ?? p);
}

const TOOLS: [string, any[], (spec: any, t: Dict) => RenderedSvg][] = [
  ["algorithms", specs(ALGO_PRESETS), (s, t) => renderAlgo(s, t.algoWords)],
  ["analysis", specs(ANALYSIS_PRESETS), (s, t) => renderAnalysis(s, t.analysisWords)],
  ["combinatorics", specs(COMB_PRESETS), (s, t) => renderComb(s, t.combWords)],
  ["complex", specs(CX_PRESETS), (s, t) => renderComplex(s, t.cxWords)],
  ["geometry", specs(GEO_PRESETS), (s) => renderGeometry(s)],
  ["graph theory", specs(GT_PRESETS), (s, t) => renderGt(s, t.gtWords)],
  ["integrals", specs(INT_PRESETS), (s, t) => renderIntegral(s, t.intWords)],
  ["logic", specs(LOGIC_PRESETS), (s, t) => renderLogic(s, t.logicWords)],
  ["models", specs(MODEL_PRESETS), (s) => renderModel(s)],
  ["number theory", specs(NT_PRESETS), (s, t) => renderNt(s, t.ntWords)],
  ["ODEs", specs(ODE_PRESETS), (s, t) => renderOde(s, t.odeWords)],
  ["statistics", specs(STAT_PRESETS).map(({ names, ...s }) => s), (s, t) => renderStatistics(s, t.statWords)],
  ["trigonometry", specs(TRIG_PRESETS), (s, t) => renderTrig(s, t.trigWords)],
  ["mental math", specs(MENTAL_PRESETS), (s, t) => renderMental(s, t.mentalWords)],
  ["tactics", specs(TACTICS_PRESETS), (s, t) => renderTactics(s, t.tacticsWords)],
  ["algebra", specs(ALGEBRA_PRESETS), (s, t) => renderAlgebra(s, t.algebraWords)],
  ["powers", specs(POWERS_PRESETS), (s, t) => renderPowers(s, t.powersWords)],
  ["coordinate geometry", specs(COORD_PRESETS), (s, t) => renderCoord(s, t.coordWords)],
  ["derivatives", specs(DERIV_PRESETS), (s, t) => renderDeriv(s, t.derivWords)],
  ["applied calculus", specs(APP_PRESETS), (s, t) => renderApplied(s, t.appWords)],
  ["inference", specs(INF_PRESETS), (s, t) => renderInference(s, t.infWords)],
  ["practice", specs(PRACTICE_PRESETS), (s, t) => renderPractice(s, t.pracWords)],
  ["vector spaces", SPACE_PRESETS.map((p) => ({ ...DEFAULT_SPACE, op: p.op, A: p.A, w: p.w ?? DEFAULT_SPACE.w })), (s, t) => renderSpace(s, t.spaceWords)],
];

const LANGS = { en, ru, ka } as Record<string, Dict>;

for (const [tool, list, render] of TOOLS) {
  test(`${tool}: every example renders`, () => {
    assert.ok(list.length > 0, "no examples found");
    for (const [lang, t] of Object.entries(LANGS)) {
      list.forEach((spec, i) => {
        const where = `${tool} #${i} (${lang}): ${JSON.stringify(spec).slice(0, 80)}`;
        let r: RenderedSvg;
        try {
          r = render(spec, t);
        } catch (e) {
          assert.fail(`${where} threw ${(e as Error).message}`);
        }
        assert.match(r.svg, /^<svg/, where);
        assert.doesNotMatch(r.svg, /NaN|undefined/, where);
        for (const tag of r.svg.match(/<[a-zA-Z][^>]*>/g) ?? []) {
          const names = [...tag.matchAll(/\s([\w:-]+)="/g)].map((m) => m[1]);
          assert.equal(new Set(names).size, names.length, `${where}: repeated attribute in ${tag.slice(0, 120)}`);
        }
        assert.ok(r.width > 0 && r.height > 0 && Number.isFinite(r.width + r.height), where);
      });
    }
  });
}
