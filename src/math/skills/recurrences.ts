// Practice: Linear recurrences. Easy finds a term of aₙ = p aₙ₋₁ + q aₙ₋₂ from the first two (the term before,
// named); medium the roots of the characteristic equation (the signs flipped, named); hard A and B in the closed form
// aₙ = A r₁ⁿ + B r₂ⁿ from a₀ and a₁ (A and B swapped, named).
import { F } from "../calculusTwo";
import { pairOf, valuesOf, wholeOf } from "../realAnalysis";
import { recurrenceTerms, sub } from "../discrete";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** p x + q y with p, q whole (a 1 left out, a 0 term dropped; y = "" for a constant). */
function lin2(p: number, x: string, q: number, y: string): string {
  const term = (c: number, v: string, first: boolean) => {
    if (c === 0) return "";
    const mag = v === "" ? String(Math.abs(c)) : Math.abs(c) === 1 ? v : `${Math.abs(c)}${v}`;
    return first ? (c < 0 ? `-${mag}` : mag) : c < 0 ? ` - ${mag}` : ` + ${mag}`;
  };
  return p === 0 ? term(q, y, true) : term(p, x, true) + term(q, y, false);
}

const recTex = (p: number, q: number) => `a_n = ${lin2(p, "a_{n-1}", q, "a_{n-2}")}`;
const charTex = (p: number, q: number) => `x^{2} = ${lin2(p, "x", q, "")}`;
const paren = (n: number) => (n < 0 ? `(${n})` : String(n));
/** |c| · x with the numbers written out (a 1 left out). */
const times = (c: number, x: number) => `${Math.abs(c) === 1 ? "" : `${Math.abs(c)} \\cdot `}${paren(x)}`;
/** p · x + q · y, worked with the numbers. */
const workTex = (p: number, x: number, q: number, y: number) => `${p < 0 ? "-" : ""}${times(p, x)} ${q < 0 ? "-" : "+"} ${times(q, y)}`;

function termPart(r: Rng, w: PracticeWords): Part {
  // q = −1 only with p = 3 and a₁ > a₀, so every term grows and the term before is a different number
  const q = r.pick([1, 2, 3, -1]);
  const p = q === -1 ? 3 : r.pick([1, 2, 3]);
  const a0 = r.int(0, 3);
  const a1 = r.int(a0 + 1, a0 + 4);
  const n = r.int(5, 6);
  const a = recurrenceTerms(p, q, a0, a1, n);
  return {
    prompt: fill(w.dm.prompt.term, { a: `a${sub(n)}` }),
    q: `${recTex(p, q)}, \\quad a_0 = ${a0}, \\; a_1 = ${a1}`,
    ...wholeOf(a[n], [["recurrenceIndexOff", a[n - 1]]]),
    steps: a.slice(2).map((v, i) => `a_{${i + 2}} = ${workTex(p, a[i + 1], q, a[i])} = ${v}`),
  };
}

const ROOTS = [-3, -2, -1, 1, 2, 3, 4, 5];

function rootsOf(r: Rng): [number, number] {
  for (;;) {
    const r1 = r.pick(ROOTS);
    const r2 = r.pick(ROOTS);
    if (r1 < r2 && r1 + r2 !== 0) return [r1, r2];
  }
}

const factor = (x: number) => (x < 0 ? `(x + ${-x})` : `(x - ${x})`);

function rootsPart(r: Rng, w: PracticeWords): Part {
  const [r1, r2] = rootsOf(r);
  const p = r1 + r2;
  const q = -r1 * r2;
  return {
    prompt: w.dm.prompt.roots,
    q: recTex(p, q),
    ...valuesOf([F(r1), F(r2)], [["characteristicSignFlipped", [F(-r1), F(-r2)]]], "roots"),
    steps: [`a_n = x^{n}: \\quad ${charTex(p, q)}`, `x^{2} ${lin2(-p, "x", -q, "").replace(/^(?!-)/, "+ ").replace(/^-/, "- ")} = ${factor(r1)}${factor(r2)} = 0`, `x = ${r1}, \\; x = ${r2}`],
  };
}

function closedPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const [r1, r2] = rootsOf(r);
    const A = r.pick([-3, -2, -1, 1, 2, 3, 4]);
    const B = r.pick([-3, -2, -1, 1, 2, 3, 4]);
    if (A === B) continue;
    const a0 = A + B;
    const a1 = A * r1 + B * r2;
    const p = r1 + r2;
    const q = -r1 * r2;
    return {
      prompt: w.dm.prompt.closed,
      q: `${recTex(p, q)}, \\quad a_0 = ${a0}, \\; a_1 = ${a1}, \\quad a_n = A \\cdot ${paren(r1)}^{n} + B \\cdot ${paren(r2)}^{n}`,
      ...pairOf([F(A), F(B)], [["closedFormSwapped", [F(B), F(A)]]], "pair"),
      steps: [
        `${charTex(p, q)} \\Rightarrow x = ${r1}, \\; x = ${r2}`,
        `n = 0: \\; A + B = ${a0}, \\quad n = 1: \\; ${lin2(r1, "A", r2, "B")} = ${a1}`,
        `A = ${A}, \\; B = ${B}`,
      ],
    };
  }
}

const gen: Gen = (r, L, w) => (L === 1 ? termPart(r, w) : L === 2 ? rootsPart(r, w) : closedPart(r, w));

export default gen;
