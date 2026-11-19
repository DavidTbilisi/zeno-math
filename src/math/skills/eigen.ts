// Practice: Eigenvalues and eigenvectors.
import { fill } from "../chart";
import { det, gaussJordan, type Mat, mul, texM } from "../matrix";
import type { SpaceSpec } from "../vectorspace";
import { colTex, fr, gcd, M, plainFrac, polyStr } from "../practiceKit";
import type { Exercise, Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // A = PDP⁻¹ with P made of shears (det 1), so A, P⁻¹ and the eigenvalues are whole numbers.
  const unit = (n: number) => M(Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))));
  const shears = (n: number) => {
    for (;;) {
      let P = unit(n);
      for (let s = 0; s <= n; s++) {
        const [i, j] = [r.int(0, n - 1), r.int(0, n - 1)];
        if (i === j) continue;
        const E = unit(n);
        E[i][j] = fr(r.nz(-2, 2));
        P = mul(P, E);
      }
      if (P.flat().filter((x) => !x.isZero()).length > n && P.flat().every((x) => Math.abs(x.n) <= 4)) return P;
    }
  };
  const inverse = (P: Mat) => gaussJordan(P.map((row, i) => [...row, ...unit(P.length)[i]]), P.length).result.map((row) => row.slice(P.length));
  const make = (n: number) => {
    for (;;) {
      const P = shears(n);
      const ls: number[] = [];
      while (ls.length < n) {
        const l = r.int(-4, 6);
        if (!ls.includes(l) && (n === 2 || l !== 0)) ls.push(l);
      }
      const D = M(ls.map((l, i) => ls.map((_, j) => (i === j ? l : 0))));
      const A = mul(mul(P, D), inverse(P));
      // Not triangular, so the eigenvalues can't be read off the diagonal; in 2D neither corner is 0.
      const above = A.some((row, i) => row.some((x, j) => j > i && !x.isZero()));
      const below = A.some((row, i) => row.some((x, j) => j < i && !x.isZero()));
      const corners = n === 3 ? A.flat().filter((x) => x.isZero()).length <= 2 : !A[0][1].isZero() && !A[1][0].isZero();
      if (above && below && corners && A.flat().every((x) => Math.abs(x.n) <= (n === 2 ? 12 : 15))) return { A, P, ls };
    }
  };
  const eigenOf = (A: Mat): Exercise["solution"] => ({ kind: "matrix", spec: { type: "space", op: "eigen", A: A.map((row) => row.map(plainFrac)), w: A.map(() => "0"), steps: true } satisfies SpaceSpec });
  if (L === 1) {
    const { A, ls } = make(2);
    return { prompt: w.prompts.eigValues, q: `A = ${texM(A)}`, answer: { k: "set", vs: ls, tol: 1e-9 }, show: `\\lambda = ${ls.join(", \\; ")}`, plain: ls.join("; "), format: "roots", solution: eigenOf(A) };
  }
  if (L === 2) {
    const { A, P, ls } = make(2);
    const i = r.int(0, 1);
    // P's column i, as short as it goes and with its first non-zero component positive.
    const v = P.map((row) => row[i].n);
    const g = gcd(v[0], v[1]) * Math.sign(v.find((x) => x !== 0)!);
    const u = v.map((x) => x / g || 0);
    return { prompt: fill(w.prompts.eigVector, { l: ls[i] }), q: `A = ${texM(A)}`, answer: { k: "dir", vs: u }, show: colTex(u.map(String)), plain: `(${u.join("; ")})`, format: "eigvec", solution: eigenOf(A) };
  }
  // Given one eigenvalue, the other two from the trace (their sum) and the determinant (their product).
  const { A, ls } = make(3);
  const tr = A.reduce((s, row, i) => s + row[i].n, 0);
  const [l1, rest] = [ls[0], ls.slice(1).sort((a, b) => a - b)];
  const [sum, prod] = [tr - l1, det(A).n / l1];
  return {
    prompt: fill(w.prompts.eigRest, { l: l1 }),
    q: `A = ${texM(A)}`,
    answer: { k: "set", vs: rest, tol: 1e-9 },
    show: `\\lambda = ${rest.join(", \\; ")}`,
    plain: rest.join("; "),
    format: "roots",
    steps: [
      `\\operatorname{tr} A = ${tr} = ${l1} + \\lambda_2 + \\lambda_3 \\;\\Rightarrow\\; \\lambda_2 + \\lambda_3 = ${sum}`,
      `\\det A = ${det(A).n} = ${l1 < 0 ? `(${l1})` : l1}\\,\\lambda_2 \\lambda_3 \\;\\Rightarrow\\; \\lambda_2 \\lambda_3 = ${prod}`,
      `${polyStr([prod, -sum, 1], "t")} = 0 \\;\\Rightarrow\\; t = ${rest.join(", \\; ")}`,
    ],
  };
};

export default gen;
