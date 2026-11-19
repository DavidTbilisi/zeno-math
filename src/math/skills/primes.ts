// Practice: Prime factors.
import { fill } from "../chart";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const ps = L === 1 ? [2, 3, 5, 7] : L === 2 ? [2, 3, 5, 7, 11] : [2, 3, 5, 7, 11, 13];
  const limit = L === 1 ? 100 : L === 2 ? 1000 : 10000;
  let n = 1;
  let k = 0;
  for (;;) {
    const p = r.pick(ps);
    if (n * p > limit) {
      if (k >= (L === 1 ? 2 : 3)) break;
      n = 1;
      k = 0;
      continue;
    }
    n *= p;
    k++;
  }
  const pf: [number, number][] = [];
  let m = n;
  for (const p of ps)
    if (m % p === 0) {
      let e = 0;
      while (m % p === 0) (m /= p), e++;
      pf.push([p, e]);
    }
  return {
    prompt: fill(w.prompts.primes, { n }),
    q: "",
    answer: { k: "primes", n },
    show: pf.map(([p, e]) => (e > 1 ? `${p}^{${e}}` : String(p))).join(" \\cdot "),
    plain: pf.map(([p, e]) => (e > 1 ? `${p}^${e}` : String(p))).join(" * "),
    format: "primes",
    solution: { kind: "nt", spec: { topic: "factor", n: String(n) } },
  };
};

export default gen;
