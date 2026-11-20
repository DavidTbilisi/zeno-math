// Practice: the simplex method. Easy reads the first tableau of a maximisation: which variable enters (the smallest
// gain, named) or, given the entering one, which leaves by the ratio test (the largest ratio, a row with a negative
// coefficient, named); medium makes that pivot and finds the new z (b not divided by the pivot, the wrong row, named)
// or another row's new right-hand side (the pivot row not scaled, the multiple added, named); hard finds a shadow
// price, the dual solution of a two-variable LP whose optimum is where both constraints are tight (the system not
// transposed, the optimal z, named).
import { F, exact, pickOf, sym } from "../calculusTwo";
import type { Frac } from "../fraction";
import { drawLp, ratioRow, shadowPrices } from "../optimisation";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const SUB = "₀₁₂₃₄₅₆₇₈₉";
const name = (v: string, i: number) => sym(`${v}_{${i}}`, `${v}${SUB[i]}`);
const term = (k: number, v: string) => (k === 1 ? v : `${k}${v}`);

/** A simplex tableau: n decision variables and m slacks, the basis the slacks, the z row −c. */
function tableau(c: number[], rows: number[][], rhs: number[]) {
  const n = c.length;
  const m = rows.length;
  const heads = [...Array.from({ length: n }, (_, j) => `x_{${j + 1}}`), ...Array.from({ length: m }, (_, i) => `s_{${i + 1}}`)];
  const unit = (i: number) => Array.from({ length: m }, (_, k) => (k === i ? 1 : 0));
  const line = (head: string, xs: number[], b: number) => `${head} & ${xs.join(" & ")} & ${b}`;
  const body = rows.map((row, i) => line(`s_{${i + 1}}`, [...row, ...unit(i)], rhs[i]));
  const z = line("z", [...c.map((v) => -v), ...Array(m).fill(0)], 0);
  return `\\begin{array}{c|${"c".repeat(n + m)}|c} & ${heads.join(" & ")} & b \\\\ \\hline ${body.join(" \\\\ ")} \\\\ \\hline ${z} \\end{array}`;
}

function enteringPart(r: Rng, w: PracticeWords): Part {
  let c: number[];
  do c = [r.int(1, 9), r.int(1, 9), r.int(1, 9)];
  while (new Set(c).size < 3);
  const rows = [0, 1].map(() => [r.int(1, 4), r.int(1, 4), r.int(0, 4)]);
  const rhs = [r.int(4, 20), r.int(4, 20)];
  const right = c.indexOf(Math.max(...c));
  const options = [1, 2, 3].map((j) => name("x", j));
  return {
    prompt: w.opt.prompt.entering,
    q: tableau(c, rows, rhs),
    ...pickOf(options, right, [["enteringSmallestGain", c.indexOf(Math.min(...c))]]),
    steps: [`\\min(${c.map((v) => -v).join(", ")}) = ${-c[right]}`, `x_{${right + 1}}`],
  };
}

/** A tableau with two decision variables and three constraints, column e entering: one row negative there, two positive with different ratios. */
function drawPivot(r: Rng) {
  for (;;) {
    const e = r.int(0, 1);
    const c = [r.int(1, 6), r.int(1, 6)];
    if (c[e] <= c[1 - e]) continue;
    const col = r.pick([[-r.int(1, 3), r.int(1, 4), r.int(1, 4)], [r.int(1, 4), -r.int(1, 3), r.int(1, 4)], [r.int(1, 4), r.int(1, 4), -r.int(1, 3)]]);
    const rhs = [r.int(2, 18), r.int(2, 18), r.int(2, 18)];
    const pos = [0, 1, 2].filter((i) => col[i] > 0);
    if (rhs[pos[0]] * col[pos[1]] === rhs[pos[1]] * col[pos[0]]) continue;
    const rows = col.map((v) => (e === 0 ? [v, r.int(1, 4)] : [r.int(1, 4), v]));
    const row = ratioRow(col, rhs);
    const other = pos.find((i) => i !== row)!;
    const neg = col.findIndex((v) => v < 0);
    return { e, c, col, rhs, rows, row, other, neg, theta: F(rhs[row], col[row]) };
  }
}

const ratioSteps = (col: number[], rhs: number[]) =>
  col
    .map((a, i) => {
      if (a <= 0) return `s_{${i + 1}}: ${a} \\le 0`;
      const raw = `\\frac{${rhs[i]}}{${a}}`;
      const v = F(rhs[i], a).tex();
      return `s_{${i + 1}}: ${raw}${v === raw ? "" : ` = ${v}`}`;
    })
    .join(", \\quad ");

