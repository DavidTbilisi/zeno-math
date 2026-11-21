// Practice: net present value and internal rate of return (#456). Easy finds the present value of one cash flow C
// k years out, C/(1 + r)^k (grown forward instead, discounted for one year only, named); medium a project's NPV,
// Σ C_t/(1 + r)^t with C_0 paid now (the flows added undiscounted, every flow discounted a year too many, named), or
// whether to accept it, by the sign of its NPV (the undiscounted sum's sign, named); hard the IRR of a two-period
// project, the rate x with −C_0 + C_1/(1 + x) + C_2/(1 + x)² = 0, a quadratic in 1 + x built to have a whole-percent
// root (the total return, the total return spread over the two years, named).
import { pickOf, word } from "../calculusTwo";
import { money, npvAt } from "../finance";
import type { MistakeId } from "../mistakes";
import { dp, num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const pc = (r: number) => `${dp(r * 100, 2)}\\%`;
const RATES = [0.04, 0.05, 0.08, 0.1, 0.12];

function pvPart(r: Rng, w: PracticeWords): Part {
  const C = r.pick([1000, 2000, 5000, 8000, 10000]);
  const rate = r.pick(RATES);
  const k = r.pick([2, 3, 4, 5]);
  const v = C / (1 + rate) ** k;
  return {
    prompt: w.fin.prompt.npvPV,
    q: `C = ${C}, \\ r = ${pc(rate)}, \\ k = ${k}`,
    ...money(v, [["pvGrownForward", C * (1 + rate) ** k], ["pvDiscountedOnce", C / (1 + rate)]]),
    steps: [`PV = \\frac{C}{(1 + r)^{k}} = \\frac{${C}}{${1 + rate}^{${k}}}`, `PV \\approx ${v.toFixed(2)}`],
  };
}

/** A project: C_0 paid now, three inflows that add up to more than it, so the rate decides; and its NPV at the rate. */
function project(r: Rng) {
  for (;;) {
    const P = r.pick([10000, 20000]);
    const flows = [-P, ...[0, 1, 2].map(() => (P / 10000) * r.pick([3000, 3500, 4000, 4500]))];
    const rate = r.pick(RATES);
    const npv = npvAt(flows, rate);
    if (flows.reduce((s, c) => s + c, 0) > 0 && Math.abs(npv) >= 1) return { flows, rate, npv };
  }
}

const flowsTex = (flows: number[]) => flows.map((c, t) => `C_${t} = ${c}`).join(", \\ ");
const npvSteps = (flows: number[], rate: number, npv: number) => [
  `NPV = ${flows.map((c, t) => (t === 0 ? `${c}` : `\\frac{${c}}{${1 + rate}^{${t}}}`)).join(" + ").replace("+ -", "- ")}`,
  `NPV \\approx ${npv.toFixed(2)}`,
];

function npvPart(r: Rng, w: PracticeWords): Part {
  const { flows, rate, npv } = project(r);
  return {
    prompt: w.fin.prompt.npvValue,
    q: `${flowsTex(flows)}, \\ r = ${pc(rate)}`,
    ...money(npv, [
      ["npvUndiscounted", flows.reduce((s, c) => s + c, 0)],
      ["npvFirstDiscounted", npvAt(flows, rate) / (1 + rate)],
    ]),
    steps: npvSteps(flows, rate, npv),
  };
}

function acceptPart(r: Rng, w: PracticeWords): Part {
  const { flows, rate, npv } = project(r);
  const options = [word(w.fin.npv.accept), word(w.fin.npv.reject)];
  const right = npv > 0 ? 0 : 1;
  // Every project here pays back more than it costs, undiscounted: "accept" is the slip when the NPV says no.
  const slips: [MistakeId, number][] = [["npvUndiscounted", 0]];
  return {
    prompt: w.fin.prompt.npvAccept,
    q: `${flowsTex(flows)}, \\ r = ${pc(rate)}`,
    ...pickOf(options, right, slips),
    steps: [...npvSteps(flows, rate, npv), `NPV ${npv > 0 ? ">" : "<"} 0: \\text{${options[right].text}}`],
  };
}

/** Two-period projects with a whole-percent IRR: P y² − C_1 y − C_2 = 0 at y = 1 + IRR, every flow whole. */
const IRR: { P: number; C1: number; C2: number; x: number }[] = [];
for (const x of [5, 10, 20, 25, 50])
  for (const P of [1000, 2000, 4000])
    for (const share of [0.2, 0.4, 0.5, 0.6]) {
      const y = 1 + x / 100;
      const C1 = P * share;
      const C2 = Math.round((P * y * y - C1 * y) * 1e6) / 1e6;
      if (C2 > 0 && Number.isInteger(C2)) IRR.push({ P, C1, C2, x });
    }

function irrPart(r: Rng, w: PracticeWords): Part {
  const { P, C1, C2, x } = r.pick(IRR);
  const total = ((C1 + C2 - P) / P) * 100;
  const traps = (
    [
      ["irrTotalReturn", total],
      ["irrAveraged", total / 2],
    ] as const
  )
    .filter(([, t]) => Math.abs(t - x) > 0.05)
    .map(([id, t]) => ({ id, a: num(t, 0.051) }));
  return {
    prompt: w.fin.prompt.npvIrr,
    q: `C_0 = ${-P}, \\ C_1 = ${C1}, \\ C_2 = ${C2}`,
    answer: { ...num(x), ...(traps.length ? { traps } : {}) },
    show: `${x}\\%`,
    plain: String(x),
    format: "number",
    steps: [
      `-${P} + \\frac{${C1}}{y} + \\frac{${C2}}{y^{2}} = 0, \\quad y = 1 + x`,
      `${P}y^{2} - ${C1}y - ${C2} = 0 \\implies y = \\frac{${C1} + \\sqrt{${C1}^{2} + 4 \\cdot ${P} \\cdot ${C2}}}{2 \\cdot ${P}} = ${1 + x / 100}`,
      `x = ${x}\\%`,
    ],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? pvPart(r, w) : L === 2 ? (r.next() < 0.5 ? npvPart(r, w) : acceptPart(r, w)) : irrPart(r, w));

export default gen;
