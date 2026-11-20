// Practice: Metric spaces. Easy finds the distance between two points of ℝ² in d₁, d₂ or d∞ (another metric's
// distance, named); medium says whether d is a metric and, if not, which axiom fails first (an axiom left unchecked,
// or a metric rejected, named); hard names the shape of a ball in d₁, d₂, d∞ or the discrete metric, or finds its
// area (the diamond and the square swapped, the discrete ball's radius ignored, named).
import { pickOf, word } from "../calculusTwo";
import { wholeOf } from "../realAnalysis";
import { d1, d2, dInf } from "../topology";
import type { MistakeId } from "../mistakes";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const TRIPLES: [number, number][] = [[3, 4], [6, 8], [5, 12], [8, 15], [9, 12]];
const DEF = {
  d1: "|p_{1} - q_{1}| + |p_{2} - q_{2}|",
  d2: "\\sqrt{(p_{1} - q_{1})^{2} + (p_{2} - q_{2})^{2}}",
  dInf: "\\max(|p_{1} - q_{1}|, |p_{2} - q_{2}|)",
} as const;
const NAME = { d1: "d_{1}", d2: "d_{2}", dInf: "d_{\\infty}" } as const;
type Metric = keyof typeof DEF;

function distancePart(r: Rng, w: PracticeWords): Part {
  let [dx, dy] = r.pick(TRIPLES);
  if (r.next() < 0.5) [dx, dy] = [dy, dx];
  dx *= r.sign();
  dy *= r.sign();
  const [x, y] = [r.int(-5, 5), r.int(-5, 5)];
  const m = r.pick(["d1", "d2", "dInf"] as Metric[]);
  const value = { d1: d1(dx, dy), d2: d2(dx, dy), dInf: dInf(dx, dy) };
  const others = (["d1", "d2", "dInf"] as Metric[]).filter((k) => k !== m).map((k): [MistakeId, number] => ["otherMetric", value[k]]);
  const [a, b] = [Math.abs(dx), Math.abs(dy)];
  const last = m === "d1" ? `${a} + ${b} = ${value.d1}` : m === "d2" ? `\\sqrt{${a * a} + ${b * b}} = ${value.d2}` : `\\max(${a}, ${b}) = ${value.dInf}`;
  return {
    prompt: w.top.prompt.distance,
    q: `p = (${x}, ${y}), \\; q = (${x + dx}, ${y + dy}), \\quad ${NAME[m]}(p, q) = ?`,
    ...wholeOf(value[m], others),
    steps: [`${NAME[m]}(p, q) = ${DEF[m]}`, `|p_{1} - q_{1}| = ${a}, \\; |p_{2} - q_{2}| = ${b}`, `${NAME[m]}(p, q) = ${last}`],
  };
}

type Candidate = { q: string; right: 0 | 1 | 2 | 3; slip?: [MistakeId, number]; steps: string[] };
const CANDIDATES: Candidate[] = [
  { q: "d(x, y) = |x - y| \\quad (\\mathbb{R})", right: 0, steps: ["|x - z| \\le |x - y| + |y - z|"] },
  { q: "d(x, y) = \\sqrt{|x - y|} \\quad (\\mathbb{R})", right: 0, slip: ["metricRejected", 3], steps: ["\\sqrt{a + b} \\le \\sqrt{a} + \\sqrt{b} \\; (a, b \\ge 0)", "\\sqrt{|x - z|} \\le \\sqrt{|x - y| + |y - z|} \\le \\sqrt{|x - y|} + \\sqrt{|y - z|}"] },
  { q: "d(x, y) = \\frac{|x - y|}{1 + |x - y|} \\quad (\\mathbb{R})", right: 0, slip: ["metricRejected", 3], steps: ["\\varphi(t) = \\frac{t}{1 + t}: \\; \\varphi' > 0, \\; \\varphi(a + b) \\le \\varphi(a) + \\varphi(b)", "d(x, z) \\le \\varphi(|x - y| + |y - z|) \\le d(x, y) + d(y, z)"] },
  { q: "d(x, y) = \\min(|x - y|, 1) \\quad (\\mathbb{R})", right: 0, slip: ["metricRejected", 3], steps: ["d(x, y) + d(y, z) \\ge 1 \\ge d(x, z) \\; \\lor \\; d(x, y) + d(y, z) = |x - y| + |y - z| \\ge |x - z|"] },
  { q: "d(x, y) = |x^{3} - y^{3}| \\quad (\\mathbb{R})", right: 0, slip: ["metricRejected", 1], steps: ["x^{3} = y^{3} \\Rightarrow x = y", "|x^{3} - z^{3}| \\le |x^{3} - y^{3}| + |y^{3} - z^{3}|"] },
  { q: "d(x, y) = (x - y)^{2} \\quad (\\mathbb{R})", right: 3, slip: ["triangleNotChecked", 0], steps: ["d(0, 2) = 4", "d(0, 1) + d(1, 2) = 1 + 1 = 2 < 4"] },
  { q: "d(p, q) = (p_{1} - q_{1})^{2} + (p_{2} - q_{2})^{2} \\quad (\\mathbb{R}^{2})", right: 3, slip: ["triangleNotChecked", 0], steps: ["d((0, 0), (2, 0)) = 4", "d((0, 0), (1, 0)) + d((1, 0), (2, 0)) = 2 < 4"] },
  { q: "d(x, y) = |x^{2} - y^{2}| \\quad (\\mathbb{R})", right: 1, slip: ["identityNotChecked", 0], steps: ["d(1, -1) = |1 - 1| = 0", "1 \\ne -1"] },
  { q: "d(x, y) = |\\sin x - \\sin y| \\quad (\\mathbb{R})", right: 1, slip: ["identityNotChecked", 0], steps: ["d(0, \\pi) = |0 - 0| = 0", "0 \\ne \\pi"] },
  { q: "d(p, q) = |p_{1} - q_{1}| \\quad (\\mathbb{R}^{2})", right: 1, slip: ["identityNotChecked", 0], steps: ["d((0, 0), (0, 1)) = 0", "(0, 0) \\ne (0, 1)"] },
  { q: "d(x, y) = \\begin{cases} 2(y - x) & x \\le y \\\\ x - y & x > y \\end{cases} \\quad (\\mathbb{R})", right: 2, slip: ["symmetryNotChecked", 0], steps: ["d(x, y) = 0 \\Leftrightarrow x = y", "d(0, 1) = 2 \\ne d(1, 0) = 1"] },
  { q: "d(x, y) = |x - y| + |x| - |y| + 1 \\; (x \\ne y), \\; d(x, x) = 0 \\quad (\\mathbb{R})", right: 2, slip: ["symmetryNotChecked", 0], steps: ["|x - y| + |x| - |y| \\ge 0 \\Rightarrow d(x, y) \\ge 1 \\; (x \\ne y)", "d(0, 1) = 1 + 0 - 1 + 1 = 1 \\ne d(1, 0) = 1 + 1 - 0 + 1 = 3"] },
];

