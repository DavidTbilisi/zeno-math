// Practice: Systems and rank.
import { det, env, gaussJordan, texM } from "../matrix";
import type { SpaceSpec } from "../vectorspace";
import { ints, M, matCalc, num, polyStr } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const V = ["x", "y", "z"];
  /** 2x - y + 3z, with a coefficient written k where it is k. */
  const lhs = (row: (number | "k")[]) => {
    let out = "";
    row.forEach((c, j) => {
      if (c === 0) return;
      const neg = c !== "k" && c < 0;
      const body = c === "k" ? `k${V[j]}` : `${Math.abs(c) === 1 ? "" : Math.abs(c)}${V[j]}`;
      out += out ? (neg ? ` - ${body}` : ` + ${body}`) : neg ? `-${body}` : body;
    });
    return out || "0";
  };
  const system = (A: (number | "k")[][], b: number[]) => `\\begin{aligned} ${A.map((row, i) => `${lhs(row)} &= ${b[i]}`).join(" \\\\ ")} \\end{aligned}`;
  if (L === 1) {
    let A: number[][];
    do A = ints(r, 3, 3, -3, 4);
    while (det(M(A)).isZero() || A.some((row) => row.filter(Boolean).length < 2));
    const x = Array.from({ length: 3 }, () => r.int(-4, 5));
    const b = A.map((row) => row.reduce((s, c, j) => s + c * x[j], 0));
    return {
      prompt: w.prompts.elimSolve,
      q: system(A, b),
      answer: { k: "tuple", vs: x, tol: 1e-9 },
      show: `x = ${x[0]}, \\; y = ${x[1]}, \\; z = ${x[2]}`,
      plain: `x = ${x[0]}; y = ${x[1]}; z = ${x[2]}`,
      format: "xyz",
      solution: matCalc("solve", A.map((row, i) => [...row, b[i]])),
    };
  }
  if (L === 2) {
    // Rank k: a 3 × k matrix times a k × 4 one, kept only when the rank really is k.
    const k = r.pick([1, 2, 2, 3] as const);
    let A: number[][];
    do {
      const [P, Q] = [ints(r, 3, k, -3, 3), ints(r, k, 4, -2, 3)];
      A = P.map((row) => Q[0].map((_, j) => row.reduce((s, x, i) => s + x * Q[i][j], 0)));
    } while (
      gaussJordan(M(A), 4).pivots.length !== k ||
      // No row or column of zeros, and few zeros at all: the rank has to be worked out, not seen.
      A.some((row) => row.every((x) => x === 0)) ||
      A[0].some((_, j) => A.every((row) => row[j] === 0)) ||
      A.flat().filter((x) => x === 0).length > 2 ||
      A.some((row, i) => A.some((other, j) => j > i && (row.every((x, c) => x === other[c]) || row.every((x, c) => x === -other[c])))) ||
      A.flat().some((x) => Math.abs(x) > 12)
    );
    const spec: SpaceSpec = { type: "space", op: "subspaces", A: A.map((row) => row.map(String)), w: ["0", "0", "0"], steps: true };
    return { prompt: w.prompts.elimRank, q: texM(M(A)), answer: num(k), show: String(k), plain: String(k), format: "number", solution: { kind: "matrix", spec } };
  }
  // One coefficient is k: det A = αk + β (α its cofactor), so the solution stops being unique only at k = −β/α.
  let A: number[][], at: [number, number], alpha: number, beta: number;
  do {
    A = ints(r, 3, 3, -3, 4);
    at = [r.int(0, 2), r.int(0, 2)];
    A[at[0]][at[1]] = 0;
    beta = det(M(A)).n;
    A[at[0]][at[1]] = 1;
    alpha = det(M(A)).n - beta;
  } while (alpha === 0 || beta === 0 || beta % alpha !== 0 || A.some((row) => row.filter(Boolean).length < 2));
  const kv = -beta / alpha;
  const shown: (number | "k")[][] = A.map((row, i) => row.map((c, j) => (i === at[0] && j === at[1] ? "k" : c)));
  const b = Array.from({ length: 3 }, () => r.int(-6, 9));
  return {
    prompt: w.prompts.elimK,
    q: system(shown, b),
    answer: num(kv),
    show: `k = ${kv}`,
    plain: String(kv),
    format: "number",
    steps: [
      `\\det A = ${env(shown.map((row) => row.map(String)), "vmatrix")} = ${polyStr([beta, alpha], "k")}`,
      `\\det A = 0 \\;\\Rightarrow\\; k = ${kv}`,
    ],
  };
};

export default gen;
