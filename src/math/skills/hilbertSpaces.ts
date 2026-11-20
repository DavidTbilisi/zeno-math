// Practice: Hilbert spaces. Easy finds t for the orthogonal projection t·u of v onto the line through u in ℝ³ (⟨v, u⟩
// not divided by ⟨u, u⟩, divided by ⟨v, v⟩, named); medium finds ‖f‖² in L²[−π, π] for a + b cos mx + c sin nx by
// Parseval (the constant weighted π instead of 2π, as in fourier, π left out, named); hard finds the best constant approximation
// of c·xᵏ in L²[0, 1] (the value at the midpoint, the average of the ends, named) or the squared distance to it (‖f‖²
// without the projection taken off, named).
import { exact, piTimes } from "../calculusTwo";
import { F } from "../measureTheory";
import { vecTex } from "../functionalAnalysis";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const dot = (x: number[], y: number[]) => x.reduce((s, v, i) => s + v * y[i], 0);

function projectionPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const u = [r.int(-3, 3), r.int(-3, 3), r.int(-3, 3)];
    const v = [r.int(-5, 5), r.int(-5, 5), r.int(-5, 5)];
    const vu = dot(v, u);
    const uu = dot(u, u);
    const vv = dot(v, v);
    if (uu === 0 || vu === 0 || vv === uu || uu === 1) continue;
    const t = F(vu, uu);
    return {
      prompt: w.fa.prompt.projection,
      q: `v = ${vecTex(v)}, \\quad u = ${vecTex(u)}`,
      ...exact(t, [["noNormalise", vu], ["projectionSwapped", F(vu, vv)]]),
      steps: [
        `v - t u \\perp u \\iff \\langle v, u \\rangle - t \\langle u, u \\rangle = 0`,
        `t = \\frac{\\langle v, u \\rangle}{\\langle u, u \\rangle} = \\frac{${vu}}{${uu}} = ${t.tex()}`,
      ],
    };
  }
}

function parsevalPart(r: Rng, w: PracticeWords): Part {
  const a = r.nz(-4, 4);
  const b = r.nz(-5, 5);
  const c = r.nz(-5, 5);
  const m = r.int(1, 3);
  const n = r.int(1, 3);
  const k = 2 * a * a + b * b + c * c;
  const f = `f(x) = ${a} ${b < 0 ? "-" : "+"} ${Math.abs(b) === 1 ? "" : Math.abs(b)}\\cos ${m === 1 ? "" : m}x ${c < 0 ? "-" : "+"} ${Math.abs(c) === 1 ? "" : Math.abs(c)}\\sin ${n === 1 ? "" : n}x`;
  return {
    prompt: w.fa.prompt.parseval,
    q: f,
    ...piTimes(F(k), [["parsevalConstantWeight", (a * a + b * b + c * c) * Math.PI], ["piForgotten", k]]),
    steps: [
      `\\|1\\|^2 = 2\\pi, \\quad \\|\\cos ${m === 1 ? "" : m}x\\|^2 = \\|\\sin ${n === 1 ? "" : n}x\\|^2 = \\pi, \\text{ and the three are orthogonal}`,
      `\\|f\\|^2 = 2\\pi \\cdot ${a * a} + \\pi \\cdot ${b * b} + \\pi \\cdot ${c * c} = ${k}\\pi`,
    ],
  };
}

function approximationPart(r: Rng, w: PracticeWords): Part {
  const c = r.int(2, 6);
  const k = r.int(2, 4);
  const mean = F(c, k + 1);
  const f = `f(x) = ${c}x^{${k}}`;
  if (r.next() < 0.5)
    return {
      prompt: w.fa.prompt.bestConstant,
      q: f,
      ...exact(mean, [["midpointValue", F(c, 2 ** k)], ["averageOfEnds", F(c, 2)]]),
      steps: [`f - m \\perp 1 \\iff \\int_0^1 (${c}x^{${k}} - m) \\, dx = 0`, `m = \\int_0^1 ${c}x^{${k}} \\, dx = ${mean.tex()}`],
    };
  const ff = F(c * c, 2 * k + 1);
  const d = ff.sub(mean.mul(mean));
  return {
    prompt: w.fa.prompt.distance,
    q: f,
    ...exact(d, [["normOfF", ff]]),
    steps: [
      `m = \\int_0^1 ${c}x^{${k}} \\, dx = ${mean.tex()}`,
      `\\|f - m\\|^2 = \\|f\\|^2 - m^2 = ${ff.tex()} - \\left(${mean.tex()}\\right)^2 = ${d.tex()}`,
    ],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? projectionPart(r, w) : L === 2 ? parsevalPart(r, w) : approximationPart(r, w));

export default gen;
