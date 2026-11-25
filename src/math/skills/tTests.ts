// Practice: t tests and a proportion (#654). Easy: the z statistic of a one-proportion test, and whether its normal
// model may be used. Medium: the t statistic of a mean, and the margin of error of a t interval. Hard, in a new
// setting: the paired t test on before-and-after data. The spread taken from p̂ instead of p₀, one of the two counts
// checked, s divided by n, z used for t, n degrees of freedom for n − 1, and paired lists treated as two samples are
// slips.
import { fill } from "../chart";
import { dp, num } from "../practiceKit";
import type { Gen, Trap } from "../practiceTypes";
import { mean, pickPart, sd, tStar } from "../tTails";

/** The answer's tolerance: two places, as worked by hand. */
const TOL = 0.0051;
/** A slip is offered only when it lands clear of the answer's close window. */
const FAR = 0.15;

const gen: Gen = (r, L, w) => {
  const W = w.tts;
  const slips = (v: number, list: { id: Trap["id"]; v: number; vars?: Record<string, string | number> }[]) =>
    list.filter((s) => Number.isFinite(s.v) && Math.abs(s.v - v) > FAR).map((s) => ({ id: s.id, a: num(s.v, TOL), vars: s.vars }));
  const numPart = (prompt: string, v: number, traps: Trap[], steps: string[]) => ({
    prompt, q: "", answer: { ...num(v, TOL), traps }, show: dp(v, 2), plain: dp(v, 2), format: "dp2" as const, steps,
  });

  if (L === 1) {
    if (r.next() < 0.5) {
      // z = (p̂ − p₀)/√(p₀(1 − p₀)/n), with a p̂ some way from p₀.
      for (;;) {
        const n = r.pick([100, 200, 250, 400, 500]);
        const p0 = r.pick([0.2, 0.3, 0.4, 0.5, 0.6, 0.7]);
        const x = Math.round(n * (p0 + r.pick([-1, 1]) * r.int(3, 10) / 100));
        const ph = x / n;
        const z = (ph - p0) / Math.sqrt((p0 * (1 - p0)) / n);
        const zh = (ph - p0) / Math.sqrt((ph * (1 - ph)) / n);
        const traps = slips(z, [{ id: "propSeFromPhat", v: zh, vars: { p0, q0: dp(1 - p0, 2), n } }]);
        if (!traps.length || Math.abs(z) > 3.5) continue;
        return numPart(fill(W.propQ, { p: Math.round(p0 * 100), n, x, p0 }), z, traps,
          [`\\hat p = \\frac{${x}}{${n}} = ${ph}`, `z = \\frac{${ph} - ${p0}}{\\sqrt{${p0}(1 - ${p0})/${n}}} = ${dp(z, 2)}`]);
      }
    }
    // Both np₀ and n(1 − p₀) at least 10, or one of them short.
    const ok = r.next() < 0.5;
    const [n, p0] = ok ? [r.pick([50, 80, 100, 200]), r.pick([0.2, 0.3, 0.5, 0.7, 0.8])] : r.pick([[50, 0.9], [60, 0.9], [80, 0.95], [100, 0.95], [40, 0.1], [150, 0.05], [300, 0.98]] as const);
    const a = Math.round(n * p0);
    const b = n - a;
    const vars = { a, b };
    return pickPart(r, [fill(W.condYes, vars), fill(W.condNo, vars)], ok ? 0 : 1, [{ id: "conditionsOneSide", at: 0, vars }],
      fill(W.condQ, { p0, n }), [`\\text{${fill(W.condStep, vars)}}`]);
  }

  if (L === 2) {
    if (r.next() < 0.5) {
      // t = (x̄ − μ₀)/(s/√n), n a square so the standard error is plain.
      for (;;) {
        const n = r.pick([9, 16, 25, 36]);
        const s = r.int(4, 20);
        const mu = r.int(20, 80);
        const se = s / Math.sqrt(n);
        const m = Math.round((mu + r.pick([-1, 1]) * r.int(5, 30) / 10 * se) * 10) / 10;
        const t = (m - mu) / se;
        const traps = slips(t, [{ id: "seDividedByN", v: (m - mu) / (s / n), vars: { s, n, se: dp(se, 3) } }]);
        if (!traps.length) continue;
        return numPart(fill(W.tQ, { n, m, s, mu }), t, traps, [`\\frac{s}{\\sqrt n} = \\frac{${s}}{\\sqrt{${n}}} = ${dp(se, 3)}`, `t = \\frac{${m} - ${mu}}{${dp(se, 3)}} = ${dp(t, 2)}`]);
      }
    }
    // The margin of error t*·s/√n; the table gives t* for n − 1 and for n degrees of freedom.
    for (;;) {
      const n = r.pick([5, 6, 8, 9, 10]);
      const s = r.int(8, 30);
      const m = r.int(40, 120);
      const [t1, t0] = [tStar(n - 1), tStar(n)];
      const se = s / Math.sqrt(n);
      const v = t1 * se;
      const traps = slips(v, [
        { id: "marginWithZ", v: 1.96 * se, vars: { t: t1 } },
        { id: "dfIsN", v: t0 * se, vars: { df: n - 1, t: t1 } },
      ]);
      if (traps.length < 2) continue;
      const first = r.next() < 0.5;
      return numPart(fill(W.marginQ, { n, m, s, a: first ? t1 : t0, d1: first ? n - 1 : n, b: first ? t0 : t1, d2: first ? n : n - 1 }), v, traps,
        [`df = ${n} - 1 = ${n - 1}, \\quad t^* = ${t1}`, `${t1} \\times \\frac{${s}}{\\sqrt{${n}}} = ${dp(v, 2)}`]);
    }
  }

  // A new setting: six pairs, before and after; the differences carry the test.
  for (;;) {
    const [setting, A, B, lo] = r.pick([[W.runSetting, W.runA, W.runB, 55], [W.fieldSetting, W.fieldA, W.fieldB, 20]] as const);
    const xs = Array.from({ length: 6 }, () => r.int(lo, lo + 25));
    const ds = Array.from({ length: 6 }, () => r.int(-1, 5));
    const ys = xs.map((x, i) => x - ds[i]);
    const [d, sdd] = [mean(ds), sd(ds)];
    if (sdd === 0) continue;
    const t = d / (sdd / Math.sqrt(6));
    const two = (mean(xs) - mean(ys)) / Math.sqrt((sd(xs) ** 2 + sd(ys) ** 2) / 6);
    const traps = slips(t, [{ id: "pairedAsIndependent", v: two, vars: { d: dp(d, 2), sd: dp(sdd, 2), t: dp(t, 2) } }]);
    if (!traps.length || Math.abs(t) > 8) continue;
    return numPart(fill(W.pairedQ, { setting, a: A, b: B, xs: xs.join(", "), ys: ys.join(", ") }), t, traps, [
      `d = ${ds.join(", ")}`,
      `\\bar d = ${dp(d, 3)}, \\quad s_d = ${dp(sdd, 3)}`,
      `t = \\frac{${dp(d, 3)}}{${dp(sdd, 3)}/\\sqrt 6} = ${dp(t, 2)}`,
    ]);
  }
};

export default gen;
