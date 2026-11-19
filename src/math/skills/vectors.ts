// Practice: Vectors.
import { fill } from "../chart";
import { sqrtSplit } from "../expr";
import { dp, fr, num, plainFrac, surdTex } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const vec = (n: number, lo: number, hi: number) => Array.from({ length: n }, () => r.int(lo, hi));
  const vs = (v: (number | string)[]) => `(${v.join(", ")})`;
  const col = (v: number[]) => `\\begin{pmatrix} ${v.join(" \\\\ ")} \\end{pmatrix}`;
  const sol = (topic: string, src: string) => ({ kind: "vectors" as const, spec: { topic, src } });
  if (L === 1) {
    const [a, b] = [vec(2, -6, 6), vec(2, -6, 6)];
    const [p, q] = [r.pick([1, 2, 3, -2] as const), r.pick([1, 2, 3, -1, -2, -3] as const)];
    const res = a.map((x, i) => p * x + q * b[i]);
    const k = (c: number, first: boolean) => (Math.abs(c) === 1 ? (c < 0 && first ? "-" : "") : String(first ? c : Math.abs(c)));
    const e = `${k(p, true)}a ${q < 0 ? "-" : "+"} ${k(q, false)}b`;
    return {
      prompt: fill(w.prompts.vecCombo, { a: vs(a), b: vs(b) }),
      q: e.replace(/([ab])/g, "\\mathbf{$1}"),
      answer: { k: "tuple", vs: res, tol: 1e-9 },
      show: col(res),
      plain: `(${res.join("; ")})`,
      format: "vector",
      solution: sol("basics", `a = ${vs(a)}; b = ${vs(b)}; ${e}`),
    };
  }
  if (L === 2) {
    const A = vec(3, -5, 5);
    let d: number[];
    do d = vec(3, -6, 6);
    while (d.filter(Boolean).length < 2);
    const B = A.map((x, i) => x + d[i]);
    const d2 = d.reduce((s, x) => s + x * x, 0);
    const { out, s } = sqrtSplit(fr(d2));
    const v = Math.sqrt(d2);
    return {
      prompt: fill(w.prompts.vecLength, { a: `A${vs(A)}`, b: `B${vs(B)}` }),
      q: "",
      answer: num(v, 1e-9, { surd: true }),
      show: s === 1 ? String(out.n) : `${surdTex(fr(0), out, s)} \\approx ${dp(v, 2)}`,
      plain: s === 1 ? String(out.n) : `${out.n === 1 ? "" : out.n}sqrt(${s})`,
      format: "exact",
      solution: sol("basics", `A${vs(A)}; B${vs(B)}`),
    };
  }
  // a = (k, p, q), b = (m, k, n) are perpendicular when k·m + p·k + q·n = 0.
  let p: number, q: number, m: number, n: number;
  do [p, q, m, n] = [r.nz(-5, 5), r.nz(-5, 5), r.nz(-5, 5), r.nz(-5, 5)];
  while (m + p === 0);
  const kv = fr(-q * n, m + p);
  const at = (v: (number | string)[]) => v.map((x) => (x === "k" ? `${kv.n}/${kv.d}` : x));
  return {
    prompt: fill(w.prompts.vecPerp, { a: vs(["k", p, q]), b: vs([m, "k", n]) }),
    q: "",
    answer: num(kv.toNumber(), 1e-9, { lowest: true }),
    show: kv.tex(),
    plain: plainFrac(kv),
    format: "fraction",
    solution: sol("dot", `a = ${vs(at(["k", p, q]))}; b = ${vs(at([m, "k", n]))}`),
  };
};

export default gen;
