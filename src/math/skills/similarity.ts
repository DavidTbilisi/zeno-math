// Practice: Similarity.
import { fill } from "../chart";
import { dp, num } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const sol = (src: string) => ({ kind: "euclid" as const, spec: { topic: "similar", src } });
  const out = (prompt: string, q: string, v: number, src: string) => ({
    prompt,
    q,
    answer: num(v, 1e-6),
    show: dp(v, 3),
    plain: dp(v, 3),
    format: "number" as const,
    solution: sol(src),
  });
  if (L === 1) {
    const a = 2 * r.int(1, 5);
    const k = r.pick([2, 3, 1.5, 0.5, 2.5]);
    const b = r.int(3, 9);
    const [de, ef] = [a * k, b * k];
    return out(fill(w.prompts.similarSide, { a: "ABC", b: "DEF", s: "EF" }), `AB = ${a},\\quad BC = ${b},\\quad DE = ${dp(de, 3)}`, ef, `ABC ~ DEF; AB = ${a}; BC = ${b}; DE = ${dp(de, 3)}; find EF`);
  }
  if (L === 2) {
    const [a, b, m] = [r.int(2, 6), r.int(2, 8), r.int(1, 3)];
    return out(w.prompts.similarA, `AD = ${a},\\quad DB = ${b},\\quad DE = ${a * m}`, m * (a + b), `ADE ~ ABC; AD = ${a}; DB = ${b}; DE = ${a * m}; find BC`);
  }
  const [a, b] = r.pick([[2, 3], [3, 4], [2, 5], [3, 5], [1, 2], [1, 3], [4, 5]] as const);
  const m = r.int(1, 4);
  const kind = r.int(0, 2);
  if (kind === 0) return out(fill(w.prompts.scaleArea, { a, b, A: a * a * m }), "", b * b * m, `lengths ${a} : ${b}; area ${a * a * m} : ?`);
  if (kind === 1) return out(fill(w.prompts.scaleVolume, { a, b, V: a ** 3 * m }), "", b ** 3 * m, `lengths ${a} : ${b}; volume ${a ** 3 * m} : ?`);
  return out(fill(w.prompts.scaleAreaVolume, { a: a * a, b: b * b, V: a ** 3 * m }), "", b ** 3 * m, `areas ${a * a} : ${b * b}; volume ${a ** 3 * m} : ?`);
};

export default gen;
