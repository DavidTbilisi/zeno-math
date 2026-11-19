// Practice: Algebraic fractions.
import { parseE } from "../expr";
import { fractionQuestion } from "../formulae";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // Simplify by factorising (easy); add, subtract, multiply and divide over linear bottoms (medium) and over
  // quadratic ones that are factorised first (hard), as one fraction cut down (src/math/formulae.ts).
  const q = fractionQuestion(r.next, L);
  const simplify = ["monomial", "termsCancel", "bracket", "diffSquares", "quadQuad"].includes(q.kind);
  return {
    prompt: simplify ? w.formulae.simplify : w.formulae.single,
    q: q.q,
    answer: { k: "expr", e: parseE(q.ans), mode: "fraction", traps: q.traps.map((t) => ({ id: t.id, a: { k: "expr", e: parseE(t.e) }, vars: t.vars })) },
    show: q.show,
    plain: q.ans,
    format: "algFraction",
    steps: q.steps,
  };
};

export default gen;
