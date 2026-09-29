// Matrix operations that produce LaTeX with worked steps (exact fractions throughout).
import { Frac } from "./fraction";

export type Mat = Frac[][];
export type MatrixOp = "add" | "sub" | "mul" | "scalar" | "transpose" | "det" | "inverse" | "solve";
export const MATRIX_OPS: MatrixOp[] = ["add", "sub", "mul", "scalar", "transpose", "det", "inverse", "solve"];
export const OP_LABELS: Record<MatrixOp, string> = {
  add: "A + B",
  sub: "A − B",
  mul: "A · B",
  scalar: "k · A",
  transpose: "Aᵀ",
  det: "det A",
  inverse: "A⁻¹",
  solve: "Ax = b",
};

export type MatrixCalcSpec = {
  type: "calc";
  op: MatrixOp;
  A: string[][];
  B: string[][];
  k: string;
  steps: boolean;
};

/** Errors carry an i18n key so the dialog can show a translated message. */
export type MatrixErrorKey = "empty" | "invalid" | "sameSize" | "mulSize" | "square" | "solveSize";
export class MatrixError extends Error {
  key: MatrixErrorKey;
  constructor(key: MatrixErrorKey) {
    super(key);
    this.key = key;
  }
}

export const needsB = (op: MatrixOp) => op === "add" || op === "sub" || op === "mul";

export function parseMatrix(cells: string[][]): Mat {
  return cells.map((row) =>
    row.map((c) => {
      if (!c.trim()) throw new MatrixError("empty");
      const f = Frac.parse(c);
      if (!f) throw new MatrixError("invalid");
      return f;
    }),
  );
}

// ---------- LaTeX helpers ----------

const env = (rows: string[][], name = "pmatrix") =>
  `\\begin{${name}} ${rows.map((r) => r.join(" & ")).join(" \\\\ ")} \\end{${name}}`;
const texM = (m: Mat, name = "pmatrix") => env(m.map((r) => r.map((x) => x.tex())), name);
/** Augmented matrix with a bar before column `split`. */
const texAug = (m: Mat, split: number) => {
  const cols = m[0].length;
  const spec = "c".repeat(split) + (split < cols ? "|" + "c".repeat(cols - split) : "");
  return `\\left(\\begin{array}{${spec}} ${m.map((r) => r.map((x) => x.tex()).join(" & ")).join(" \\\\ ")} \\end{array}\\right)`;
};
const lines = (ls: string[]) => `\\begin{aligned} ${ls.join(" \\\\[4pt] ")} \\end{aligned}`;

// ---------- Arithmetic ----------

const map2 = (a: Mat, b: Mat, f: (x: Frac, y: Frac) => Frac) => a.map((r, i) => r.map((x, j) => f(x, b[i][j])));

function mul(a: Mat, b: Mat): Mat {
  return a.map((row) => b[0].map((_, j) => row.reduce((s, x, k) => s.add(x.mul(b[k][j])), Frac.ZERO)));
}

function minor(m: Mat, i: number, j: number): Mat {
  return m.filter((_, r) => r !== i).map((row) => row.filter((_, c) => c !== j));
}

export function det(m: Mat): Frac {
  const n = m.length;
  if (n === 1) return m[0][0];
  if (n === 2) return m[0][0].mul(m[1][1]).sub(m[0][1].mul(m[1][0]));
  return m[0].reduce((s, x, j) => {
    const term = x.mul(det(minor(m, 0, j)));
    return j % 2 ? s.sub(term) : s.add(term);
  }, Frac.ZERO);
}

type GJStep = { ops: string[]; m: Mat };

/** Gauss–Jordan elimination on the first `cols` columns, recording grouped row operations. */
function gaussJordan(start: Mat, cols: number): { steps: GJStep[]; result: Mat; pivots: number[] } {
  let m = start.map((r) => [...r]);
  const steps: GJStep[] = [];
  const pivots: number[] = [];
  const R = (i: number) => `R_{${i + 1}}`;
  let r = 0;
  for (let c = 0; c < cols && r < m.length; c++) {
    const p = m.findIndex((row, i) => i >= r && !row[c].isZero());
    if (p < 0) continue;
    if (p !== r) {
      [m[p], m[r]] = [m[r], m[p]];
      steps.push({ ops: [`${R(r)} \\leftrightarrow ${R(p)}`], m: m.map((x) => [...x]) });
    }
    const pivot = m[r][c];
    if (!pivot.isOne()) {
      const k = Frac.ONE.div(pivot);
      m[r] = m[r].map((x) => x.mul(k));
      steps.push({ ops: [`${R(r)} \\to ${k.isInt() ? (k.n === -1 ? "-" : k.tex()) : k.texP()}\\,${R(r)}`], m: m.map((x) => [...x]) });
    }
    const ops: string[] = [];
    for (let i = 0; i < m.length; i++) {
      const f = m[i][c];
      if (i === r || f.isZero()) continue;
      const coef = f.abs().isOne() ? "" : f.abs().tex();
      ops.push(`${R(i)} \\to ${R(i)} ${f.isNeg() ? "+" : "-"} ${coef}${R(r)}`);
      m[i] = m[i].map((x, j) => x.sub(f.mul(m[r][j])));
    }
    if (ops.length) steps.push({ ops, m: m.map((x) => [...x]) });
    pivots.push(c);
    r++;
  }
  m = m.map((row) => row.map((x) => (x.isZero() ? Frac.ZERO : x)));
  return { steps, result: m, pivots };
}