function leavingPart(r: Rng, w: PracticeWords): Part {
  const t = drawPivot(r);
  return {
    prompt: fill(w.opt.prompt.leaving, { v: `x${SUB[t.e + 1]}` }),
    q: tableau(t.c, t.rows, t.rhs),
    ...pickOf([1, 2, 3].map((i) => name("s", i)), t.row, [["ratioLargest", t.other], ["ratioNegativeIncluded", t.neg]]),
    steps: [ratioSteps(t.col, t.rhs), `s_{${t.row + 1}}`],
  };
}

function pivotZPart(r: Rng, w: PracticeWords): Part {
  const t = drawPivot(r);
  const ce = t.c[t.e];
  const z = F(ce).mul(t.theta);
  return {
    prompt: fill(w.opt.prompt.pivotZ, { v: `x${SUB[t.e + 1]}` }),
    q: tableau(t.c, t.rows, t.rhs),
    ...exact(z, [["pivotNotDivided", ce * t.rhs[t.row]], ["pivotWrongRow", F(ce * t.rhs[t.other], t.col[t.other])]]),
    steps: [ratioSteps(t.col, t.rhs), `x_{${t.e + 1}} = ${t.theta.tex()}`, `z = ${ce} \\cdot ${t.theta.tex()} = ${z.tex()}`],
  };
}

function pivotRowPart(r: Rng, w: PracticeWords): Part {
  const t = drawPivot(r);
  const k = r.pick([t.other, t.neg]);
  const a = t.col[k];
  const b: Frac = F(t.rhs[k]).sub(F(a).mul(t.theta));
  return {
    prompt: fill(w.opt.prompt.pivotRow, { v: `x${SUB[t.e + 1]}`, s: `s${SUB[k + 1]}` }),
    q: tableau(t.c, t.rows, t.rhs),
    ...exact(b, [["pivotRowNotScaled", t.rhs[k] - a * t.rhs[t.row]], ["pivotAddedNotSubtracted", F(t.rhs[k]).add(F(a).mul(t.theta))]]),
    steps: [ratioSteps(t.col, t.rhs), `x_{${t.e + 1}} = ${t.theta.tex()}`, `${t.rhs[k]} - ${F(a).texP()} \\cdot ${t.theta.tex()} = ${b.tex()}`],
  };
}

function shadowPart(r: Rng, w: PracticeWords): Part {
  const lp = drawLp(r);
  const i = r.int(0, 1);
  const y = shadowPrices(lp);
  const z = lp.p * lp.X + lp.q * lp.Y;
  const lhs = (a: number, b: number, u: string, v: string) => `${term(a, u)} + ${term(b, v)}`;
  return {
    prompt: fill(w.opt.prompt.shadowPrice, { i: i + 1, y: `y${SUB[i + 1]}` }),
    q: `\\max\\ z = ${lhs(lp.p, lp.q, "x", "y")}, \\quad ${lhs(lp.a1, lp.b1, "x", "y")} \\le ${lp.c1}, \\quad ${lhs(lp.a2, lp.b2, "x", "y")} \\le ${lp.c2}, \\quad x, y \\ge 0`,
    ...exact(y[i], [["dualNotTransposed", shadowPrices(lp, false)[i]], ["dualValueForPrice", z]]),
    steps: [
      `\\min\\ ${lhs(lp.c1, lp.c2, "y_{1}", "y_{2}")}, \\quad ${lhs(lp.a1, lp.a2, "y_{1}", "y_{2}")} \\ge ${lp.p}, \\quad ${lhs(lp.b1, lp.b2, "y_{1}", "y_{2}")} \\ge ${lp.q}`,
      `x = ${lp.X}, \\ y = ${lp.Y} > 0 \\implies ${lhs(lp.a1, lp.a2, "y_{1}", "y_{2}")} = ${lp.p}, \\quad ${lhs(lp.b1, lp.b2, "y_{1}", "y_{2}")} = ${lp.q}`,
      `y_{1} = ${y[0].tex()}, \\quad y_{2} = ${y[1].tex()}, \\quad ${lp.c1}y_{1} + ${lp.c2}y_{2} = ${z} = z_{\\max}`,
    ],
  };
}

const gen: Gen = (r, L, w) => {
  if (L === 1) return r.next() < 0.5 ? enteringPart(r, w) : leavingPart(r, w);
  if (L === 2) return r.next() < 0.5 ? pivotZPart(r, w) : pivotRowPart(r, w);
  return shadowPart(r, w);
};

export default gen;
