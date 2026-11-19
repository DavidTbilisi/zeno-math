// Practice: Logarithms.
import type { Frac } from "../fraction";
import { fr, num, plainFrac } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const logTex = (b: number, x: string) => (b === 10 ? `\\log ${x}` : `\\log_{${b}} ${x}`);
  const logSrc = (b: number, x: string) => (b === 10 ? `log(${x})` : `log_${b}(${x})`);
  let src: string;
  let q: string;
  let v: Frac;
  if (L === 1) {
    const b = r.pick([2, 3, 5, 10]);
    const k = r.int(1, b === 2 ? 7 : b === 10 ? 5 : 4);
    src = logSrc(b, String(b ** k));
    q = logTex(b, String(b ** k));
    v = fr(k);
  } else if (L === 2) {
    if (r.next() < 0.5) {
      const b = r.pick([2, 3, 10]);
      const k = r.int(1, 4);
      src = logSrc(b, `1/${b ** k}`);
      q = logTex(b, `\\frac{1}{${b ** k}}`);
      v = fr(-k);
    } else {
      const b = r.pick([2, 3]);
      const [m, n] = r.pick([[2, 3], [2, 1], [2, 5], [3, 2], [3, 1], [2, 4]] as const);
      if (b ** n > 10000 || b ** m > 100) return gen(r, 1, w);
      src = logSrc(b ** m, String(b ** n));
      q = logTex(b ** m, String(b ** n));
      v = fr(n, m);
    }
  } else {
    const b = r.pick([2, 3, 5, 6, 10]);
    const k = r.int(1, b <= 3 ? 3 : 2);
    if (b === 6 || b === 10) {
      const t = b ** k;
      const parts = k === 1 ? (b === 6 ? [2, 3] : [2, 5]) : b === 6 ? [4, 9] : k === 2 ? [4, 25] : [8, 125];
      src = `${logSrc(b, String(parts[0]))} + ${logSrc(b, String(parts[1]))}`;
      q = `${logTex(b, String(parts[0]))} + ${logTex(b, String(parts[1]))}`;
      v = fr(Math.round(Math.log(t) / Math.log(b)));
    } else {
      const y = r.pick([2, 3, 5, 6, 7].filter((x) => x % b !== 0));
      src = `${logSrc(b, String(y * b ** k))} - ${logSrc(b, String(y))}`;
      q = `${logTex(b, String(y * b ** k))} - ${logTex(b, String(y))}`;
      v = fr(k);
    }
  }
  return { prompt: w.prompts.evaluate, q, answer: num(v.toNumber()), show: v.tex(), plain: plainFrac(v), format: "exact", solution: { kind: "powers", spec: { topic: "logs", src } } };
};

export default gen;