function stepLines(start: Mat, steps: GJStep[], split: number): string[] {
  // Row operations sit right-aligned in the left column, next to a plain arrow
  // (stretchy \xrightarrow labels overlap their arrow in MathJax's standalone SVG).
  const arrow = "\\;\\longrightarrow\\;";
  return [
    `& \\phantom{${arrow}} ${texAug(start, split)}`,
    ...steps.map((s) => `{\\scriptstyle \\begin{gathered} ${s.ops.join(" \\\\ ")} \\end{gathered}} &${arrow} ${texAug(s.m, split)}`),
  ];
}

const VARS = ["x", "y", "z", "w"];
const PARAMS = ["t", "s", "u", "v"];

// ---------- Operations ----------

export function matrixLatex(spec: MatrixCalcSpec): string {
  const A = parseMatrix(spec.A);
  const B = needsB(spec.op) ? parseMatrix(spec.B) : [];
  const n = A.length;
  const square = A.every((r) => r.length === n);
  const steps = spec.steps;

  switch (spec.op) {
    case "add":
    case "sub": {
      if (A.length !== B.length || A[0].length !== B[0].length) throw new MatrixError("sameSize");
      const sign = spec.op === "add" ? "+" : "-";
      const res = map2(A, B, (x, y) => (spec.op === "add" ? x.add(y) : x.sub(y)));
      const out = [`A ${sign} B &= ${texM(A)} ${sign} ${texM(B)}`];
      if (steps) out.push(`&= ${env(A.map((r, i) => r.map((x, j) => `${x.tex()} ${sign} ${B[i][j].texP()}`)))}`);
      out.push(`&= ${texM(res)}`);
      return lines(out);
    }
    case "mul": {
      if (A[0].length !== B.length) throw new MatrixError("mulSize");
      const res = mul(A, B);
      const out = [`A \\cdot B &= ${texM(A)} ${texM(B)}`];
      if (steps && A[0].length <= 4 && res.length * res[0].length <= 16)
        out.push(`&= ${env(A.map((row) => B[0].map((_, j) => row.map((x, k) => `${x.texP()} \\cdot ${B[k][j].texP()}`).join(" + "))))}`);
      out.push(`&= ${texM(res)}`);
      return lines(out);
    }
    case "scalar": {
      const k = Frac.parse(spec.k);
      if (!k) throw new MatrixError("invalid");
      const out = [`${k.tex()} \\cdot A &= ${k.tex()} \\cdot ${texM(A)}`];
      if (steps) out.push(`&= ${env(A.map((r) => r.map((x) => `${k.texP()} \\cdot ${x.texP()}`)))}`);
      out.push(`&= ${texM(A.map((r) => r.map((x) => k.mul(x))))}`);
      return lines(out);
    }
    case "transpose":
      return `A^{T} = ${texM(A)}^{T} = ${texM(A[0].map((_, j) => A.map((r) => r[j])))}`;
    case "det": {
      if (!square) throw new MatrixError("square");
      const d = det(A);
      if (n === 1) return `\\det A = ${d.tex()}`;
      if (n === 2) {
        const [[a, b], [c, e]] = A;
        const out = [`\\det A &= ${texM(A, "vmatrix")}`];
        if (steps) out.push(`&= ${a.texP()} \\cdot ${e.texP()} - ${b.texP()} \\cdot ${c.texP()}`);
        out.push(`&= ${d.tex()}`);
        return lines(out);
      }
      // Cofactor expansion along the first row.
      const terms = A[0].map((x, j) => ({ x, sign: j % 2 ? "-" : "+", m: minor(A, 0, j) }));
      const join = (f: (t: (typeof terms)[number]) => string) =>
        terms.map((t, j) => `${j === 0 ? (t.sign === "-" ? "-" : "") : ` ${t.sign} `}${f(t)}`).join("");
      const out = [`\\det A &= ${texM(A, "vmatrix")}`];
      if (steps) {
        out.push(`&= ${join((t) => `${t.x.texP()} ${texM(t.m, "vmatrix")}`)}`);
        if (n === 3)
          out.push(`&= ${join((t) => `${t.x.texP()} \\left(${t.m[0][0].texP()} \\cdot ${t.m[1][1].texP()} - ${t.m[0][1].texP()} \\cdot ${t.m[1][0].texP()}\\right)`)}`);
        out.push(`&= ${join((t) => `${t.x.texP()} \\cdot ${det(t.m).texP()}`)}`);
      }
      out.push(`&= ${d.tex()}`);
      return lines(out);
    }
    case "inverse": {
      if (!square) throw new MatrixError("square");
      const d = det(A);
      if (d.isZero()) return `\\det A = 0 \\;\\Rightarrow\\; \\nexists\\, A^{-1}`;
      if (n === 1) return `A^{-1} = \\frac{1}{${A[0][0].tex()}} = ${Frac.ONE.div(A[0][0]).tex()}`;
      if (n === 2) {
        const [[a, b], [c, e]] = A;
        const adj: Mat = [[e, b.neg()], [c.neg(), a]];
        const inv = adj.map((r) => r.map((x) => x.div(d)));
        const out = [`\\det A &= ${a.texP()} \\cdot ${e.texP()} - ${b.texP()} \\cdot ${c.texP()} = ${d.tex()}`];
        out.push(`A^{-1} &= \\frac{1}{\\det A} ${env([["d", "-b"], ["-c", "a"]])}`);
        if (steps) out.push(`&= \\frac{1}{${d.tex()}} ${texM(adj)}`);
        out.push(`&= ${texM(inv)}`);
        return lines(out);
      }
      // Gauss–Jordan on [A | I].
      const aug = A.map((r, i) => [...r, ...r.map((_, j) => (i === j ? Frac.ONE : Frac.ZERO))]);
      const gj = gaussJordan(aug, n);
      const inv = gj.result.map((r) => r.slice(n));
      const out = steps ? stepLines(aug, gj.steps, n) : [];
      out.push(`A^{-1} &= ${texM(inv)}`);
      return lines(out);
    }
    case "solve": {
      // A is the augmented matrix [coefficients | b].
      const cols = A[0].length;
      if (cols < 2 || cols - 1 > VARS.length) throw new MatrixError("solveSize");
      const nv = cols - 1;
      const gj = gaussJordan(A, nv);
      const out = steps ? stepLines(A, gj.steps, nv) : [`& ${texAug(A, nv)} \\to ${texAug(gj.result, nv)}`];
      const m = gj.result;
      const inconsistent = m.some((row) => row.slice(0, nv).every((x) => x.isZero()) && !row[nv].isZero());
      if (inconsistent) {
        out.push(`& 0 = ${m.find((row) => row.slice(0, nv).every((x) => x.isZero()) && !row[nv].isZero())![nv].tex()} \\;\\Rightarrow\\; \\varnothing`);
        return lines(out);
      }
      // Free variables become parameters t, s, …
      const free = [...Array(nv).keys()].filter((c) => !gj.pivots.includes(c));
      const param = (c: number) => PARAMS[free.indexOf(c)];
      const values = [...Array(nv).keys()].map((c) => {
        if (free.includes(c)) return `${VARS[c]} = ${param(c)}`;
        const row = m[gj.pivots.indexOf(c)];
        let s = row[nv].isZero() && free.some((f) => !row[f].isZero()) ? "" : row[nv].tex();
        for (const f of free) {
          const coef = row[f].neg(); // move free terms to the right-hand side
          if (coef.isZero()) continue;
          const mag = coef.abs().isOne() ? "" : coef.abs().tex();
          s += s ? ` ${coef.isNeg() ? "-" : "+"} ${mag}${param(f)}` : `${coef.isNeg() ? "-" : ""}${mag}${param(f)}`;
        }
        return `${VARS[c]} = ${s || "0"}`;
      });
      out.push(`& ${values.join(",\\quad ")}${free.length ? `,\\quad ${free.map(param).join(", ")} \\in \\mathbb{R}` : ""}`);
      return lines(out);
    }
  }
}

export const DEFAULT_MATRIX: MatrixCalcSpec = {
  type: "calc",
  op: "mul",
  A: [["2", "1"], ["1", "3"]],
  B: [["1", "0"], ["4", "-1"]],
  k: "3",
  steps: true,
};
