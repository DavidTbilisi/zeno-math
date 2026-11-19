// Practice: HCF and LCM.
import { fill } from "../chart";
import { gcd, num } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const g = L === 3 ? r.int(6, 30) : r.int(2, 12);
  let m: number;
  let n: number;
  do {
    m = r.int(2, L === 3 ? 15 : 9);
    n = r.int(2, L === 3 ? 15 : 9);
  } while (m === n || gcd(m, n) !== 1);
  const [a, b] = [g * m, g * n];
  const lcm = L === 2;
  const v = lcm ? g * m * n : g;
  return { prompt: fill(lcm ? w.prompts.lcm : w.prompts.hcf, { a, b }), q: "", answer: num(v), show: String(v), plain: String(v), format: "number", solution: { kind: "nt", spec: { topic: "gcd", mode: "euclid", a: String(a), b: String(b), c: "1" } } };
};

export default gen;
