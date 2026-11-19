// Practice: Circle theorems.
import { fill, r2 } from "../chart";
import { circleFigure } from "../euclid";
import { num } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // An angle (or a length) from a circle theorem, with the figure.
  const make = (src: string, given: string, ask: string, v: number, angle = true) => {
    const full = `${src}; find ${ask}`;
    const fig = circleFigure(full);
    return {
      prompt: fill(w.prompts.circleFind, { a: angle ? `∠${ask}` : ask }),
      q: given,
      pic: fig ? { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${fig.svg}</g>`, h: fig.h, w: fig.w } : undefined,
      answer: num(v, 1e-6),
      show: angle ? `${v}^\\circ` : String(v),
      plain: String(v),
      format: "number" as const,
      solution: { kind: "euclid" as const, spec: { topic: "circle", src: full } },
    };
  };
  const deg = (n: string, v: number) => `\\angle ${n} = ${v}^\\circ`;
  if (L === 1) {
    const kind = r.int(0, 2);
    const a = r.int(25, 70);
    if (kind === 0) return r.next() < 0.5 ? make(`centre; AOB = ${2 * a}`, deg("AOB", 2 * a), "ACB", a) : make(`centre; ACB = ${a}`, deg("ACB", a), "AOB", 2 * a);
    if (kind === 1) return make(`semicircle; CAB = ${a}`, deg("CAB", a), "CBA", 90 - a);
    return make(`segment; ACB = ${a}`, deg("ACB", a), "ADB", a);
  }
  if (L === 2) {
    if (r.next() < 0.5) {
      const [A, B] = [r.int(55, 125), r.int(55, 125)];
      const src = `cyclic; A = ${A}; B = ${B}`;
      const q = `${deg("DAB", A)},\\quad ${deg("ABC", B)}`;
      return r.next() < 0.5 ? make(src, q, "BCD", 180 - A) : make(src, q, "CDA", 180 - B);
    }
    const P = 2 * r.int(15, 50);
    return r.next() < 0.5 ? make(`tangents; APB = ${P}`, deg("APB", P), "AOB", 180 - P) : make(`tangents; APB = ${P}`, deg("APB", P), "PAB", (180 - P) / 2);
  }
  const kind = r.int(0, 2);
  if (kind === 0) {
    const [a, b] = [r.int(40, 75), r.int(40, 75)];
    return make(`alternate; TAB = ${a}; SAC = ${b}`, `${deg("TAB", a)},\\quad ${deg("SAC", b)}`, "BAC", 180 - a - b);
  }
  if (kind === 1) {
    const P = 2 * r.int(15, 50);
    return make(`tangents; APB = ${P}`, deg("APB", P), "OAB", P / 2);
  }
  const [m, h, k] = r.pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [6, 8, 10], [9, 12, 15], [12, 16, 20]] as const);
  const [half, om] = r.next() < 0.5 ? [m, h] : [h, m];
  return make(`chord; AB = ${2 * half}; OA = ${k}`, `AB = ${2 * half},\\quad OA = ${k}`, "OM", om, false);
};

export default gen;
