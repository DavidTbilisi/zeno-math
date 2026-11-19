// Practice: Expanding brackets.
import { parseE } from "../expr";
import { bracket, pmul, polyStr, T } from "../practiceKit";
import type { Gen, Trap } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  let src: string;
  let cs: number[];
  const traps: Trap[] = [];
  if (L === 1) {
    const [a, b] = [r.nz(-9, 9), r.nz(-9, 9)];
    src = `${bracket(1, a)}${bracket(1, b)}`;
    cs = pmul([a, 1], [b, 1]);
    if (a + b !== 0) traps.push({ id: "noMiddle", a: { k: "expr", e: parseE(polyStr([a * b, 0, 1])) }, vars: { L: (1 + a) * (1 + b), R: 1 + a * b } });
  } else if (L === 2) {
    const [a, b, c, d] = [r.int(2, 5), r.nz(-7, 7), r.int(1, 5), r.nz(-7, 7)];
    src = `${bracket(a, b)}${bracket(c, d)}`;
    cs = pmul([b, a], [d, c]);
  } else {
    const kind = r.int(0, 2);
    if (kind === 0) {
      const [a, b] = [r.int(2, 5), r.nz(-7, 7)];
      src = `${bracket(a, b)}^2`;
      cs = pmul([b, a], [b, a]);
      traps.push({ id: "squareTerms", a: { k: "expr", e: parseE(polyStr([b * b, 0, a * a])) }, vars: { L: (a + b) ** 2, R: a * a + b * b } });
    } else if (kind === 1) {
      const [a, b, c] = [r.nz(-5, 5), r.nz(-5, 5), r.nz(-6, 6)];
      src = `${bracket(1, a)}(${polyStr([c, b, 1])})`;
      cs = pmul([a, 1], [c, b, 1]);
    } else {
      const [k, a, b] = [r.int(2, 5) * r.sign(), r.nz(-6, 6), r.nz(-6, 6)];
      src = `${k}${bracket(1, a)}${bracket(1, b)}`;
      cs = pmul([k], pmul([a, 1], [b, 1]));
    }
  }
  const out = polyStr(cs);
  return { prompt: w.prompts.expand, q: T(src), answer: { k: "expr", e: parseE(out), mode: "expand", traps }, show: T(out), plain: out, format: "expr", solution: { kind: "algebra", spec: { topic: "expand", eq: src, method: "factor" } } };
};

export default gen;
