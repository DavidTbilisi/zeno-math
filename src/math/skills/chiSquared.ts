// Practice: χ² tests. Easy finds an expected count under independence (N over the number of cells, named) or the
// degrees of freedom (k for k − 1, rc − 1 for (r − 1)(c − 1), named); medium the goodness-of-fit statistic; hard the
// statistic of a test of independence (divided by O, not divided, every expected count N / rc, named).
import { wholeOf } from "../realAnalysis";
import { dp3Of } from "../probTheory";
import { chiSquare, countTableTex, expectedTable, F } from "../mathStats";
import { fill } from "../text";
import type { Frac } from "../fraction";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const ROWS = ["A", "B", "C"];
const COLS = ["1", "2", "3", "4"];

function table(r: Rng, rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => r.int(5, 40)));
}

/** A goodness-of-fit table: observed counts and the hypothesised shares. */
function gofTex(obs: number[], ps: Frac[]): string {
  return `\\begin{array}{c|${"c".repeat(obs.length)}} & ${obs.map((_, i) => COLS[i]).join(" & ")} \\\\ \\hline O & ${obs.join(" & ")} \\\\ p_0 & ${ps.map((p) => p.tex()).join(" & ")} \\end{array}`;
}

const SHARES: [number, number][][] = [
  [[1, 3], [1, 3], [1, 3]],
  [[1, 2], [1, 4], [1, 4]],
  [[1, 4], [1, 4], [1, 4], [1, 4]],
  [[1, 5], [2, 5], [2, 5]],
  [[1, 2], [3, 10], [1, 5]],
  [[1, 10], [2, 5], [1, 2]],
];

function gof(r: Rng): { obs: number[]; ps: Frac[]; exp: Frac[] } {
  const ps = r.pick(SHARES).map(([a, b]) => F(a, b));
  const n = 60 * r.int(1, 3);
  const exp = ps.map((p) => p.mul(F(n)));
  let obs: number[];
  do {
    obs = exp.map((e) => Math.max(1, e.toNumber() + r.int(-8, 8)));
    const diff = n - obs.reduce((a, b) => a + b, 0);
    obs[obs.length - 1] += diff;
  } while (obs[obs.length - 1] < 1 || obs.every((o, i) => o === exp[i].toNumber()));
  return { obs, ps, exp };
}

function easyPart(r: Rng, w: PracticeWords): Part {
  const kind = r.int(0, 2);
  if (kind === 0) {
    const rows = 2;
    const cols = r.int(2, 3);
    const t = table(r, rows, cols);
    const i = r.int(0, rows - 1);
    const j = r.int(0, cols - 1);
    const e = expectedTable(t)[i][j];
    const rowSum = t[i].reduce((a, b) => a + b, 0);
    const colSum = t.reduce((s, row) => s + row[j], 0);
    const n = t.flat().reduce((a, b) => a + b, 0);
    return {
      prompt: fill(w.st.prompt.expectedCell, { r: ROWS[i], c: COLS[j] }),
      q: countTableTex(t, ROWS.slice(0, rows), COLS.slice(0, cols)),
      ...dp3Of(e.toNumber(), `E_{${ROWS[i]}${COLS[j]}}`, [["expectedUniform", F(n, rows * cols)]]),
      steps: [`E_{${ROWS[i]}${COLS[j]}} = \\frac{${rowSum} \\cdot ${colSum}}{${n}} = ${e.tex()}`],
    };
  }
  if (kind === 1) {
    const { obs, ps } = gof(r);
    const k = obs.length;
    return { prompt: w.st.prompt.df, q: gofTex(obs, ps), ...wholeOf(k - 1, [["dfCategories", k]]), steps: [`\\mathrm{df} = k - 1 = ${k} - 1 = ${k - 1}`] };
  }
  const rows = r.int(2, 3);
  const cols = r.int(2, 4);
  const t = table(r, rows, cols);
  const df = (rows - 1) * (cols - 1);
  return {
    prompt: w.st.prompt.df,
    q: countTableTex(t, ROWS.slice(0, rows), COLS.slice(0, cols)),
    ...wholeOf(df, [["dfCellsMinusOne", rows * cols - 1]]),
    steps: [`\\mathrm{df} = (r - 1)(c - 1) = ${rows - 1} \\cdot ${cols - 1} = ${df}`],
  };
}

const terms = (obs: number[], exp: Frac[]) => obs.map((o, i) => `\\frac{(${o} - ${exp[i].tex()})^{2}}{${exp[i].tex()}}`).join(" + ");

function gofPart(r: Rng, w: PracticeWords): Part {
  const { obs, ps, exp } = gof(r);
  const n = obs.reduce((a, b) => a + b, 0);
  const c = chiSquare(obs, exp);
  return {
    prompt: w.st.prompt.chiStat,
    q: gofTex(obs, ps),
    ...dp3Of(c.stat.toNumber(), "\\chi^{2}", [["chiSquaredByObserved", c.byObserved], ["chiSquaredNotDivided", c.undivided]]),
    steps: [`E_i = n p_i = ${n} p_i: \\; ${exp.map((e) => e.tex()).join(", \\; ")}`, `\\chi^{2} = ${terms(obs, exp)} \\approx ${c.stat.toNumber().toFixed(4)}`],
  };
}

function independencePart(r: Rng, w: PracticeWords): Part {
  const cols = r.int(2, 3);
  const t = table(r, 2, cols);
  const exp = expectedTable(t);
  const obs = t.flat();
  const e = exp.flat();
  const n = obs.reduce((a, b) => a + b, 0);
  const c = chiSquare(obs, e);
  const flat = chiSquare(obs, obs.map(() => F(n, obs.length)));
  return {
    prompt: w.st.prompt.chiStat,
    q: countTableTex(t, ROWS.slice(0, 2), COLS.slice(0, cols)),
    ...dp3Of(c.stat.toNumber(), "\\chi^{2}", [["chiSquaredByObserved", c.byObserved], ["chiSquaredNotDivided", c.undivided], ["expectedUniform", flat.stat]]),
    steps: [`E_{ij} = \\frac{R_i C_j}{N}: \\; ${exp.map((row) => row.map((x) => x.tex()).join(", \\; ")).join("; \\; ")}`, `\\chi^{2} = ${terms(obs, e)} \\approx ${c.stat.toNumber().toFixed(4)}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? easyPart(r, w) : L === 2 ? gofPart(r, w) : independencePart(r, w));

export default gen;
