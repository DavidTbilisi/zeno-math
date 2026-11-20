// Practice: Connectedness. Easy says whether a set is connected (a missing point ignored, a union of touching pieces
// called disconnected, a dense set called connected, named); medium counts the connected components (touching pieces
// counted apart, a fencepost slip, the plane split by one point, named); hard says whether a set is path-connected,
// connected only, or not connected (the topologist's sine curve, tangent open discs and the plane less a countable set
// taken the wrong way, named).
import { pickOf, word } from "../calculusTwo";
import { wholeOf } from "../realAnalysis";
import { componentsOf, iv, point, unionTex, type Piece } from "../topology";
import type { MistakeId } from "../mistakes";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

function ends(r: Rng): [number, number, number, number] {
  const a = r.int(-6, 2);
  const b = a + r.int(1, 4);
  const c = b + r.int(1, 4);
  return [a, b, c, c + r.int(1, 3)];
}

function connectedPart(r: Rng, w: PracticeWords): Part {
  const [a, b, c] = ends(r);
  const k = r.int(1, 4);
  const options = [word(w.top.connected), word(w.top.notConnected)];
  const cases: { q: string; right: 0 | 1; slip?: [MistakeId, number]; steps: string[] }[] = [
    { q: `[${a}, ${b}]`, right: 0, steps: [`x < y \\in A \\Rightarrow [x, y] \\subseteq A`] },
    { q: `[${a}, ${c}] \\setminus \\{${b}\\}`, right: 1, slip: ["gapPointIgnored", 0], steps: [`A = [${a}, ${b}) \\cup (${b}, ${c}]`, `U = (-\\infty, ${b}), \\; V = (${b}, \\infty)`] },
    { q: `(${a}, ${b}) \\cup (${b}, ${c})`, right: 1, slip: ["gapPointIgnored", 0], steps: [`${b} \\notin A`, `U = (-\\infty, ${b}), \\; V = (${b}, \\infty)`] },
    { q: `[${a}, ${b}] \\cup (${b}, ${c})`, right: 0, slip: ["unionAlwaysDisconnected", 1], steps: [`[${a}, ${b}] \\cup (${b}, ${c}) = [${a}, ${c})`] },
    { q: `[${a}, ${b}) \\cup [${b}, ${c}]`, right: 0, slip: ["unionAlwaysDisconnected", 1], steps: [`[${a}, ${b}) \\cup [${b}, ${c}] = [${a}, ${c}]`] },
    { q: "\\mathbb{Q}", right: 1, slip: ["denseMeansConnected", 0], steps: ["U = (-\\infty, \\sqrt{2}) \\cap \\mathbb{Q}, \\; V = (\\sqrt{2}, \\infty) \\cap \\mathbb{Q}"] },
    { q: "\\mathbb{R} \\setminus \\mathbb{Q}", right: 1, slip: ["denseMeansConnected", 0], steps: ["U = (-\\infty, 0), \\; V = (0, \\infty)", "0 \\notin A"] },
    { q: `\\{(x, y) : x^{2} + y^{2} = ${k * k}\\}`, right: 0, steps: [`t \\mapsto (${k} \\cos t, ${k} \\sin t), \\; t \\in [0, 2\\pi]`] },
    { q: `\\mathbb{R}^{2} \\setminus \\{(${a}, ${b})\\}`, right: 0, slip: ["planeMinusPointSplit", 1], steps: [`p, q \\ne (${a}, ${b}): \\; p \\to s \\to q, \\; s \\notin \\overline{pq} \\cup \\{(${a}, ${b})\\}`] },
    { q: `\\{(x, y) : xy = ${k}\\}`, right: 1, steps: [`x > 0 \\; \\lor \\; x < 0`, `U = \\{x > 0\\}, \\; V = \\{x < 0\\}`] },
  ];
  const s = r.pick(cases);
  return { prompt: w.top.prompt.connected, q: `A = ${s.q}`, ...pickOf(options, s.right, s.slip ? [s.slip] : []), steps: s.steps };
}