function axiomPart(r: Rng, w: PracticeWords): Part {
  const c = r.pick(CANDIDATES);
  const a = w.top.axiom;
  const options = [word(a.metric), word(a.identity), word(a.symmetry), word(a.triangle)];
  return { prompt: w.top.prompt.isMetric, q: c.q, ...pickOf(options, c.right, c.slip ? [c.slip] : []), steps: c.steps };
}

function ballPart(r: Rng, w: PracticeWords): Part {
  const [a, b] = [r.int(-3, 3), r.int(-3, 3)];
  if (r.next() < 0.35) {
    const radius = r.int(1, 6);
    const m = r.pick(["d1", "dInf"] as const);
    const [area, other] = m === "d1" ? [2 * radius * radius, 4 * radius * radius] : [4 * radius * radius, 2 * radius * radius];
    return {
      prompt: w.top.prompt.ballArea,
      q: `d(p, q) = ${DEF[m]}, \\quad B((${a}, ${b}), ${radius})`,
      ...wholeOf(area, [["ballShapesSwapped", other]]),
      steps:
        m === "d1"
          ? [`(${a} \\pm ${radius}, ${b}), \\; (${a}, ${b} \\pm ${radius})`, `\\frac{(2 \\cdot ${radius})^{2}}{2} = ${area}`]
          : [`(${a} \\pm ${radius}, ${b} \\pm ${radius})`, `(2 \\cdot ${radius})^{2} = ${area}`],
    };
  }
  const B = w.top.ball;
  const options = [word(B.disc), word(B.diamond), word(B.square), word(B.point), word(B.plane)];
  const kind = r.int(0, 3);
  if (kind === 3) {
    const big = r.next() < 0.5;
    const radius = big ? r.pick(["2", "3", "\\tfrac{3}{2}"]) : r.pick(["1", "\\tfrac{1}{2}"]);
    return {
      prompt: w.top.prompt.ballShape,
      q: `d(p, q) = \\begin{cases} 0 & p = q \\\\ 1 & p \\ne q \\end{cases}, \\quad B((${a}, ${b}), ${radius})`,
      ...pickOf(options, big ? 4 : 3, [["discreteBallRadius", big ? 3 : 4]]),
      steps: big ? [`d(p, q) \\le 1 < ${radius} \\; (q \\in \\mathbb{R}^{2})`, `B = \\mathbb{R}^{2}`] : [`d(p, q) = 1 \\not< ${radius} \\; (q \\ne p)`, `B = \\{(${a}, ${b})\\}`],
    };
  }
  const m = (["d2", "d1", "dInf"] as Metric[])[kind];
  const radius = r.int(1, 5);
  const steps: Record<Metric, string[]> = {
    d2: [`(p_{1} - ${a})^{2} + (p_{2} - ${b})^{2} < ${radius * radius}`],
    d1: [`|p_{1} - ${a}| + |p_{2} - ${b}| < ${radius}`, `(${a} \\pm ${radius}, ${b}), \\; (${a}, ${b} \\pm ${radius})`],
    dInf: [`|p_{1} - ${a}| < ${radius}, \\; |p_{2} - ${b}| < ${radius}`, `(${a} \\pm ${radius}, ${b} \\pm ${radius})`],
  };
  const slip: [MistakeId, number][] = m === "d1" ? [["ballShapesSwapped", 2]] : m === "dInf" ? [["ballShapesSwapped", 1]] : [];
  return { prompt: w.top.prompt.ballShape, q: `d(p, q) = ${DEF[m]}, \\quad B((${a}, ${b}), ${radius})`, ...pickOf(options, kind, slip), steps: steps[m] };
}

const gen: Gen = (r, L, w) => (L === 1 ? distancePart(r, w) : L === 2 ? axiomPart(r, w) : ballPart(r, w));

export default gen;
