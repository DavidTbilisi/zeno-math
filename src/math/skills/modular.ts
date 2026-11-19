// Practice: Divisors, remainders and congruences.
import { congruenceQuestion, divisorQuestion, productRemainderQuestion, repeatingQuestion, unitsDigitQuestion } from "../numberTheory";
import { numberTheoryPart } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // Divisors, units digits, repeating decimals, remainders and congruences (src/math/numberTheory.ts): divisors from
  // the prime factorisation and the units digit of a power (easy); a repeating decimal as a fraction and the
  // remainder of a product (medium); the remainder of a power, a x ≡ b (mod m) and two congruences at once (hard).
  const q = L === 1 ? (r.next() < 0.5 ? divisorQuestion : unitsDigitQuestion) : L === 2 ? (r.next() < 0.5 ? repeatingQuestion : productRemainderQuestion) : congruenceQuestion;
  return numberTheoryPart(q(r.next), w);
};

export default gen;
