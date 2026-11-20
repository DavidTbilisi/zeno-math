// Practice: Suprema and infima. Easy finds sup S and inf S of a set made from a sequence (the two swapped, or the
// first term taken on both sides of an alternating one, named); medium says whether the set has a largest and a
// smallest element (a bound not reached called a maximum, the limit taken for the bound, named); hard uses the
// approximation property: the first element within ε of the supremum (n = bε that only reaches it, the square root
// forgotten, named).
import { pickOf, word } from "../calculusTwo";
import type { MistakeId } from "../mistakes";
import { epsTex, F, pairOf, setTex, termTex, wholeOf } from "../realAnalysis";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** sup S and inf S of {c + b/n} or {c + (−1)ⁿb/n}. */
function boundsPart(r: Rng, w: PracticeWords): Part {
  const c = r.int(-3, 3);
  const prompt = w.real.prompt.supInf;
  if (r.next() < 0.5) {
    const b = F(r.nz(-6, 6), r.pick([1, 1, 2]));
    const first = F(c).add(b);
    const [sup, inf] = b.isNeg() ? [F(c), first] : [first, F(c)];
    return {
      prompt,
      q: `S = ${setTex(termTex(c, b))}`,
      ...pairOf([sup, inf], [["supInfSwapped", [inf, sup]]], "supInf"),
      steps: [`a_1 = ${first.tex()}, \\quad a_n \\to ${c} \\; (${b.isNeg() ? "\\nearrow" : "\\searrow"})`, `\\sup S = ${sup.tex()}, \\; \\inf S = ${inf.tex()}`],
    };
  }
  // n = 1 gives the least term c − b, n = 2 the greatest c + b/2.
  const b = r.int(1, 6);
  const [sup, inf] = [F(c).add(F(b, 2)), F(c - b)];
  return {
    prompt,
    q: `S = ${setTex(termTex(c, F(b), 1, true))}`,
    ...pairOf([sup, inf], [["supInfSwapped", [inf, sup]], ["alternatingFirstTerm", [F(c + b), F(c - b)]]], "supInf"),
    steps: [`a_1 = ${inf.tex()}, \\; a_2 = ${sup.tex()}, \\; a_3 = ${F(c).sub(F(b, 3)).tex()}, \\; \\dots \\to ${c}`, `\\sup S = ${sup.tex()}, \\; \\inf S = ${inf.tex()}`],
  };
}

/** Does S have a maximum, a minimum, both or neither? */
function maxMinPart(r: Rng, w: PracticeWords): Part {
  const W = w.real.maxMin;
  const options = [word(W.both), word(W.maxOnly), word(W.minOnly), word(W.neither)];
  const kind = r.int(0, 3);
  let q: string;
  let right: number;
  let step: string;
  const slips: [MistakeId, number][] = [];
  if (kind === 0) {
    const a = r.int(-5, 3);
    const b = a + r.int(1, 6);
    const [open, close] = [r.pick(["[", "("]), r.pick(["]", ")"])];
    q = `S = ${open}${a}, ${b}${close}`;
    right = open === "[" ? (close === "]" ? 0 : 2) : close === "]" ? 1 : 3;
    step = `\\inf S = ${a} ${open === "[" ? "\\in" : "\\notin"} S, \\quad \\sup S = ${b} ${close === "]" ? "\\in" : "\\notin"} S`;
  } else if (kind === 1) {
    const c = r.int(-3, 3);
    const b = r.nz(-6, 6);
    q = `S = ${setTex(termTex(c, F(b)))}`;
    right = b > 0 ? 1 : 2;
    step = b > 0 ? `\\max S = a_1 = ${c + b}, \\quad \\inf S = ${c} \\notin S` : `\\min S = a_1 = ${c + b}, \\quad \\sup S = ${c} \\notin S`;
  } else if (kind === 2) {
    const c = r.int(-3, 3);
    const b = r.int(1, 6);
    q = `S = ${setTex(termTex(c, F(b), 1, true))}`;
    right = 0;
    slips.push(["limitAsBound", 2]);
    step = `\\min S = a_1 = ${c - b}, \\quad \\max S = a_2 = ${F(c).add(F(b, 2)).tex()}`;
  } else {
    const p = r.pick([2, 3, 5, 6, 7]);
    q = `S = ${setTex(`x^{2} \\le ${p}`, "x", "\\mathbb{Q}")}`;
    right = 3;
    step = `\\sup S = \\sqrt{${p}} \\notin \\mathbb{Q}, \\quad \\inf S = -\\sqrt{${p}} \\notin \\mathbb{Q}`;
  }
  if (right !== 0) slips.push(["boundAsAttained", 0]);
  return { prompt: w.real.prompt.maxMin, q, ...pickOf(options, right, slips), steps: [step, `\\text{${options[right].text}}`] };
}

/** sup{c − b/nᵖ} = c: the first n with aₙ > c − ε. */
function approximatePart(r: Rng, w: PracticeWords): Part {
  const c = r.int(-3, 3);
  const cT = c === 0 ? "-" : `${c} - `;
  if (r.next() < 0.5) {
    const [b, k] = [r.int(2, 5), r.pick([10, 20, 100])];
    const m = b * k;
    return {
      prompt: fill(w.real.prompt.approximate, { c }),
      q: `S = ${setTex(termTex(c, F(-b)))}, \\quad ${epsTex(k)}`,
      ...wholeOf(m + 1, [["epsilonBoundaryN", m]]),
      steps: [`${cT}\\frac{${b}}{n} > ${cT}\\frac{1}{${k}} \\iff n > ${m}`, `n = ${m + 1}`],
    };
  }
  // b/n² < 1/k ⇔ n² > bk = m², with k = b·j².
  const [b, j] = [r.int(1, 3), r.int(2, 5)];
  const [k, m] = [b * j * j, b * j];
  return {
    prompt: fill(w.real.prompt.approximate, { c }),
    q: `S = ${setTex(termTex(c, F(-b), 2))}, \\quad ${epsTex(k)}`,
    ...wholeOf(m + 1, [["epsilonBoundaryN", m], ["forgotSquareRootN", m * m + 1]]),
    steps: [`${cT}\\frac{${b}}{n^{2}} > ${cT}\\frac{1}{${k}} \\iff n^{2} > ${m * m} \\iff n > ${m}`, `n = ${m + 1}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? boundsPart(r, w) : L === 2 ? maxMinPart(r, w) : approximatePart(r, w));

export default gen;