function componentsPart(r: Rng, w: PracticeWords): Part {
  const kind = r.int(0, 2);
  if (kind === 0) {
    // A union of pieces of ℝ, some touching through a closed end.
    const [a, b, c, d] = ends(r);
    const e = d + r.int(1, 3);
    const options: Piece[][] = [
      [iv(a, b, true, true), iv(b, c, false, false), iv(d, e, true, true)],
      [iv(a, b, true, false), iv(b, c, true, true), point(e)],
      [iv(a, b, false, false), iv(b, c, false, true), iv(c, d, false, false)],
      [iv(a, b, false, true), iv(b, c, false, false), iv(c, d, true, true), point(e)],
    ];
    const pieces = r.pick(options);
    const count = componentsOf(pieces);
    return {
      prompt: w.top.prompt.components,
      q: `A = ${unionTex(pieces)}`,
      ...wholeOf(count, [["touchingPiecesCounted", pieces.length]]),
      steps: [`[x, y) \\cup [y, z) = [x, z), \\quad (x, y) \\cup (y, z) \\not\\ni y`, `${count}`],
    };
  }
  if (kind === 1) {
    const n = r.int(2, 7);
    const pts = Array.from({ length: n }, (_, i) => i * 2 - n + 1);
    return {
      prompt: w.top.prompt.components,
      q: `A = \\mathbb{R} \\setminus \\{${pts.join(", ")}\\}`,
      ...wholeOf(n + 1, [["componentsFencepost", n]]),
      steps: [`(-\\infty, ${pts[0]}), \\; ${pts.slice(1).map((p, i) => `(${pts[i]}, ${p})`).join(", \\; ")}, \\; (${pts[n - 1]}, \\infty)`, `${n} + 1 = ${n + 1}`],
    };
  }
  const shapes: { q: string; n: number; slip: [MistakeId, number]; steps: string[] }[] = [
    { q: "\\mathbb{R}^{2} \\setminus \\{(0, 0)\\}", n: 1, slip: ["planeMinusPointSplit", 2], steps: ["(1, 0) \\to (0, 1) \\to (-1, 0) \\to (0, -1)"] },
    { q: "\\mathbb{R}^{2} \\setminus \\{(x, 0) : x \\in \\mathbb{R}\\}", n: 2, slip: ["planeMinusPointSplit", 1], steps: ["y > 0 \\; \\lor \\; y < 0"] },
    { q: "\\mathbb{R}^{2} \\setminus (\\{x = 0\\} \\cup \\{y = 0\\})", n: 4, slip: ["planeMinusPointSplit", 2], steps: ["\\operatorname{sgn} x, \\; \\operatorname{sgn} y: \\; 2 \\cdot 2 = 4"] },
    { q: "\\mathbb{R}^{2} \\setminus \\{(x, y) : x^{2} + y^{2} = 1\\}", n: 2, slip: ["planeMinusPointSplit", 1], steps: ["x^{2} + y^{2} < 1 \\; \\lor \\; x^{2} + y^{2} > 1"] },
    { q: "\\mathbb{R}^{2} \\setminus \\{(0, 0), (1, 0), (2, 0)\\}", n: 1, slip: ["planeMinusPointSplit", 4], steps: ["p \\to (p_{1}, 1) \\to (q_{1}, 1) \\to q"] },
  ];
  const s = r.pick(shapes);
  return { prompt: w.top.prompt.components, q: `A = ${s.q}`, ...wholeOf(s.n, [s.slip]), steps: [...s.steps, `${s.n}`] };
}

function pathPart(r: Rng, w: PracticeWords): Part {
  const P = w.top.path;
  const options = [word(P.path), word(P.only), word(P.not)];
  const k = r.int(1, 4);
  const cases: { q: string; right: 0 | 1 | 2; slip?: [MistakeId, number]; steps: string[] }[] = [
    { q: "\\left\\{ \\left(x, \\sin \\tfrac{1}{x}\\right) : x > 0 \\right\\} \\cup \\{0\\} \\times [-1, 1]", right: 1, slip: ["connectedMeansPathConnected", 0], steps: ["S = \\left\\{ \\left(x, \\sin \\tfrac{1}{x}\\right) \\right\\}: \\; \\overline{S} \\supseteq \\{0\\} \\times [-1, 1]", "\\gamma(t) \\to (0, 0) \\Rightarrow \\sin \\tfrac{1}{x} \\to 0, \\; \\sin \\tfrac{1}{x_{n}} = 1 \\; (x_{n} = \\tfrac{2}{(4n + 1)\\pi})"] },
    { q: "\\left\\{ \\left(x, \\sin \\tfrac{1}{x}\\right) : x > 0 \\right\\} \\cup \\{(0, 0)\\}", right: 1, slip: ["connectedMeansPathConnected", 0], steps: ["S \\subseteq A \\subseteq \\overline{S}", "\\gamma(t) \\to (0, 0) \\Rightarrow \\sin \\tfrac{1}{x} \\to 0, \\; \\sin \\tfrac{1}{x_{n}} = 1 \\; (x_{n} = \\tfrac{2}{(4n + 1)\\pi})"] },
    { q: `\\{x^{2} + y^{2} < ${k * k}\\} \\cup \\{(x - ${2 * k})^{2} + y^{2} < ${k * k}\\}`, right: 2, slip: ["tangentOpenDiscsJoin", 0], steps: [`(${k}, 0) \\notin A`, `U = \\{x < ${k}\\} \\cap A, \\; V = \\{x > ${k}\\} \\cap A`] },
    { q: `\\{x^{2} + y^{2} \\le ${k * k}\\} \\cup \\{(x - ${2 * k})^{2} + y^{2} \\le ${k * k}\\}`, right: 0, steps: [`(${k}, 0) \\in A`, `p \\to (${k}, 0) \\to q`] },
    { q: "\\mathbb{R}^{2} \\setminus \\mathbb{Q}^{2}", right: 0, slip: ["countableRemovalDisconnects", 2], steps: ["(x, y) \\to (x, \\sqrt{2}) \\to (\\sqrt{2}, \\sqrt{2})", "x \\notin \\mathbb{Q} \\lor y \\notin \\mathbb{Q}"] },
    { q: "\\mathbb{R}^{2} \\setminus \\{(n, 0) : n \\in \\mathbb{Z}\\}", right: 0, slip: ["countableRemovalDisconnects", 2], steps: ["p \\to (p_{1}, 1) \\to (q_{1}, 1) \\to q"] },
    { q: `\\{(x, y) : x^{2} + y^{2} = ${k * k}\\}`, right: 0, steps: [`\\gamma(t) = (${k} \\cos t, ${k} \\sin t)`] },
    { q: `[0, 1] \\times \\{0\\} \\cup [${k + 1}, ${k + 2}] \\times \\{0\\}`, right: 2, steps: [`m = ${(k + 2) / 2}: \\; U = \\{x < m\\}, \\; V = \\{x > m\\}`] },
  ];
  const s = r.pick(cases);
  return { prompt: w.top.prompt.pathConnected, q: `A = ${s.q}`, ...pickOf(options, s.right, s.slip ? [s.slip] : []), steps: s.steps };
}

const gen: Gen = (r, L, w) => (L === 1 ? connectedPart(r, w) : L === 2 ? componentsPart(r, w) : pathPart(r, w));

export default gen;
