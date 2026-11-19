// Practice: Counting.
import { fill } from "../chart";
import { num } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const fact = (k: number): number => (k <= 1 ? 1 : k * fact(k - 1));
  const count = (kind: string, n: number, k: number, word = "MISSISSIPPI") => ({ kind: "comb" as const, spec: { topic: "count", kind, n: String(n), r: String(k), word } });
  if (L === 1) {
    if (r.next() < 0.5) {
      const n = r.int(4, 7);
      return { prompt: fill(w.prompts.lineUp, { n }), q: "", answer: num(fact(n)), show: `${n}! = ${fact(n)}`, plain: String(fact(n)), format: "number", solution: count("perm", n, n) };
    }
    const [n, k] = [r.int(5, 10), r.int(2, 3)];
    const v = fact(n) / fact(n - k);
    return { prompt: fill(w.prompts.podium, { n, r: k }), q: "", answer: num(v), show: `P(${n}, ${k}) = ${v}`, plain: String(v), format: "number", solution: count("perm", n, k) };
  }
  if (L === 2) {
    const [n, k] = [r.int(6, 15), r.int(2, 4)];
    const v = Math.round(fact(n) / fact(k) / fact(n - k));
    return { prompt: fill(w.prompts.choose, { n, r: k }), q: "", answer: num(v), show: `\\binom{${n}}{${k}} = ${v}`, plain: String(v), format: "number", solution: count("comb", n, k) };
  }
  const word = r.pick(["BANANA", "LEVEL", "APPLE", "PEPPER", "LETTER", "COFFEE", "BALLOON", "SUCCESS", "STATISTICS"]);
  const counts = new Map<string, number>();
  for (const ch of word) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  const v = Math.round([...counts.values()].reduce((acc, c) => acc / fact(c), fact(word.length)));
  const rep = [...counts.values()].filter((c) => c > 1).map((c) => `${c}!`).join(" \\cdot ");
  return { prompt: fill(w.prompts.word, { word }), q: "", answer: num(v), show: `\\frac{${word.length}!}{${rep}} = ${v}`, plain: String(v), format: "number", solution: count("word", 5, 3, word) };
};

export default gen;
