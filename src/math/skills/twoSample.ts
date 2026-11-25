// Practice: two samples, errors and the slope (#654). Easy: a Type I or Type II error, and what raises a test's power.
// Medium: the two-sample t statistic, and the margin of error of an interval for μ₁ − μ₂. Hard: whether a slope is
// significant on n − 2 degrees of freedom, and, in a new setting, which test fits a study. The two errors swapped, a
// smaller α taken to raise power, standard errors added instead of variances, n − 1 degrees of freedom for a slope,
// and paired and two-sample designs mistaken for each other are slips.
import { fill } from "../chart";
import { dp, num } from "../practiceKit";
import type { Gen, Trap } from "../practiceTypes";
import { pickPart, tStar } from "../tTails";

const TOL = 0.0051;
const FAR = 0.15;

const gen: Gen = (r, L, w) => {
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
