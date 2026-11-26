// Practice: Counting. L1 a line-up (n!) or a podium (P(n, k)); L2 a choice (C(n, k)); L3 a word's arrangements. Since
// #738 half the questions at each level come from `more()`: L1 the counting principle (a meal or an outfit, the
// choices multiplied; a lock code with repeats); L2 overcounting (handshakes, where order would count each twice, and
// a captain and vice-captain, where order counts); L3 a new setting, probability by counting (a draw of numbers, a
// committee of girls).
import { fill } from "../chart";
import { fr, num, plainFrac } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";

const fact = (k: number): number => (k <= 1 ? 1 : k * fact(k - 1));
const nCk = (n: number, k: number) => Math.round(fact(n) / fact(k) / fact(n - k));
const nPk = (n: number, k: number) => fact(n) / fact(n - k);
const tn = (id: Trap["id"], v: number, vars: Record<string, string | number>): Trap => ({ id, a: num(v), vars });
const keep = (v: number, traps: Trap[]) => traps.filter((t, i) => t.a.k === "num" && Math.abs(t.a.v - v) > 1e-12 && traps.findIndex((u) => u.a.k === "num" && t.a.k === "num" && Math.abs(u.a.v - t.a.v) < 1e-12) === i);

function more(r: Rng, L: 1 | 2 | 3, w: PracticeWords): Part {
  const K = w.ctK;
  const whole = (prompt: string, v: number, traps: Trap[], steps: string[]): Part => ({ prompt, q: "", answer: { ...num(v), traps: keep(v, traps) }, show: String(v), plain: String(v), format: "number", steps });
  if (L === 1) {
    if (r.next() < 0.6) {
      const fs = [r.int(2, 5), r.int(3, 6), r.int(2, 4)];
      const v = fs[0] * fs[1] * fs[2];
      const vars = { f: fs.join(" × "), v };
      return whole(fill(r.next() < 0.5 ? K.mealQ : K.outfitQ, { a: fs[0], b: fs[1], c: fs[2] }), v, [tn("countingAdded", fs[0] + fs[1] + fs[2], vars)], [`${fs.join(" \\times ")} = ${v}`]);
    }
    const k = r.int(3, 4);
    const v = 10 ** k;
    const down = Array.from({ length: k }, (_, i) => 10 - i);
    return whole(fill(K.codeQ, { k }), v, [tn("repeatsForbidden", nPk(10, k), { k, f: down.join(" × "), v }), tn("digitsTimesPlaces", 10 * k, { k, v })],
      [`${Array(k).fill(10).join(" \\times ")} = 10^{${k}} = ${v}`]);
  }
  if (L === 2) {
    const n = r.int(5, 14);
    const vars = { n, m: n - 1, v: 0 };
    if (r.next() < 0.5) {
      const v = nCk(n, 2);
      return whole(fill(K.shakeQ, { n }), v, [tn("orderCountedTwice", n * (n - 1), { ...vars, v })], [`\\frac{${n} \\times ${n - 1}}{2} = ${v}`]);
    }
    const v = nPk(n, 2);
    return whole(fill(K.officerQ, { n }), v, [tn("orderIgnored", nCk(n, 2), { ...vars, v })], [`${n} \\times ${n - 1} = ${v}`]);
  }
  if (r.next() < 0.5) {
    const n = r.int(8, 10);
    const c = nCk(n, 3);
    return {
      prompt: fill(K.lotteryQ, { n }), q: "",
      answer: { ...num(1 / c, 1e-12, { lowest: true }), traps: [{ id: "lotteryOrdered", a: num(1 / nPk(n, 3), 1e-12), vars: { n, c } }] },
      show: `\\frac{1}{${c}}`, plain: `1/${c}`, format: "fraction",
      steps: [`\\binom{${n}}{3} = ${c}`, `P = \\frac{1}{${c}}`],
    };
  }
  const [g, b] = [r.int(4, 6), r.int(3, 6)];
  const n = g + b;
  const p = fr(nCk(g, 3), nCk(n, 3));
  return {
    prompt: fill(K.committeeQ, { g, b }), q: "",
    answer: { ...num(p.toNumber(), 1e-12, { lowest: true }), traps: [{ id: "committeeWithReplacement", a: num((g / n) ** 3, 1e-12), vars: { g, n, cg: nCk(g, 3), cn: nCk(n, 3), v: plainFrac(p) } }] },
    show: p.tex(), plain: plainFrac(p), format: "fraction",
    steps: [`\\frac{\\binom{${g}}{3}}{\\binom{${n}}{3}} = \\frac{${nCk(g, 3)}}{${nCk(n, 3)}} = ${p.tex()}`],
  };
}

const gen: Gen = (r, L, w) => {
  if (r.int(0, 9) >= 5) return more(r, L, w);
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
