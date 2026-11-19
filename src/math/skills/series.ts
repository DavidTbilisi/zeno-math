// Practice: Series and sums.
import { fill } from "../chart";
import { fr, num, plainFrac, polyStr, T } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const sol = (topic: string, src: string) => ({ kind: "sequences" as const, spec: { topic, src } });
  const list = (vs: string[]) => `${vs.join(", ")}, …`.replace(/-/g, "−");
  if (L === 1) {
    const [a, d] = [r.int(-5, 15), r.nz(-3, 8)];
    const n = r.int(10, 30);
    const terms = [0, 1, 2, 3].map((i) => String(a + i * d));
    const v = (n * (2 * a + (n - 1) * d)) / 2;
    return { prompt: fill(w.prompts.serSum, { n, list: list(terms) }), q: "", answer: num(v), show: String(v), plain: String(v), format: "number", solution: sol("arith", `${terms.join(", ")}, …; S${n}`) };
  }
  if (L === 2) {
    if (r.next() < 0.5) {
      const [a, ratio, n] = [r.int(1, 5), r.pick([2, 3] as const), r.int(5, 8)];
      const terms = [0, 1, 2, 3].map((i) => String(a * ratio ** i));
      const v = (a * (ratio ** n - 1)) / (ratio - 1);
      return { prompt: fill(w.prompts.serSum, { n, list: list(terms) }), q: "", answer: num(v), show: String(v), plain: String(v), format: "number", solution: sol("geom", `${terms.join(", ")}, …; S${n}`) };
    }
    const [p, q] = r.pick([[1, 2], [1, 3], [2, 3], [-1, 2], [3, 4], [-1, 3], [-2, 3]] as const);
    const a = r.int(1, 3) * q ** 3;
    const terms = [0, 1, 2, 3].map((i) => (a * p ** i) / q ** i);
    const v = fr(a * q, q - p);
    return {
      prompt: fill(w.prompts.serInf, { list: list(terms.map(String)) }),
      q: "",
      answer: num(v.toNumber(), 1e-9, { lowest: true }),
      show: v.tex(),
      plain: plainFrac(v),
      format: "fraction",
      solution: sol("geom", `${terms.join(", ")}, …; S∞`),
    };
  }
  const N = r.int(10, 30);
  if (r.next() < 0.5) {
    // 1/(k(k + m)) telescopes.
    const m = r.pick([1, 1, 2] as const);
    let v = fr(0);
    for (let k = 1; k <= N; k++) v = v.add(fr(1, k * (k + m)));
    return {
      prompt: w.prompts.serSigma,
      q: `\\sum_{k=1}^{${N}} \\frac{1}{k(k + ${m})}`,
      answer: num(v.toNumber(), 1e-9, { lowest: true }),
      show: v.tex(),
      plain: plainFrac(v),
      format: "fraction",
      solution: sol("sigma", `sum k=1..${N} 1/(k(k + ${m}))`),
    };
  }
  const [p, q, c] = [r.int(0, 3), r.nz(-4, 6), r.int(-5, 5)];
  const f = (k: number) => p * k * k + q * k + c;
  let v = 0;
  for (let k = 1; k <= N; k++) v += f(k);
  const body = polyStr([c, q, p], "k");
  return {
    prompt: w.prompts.serSigma,
    q: `\\sum_{k=1}^{${N}} \\left(${T(polyStr([c, q, p])).replace(/x/g, "k")}\\right)`,
    answer: num(v),
    show: String(v),
    plain: String(v),
    format: "number",
    solution: sol("sigma", `sum k=1..${N} (${body})`),
  };
};

export default gen;
