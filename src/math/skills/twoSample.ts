// Practice: two samples, errors and the slope (#654). Easy: a Type I or Type II error, and what raises a test's power.
// Medium: the two-sample t statistic, and the margin of error of an interval for μ₁ − μ₂. Hard: whether a slope is
// significant on n − 2 degrees of freedom, and, in a new setting, which test fits a study. The two errors swapped, a
// smaller α taken to raise power, standard errors added instead of variances, n − 1 degrees of freedom for a slope,
// and paired and two-sample designs mistaken for each other are slips. #743 adds, on half the seeds of the two harder
// levels: the conditions for inference on two means or two proportions, hypotheses for a difference of proportions
// and the margin of error of a two-sample z interval for it (L2); then a new setting, two medicines' recovery rates,
// the pooled z statistic, its P-value and the conclusion (L3).
import { fill } from "../chart";
import { normSf } from "../inference";
import { numPart, tf } from "../partKit";
import { dp, num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { pickPart, tStar } from "../tTails";
import { conclusion, conditions, hypotheses } from "./hypothesis";

const TOL = 0.0051;
const FAR = 0.15;

/** P-values to 3 places; a slip within 21 × P_TOL would read as rounding. */
const P_TOL = 0.0006;

function more(r: Rng, L: 2 | 3, w: PracticeWords): Part {
  const K = w.t2K;
  if (L === 2) {
    const t = r.pick(["cond", "hyp", "margin"] as const);
    if (t === "cond") {
      const k = r.int(0, 3);
      if (r.next() < 0.5) return conditions(r, [K.cRandom, K.cIndep, K.cNormal, K.cAll], k, [K.whyRandomM, K.whyIndepM, K.whyNormalM, K.whyAllM][k], fill(K.condQM, { s: [K.sRandomM, K.sIndepM, K.sNormalM, K.sAllM][k] }));
      return conditions(r, [K.cRandom, K.cIndep, K.cLarge, K.cAll], k, [K.whyRandomP, K.whyIndepP, K.whyLargeP, K.whyAllP][k], fill(K.condQP, { s: [K.sRandomP, K.sIndepP, K.sLargeP, K.sAllP][k] }));
    }
    if (t === "hyp") return r.next() < 0.5 ? hypotheses(r, K.hypVaccine, "p₁ − p₂", "p̂₁ − p̂₂", 0, "<") : hypotheses(r, K.hypTowns, "p₁ − p₂", "p̂₁ − p̂₂", 0, "≠");
    for (;;) {
      const [n1, n2] = [r.pick([100, 150, 200, 250]), r.pick([100, 120, 160, 200])];
      const [x1, x2] = [r.int(Math.round(n1 * 0.2), Math.round(n1 * 0.7)), r.int(Math.round(n2 * 0.2), Math.round(n2 * 0.7))];
      const [p1, p2] = [x1 / n1, x2 / n2];
      const c = r.pick([90, 95, 99]);
      const z = ({ 90: 1.645, 95: 1.96, 99: 2.576 } as Record<number, number>)[c];
      const [a, b] = [(p1 * (1 - p1)) / n1, (p2 * (1 - p2)) / n2];
      const se = Math.sqrt(a + b);
      const E = z * se;
      if (Math.abs(z * (Math.sqrt(a) + Math.sqrt(b)) - E) <= 21 * P_TOL || Math.abs(se - E) <= 21 * P_TOL) continue;
      const vars = { a: dp(a, 5), b: dp(b, 5), v: dp(se, 4), z, E: dp(E, 3) };
      const d = p1 - p2;
      return numPart(fill(K.marginQ, { n1, x1, n2, x2, c, z }), E, [tf("diffSdAdded", z * (Math.sqrt(a) + Math.sqrt(b)), vars, P_TOL), tf("marginIsSe", se, vars, P_TOL)],
        [`\\hat p_1 = ${dp(p1, 4)}, \\quad \\hat p_2 = ${dp(p2, 4)}`, `SE = \\sqrt{\\frac{\\hat p_1(1 - \\hat p_1)}{${n1}} + \\frac{\\hat p_2(1 - \\hat p_2)}{${n2}}} = ${dp(se, 4)}`,
          `E = ${z} \\times ${dp(se, 4)} = ${dp(E, 3)}, \\quad ${dp(d, 3)} \\pm ${dp(E, 3)} = (${dp(d - E, 3)}, \\; ${dp(d + E, 3)})`], P_TOL);
    }
  }
  // A new setting: two medicines, the share of patients who recover with each.
  const t = r.pick(["z", "p", "concl"] as const);
  if (t === "concl") return conclusion(r, w, K.ctxMed, K.claimMed, K.nullMed, { flipped: "decisionFlipped", accepted: "nullAccepted" });
  if (t === "z") {
    for (;;) {
      const [n1, n2] = [r.pick([80, 100, 120, 150, 200]), r.pick([60, 80, 100, 150])];
      const [x1, x2] = [r.int(Math.round(n1 * 0.3), Math.round(n1 * 0.8)), r.int(Math.round(n2 * 0.3), Math.round(n2 * 0.8))];
      const [p1, p2] = [x1 / n1, x2 / n2];
      const pool = (x1 + x2) / (n1 + n2);
      const se = Math.sqrt(pool * (1 - pool) * (1 / n1 + 1 / n2));
      const z = (p1 - p2) / se;
      const zu = (p1 - p2) / Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
      if (Math.abs(z) < 0.5 || Math.abs(z) > 3.5 || Math.abs(zu - z) <= 0.11) continue;
      const vars = { pool: dp(pool, 4), z: dp(z, 2) };
      return numPart(fill(K.zQ, { n1, x1, n2, x2 }), z, [tf("unpooledInTest", zu, vars, 0.0051)],
        [`\\hat p = \\frac{${x1} + ${x2}}{${n1} + ${n2}} = ${dp(pool, 4)}`, `z = \\frac{${dp(p1, 4)} - ${dp(p2, 4)}}{\\sqrt{${dp(pool, 4)}(1 - ${dp(pool, 4)})\\left(\\frac{1}{${n1}} + \\frac{1}{${n2}}\\right)}} = ${dp(z, 2)}`], 0.0051);
    }
  }
  for (;;) {
    const z = r.int(80, 280) / 100 * r.pick([-1, 1]);
    const alt = r.pick(["gt", "lt", "ne"] as const);
    if (alt !== "ne" && (alt === "gt") !== z > 0) continue;
    const one = normSf(Math.abs(z));
    const P = alt === "ne" ? 2 * one : one;
    if (one <= 21 * P_TOL) continue;
    const vars = { z, v: dp(P, 3) };
    const rel = alt === "ne" ? "≠" : alt === "gt" ? ">" : "<";
    return numPart(fill(K.pQ, { z, rel }), P, [alt === "ne" ? tf("zTailNotDoubled", one, vars, P_TOL) : tf("tailDoubled", 2 * P, vars, P_TOL)],
      [`P = ${alt === "ne" ? "2 \\cdot " : ""}P(Z > ${Math.abs(z)}) \\approx ${dp(P, 3)}`], P_TOL);
  }
}

const gen: Gen = (r, L, w) => {
  if (L > 1 && r.int(0, 9) >= 5) return more(r, L as 2 | 3, w);
  const W = w.tws;
  if (L === 1) {
    if (r.next() < 0.6) {
      // The truth about H₀ against the decision: two ways to be wrong, two to be right.
      const h0 = r.next() < 0.5;
      const reject = r.next() < 0.5;
      const right = h0 && reject ? 0 : !h0 && !reject ? 1 : 2;
      return pickPart(r, [W.typeI, W.typeII, W.correct], right, right < 2 ? [{ id: "errorTypesSwapped", at: 1 - right }] : [],
        fill(W.errQ, { s: r.pick([W.errMachine, W.errDoctor]), truth: h0 ? W.h0True : W.h0False, dec: reject ? W.decReject : W.decKeep }), [`\\text{${W.errStep}}`]);
    }
    return pickPart(r, [W.powerBigger, W.powerAlpha, W.powerSmaller], 0, [{ id: "powerSmallerAlpha", at: 1 }], W.powerQ, [`\\text{${W.powerStep}}`]);
  }

  if (L === 2) {
    for (;;) {
      const [n1, n2] = [r.pick([10, 12, 15, 20, 25]), r.pick([10, 12, 15, 20, 25])];
      const [s1, s2] = [r.int(3, 15), r.int(3, 15)];
      const m1 = r.int(40, 80);
      const m2 = m1 + r.pick([-1, 1]) * r.int(2, 10);
      const [v1, v2] = [s1 * s1 / n1, s2 * s2 / n2];
      const se = Math.sqrt(v1 + v2);
      const added = s1 / Math.sqrt(n1) + s2 / Math.sqrt(n2);
      const vars = { se: dp(se, 3) };
      const groups = { n1, m1, s1, n2, m2, s2 };
      const steps = [`SE = \\sqrt{\\frac{${s1}^2}{${n1}} + \\frac{${s2}^2}{${n2}}} = ${dp(se, 3)}`];
      const make = (prompt: string, v: number, slip: number, more: string) => {
        if (Math.abs(slip - v) <= FAR) return null;
        const traps: Trap[] = [{ id: "seAdded", a: num(slip, TOL), vars }];
        return { prompt, q: "", answer: { ...num(v, TOL), traps }, show: dp(v, 2), plain: dp(v, 2), format: "dp2" as const, steps: [...steps, more] };
      };
      const part = r.next() < 0.5
        ? make(fill(W.twoQ, groups), (m1 - m2) / se, (m1 - m2) / added, `t = \\frac{${m1} - ${m2}}{${dp(se, 3)}} = ${dp((m1 - m2) / se, 2)}`)
        : (() => {
            const ts = tStar(Math.min(n1, n2) - 1);
            return make(fill(W.marginQ, { ...groups, t: ts, df: Math.min(n1, n2) - 1 }), ts * se, ts * added, `${ts} \\times ${dp(se, 3)} = ${dp(ts * se, 2)}`);
          })();
      if (part && Math.abs(m1 - m2) / se < 6) return part;
    }
  }

  if (r.next() < 0.5) {
    // A slope: t = b/SE on n − 2 degrees of freedom. Half the time t falls between the cuts for n − 2 and n − 1.
    for (;;) {
      const n = r.int(4, 8);
      const [c2, c1] = [tStar(n - 2), tStar(n - 1)];
      const se = r.pick([0.2, 0.25, 0.4, 0.5, 0.8]);
      const kind = r.pick(["between", "above", "below"] as const);
      const t = kind === "between" ? c1 + (c2 - c1) * (0.3 + 0.4 * r.next()) : kind === "above" ? c2 + 0.3 + r.next() : c1 - 0.4 - r.next();
      const b = Math.round(t * se * 100) / 100;
      const tt = b / se;
      const sig = tt > c2;
      if (kind === "between" ? !(tt > c1 && tt < c2) : kind === "above" ? !sig : tt >= c1) continue;
      const first = r.next() < 0.5;
      const vars = { df: n - 2, ts: c2, t: dp(tt, 2) };
      return pickPart(r, [W.yes, W.no], sig ? 0 : 1, kind === "between" ? [{ id: "slopeDfOne", at: 0, vars }] : [],
        fill(W.slopeQ, { n, b, se, a: first ? c2 : c1, d1: first ? n - 2 : n - 1, c: first ? c1 : c2, d2: first ? n - 1 : n - 2 }),
        [`t = \\frac{${b}}{${se}} = ${dp(tt, 2)}`, `df = ${n} - 2 = ${n - 2}, \\quad t^* = ${c2}`]);
    }
  }
  // A new setting: which test fits a study.
  const k = r.int(0, 3);
  const study = [W.sPaired, W.sTwo, W.sOne, W.sProp][k];
  const traps = k === 0 ? [{ id: "pairedAsTwoSample" as const, at: 1 }] : k === 1 ? [{ id: "twoSampleAsPaired" as const, at: 0 }] : [];
  return pickPart(r, [W.oPaired, W.oTwo, W.oOne, W.oProp], k, traps, fill(W.whichQ, { s: study }), [`\\text{${W.whichStep}}`]);
};

export default gen;
