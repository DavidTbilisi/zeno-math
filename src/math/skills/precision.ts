// Practice: Precision and recall.
import { fill } from "../chart";
import { errTable, fr, num, plainFrac } from "../practiceKit";
import type { Gen, Trap } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const T = (k: string) => `\\mathrm{${k}}`;
  const cm = (tp: number, fn: number, fp: number, tn: number) =>
    `\\begin{array}{c|cc} & \\hat y = 1 & \\hat y = 0 \\\\ \\hline y = 1 & ${tp} & ${fn} \\\\ y = 0 & ${fp} & ${tn} \\end{array}`;
  const asked = (ask: "P" | "R", tp: number, fp: number, fn: number, prompt: string, q: string, more: string[] = []) => {
    const v = fr(tp, tp + (ask === "P" ? fp : fn));
    const other = fr(tp, tp + (ask === "P" ? fn : fp));
    const traps: Trap[] = fp !== fn ? [{ id: "swappedPR", a: num(other.toNumber()) }] : [];
    const formula = ask === "P" ? `P = \\frac{${T("TP")}}{${T("TP")} + ${T("FP")}} = \\frac{${tp}}{${tp} + ${fp}}` : `R = \\frac{${T("TP")}}{${T("TP")} + ${T("FN")}} = \\frac{${tp}}{${tp} + ${fn}}`;
    return { prompt, q, answer: { ...num(v.toNumber(), 1e-9, { lowest: true }), traps }, show: v.tex(), plain: plainFrac(v), format: "fraction" as const, steps: [...more, `${formula} = ${v.tex()}`] };
  };
  if (L < 3) {
    const [tp, fn, fp, tn] = [r.int(10, 60), r.int(2, 30), r.int(2, 30), r.int(20, 150)];
    const q = cm(tp, fn, fp, tn);
    const ask = r.pick(["P", "R"] as const);
    if (L === 1) return asked(ask, tp, fp, fn, ask === "P" ? w.prompts.prPrecision : w.prompts.prRecall, q);
    // F1, the harmonic mean of P and R: 2TP / (2TP + FP + FN).
    const v = fr(2 * tp, 2 * tp + fp + fn);
    return {
      prompt: w.prompts.prF1,
      q,
      answer: num(v.toNumber(), 1e-9, { lowest: true }),
      show: v.tex(),
      plain: plainFrac(v),
      format: "fraction",
      steps: [`P = ${fr(tp, tp + fp).tex()}, \\quad R = ${fr(tp, tp + fn).tex()}`, `F_1 = \\frac{2PR}{P + R} = \\frac{2 \\cdot ${tp}}{2 \\cdot ${tp} + ${fp} + ${fn}} = ${v.tex()}`],
    };
  }
  // Eight examples' scores and classes; predict 1 when the score is at least t.
  const t = r.pick([0.3, 0.4, 0.5, 0.6, 0.7] as const);
  let ex: { s: number; y: number }[], tp: number, fp: number, fn: number;
  do {
    const scores = new Set<number>();
    while (scores.size < 8) {
      const s = r.int(1, 19) * 5;
      if (s !== t * 100) scores.add(s);
    }
    // Higher scores are more often class 1, as from a classifier that is better than chance.
    ex = [...scores].sort((a, b) => b - a).map((s) => ({ s: s / 100, y: r.next() < 0.15 + 0.7 * (s / 100) ? 1 : 0 }));
    tp = ex.filter((e) => e.s >= t && e.y === 1).length;
    fp = ex.filter((e) => e.s >= t && e.y === 0).length;
    fn = ex.filter((e) => e.s < t && e.y === 1).length;
  } while (tp === 0 || fp === 0 || fn === 0 || fp === fn);
  const ask = r.pick(["P", "R"] as const);
  const q = errTable("s", ex.map((e) => e.s), [["y", ex.map((e) => e.y)]]);
  return asked(ask, tp, fp, fn, fill(ask === "P" ? w.prompts.prThreshP : w.prompts.prThreshR, { t }), q, [`s \\ge ${t}: \\ ${T("TP")} = ${tp}, \\ ${T("FP")} = ${fp}; \\quad s < ${t}: \\ ${T("FN")} = ${fn}`]);
};

export default gen;
