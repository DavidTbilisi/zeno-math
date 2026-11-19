// Practice: Proof by induction. Easy puts the lines of a short induction proof (a sum formula) in order, a look-alike
// line that assumes what is to be proved left out (named if used), or gives the reason for a marked line (the base
// case, the assumption for k, the inductive hypothesis used, the principle of induction); medium does the same for a
// divisibility claim and an inequality; hard finds the first wrong line of a faulty induction: all horses one colour
// (the step fails from 1 to 2), no base case (the right step taken for the wrong line, named), a base case worked
// wrong. Uses the proof answer kinds of src/math/proofs.ts.
import { fill } from "../chart";
import type { Gen } from "../practiceTypes";
import { INDUCTION, INDUCTION_FLAW_IDS, INDUCTION_FLAW_TEX, INDUCTION_FLAWS, INDUCTION_REASON_KEYS, LONG_INDUCTION, SHORT_INDUCTION, type InductionId } from "../proofs";
import { flawLines, orderLines, reasonLines } from "./proofs";

const gen: Gen = (r, L, w) => {
  const W = w.proofs;
  if (L === 3) {
    const id = r.pick(INDUCTION_FLAW_IDS);
    return flawLines(W.inductionFlaws[id], INDUCTION_FLAWS[id], INDUCTION_FLAW_TEX[id], W);
  }
  const id: InductionId = r.pick(L === 1 ? SHORT_INDUCTION : LONG_INDUCTION);
  const p = W.induction[id];
  return r.next() < 0.5 ? { ...orderLines(p, INDUCTION[id].mimics, r), prompt: fill(W.prompt.order, { claim: p.claim }) } : reasonLines(p, INDUCTION[id].reasons, INDUCTION_REASON_KEYS, r, W);
};

export default gen;
