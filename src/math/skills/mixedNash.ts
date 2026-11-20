// Practice: mixed strategies and zero-sum games. Easy finds the value of a 3 × 3 zero-sum game with a saddle point
// (the smallest row maximum, the largest column minimum, named); medium plays a 2 × 2 zero-sum game with no saddle
// point: Row's equilibrium probability (Column's probability, 1 − p, named) or the value (the average of the
// payoffs, Row's pure maximin, named); hard finds a mixed Nash equilibrium of a 2 × 2 game with no pure one, Row's
// probability or Column's (the player's own payoffs made indifferent, 1 − p, named).
import { exact, type NumSlip } from "../calculusTwo";
import { F, maxOfColumnMinima, maximin, minimax, minOfRowMaxima, mixCol, mixRow, negate, pureNash, zeroSumValue, type Game } from "../gameTheory";
import type { Frac } from "../fraction";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";
import { gameTex } from "./normalForm";

/** A zero-sum game as a table of what Column pays Row. */
function zeroTex(m: number[][]): string {
  const rs = m.length === 2 ? ["U", "D"] : ["U", "M", "D"];
  const cs = m[0].length === 2 ? ["L", "R"] : ["L", "C", "R"];
  return `\\begin{array}{c|${"c".repeat(cs.length)}} & ${cs.join(" & ")} \\\\ \\hline ${m.map((row, i) => `${rs[i]} & ${row.join(" & ")}`).join(" \\\\ ")} \\end{array}`;
}
const draw = (r: Rng, n: number, m: number, lo: number, hi: number) => Array.from({ length: n }, () => Array.from({ length: m }, () => r.int(lo, hi)));
/** k·(…) as written: 3p, (−2)(1 − p). */
const cf = (k: number) => (k < 0 ? `(${k})` : `${k}`);
/** The indifference equation of a 2 × 2 table u with x the first strategy's probability, read along rows or columns. */
const indifference = (u: number[][], x: string, alongRows: boolean) => {
  const [p, q, s, t] = alongRows ? [u[0][0], u[0][1], u[1][0], u[1][1]] : [u[0][0], u[1][0], u[0][1], u[1][1]];
  return `${cf(p)}${x} + ${cf(q)}(1 - ${x}) = ${cf(s)}${x} + ${cf(t)}(1 - ${x})`;
};

function saddlePart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const m = draw(r, 3, 3, -3, 9);
    const v = maximin(m);
    if (v !== minimax(m)) continue;
    const mins = m.map((row) => Math.min(...row));
    const maxs = m[0].map((_, j) => Math.max(...m.map((row) => row[j])));
    return {
      prompt: w.gt.prompt.saddle,
      q: zeroTex(m),
      ...exact(F(v), [["saddleRowMaxima", minOfRowMaxima(m)], ["saddleColumnMinima", maxOfColumnMinima(m)]]),
      steps: [`\\min_{j} a_{ij} = ${mins.join(", ")} \\implies \\max_{i} \\min_{j} a_{ij} = ${v}`, `\\max_{i} a_{ij} = ${maxs.join(", ")} \\implies \\min_{j} \\max_{i} a_{ij} = ${v}`],
    };
  }
}

function zeroSumPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const m = draw(r, 2, 2, -4, 8);
    if (maximin(m) >= minimax(m)) continue;
    const p = mixRow(negate(m));
    const q = mixCol(m);
    const v = zeroSumValue(m);
    const asksP = r.next() < 0.5;
    const eq = `${indifference(m, "p", false)} \\implies p = ${p.tex()}`;
    if (asksP)
      return {
        prompt: w.gt.prompt.zeroSumMix,
        q: zeroTex(m),
        ...exact(p, [["mixOwnPayoff", q], ["mixSwapped", F(1).sub(p)]]),
        steps: [eq],
      };
    const average: Frac = F(m.flat().reduce((s, x) => s + x, 0), 4);
    return {
      prompt: w.gt.prompt.zeroSumValue,
      q: zeroTex(m),
      ...exact(v, [["valueAverage", average], ["valueMaximin", maximin(m)]]),
      steps: [eq, `v = ${cf(m[0][0])} \\cdot ${p.texP()} + ${cf(m[1][0])} \\cdot ${F(1).sub(p).texP()} = ${v.tex()}`],
    };
  }
}

function bimatrixPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const g: Game = { a: draw(r, 2, 2, 0, 9), b: draw(r, 2, 2, 0, 9) };
    const ties = g.a[0][0] === g.a[1][0] || g.a[0][1] === g.a[1][1] || g.b[0][0] === g.b[0][1] || g.b[1][0] === g.b[1][1];
    if (ties || pureNash(g).length) continue;
    const p = mixRow(g.b);
    const q = mixCol(g.a);
    const asksP = r.next() < 0.5;
    const x = asksP ? p : q;
    const slips: NumSlip[] = [["mixOwnPayoff", asksP ? q : p], ["mixSwapped", F(1).sub(x)]];
    return {
      prompt: asksP ? w.gt.prompt.mixRow : w.gt.prompt.mixCol,
      q: gameTex(g),
      ...exact(x, slips),
      steps: asksP ? [`${indifference(g.b, "p", false)} \\implies p = ${p.tex()}`] : [`${indifference(g.a, "q", true)} \\implies q = ${q.tex()}`],
    };
  }
}

const gen: Gen = (r, L, w) => {
  if (L === 1) return saddlePart(r, w);
  if (L === 2) return zeroSumPart(r, w);
  return bimatrixPart(r, w);
};

export default gen;
