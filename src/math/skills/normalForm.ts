// Practice: games in normal form. Easy finds a best response, Row's to a column or Column's to a row (the other
// player's payoffs read, the strategy with the player's largest payoff anywhere, named); medium finds the one pure
// Nash equilibrium of a 2 × 3 game (the cell with the largest total, a cell where only one player is best
// responding, named); hard removes strictly dominated strategies in turn from a 3 × 3 game until one cell is left
// (the largest total, Row's largest payoff, named).
import { pickOf, sym } from "../calculusTwo";
import { argmax, colBest, COLS, iterated, pureNash, rowBest, ROWS, type Game } from "../gameTheory";
import type { MistakeId } from "../mistakes";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const draw = (r: Rng, n: number, m: number): Game => ({
  a: Array.from({ length: n }, () => Array.from({ length: m }, () => r.int(0, 9))),
  b: Array.from({ length: n }, () => Array.from({ length: m }, () => r.int(0, 9))),
});
const rowNames = (n: number) => (n === 2 ? ["U", "D"] : [...ROWS]);
const colNames = (m: number) => (m === 2 ? ["L", "R"] : [...COLS]);
/** The game as a table: each cell (Row's payoff, Column's payoff). */
export function gameTex(g: Game): string {
  const rs = rowNames(g.a.length);
  const cs = colNames(g.a[0].length);
  const body = g.a.map((row, i) => `${rs[i]} & ${row.map((x, j) => `(${x}, ${g.b[i][j]})`).join(" & ")}`);
  return `\\begin{array}{c|${"c".repeat(cs.length)}} & ${cs.join(" & ")} \\\\ \\hline ${body.join(" \\\\ ")} \\end{array}`;
}
const cells = (g: Game) => {
  const rs = rowNames(g.a.length);
  const cs = colNames(g.a[0].length);
  return rs.flatMap((ri) => cs.map((cj) => sym(`(${ri}, ${cj})`, `(${ri}, ${cj})`)));
};
/** The named slips whose option exists (−1 where it does not), the first one only where two land on the same option. */
const named = (slips: [MistakeId, number][]) => slips.filter(([, i], n) => i >= 0 && slips.findIndex(([, j]) => j === i) === n);
const sum = (g: Game) => g.a.flatMap((row, i) => row.map((x, j) => x + g.b[i][j]));
/** The strategy where a player's largest payoff anywhere lies, or −1 when it is not alone. */
const holder = (m: number[][], byRow: boolean) => {
  const best = Math.max(...m.flat());
  const at = m.flatMap((row, i) => row.flatMap((x, j) => (x === best ? [byRow ? i : j] : [])));
  return new Set(at).size === 1 ? at[0] : -1;
};

function bestPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const g = draw(r, 3, 3);
    const byRow = r.next() < 0.5;
    const k = r.int(0, 2);
    const own = byRow ? g.a.map((row) => row[k]) : g.b[k];
    const other = byRow ? g.b.map((row) => row[k]) : g.a[k];
    const right = argmax(own);
    if (right === null) continue;
    const names = byRow ? [...ROWS] : [...COLS];
    const wrong = argmax(other) ?? -1;
    const far = holder(byRow ? g.a : g.b, byRow);
    return {
      prompt: fill(byRow ? w.gt.prompt.rowBest : w.gt.prompt.colBest, { s: byRow ? COLS[k] : ROWS[k] }),
      q: gameTex(g),
      ...pickOf(names.map((n) => sym(n, n)), right, named([["bestResponseWrongPayoff", wrong], ["bestResponseGlobalMax", far]])),
      steps: [`${names.map((n, i) => `${byRow ? `${n}, ${COLS[k]}` : `${ROWS[k]}, ${n}`} \\to ${own[i]}`).join(", \\quad ")}`, names[right]],
    };
  }
}

function nashPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const g = draw(r, 2, 3);
    if ([0, 1, 2].some((j) => rowBest(g, j).length > 1) || [0, 1].some((i) => colBest(g, i).length > 1)) continue;
    const eq = pureNash(g);
    if (eq.length !== 1) continue;
    const [i0, j0] = eq[0];
    const idx = (i: number, j: number) => i * 3 + j;
    const total = argmax(sum(g)) ?? -1;
    const one = [0, 1].flatMap((i) => [0, 1, 2].map((j) => [i, j])).find(([i, j]) => rowBest(g, j).includes(i) !== colBest(g, i).includes(j));
    const rs = ["U", "D"];
    return {
      prompt: w.gt.prompt.pureNash,
      q: gameTex(g),
      ...pickOf(cells(g), idx(i0, j0), named([["nashBestSum", total], ["nashOneSided", one ? idx(one[0], one[1]) : -1]])),
      steps: [
        `${[0, 1, 2].map((j) => `BR_{1}(${COLS[j]}) = ${rs[rowBest(g, j)[0]]}`).join(", \\quad ")}`,
        `${[0, 1].map((i) => `BR_{2}(${rs[i]}) = ${COLS[colBest(g, i)[0]]}`).join(", \\quad ")}`,
        `(${rs[i0]}, ${COLS[j0]})`,
      ],
    };
  }
}

function iteratedPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const g = draw(r, 3, 3);
    const { rows, cols, removed } = iterated(g);
    if (rows.length !== 1 || cols.length !== 1) continue;
    // one strategy is dominated at the start, and the rest only once it is gone
    const firstRows = iterated({ a: g.a, b: g.b.map((row) => row.map(() => 0)) }).removed.length;
    const firstCols = iterated({ a: g.a.map((row) => row.map(() => 0)), b: g.b }).removed.length;
    if (firstRows > 1 || firstCols > 1) continue;
    const idx = (i: number, j: number) => i * 3 + j;
    const total = argmax(sum(g)) ?? -1;
    const ownBest = argmax(g.a.flat()) ?? -1;
    let leftRows = [0, 1, 2];
    let leftCols = [0, 1, 2];
    const steps = removed.map(({ who, out, by }) => {
      const u = (k: number) => (who === 0 ? leftCols.map((j) => g.a[k][j]) : leftRows.map((i) => g.b[i][k]));
      const name = who === 0 ? ROWS : COLS;
      const tup = (xs: number[]) => (xs.length === 1 ? `${xs[0]}` : `(${xs.join(", ")})`);
      const s = `${name[out]} < ${name[by]}: ${tup(u(out))} < ${tup(u(by))}`;
      if (who === 0) leftRows = leftRows.filter((i) => i !== out);
      else leftCols = leftCols.filter((j) => j !== out);
      return s;
    });
    return {
      prompt: w.gt.prompt.iterated,
      q: gameTex(g),
      ...pickOf(cells(g), idx(rows[0], cols[0]), named([["nashBestSum", total], ["nashOwnBest", ownBest]])),
      steps: [...steps, `(${ROWS[rows[0]]}, ${COLS[cols[0]]})`],
    };
  }
}

const gen: Gen = (r, L, w) => {
  if (L === 1) return bestPart(r, w);
  if (L === 2) return nashPart(r, w);
  return iteratedPart(r, w);
};

export default gen;
