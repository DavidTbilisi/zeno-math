// Practice: Compactness. Easy says whether a set is compact by Heine–Borel (bounded taken to be enough, or closed,
// named); medium lists the limits of a bounded sequence's convergent subsequences (one missed, named) or counts the
// fewest sets of an open cover that cover [a, b] (one end left out, named); hard finds where a nested open cover
// first covers a compact set (an open end taken to be in the set, named) or the maximum a continuous function attains
// on a closed interval (the ends alone tried, named).
import { minusA, pickOf, word } from "../calculusTwo";
import { elementsOf } from "../groups";
import { wholeOf } from "../realAnalysis";
import type { MistakeId } from "../mistakes";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

function compactPart(r: Rng, w: PracticeWords): Part {
  const a = r.int(-5, 2);
  const b = a + r.int(1, 4);
  const c = b + r.int(1, 3);
  const d = c + r.int(1, 3);
  const k = r.int(1, 4);
  const options = [word(w.top.compact), word(w.top.notCompact)];
  const cases: { q: string; right: 0 | 1; slip?: [MistakeId, number]; steps: string[] }[] = [
    { q: `[${a}, ${b}]`, right: 0, steps: [`[${a}, ${b}] \\subseteq [-${Math.max(-a, b, 1)}, ${Math.max(-a, b, 1)}]`, `\\mathbb{R} \\setminus [${a}, ${b}] = (-\\infty, ${a}) \\cup (${b}, \\infty)`] },
    { q: `(${a}, ${b}]`, right: 1, slip: ["boundedMeansCompact", 0], steps: [`${a} + \\tfrac{1}{n} \\to ${a} \\notin K`] },
    { q: `(${a}, ${b})`, right: 1, slip: ["boundedMeansCompact", 0], steps: [`${b} - \\tfrac{1}{n} \\to ${b} \\notin K`] },
    { q: `[${a}, \\infty)`, right: 1, slip: ["closedMeansCompact", 0], steps: [`x_{n} = ${a} + n \\to \\infty`, `\\{(${a} - 1, n) : n \\in \\mathbb{N}\\}`] },
    { q: "\\mathbb{Z}", right: 1, slip: ["closedMeansCompact", 0], steps: ["\\{(k - \\tfrac{1}{2}, k + \\tfrac{1}{2}) : k \\in \\mathbb{Z}\\}", "x_{n} = n \\to \\infty"] },
    { q: "\\left\\{ \\tfrac{1}{n} : n \\in \\mathbb{N} \\right\\} \\cup \\{0\\}", right: 0, steps: ["K \\subseteq [0, 1]", "\\tfrac{1}{n} \\to 0 \\in K"] },
    { q: "\\left\\{ \\tfrac{1}{n} : n \\in \\mathbb{N} \\right\\}", right: 1, slip: ["boundedMeansCompact", 0], steps: ["\\tfrac{1}{n} \\to 0 \\notin K"] },
    { q: `\\{${a}, ${b}, ${c}\\}`, right: 0, steps: [`K \\subseteq [${a}, ${c}]`, "|K| = 3"] },
    { q: `\\mathbb{Q} \\cap [${a}, ${b}]`, right: 1, slip: ["boundedMeansCompact", 0], steps: [`q_{n} \\to ${a} + \\tfrac{\\sqrt{2}}{2} \\notin K`] },
    { q: `[${a}, ${b}] \\cup [${c}, ${d}]`, right: 0, steps: [`K \\subseteq [${a}, ${d}]`, `\\mathbb{R} \\setminus K = (-\\infty, ${a}) \\cup (${b}, ${c}) \\cup (${d}, \\infty)`] },
    { q: `\\{(x, y) : x^{2} + y^{2} \\le ${k * k}\\}`, right: 0, steps: [`|x|, |y| \\le ${k}`, `x_{n}^{2} + y_{n}^{2} \\le ${k * k} \\Rightarrow x^{2} + y^{2} \\le ${k * k}`] },
    { q: `\\{(x, y) : x^{2} + y^{2} < ${k * k}\\}`, right: 1, slip: ["boundedMeansCompact", 0], steps: [`\\left(${k} - \\tfrac{1}{n}, 0\\right) \\to (${k}, 0) \\notin K`] },
    { q: `\\{(x, y) : xy = ${k}\\}`, right: 1, slip: ["closedMeansCompact", 0], steps: [`\\left(n, \\tfrac{${k}}{n}\\right) \\in K, \\; n \\to \\infty`] },
  ];
  const s = r.pick(cases);
  return { prompt: w.top.prompt.compact, q: `K = ${s.q}`, ...pickOf(options, s.right, s.slip ? [s.slip] : []), steps: s.steps };
}

