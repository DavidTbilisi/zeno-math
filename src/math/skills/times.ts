// Practice: Multiplication.
import { num } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const [a, b] = L === 1 ? [r.int(12, 99), r.int(3, 9)] : L === 2 ? [r.int(12, 99), r.int(12, 99)] : [r.int(101, 999), r.int(12, 99)];
  return { prompt: w.prompts.times, q: `${a} \\times ${b}`, answer: num(a * b), show: String(a * b), plain: String(a * b), format: "number", solution: { kind: "model", spec: { type: "multiply", style: "area", a, b, step: 999 } } };
};

export default gen;
