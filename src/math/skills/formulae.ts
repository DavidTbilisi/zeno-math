// Practice: Formulae and changing the subject. Since #731, four medium and hard questions in ten are models in
// words: medium, what a number in a taxi's or a gym's formula stands for and which letter goes on which axis; hard, in
// new settings, a year at a gym written with three letters and a profit written as R(x) − C(x). The two numbers'
// meanings swapped, the axes swapped, the sessions not scaled to a year and the cost's sign kept are slips.
import { fill } from "../chart";
import { parseE, tex } from "../expr";
import { formulaQuestion } from "../formulae";
import { num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { pickPart } from "../tTails";

const gen: Gen = (r, L, w) => {
  if (L > 1 && r.int(0, 9) >= 6) return more(r, L, w);
  // Substitute into a formula, or make a letter its subject: one step (easy), two (medium), a squared or rooted
  // subject or one that appears twice (hard) (src/math/formulae.ts).
  const q = formulaQuestion(r.next, L);
  if (q.kind === "substitute")
    return { prompt: fill(w.formulae.substitute, q.vars), q: q.q, answer: num(q.v!), show: `${q.vars.s} = ${q.show}`, plain: q.ans, format: "number", steps: q.steps };
  const vars = q.letters.filter((l) => l !== q.vars.s);
  return {
    prompt: fill(w.formulae.subject, q.vars),
    q: q.q,
    answer: { k: "expr", e: parseE(q.ans, vars), vars, traps: q.traps.map((t) => ({ id: t.id, a: { k: "expr", e: parseE(t.e, vars), vars }, vars: t.vars })) },
    show: q.show,
    plain: q.ans,
    format: "formula",
    steps: q.steps,
  };
};

/** A formula in the given letters to type, with its slips. */
function formulaPart(prompt: string, right: string, vars: string[], slips: [Trap["id"], string, Record<string, string | number>][], steps: string[]): Part {
  const e = (t: string) => parseE(t, vars);
  return {
    prompt, q: "", show: tex(e(right)), plain: right, format: "formula", steps,
    answer: { k: "expr", e: e(right), vars, traps: slips.map(([id, t, v]) => ({ id, a: { k: "expr", e: e(t), vars }, vars: v })) },
  };
}

function more(r: Rng, L: number, w: PracticeWords): Part {
  const W = w.frmM;
  if (L === 2) {
    if (r.next() < 0.6) {
      // What a number in a formula stands for: the fixed part or the part per unit.
      const gym = r.next() < 0.5;
      const [a, b] = gym ? [r.pick([20, 30, 50]), r.pick([40, 60, 80])] : [r.pick([2, 3, 4]), r.pick([0.8, 1.2, 1.5])];
      const f = gym ? `C = ${b}n + ${a}` : `C = ${a} + ${b}d`;
      const askRate = r.next() < 0.5;
      const opts = gym ? [W.gymRate, W.gymFee, W.gymTotal, W.gymMonths] : [W.taxiRate, W.taxiFee, W.taxiTotal, W.taxiKm];
      const right = askRate ? 0 : 1;
      return pickPart(r, opts, right, [{ id: "termMeaningSwapped", at: 1 - right, vars: { t: askRate ? b : a, v: opts[right] } }],
        fill(gym ? W.gymQ : W.taxiQ, { f, t: askRate ? b : a }), [`${f}`]);
    }
    // Which letter goes along the bottom: the one that is chosen or passes, the time.
    const [x, y] = r.pick([["t", "V"], ["t", "h"], ["n", "C"]] as const);
    const [ux, uy] = x === "n" ? [W.unitTickets, W.unitLari] : y === "V" ? [W.unitMin, W.unitLitres] : [W.unitSec, W.unitM];
    const across = (p: string, q: string) => fill(W.axesOpt, { x: p, y: q });
    const opts = [across(`${x} (${ux})`, `${y} (${uy})`), across(`${y} (${uy})`, `${x} (${ux})`), across(`${x} (${uy})`, `${y} (${ux})`)];
    return pickPart(r, opts, 0, [{ id: "axisLabelsSwapped", at: 1, vars: { x, y } }], W[x === "n" ? "axesTickets" : y === "V" ? "axesTank" : "axesBall"], [opts[0]]);
  }
  if (r.next() < 0.5) {
    // A year at a gym: m a month and s a session, k sessions a month.
    return formulaPart(W.yearQ, "12*m + 12*k*s", ["m", "s", "k"], [["rateNotScaled", "12*m + k*s", { v: "12m + 12ks" }]], ["12m + 12 \\times k \\times s = 12m + 12ks"]);
  }
  const [p, c, F] = [r.pick([8, 10, 12, 15]), r.pick([3, 4, 5]), r.pick([60, 100, 150, 200])];
  const m = p - c;
  return formulaPart(fill(W.profitQ, { R: `R(x) = ${p}x`, C: `C(x) = ${c}x + ${F}` }), `${m}*x - ${F}`, ["x"], [["bracketSignKept", `${m}*x + ${F}`, { F, v: `${m}x − ${F}` }]],
    [`P(x) = ${p}x - (${c}x + ${F})`, `= ${m}x - ${F}`]);
}

export default gen;