function sequencePart(r: Rng, w: PracticeWords): Part {
  if (r.next() < 0.4) {
    const a = r.int(-4, 2);
    const b = a + r.int(2, 6);
    return {
      prompt: w.top.prompt.subcover,
      q: `\\{(k - 1, k + 1) : k \\in \\mathbb{Z}\\}, \\quad [${a}, ${b}]`,
      ...wholeOf(b - a + 1, [["fencepostSubcover", b - a]]),
      steps: [`m \\in \\mathbb{Z} \\Rightarrow m \\in (k - 1, k + 1) \\Leftrightarrow k = m`, `k = ${a}, \\dots, ${b}: \\; ${b} - ${a} + 1 = ${b - a + 1}`],
    };
  }
  const k = r.int(1, 5);
  const m = r.int(1, 4);
  const kind = r.int(0, 2);
  if (kind === 0)
    return {
      prompt: w.top.prompt.subsequence,
      q: `x_{n} = (-1)^{n} \\cdot ${k} + \\frac{${m}}{n}`,
      ...elementsOf([-k, k], [["subsequenceLimitMissed", [k]]]),
      steps: [`x_{2n} = ${k} + \\frac{${m}}{2n} \\to ${k}`, `x_{2n - 1} = -${k} + \\frac{${m}}{2n - 1} \\to -${k}`],
    };
  if (kind === 1)
    return {
      prompt: w.top.prompt.subsequence,
      q: `x_{n} = ${k === 1 ? "" : k}\\cos\\left(\\frac{n\\pi}{2}\\right)`,
      ...elementsOf([-k, 0, k], [["subsequenceLimitMissed", [-k, k]]]),
      steps: [`x_{1}, x_{2}, x_{3}, x_{4}, \\dots = 0, -${k}, 0, ${k}, \\dots`, `x_{2n - 1} = 0, \\; x_{4n - 2} = -${k}, \\; x_{4n} = ${k}`],
    };
  return {
    prompt: w.top.prompt.subsequence,
    q: `x_{n} = (n \\bmod 3) \\cdot ${k} + \\frac{${m}}{n}`,
    ...elementsOf([0, k, 2 * k], [["subsequenceLimitMissed", [k, 2 * k]]]),
    steps: [`x_{3n} = \\frac{${m}}{3n} \\to 0`, `x_{3n + 1} \\to ${k}, \\quad x_{3n + 2} \\to ${2 * k}`],
  };
}

function coverPart(r: Rng, w: PracticeWords): Part {
  const kind = r.int(0, 2);
  if (kind === 0) {
    const m = r.int(2, 9);
    return {
      prompt: w.top.prompt.nested,
      q: `U_{n} = \\left(\\tfrac{1}{n}, 2\\right), \\quad \\left[\\tfrac{1}{${m}}, 1\\right] \\subseteq U_{1} \\cup \\dots \\cup U_{N}`,
      ...wholeOf(m + 1, [["openEndIncluded", m]]),
      steps: [`U_{1} \\cup \\dots \\cup U_{N} = \\left(\\tfrac{1}{N}, 2\\right)`, `\\tfrac{1}{N} < \\tfrac{1}{${m}} \\Leftrightarrow N > ${m}`, `N = ${m + 1}`],
    };
  }
  if (kind === 1) {
    const a = r.int(-9, -1);
    const b = r.int(1, 9);
    const top = Math.max(-a, b);
    return {
      prompt: w.top.prompt.nested,
      q: `U_{n} = (-n, n), \\quad [${a}, ${b}] \\subseteq U_{1} \\cup \\dots \\cup U_{N}`,
      ...wholeOf(top + 1, [["openEndIncluded", top]]),
      steps: [`U_{1} \\cup \\dots \\cup U_{N} = (-N, N)`, `${top} < N`, `N = ${top + 1}`],
    };
  }
  const m = r.int(-3, 3);
  const a = m - r.int(1, 3);
  const b = m + r.int(1, 3);
  const k = r.int(10, 20);
  const f = (x: number) => k - (x - m) ** 2;
  return {
    prompt: w.top.prompt.extreme,
    q: `f(x) = ${k} - ${m === 0 ? "x^{2}" : `(${minusA(m)})^{2}`}, \\quad x \\in [${a}, ${b}]`,
    ...wholeOf(k, [["extremeAtEndsOnly", Math.max(f(a), f(b))]]),
    steps: [`f'(x) = -2(${minusA(m)}) = 0 \\Rightarrow x = ${m} \\in [${a}, ${b}]`, `f(${a}) = ${f(a)}, \\; f(${m}) = ${k}, \\; f(${b}) = ${f(b)}`, `\\max f = ${k}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? compactPart(r, w) : L === 2 ? sequencePart(r, w) : coverPart(r, w));

export default gen;
