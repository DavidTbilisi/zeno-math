// Practice: Divisible by?.
import { fill } from "../chart";
import { divSlips, divTask } from "../divisible";
import type { Gen, Trap } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // Which of the divisors offered divide a number (src/math/divisible.ts): 2, 5 and 10; then 3 and 9; then 4, 6 and
  // 8. The answer lists them, typed or tapped, in any order; the worked solution is a picture of each divisor's test
  // (src/math/divisiblePics.ts).
  const t = divTask(L, r.next);
  const traps: Trap[] = divSlips(t).map((s) => ({ id: s.id, a: { k: "divisors", n: t.n, offered: t.offered, right: s.right }, vars: s.vars }));
  return {
    prompt: fill(w.prompts.divisibility, { divs: t.offered.join(", ") }),
    q: String(t.n),
    answer: { k: "divisors", n: t.n, offered: t.offered, right: t.right, traps },
    show: t.right.join(", "),
    plain: t.right.join(", "),
    format: "divisors",
    solution: { kind: "divisible", spec: { n: t.n, offered: t.offered } },
  };
};

export default gen;
