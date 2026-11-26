// Practice: χ² tests. Easy finds an expected count under independence (N over the number of cells, named) or the
// degrees of freedom (k for k − 1, rc − 1 for (r − 1)(c − 1), named); medium the goodness-of-fit statistic; hard the
// statistic of a test of independence (divided by O, not divided, every expected count N / rc, named). #742 adds, on
// half the seeds: an expected count from a claimed split and the conditions on the expected counts (L1); the P-value
// of a goodness-of-fit statistic and a conclusion about a die (L2); the P-value of a test of independence and, in a
// new setting, a conclusion about age group and favourite phone brand (L3).
import { chiSf } from "../distributions";
import { numPart, tf } from "../partKit";
import { conclusion } from "./hypothesis";
import { wholeOf } from "../realAnalysis";
import { dp3Of } from "../probTheory";
import { chiSquare, countTableTex, expectedTable, F } from "../mathStats";
import { fill } from "../text";
import { dp } from "../practiceKit";
import type { Frac } from "../fraction";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";

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
  // A table whose statistic divided by O comes within rounding of the right one is drawn again: the slip would pass.
  let g: ReturnType<typeof gof>;
  let c: ReturnType<typeof chiSquare>;
  do {
    g = gof(r);
    c = chiSquare(g.obs, g.exp);
  } while (Math.abs(c.byObserved.toNumber() - c.stat.toNumber()) < 0.06 * c.stat.toNumber());
  const { obs, ps, exp } = g;
  const n = obs.reduce((a, b) => a + b, 0);
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

/** The sweets' claimed split, in percent: the last colour's share is small, for the conditions. */
const SPLIT = [50, 30, 15, 5];

function more(r: Rng, L: 1 | 2 | 3, w: PracticeWords): Part {
  const K = w.chK;
  if (L === 1) {
    if (r.next() < 0.5) {
      const shares = r.pick([[50, 30, 20], [40, 35, 25], [25, 25, 50]]);
      const n = r.pick([60, 80, 120, 140, 160, 200]);
      const i = r.int(0, 2);
      const s = shares[i];
      const v = (n * s) / 100;
      const vars = { n, s, v };
      return numPart(fill(K.expQ, { n, a: shares[0], b: shares[1], c: shares[2], col: [K.red, K.green, K.yellow][i] }), v,
        [tf("expectedAsShare", s, vars), tf("expectedEqualSplit", n / 3, vars, 0.006)], [`E = n p = ${n} \\times ${s / 100} = ${v}`]);
    }
    const low = r.next() < 0.5;
    const n = low ? r.pick([40, 60, 80]) : r.pick([120, 140, 160, 200]);
    const exp = SPLIT.map((p) => (n * p) / 100);
    let obs: number[];
    do {
      obs = exp.map((e) => e + r.int(-4, 4));
      obs[3] = low ? r.int(5, 8) : r.int(2, 4);
      obs[2] = n - obs[0] - obs[1] - obs[3];
    } while (obs[2] < 5);
    const e = exp.join(", ");
    const right = low ? 1 : 0;
    const traps: { id: Trap["id"]; at: number; vars: Record<string, string | number> }[] = low
      ? [{ id: "chiConditionsMissed", at: 0, vars: { e, low: exp[3] } }, { id: "observedCountChecked", at: 2, vars: { e } }]
      : [{ id: "observedCountChecked", at: 1, vars: { e } }, { id: "observedCountChecked", at: 2, vars: { e } }];
    const options = [K.condMet, K.condExpLow, K.condObsLow];
    const tex = `\\begin{array}{c|cccc} & ${[K.red, K.green, K.yellow, K.blue].map((c) => `\\text{${c}}`).join(" & ")} \\\\ \\hline O & ${obs.join(" & ")} \\\\ E & ${exp.join(" & ")} \\end{array}`;
    const order = [0, 1, 2].sort(() => r.next() - 0.5);
    const opts = order.map((k) => ({ text: options[k], plain: options[k], tex: `\\text{${options[k]}}` }));
    const at = (k: number) => order.indexOf(k);
    return {
      prompt: K.condQ, q: tex,
      answer: { k: "pick", options: opts, right: at(right), traps: traps.map((t) => ({ id: t.id, a: { k: "pick", options: opts, right: at(t.at) }, vars: t.vars })) },
      show: opts[at(right)].tex, plain: options[right], format: "pick", steps: [`E: ${e}`],
    };
  }
  if (L === 2) {
    if (r.next() < 0.5) return conclusion(r, w, K.ctxDie, K.claimDie, K.nullDie, { flipped: "chiDecisionFlipped", accepted: "chiNullAccepted" });
    const k = r.int(3, 6);
    const x = r.int(150, 1600) / 100;
    const P = chiSf(x, k - 1);
    const vars = { k, df: k - 1, x, v: dp(P, 3) };
    return numPart(fill(K.gofPQ, { k, x }), P, [tf("dfCategories", chiSf(x, k), vars, 0.0006), tf("chiLowerTail", 1 - P, vars, 0.0006)],
      [`\\mathrm{df} = ${k} - 1 = ${k - 1}`, `P = P(\\chi^2_{${k - 1}} > ${x}) \\approx ${dp(P, 3)}`], 0.0006);
  }
  if (r.next() < 0.5) return conclusion(r, w, K.ctxPhone, K.claimPhone, K.nullPhone, { flipped: "chiDecisionFlipped", accepted: "chiNullAccepted" });
  const [rows, cols] = r.pick([[2, 2], [2, 3], [3, 3], [2, 4], [3, 4]]);
  const df = (rows - 1) * (cols - 1);
  const x = r.int(150, 1800) / 100;
  const P = chiSf(x, df);
  const vars = { df, x, v: dp(P, 3) };
  return numPart(fill(K.indepPQ, { r: rows, c: cols, x }), P, [tf("dfCellsMinusOne", chiSf(x, rows * cols - 1), vars, 0.0006), tf("chiLowerTail", 1 - P, vars, 0.0006)],
    [`\\mathrm{df} = (${rows} - 1)(${cols} - 1) = ${df}`, `P = P(\\chi^2_{${df}} > ${x}) \\approx ${dp(P, 3)}`], 0.0006);
}

const gen: Gen = (r, L, w) => (r.int(0, 9) >= 5 ? more(r, L, w) : L === 1 ? easyPart(r, w) : L === 2 ? gofPart(r, w) : independencePart(r, w));

export default gen;
