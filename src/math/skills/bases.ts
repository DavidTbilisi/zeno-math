// Practice: Number bases.
import { baseOpQuestion, fromTenQuestion, toTenQuestion } from "../numberTheory";
import { numberTheoryPart } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // Number bases (src/math/numberTheory.ts): a base-b numeral in base 10 (easy), base 10 in base b (medium), adding,
  // subtracting and multiplying in base b (hard). The worked solution is the number theory tool's picture.
  return numberTheoryPart(L === 1 ? toTenQuestion(r.next) : L === 2 ? fromTenQuestion(r.next) : baseOpQuestion(r.next), w);
};

export default gen;
