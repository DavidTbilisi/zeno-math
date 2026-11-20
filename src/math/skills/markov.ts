// Practice: Markov chains. Easy finds a two-step transition probability (P²)ᵢⱼ (pᵢⱼ squared, the column for the
// row, named); medium the distribution after one step π₀P (P times π₀ as a column, named); hard the stationary
// distribution of a two-state chain (the two parts swapped, the stay-probabilities normalised, named) or the mean
// return time 1/πᵢ (πᵢ itself, named).
import { exact } from "../calculusTwo";
import { pairOf } from "../realAnalysis";
import { F, matMul, matTex, rowTimes, stationaryTwo, sum } from "../probTheory";
import { fill } from "../text";
import type { Frac } from "../fraction";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const STEPS = [F(1, 2), F(1, 3), F(2, 3), F(1, 4), F(3, 4), F(1, 5), F(2, 5), F(3, 5), F(4, 5)];

/** A two-state chain leaving state 1 with a and state 2 with b. */
const twoState = (a: Frac, b: Frac): Frac[][] => [
  [F(1).sub(a), a],
  [b, F(1).sub(b)],
];

const chainQ = (P: Frac[][]) => `P = ${matTex(P)}`;

function twoStepPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const P = twoState(r.pick(STEPS), r.pick(STEPS));
    const P2 = matMul(P, P);
    const i = r.int(0, 1);
    const j = r.int(0, 1);
    const v = P2[i][j];
    const flipped = P2[j][i];
    if (i !== j && flipped.sub(v).isZero()) continue;
    const terms = [0, 1].map((k) => `${P[i][k].tex()} \\cdot ${P[k][j].tex()}`).join(" + ");
    return {
      prompt: fill(w.pt.prompt.twoStep, { i: i + 1, j: j + 1 }),
      q: chainQ(P),
      ...exact(v, [["squaredOneEntry", P[i][j].mul(P[i][j])], ["columnForRow", flipped]]),
      steps: [`(P^{2})_{${i + 1}${j + 1}} = \\sum_{k} p_{${i + 1}k} \\, p_{k${j + 1}} = ${terms}`, `(P^{2})_{${i + 1}${j + 1}} = ${v.tex()}`],
    };
  }
}

const THIRDS = [
  [F(1, 2), F(1, 4), F(1, 4)],
  [F(1, 3), F(1, 3), F(1, 3)],
  [F(0), F(1, 2), F(1, 2)],
  [F(1, 2), F(1, 2), F(0)],
  [F(1, 4), F(1, 2), F(1, 4)],
  [F(1, 5), F(2, 5), F(2, 5)],
  [F(0), F(1), F(0)],
  [F(1, 3), F(2, 3), F(0)],
];
const STARTS = [[F(1, 2), F(1, 2), F(0)], [F(1, 3), F(1, 3), F(1, 3)], [F(1, 2), F(1, 4), F(1, 4)], [F(0), F(1, 2), F(1, 2)], [F(1, 4), F(0), F(3, 4)], [F(2, 5), F(1, 5), F(2, 5)]];

function oneStepPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const P = [r.pick(THIRDS), r.pick(THIRDS), r.pick(THIRDS)];
    const pi0 = r.pick(STARTS);
    const j = r.int(0, 2);
    const v = rowTimes(pi0, P)[j];
    const wrong = sum(P[j].map((x, k) => x.mul(pi0[k])));
    if (wrong.sub(v).isZero()) continue;
    const terms = [0, 1, 2].map((k) => `${pi0[k].tex()} \\cdot ${P[k][j].tex()}`).join(" + ");
    return {
      prompt: fill(w.pt.prompt.oneStep, { j: j + 1 }),
      q: `${chainQ(P)}, \\quad \\pi_0 = (${pi0.map((x) => x.tex()).join(", ")})`,
      ...exact(v, [["matrixTimesVector", wrong]]),
      steps: [`\\pi_1 = \\pi_0 P, \\quad (\\pi_1)_{${j + 1}} = \\sum_{k} (\\pi_0)_k \\, p_{k${j + 1}}`, `(\\pi_1)_{${j + 1}} = ${terms} = ${v.tex()}`],
    };
  }
}

function stationaryPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const a = r.pick(STEPS);
    const b = r.pick(STEPS);
    if (a.sub(b).isZero()) continue;
    const P = twoState(a, b);
    const [p1, p2] = stationaryTwo(a, b);
    const stay = F(2).sub(a).sub(b);
    const diag: [Frac, Frac] = [F(1).sub(a).div(stay), F(1).sub(b).div(stay)];
    const solve = [`\\pi_1 = \\pi_1 (1 - ${a.tex()}) + \\pi_2 \\cdot ${b.tex()} \\Rightarrow ${a.tex()}\\pi_1 = ${b.tex()}\\pi_2`, `\\pi_1 + \\pi_2 = 1`];
    if (r.int(0, 1) === 0) {
      return {
        prompt: w.pt.prompt.stationary,
        q: chainQ(P),
        ...pairOf(
          [p1, p2],
          [
            ["stationaryFlipped", [p2, p1]],
            ["stationaryFromDiagonal", diag],
          ],
          "pair",
        ),
        steps: [...solve, `\\pi = \\left(\\frac{${b.tex()}}{${a.tex()} + ${b.tex()}}, \\frac{${a.tex()}}{${a.tex()} + ${b.tex()}}\\right) = (${p1.tex()}, ${p2.tex()})`],
      };
    }
    const i = r.int(0, 1);
    const p = i === 0 ? p1 : p2;
    const v = F(1).div(p);
    return {
      prompt: fill(w.pt.prompt.returnTime, { i: i + 1 }),
      q: chainQ(P),
      ...exact(v, [["returnTimeIsProbability", p]]),
      steps: [...solve, `\\pi_${i + 1} = ${p.tex()}`, `E(T_{${i + 1}}) = \\frac{1}{\\pi_${i + 1}} = ${v.tex()}`],
    };
  }
}

const gen: Gen = (r, L, w) => (L === 1 ? twoStepPart(r, w) : L === 2 ? oneStepPart(r, w) : stationaryPart(r, w));

export default gen;
