// Practice: Indices.
import type { Frac } from "../fraction";
import { fr, num, plainFrac } from "../practiceKit";
import type { Gen, Trap } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  let src: string;
  let v: Frac;
  let q: string;
  const traps: Trap[] = [];
  if (L === 1) {
    const a = r.int(2, 5);
    const kind = r.int(0, 1);
    if (kind === 0) {
      const [m, n] = [r.int(2, 6), r.int(1, 5)];
      const k = r.int(Math.max(1, m + n - (a === 2 ? 8 : 4)), m + n);
      src = `${a}^${m} * ${a}^${n} / ${a}^${k}`;
      q = `\\frac{${a}^{${m}} \\times ${a}^{${n}}}{${a}^{${k}}}`;
      v = fr(a ** (m + n - k));
    } else {
      const n = r.int(1, 3);
      src = `${a}^(-${n})`;
      q = `${a}^{-${n}}`;
      v = fr(1, a ** n);
      traps.push({ id: "negPower", a: num(-(a ** n)) });
    }
  } else {
    const [k, d] = r.pick([[2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [2, 3], [3, 3], [4, 3], [2, 4], [3, 4], [2, 5]] as const);
    const base = k ** d;
    let n = r.int(1, d === 2 ? 3 : 2);
    if (n % d === 0) n++;
    if (L === 2) {
      src = `${base}^(${n}/${d})`;
      q = `${base}^{\\frac{${n}}{${d}}}`;
      v = fr(k ** n);
      if ((base * n) / d !== k ** n) traps.push({ id: "powTimes", a: num((base * n) / d) });
    } else {
      const [p, qq] = r.pick([[2, 3], [3, 2], [1, 2], [2, 5], [3, 4], [1, 3]] as const);
      const [P, Q] = [p ** d, qq ** d];
      src = `(${P}/${Q})^(-${n}/${d})`;
      q = `\\left(\\frac{${P}}{${Q}}\\right)^{-\\frac{${n}}{${d}}}`;
      v = fr(qq ** n, p ** n);
      // Not turned over, or taken to make the answer negative.
      traps.push({ id: "negPower", a: num((p / qq) ** n) }, { id: "negPower", a: num(-((qq / p) ** n)) });
    }
  }
  return { prompt: w.prompts.evaluate, q, answer: { ...num(v.toNumber()), traps }, show: v.tex(), plain: plainFrac(v), format: "exact", solution: { kind: "powers", spec: { topic: "laws", src } } };
};

export default gen;
