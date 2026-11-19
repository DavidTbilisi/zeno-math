// Practice: Kakooma.
import { kakSet, kakSum, kakTraps } from "../kakooma";
import type { Gen, Trap } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // Kakooma (src/math/kakooma.ts): which of a few numbers is the sum of two others (the product, on hard)? The answer
  // is that number, typed or picked; one of the two parts, a number used twice and a sum for a product are named.
  const s = kakSet(L, r.next);
  const options = s.nums.map((n) => ({ v: n, text: String(n), plain: String(n), tex: String(n) }));
  const sign = s.op === "+" ? "+" : "×";
  const traps: Trap[] = kakTraps(s).map((x) => ({ id: x.id, a: { k: "near", options, right: s.nums.indexOf(x.n) }, vars: { ...x.vars, s: sign } }));
  return {
    prompt: s.op === "+" ? w.prompts.kakoomaSum : w.prompts.kakoomaProduct,
    q: s.nums.join(", \\quad "),
    answer: { k: "near", options, right: s.nums.indexOf(s.answer), traps },
    show: kakSum(s).replace("×", "\\times"),
    plain: String(s.answer),
    format: "near",
    steps: [`${s.parts[0]} ${s.op === "+" ? "+" : "\\times"} ${s.parts[1]} = ${s.answer}`],
  };
};

export default gen;
