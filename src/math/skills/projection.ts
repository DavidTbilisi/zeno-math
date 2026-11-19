// Practice: Projections.
import { fill } from "../chart";
import { colTex, fr, gcd, num, plainFrac } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const vs = (v: number[]) => `(${v.join(", ")})`;
  const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
  const nonzero = (n: number, lo: number, hi: number) => {
    for (;;) {
      const v = Array.from({ length: n }, () => r.int(lo, hi));
      if (v.filter(Boolean).length >= 2) return v;
    }
  };
  if (L === 1) {
    // b of whole length, so a·b / |b| is a fraction; turned and signed so it looks different every time.
    const [b0, len] = r.pick([[[3, 4, 0], 5], [[1, 2, 2], 3], [[2, 3, 6], 7], [[2, 6, 9], 11], [[4, 4, 7], 9], [[1, 4, 8], 9], [[2, 1, 2], 3], [[6, 8, 0], 10]] as const);
    const perm = r.pick([[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]] as const);
    const b = perm.map((j) => r.sign() * b0[j] || 0);
    let a: number[];
    do a = nonzero(3, -6, 6);
    while (dot(a, b) === 0);
    const v = fr(dot(a, b), len);
    return {
      prompt: fill(w.prompts.projScalar, { a: vs(a), b: vs(b) }),
      q: "",
      answer: num(v.toNumber(), 1e-9, { lowest: true }),
      show: v.tex(),
      plain: plainFrac(v),
      format: "fraction",
      solution: { kind: "vectors", spec: { topic: "dot", src: `a = ${vs(a)}; b = ${vs(b)}` } },
    };
  }
  if (L === 2) {
    const n = r.pick([2, 3] as const);
    let a: number[], b: number[];
    do [a, b] = [nonzero(n, -6, 6), nonzero(n, -4, 4)];
    while (dot(a, b) === 0 || a.every((x, i) => x * b[0] === b[i] * a[0]));
    const k = fr(dot(a, b), dot(b, b));
    const p = b.map((x) => k.mul(fr(x)));
    return {
      prompt: fill(w.prompts.projVector, { a: vs(a), b: vs(b) }),
      q: "",
      answer: { k: "tuple", vs: p.map((x) => x.toNumber()), tol: 1e-9 },
      show: colTex(p.map((x) => x.tex())),
      plain: `(${p.map(plainFrac).join("; ")})`,
      format: "vector",
      solution: { kind: "vectors", spec: { topic: "dot", src: `a = ${vs(a)}; b = ${vs(b)}` } },
    };
  }
  // The foot F = A + t₀d, and P = F + m with m ⟂ d (d × e, made as short as it can be).
  let d: number[], m: number[];
  do {
    d = nonzero(3, -3, 3);
    const gd = d.reduce((s, x) => gcd(s, x), 0);
    d = d.map((x) => x / gd);
    const e = nonzero(3, -2, 2);
    m = [d[1] * e[2] - d[2] * e[1], d[2] * e[0] - d[0] * e[2], d[0] * e[1] - d[1] * e[0]];
    const g = m.reduce((s, x) => gcd(s, x), 0);
    if (g) m = m.map((x) => x / g);
  } while (m.every((x) => x === 0));
  const A = Array.from({ length: 3 }, () => r.int(-4, 4));
  const t0 = r.nz(-2, 2);
  const F = A.map((x, i) => x + t0 * d[i]);
  const s = r.pick([1, 2] as const);
  const P = F.map((x, i) => x + s * m[i]);
  return {
    prompt: fill(w.prompts.projFoot, { p: `P${vs(P)}` }),
    q: `\\mathbf{r} = ${colTex(A.map(String))} + t ${colTex(d.map(String))}`,
    answer: { k: "tuple", vs: F, tol: 1e-9 },
    show: `\\left(${F.join(", ")}\\right)`,
    plain: `(${F.join("; ")})`,
    format: "xyz",
    solution: { kind: "vectors", spec: { topic: "lines", src: `r = ${vs(A)} + t${vs(d)}; P${vs(P)}` } },
  };
};

export default gen;
