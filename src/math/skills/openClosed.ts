// Practice: Open and closed sets. Easy says whether a subset of ℝ is open, closed, both or neither (a set that is not
// open called closed, ℝ and ∅ not seen to be both, a limit point missed, an unbounded closed set called not closed,
// named); medium finds the interior or the closure of a set as an interval (the end points kept in the interior, the
// limit points left out of the closure, named); hard lists the boundary points (a gap point or an isolated point
// missed, named).
import { pickOf, word } from "../calculusTwo";
import { elementsOf } from "../groups";
import { intervalPlain, intervalTex, iv, point, unionTex, type Interval, type Piece } from "../topology";
import type { MistakeId } from "../mistakes";
import type { Answer, Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";

/** Three or four whole numbers a < b < c < d. */
function ends(r: Rng): [number, number, number, number] {
  const a = r.int(-6, 2);
  const b = a + r.int(1, 4);
  const c = b + r.int(1, 4);
  return [a, b, c, c + r.int(1, 3)];
}

function opennessPart(r: Rng, w: PracticeWords): Part {
  const [a, b, c] = ends(r);
  const o = w.top.openness;
  const options = [word(o.open), word(o.closed), word(o.both), word(o.neither)];
  const R = "\\mathbb{R}";
  const cases: { q: string; right: number; slip?: [MistakeId, number]; steps: string[] }[] = [
    { q: `(${a}, ${b})`, right: 0, steps: [`x \\in (${a}, ${b}) \\Rightarrow (x - \\varepsilon, x + \\varepsilon) \\subseteq (${a}, ${b}), \\; \\varepsilon = \\min(x - ${a}, ${b} - x)`] },
    { q: `[${a}, ${b}]`, right: 1, steps: [`${R} \\setminus [${a}, ${b}] = (-\\infty, ${a}) \\cup (${b}, \\infty)`] },
    { q: `[${a}, ${b})`, right: 3, slip: ["notOpenMeansClosed", 1], steps: [`(${a} - \\varepsilon, ${a} + \\varepsilon) \\not\\subseteq [${a}, ${b})`, `${b} - \\tfrac{1}{n} \\to ${b} \\notin [${a}, ${b})`] },
    { q: `(${a}, ${b}]`, right: 3, slip: ["notOpenMeansClosed", 1], steps: [`(${b} - \\varepsilon, ${b} + \\varepsilon) \\not\\subseteq (${a}, ${b}]`, `${a} + \\tfrac{1}{n} \\to ${a} \\notin (${a}, ${b}]`] },
    { q: R, right: 2, slip: ["clopenMissed", 0], steps: [`(x - 1, x + 1) \\subseteq ${R}`, `${R} \\setminus ${R} = \\varnothing`] },
    { q: "\\varnothing", right: 2, slip: ["clopenMissed", 0], steps: ["x \\in \\varnothing \\Rightarrow \\dots", `${R} \\setminus \\varnothing = ${R}`] },
    { q: "\\left\\{ \\tfrac{1}{n} : n \\in \\mathbb{N} \\right\\}", right: 3, slip: ["limitPointMissed", 1], steps: ["(1 - \\varepsilon, 1 + \\varepsilon) \\not\\subseteq A", "\\tfrac{1}{n} \\to 0 \\notin A"] },
    { q: "\\left\\{ \\tfrac{1}{n} : n \\in \\mathbb{N} \\right\\} \\cup \\{0\\}", right: 1, steps: ["\\tfrac{1}{n} \\to 0 \\in A", `${R} \\setminus A = (-\\infty, 0) \\cup (1, \\infty) \\cup \\bigcup_{n} \\left(\\tfrac{1}{n + 1}, \\tfrac{1}{n}\\right)`] },
    { q: "\\mathbb{Z}", right: 1, slip: ["unboundedNotClosed", 3], steps: [`${R} \\setminus \\mathbb{Z} = \\bigcup_{k \\in \\mathbb{Z}} (k, k + 1)`] },
    { q: `[${a}, \\infty)`, right: 1, slip: ["unboundedNotClosed", 3], steps: [`${R} \\setminus [${a}, \\infty) = (-\\infty, ${a})`] },
    { q: `(${a}, \\infty)`, right: 0, steps: [`x > ${a} \\Rightarrow (x - \\varepsilon, x + \\varepsilon) \\subseteq (${a}, \\infty), \\; \\varepsilon = x - ${a}`] },
    { q: `\\{${a}, ${b}, ${c}\\}`, right: 1, steps: [`${R} \\setminus A = (-\\infty, ${a}) \\cup (${a}, ${b}) \\cup (${b}, ${c}) \\cup (${c}, \\infty)`] },
    { q: `${R} \\setminus \\{${a}\\}`, right: 0, steps: [`${R} \\setminus \\{${a}\\} = (-\\infty, ${a}) \\cup (${a}, \\infty)`] },
    { q: "\\mathbb{Q}", right: 3, steps: ["(q - \\varepsilon, q + \\varepsilon) \\ni \\sqrt{2} + q' \\notin \\mathbb{Q}", "\\tfrac{\\lfloor 10^{n} \\sqrt{2} \\rfloor}{10^{n}} \\to \\sqrt{2} \\notin \\mathbb{Q}"] },
  ];
  const k = r.pick(cases);
  return { prompt: w.top.prompt.openClosed, q: `A = ${k.q}`, ...pickOf(options, k.right, k.slip ? [k.slip] : []), steps: k.steps };
}

const ineqOf = (i: Interval): Answer => ({ k: "ineq", lo: i.lo, hi: i.hi });

function interiorPart(r: Rng, w: PracticeWords): Part {
  const [a, b, c] = ends(r);
  const kind = r.int(0, 5);
  const closure = kind >= 2;
  let q: string;
  let right: Interval;
  let slip: [MistakeId, Interval];
  let steps: string[];
  if (kind === 0) {
    q = `[${a}, ${b}]`;
    right = iv(a, b, false, false);
    slip = ["endpointsInInterior", iv(a, b, true, true)];
    steps = [`(${a} - \\varepsilon, ${a} + \\varepsilon) \\not\\subseteq A, \\; (${b} - \\varepsilon, ${b} + \\varepsilon) \\not\\subseteq A`];
  } else if (kind === 1) {
    q = `[${a}, ${b}] \\cup [${b}, ${c}]`;
    right = iv(a, c, false, false);
    slip = ["endpointsInInterior", iv(a, c, true, true)];
    steps = [`A = [${a}, ${c}]`, `(${b} - \\varepsilon, ${b} + \\varepsilon) \\subseteq A, \\quad ${a}, ${c} \\notin A^{\\circ}`];
  } else if (kind === 2) {
    q = `(${a}, ${b})`;
    right = iv(a, b, true, true);
    slip = ["limitPointsLeftOut", iv(a, b, false, false)];
    steps = [`${a} + \\tfrac{1}{n} \\to ${a}, \\quad ${b} - \\tfrac{1}{n} \\to ${b}`];
  } else if (kind === 3) {
    q = `(${a}, ${b}]`;
    right = iv(a, b, true, true);
    slip = ["limitPointsLeftOut", iv(a, b, false, true)];
    steps = [`${a} + \\tfrac{1}{n} \\to ${a}`];
  } else if (kind === 4) {
    q = `(${a}, ${b}) \\cup (${b}, ${c})`;
    right = iv(a, c, true, true);
    slip = ["limitPointsLeftOut", iv(a, c, false, false)];
    steps = [`${a} + \\tfrac{1}{n} \\to ${a}, \\quad ${b} \\pm \\tfrac{1}{n} \\to ${b}, \\quad ${c} - \\tfrac{1}{n} \\to ${c}`];
  } else {
    q = `\\mathbb{Q} \\cap (${a}, ${b})`;
    right = iv(a, b, true, true);
    slip = ["limitPointsLeftOut", iv(a, b, false, false)];
    steps = [`x \\in [${a}, ${b}]: \\; q_{n} \\in \\mathbb{Q} \\cap (${a}, ${b}), \\; q_{n} \\to x`];
  }
  const traps: Trap[] = [{ id: slip[0], a: ineqOf(slip[1]) }];
  return {
    prompt: closure ? w.top.prompt.closure : w.top.prompt.interior,
    q: `A = ${q}`,
    answer: { ...ineqOf(right), traps },
    show: intervalTex(right),
    plain: intervalPlain(right),
    format: "inequality",
    steps: [...steps, `${closure ? "\\overline{A}" : "A^{\\circ}"} = ${intervalTex(right)}`],
  };
}

function boundaryPart(r: Rng, w: PracticeWords): Part {
  const [a, b, c, d] = ends(r);
  const kind = r.int(0, 3);
  const sets: { pieces: Piece[]; right: number[]; slips: [MistakeId, number[]][] }[] = [
    { pieces: [iv(a, b, true, false), iv(b, c, false, true)], right: [a, b, c], slips: [["boundaryGapMissed", [a, c]]] },
    { pieces: [iv(a, b, false, false), point(c)], right: [a, b, c], slips: [["isolatedPointBoundary", [a, b]]] },
    { pieces: [iv(a, b, true, true), iv(c, d, true, true)], right: [a, b, c, d], slips: [["boundaryGapMissed", [a, d]]] },
    { pieces: [iv(a, b, false, false), iv(b, c, false, false), point(d)], right: [a, b, c, d], slips: [["boundaryGapMissed", [a, c, d]], ["isolatedPointBoundary", [a, b, c]]] },
  ];
  const s = sets[kind];
  return {
    prompt: w.top.prompt.boundary,
    q: `A = ${unionTex(s.pieces)}`,
    ...elementsOf(s.right, s.slips),
    steps: [`\\partial A = \\overline{A} \\setminus A^{\\circ}`, `x \\in \\partial A \\Leftrightarrow (x - \\varepsilon, x + \\varepsilon) \\cap A \\ne \\varnothing \\; \\land \\; (x - \\varepsilon, x + \\varepsilon) \\not\\subseteq A`, `\\partial A = \\{${s.right.join(", ")}\\}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? opennessPart(r, w) : L === 2 ? interiorPart(r, w) : boundaryPart(r, w));

export default gen;
