// Practice: Joint distributions. Easy finds a marginal probability from a joint table (one cell for the whole row or
// column, named); medium a conditional one (the joint probability left undivided, divided by the other marginal,
// named); hard the covariance E(XY) − E(X)E(Y) (E(XY) alone, the subtraction turned round, named) or whether X and Y
// are independent (one cell checked, named).
import { exact, pickOf, word } from "../calculusTwo";
import { F, jointTex, sum } from "../probTheory";
import { fill } from "../text";
import type { Frac } from "../fraction";
import type { MistakeId } from "../mistakes";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const XS = [0, 1];
const YS = [0, 1, 2];

/** A 2 × 3 table of counts out of their total, every cell at least 1. */
function tableOf(r: Rng): Frac[][] {
  const counts = XS.map(() => YS.map(() => r.int(1, 6)));
  const n = counts.flat().reduce((s, c) => s + c, 0);
  return counts.map((row) => row.map((c) => F(c, n)));
}

const rowSum = (t: Frac[][], i: number) => sum(t[i]);
const colSum = (t: Frac[][], j: number) => sum(t.map((row) => row[j]));
const plus = (xs: Frac[]) => xs.map((x) => x.tex()).join(" + ");

function marginalPart(r: Rng, w: PracticeWords): Part {
  const t = tableOf(r);
  if (r.int(0, 1) === 0) {
    const i = r.pick(XS);
    const v = rowSum(t, i);
    const big = t[i].reduce((m, c) => (c.toNumber() > m.toNumber() ? c : m));
    return {
      prompt: fill(w.pt.prompt.marginal, { e: `X = ${i}` }),
      q: jointTex(t, YS, XS),
      ...exact(v, [["marginalOneCell", big]]),
      steps: [`P(X = ${i}) = \\sum_{y} P(X = ${i}, Y = y) = ${plus(t[i])} = ${v.tex()}`],
    };
  }
  const j = r.pick(YS);
  const col = t.map((row) => row[j]);
  const v = colSum(t, j);
  const big = col.reduce((m, c) => (c.toNumber() > m.toNumber() ? c : m));
  return {
    prompt: fill(w.pt.prompt.marginal, { e: `Y = ${j}` }),
    q: jointTex(t, YS, XS),
    ...exact(v, [["marginalOneCell", big]]),
    steps: [`P(Y = ${j}) = \\sum_{x} P(X = x, Y = ${j}) = ${plus(col)} = ${v.tex()}`],
  };
}

function conditionalPart(r: Rng, w: PracticeWords): Part {
  const t = tableOf(r);
  const i = r.pick(XS);
  const j = r.pick(YS);
  const c = t[i][j];
  const px = rowSum(t, i);
  const v = c.div(px);
  return {
    prompt: fill(w.pt.prompt.conditional, { e: `Y = ${j} | X = ${i}` }),
    q: jointTex(t, YS, XS),
    ...exact(v, [["conditionalNotDivided", c], ["conditionedWrongWay", c.div(colSum(t, j))]]),
    steps: [
      `P(X = ${i}) = ${plus(t[i])} = ${px.tex()}`,
      `P(Y = ${j} \\mid X = ${i}) = \\frac{P(X = ${i}, Y = ${j})}{P(X = ${i})} = \\frac{${c.tex()}}{${px.tex()}} = ${v.tex()}`,
    ],
  };
}

function covariancePart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const t = tableOf(r);
    const ex = rowSum(t, 1);
    const ey = sum(YS.map((j) => colSum(t, j).mul(F(j))));
    const exy = sum(YS.map((j) => t[1][j].mul(F(j))));
    const v = exy.sub(ex.mul(ey));
    if (v.isZero()) continue;
    return {
      prompt: w.pt.prompt.covariance,
      q: jointTex(t, YS, XS),
      ...exact(v, [["covarianceNoSubtraction", exy], ["covarianceSignFlipped", v.neg()]]),
      steps: [
        `E(X) = P(X = 1) = ${ex.tex()}, \\quad E(Y) = ${YS.map((j) => `${j} \\cdot ${colSum(t, j).tex()}`).join(" + ")} = ${ey.tex()}`,
        `E(XY) = ${YS.slice(1).map((j) => `${j} \\cdot ${t[1][j].tex()}`).join(" + ")} = ${exy.tex()}`,
        `\\operatorname{Cov}(X, Y) = ${exy.tex()} - ${ex.tex()} \\cdot ${ey.tex()} = ${v.tex()}`,
      ],
    };
  }
}

const PX = [F(1, 2), F(1, 3), F(1, 4), F(2, 5)];
const PY = [[F(1, 4), F(1, 4), F(1, 2)], [F(1, 6), F(1, 3), F(1, 2)], [F(1, 5), F(1, 5), F(3, 5)], [F(2, 5), F(1, 5), F(2, 5)], [F(1, 6), F(1, 2), F(1, 3)]];

function independencePart(r: Rng, w: PracticeWords): Part {
  const p0 = r.pick(PX);
  const px = [p0, F(1).sub(p0)];
  const py = r.pick(PY);
  const t = px.map((a) => py.map((b) => a.mul(b)));
  const independent = r.int(0, 1) === 0;
  if (!independent) {
    // Moved along a rectangle, so the margins and the corner cell stay as they were.
    const d = [t[0][2], t[1][1]].reduce((m, c) => (c.toNumber() < m.toNumber() ? c : m)).div(F(2));
    t[0][1] = t[0][1].add(d);
    t[0][2] = t[0][2].sub(d);
    t[1][1] = t[1][1].sub(d);
    t[1][2] = t[1][2].add(d);
  }
  const options = [word(w.pt.yes), word(w.pt.no)];
  const slips: [MistakeId, number][] = independent ? [] : [["independenceOneCell", 0]];
  const cell = (i: number, j: number) => `P(X = ${i}, Y = ${j}) = ${t[i][j].tex()} ${t[i][j].toNumber() === px[i].mul(py[j]).toNumber() ? "=" : "\\ne"} ${px[i].tex()} \\cdot ${py[j].tex()}`;
  return {
    prompt: w.pt.prompt.independent,
    q: jointTex(t, YS, XS),
    ...pickOf(options, independent ? 0 : 1, slips),
    steps: [
      `P(X = 0) = ${px[0].tex()}, \\quad ${YS.map((j) => `P(Y = ${j}) = ${py[j].tex()}`).join(", \\; ")}`,
      cell(0, 0),
      independent ? `P(X = x, Y = y) = P(X = x)P(Y = y) \\; \\forall x, y` : cell(0, 1),
    ],
  };
}

const gen: Gen = (r, L, w) =>
  L === 1 ? marginalPart(r, w) : L === 2 ? conditionalPart(r, w) : r.int(0, 1) === 0 ? covariancePart(r, w) : independencePart(r, w);

export default gen;
