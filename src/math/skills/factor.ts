// Practice: Factorising.
import { parseE } from "../expr";
import { bracket, gcd, pmul, polyStr, T } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  let fac: string;
  let cs: number[];
  if (L === 1) {
    const [a, b] = [r.nz(-9, 9), r.nz(-9, 9)];
    fac = `${bracket(1, a)}${bracket(1, b)}`;
    cs = pmul([a, 1], [b, 1]);
  } else if (L === 2) {
    let p: number, a: number, q: number, b: number;
    do [p, a, q, b] = [r.int(2, 3), r.nz(-7, 7), r.int(1, 2), r.nz(-7, 7)];
    while (gcd(p, a) !== 1 || gcd(q, b) !== 1 || p * b === q * a);
    fac = `${bracket(p, a)}${bracket(q, b)}`;
    cs = pmul([a, p], [b, q]);
  } else {
    const kind = r.int(0, 2);
    if (kind === 0) {
      let p: number, a: number;
      do [p, a] = [r.int(1, 5), r.int(1, 9)];
      while (gcd(p, a) !== 1);
      fac = `${bracket(p, -a)}${bracket(p, a)}`;
      cs = pmul([-a, p], [a, p]);
    } else if (kind === 1) {
      const [k, a, b] = [r.int(2, 5), r.nz(-6, 6), r.nz(-6, 6)];
      fac = `${k}${bracket(1, a)}${bracket(1, b)}`;
      cs = pmul([k], pmul([a, 1], [b, 1]));
    } else {
      let k: number, a: number, p: number;
      do [k, p, a] = [r.int(1, 4), r.int(2, 6), r.nz(-9, 9)];
      while (gcd(p, a) !== 1);
      fac = `${k === 1 ? "" : k}x${bracket(p, a)}`;
      cs = pmul([0, k], [a, p]);
    }
  }
  const ex = polyStr(cs);
  return { prompt: w.prompts.factor, q: T(ex), answer: { k: "expr", e: parseE(ex), mode: "factor" }, show: T(fac), plain: fac, format: "factors", solution: { kind: "algebra", spec: { topic: "factor", eq: ex, method: "factor" } } };
};

export default gen;
