// Practice: Equal expressions.
import { fill } from "../chart";
import { exprQuestion, exprSteps, exprTex } from "../exprMatch";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // The one of four expressions equal to one given (src/math/exprMatch.ts); the wrong ones are slips that get named.
  const q = exprQuestion(L, r.next);
  const best = q.options[q.right];
  return {
    prompt: fill(w.prompts.sameExpression, { e: q.given.text }),
    q: exprTex(q.given.text),
    answer: { k: "pick", options: q.options, right: q.right, traps: q.traps.map((x) => ({ id: x.id, a: { k: "pick", options: q.options, right: x.at }, vars: x.vars })) },
    show: `${exprTex(q.given.text)} = ${best.tex}`,
    plain: best.plain,
    format: "pick",
    steps: exprSteps(q),
  };
};

export default gen;
