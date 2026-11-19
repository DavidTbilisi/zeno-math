// Practice: Make the target.
import { fill } from "../chart";
import { parseSum, targetPuzzle } from "../target";
import { OP_SIGN, sumTex } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // Cards and a target, and a sum of the cards that makes it (src/math/target.ts); the answer is the sum, typed.
  const p = targetPuzzle(L, r.next);
  const vars = { t: p.target, cards: p.cards.join(", "), ops: p.ops.map((o) => OP_SIGN[o]).join(" ") };
  const solved = `${sumTex(parseSum(p.sample)!)} = ${p.target}`;
  return {
    prompt: fill(p.all ? w.prompts.makeTargetAll : w.prompts.makeTarget, vars),
    q: `${p.cards.join(", \\quad ")} \\quad \\Rightarrow \\quad ${p.target}`,
    answer: { k: "target", puzzle: { cards: p.cards, target: p.target, ops: p.ops, all: p.all }, sample: p.sample },
    show: solved,
    plain: p.sample,
    format: "target",
    steps: [solved],
  };
};

export default gen;
