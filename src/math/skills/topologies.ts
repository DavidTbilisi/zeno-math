// Practice: Topological spaces. Easy says whether a collection of subsets of {a, b, c} is a topology and, if not,
// which axiom fails first (∅ or X, a union, an intersection left unchecked, named); medium counts the open sets a
// subbasis on {a, b, c, d} generates (the subbasis taken as the topology, the intersections skipped, named); hard
// says whether a map between finite spaces is continuous (images checked for preimages, named) or whether two
// spaces are homeomorphic (boundedness taken as topological, a cut point ignored, named).
import { pickOf, word } from "../calculusTwo";
import { wholeOf } from "../realAnalysis";
import { collectionTex, faultPair, generated, intersectionsOf, isContinuous, isOpenMap, preimage, sortMasks, subsetTex, topologyFault, unionsOf } from "../topology";
import type { MistakeId } from "../mistakes";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** Topologies on X = {a, b, c} (bit masks of a = 1, b = 2, c = 4). */
export const TOPOLOGIES_3: number[][] = [
  [0, 7],
  [0, 1, 7],
  [0, 3, 7],
  [0, 1, 3, 7],
  [0, 1, 6, 7],
  [0, 1, 2, 3, 7],
  [0, 1, 3, 5, 7],
  [0, 2, 3, 6, 7],
  [0, 1, 2, 3, 4, 5, 6, 7],
];

function collectionPart(r: Rng, w: PracticeWords): Part {
  const n = 3;
  const all = 7;
  const want = r.int(0, 3);
  let ms: number[] = [];
  for (let tries = 0; tries < 200; tries++) {
    const k = r.int(1, 3);
    const body = Array.from({ length: k }, () => r.int(1, 6));
    const withEnds = [...(r.next() < 0.9 || want !== 1 ? [0] : []), ...(r.next() < 0.9 || want !== 1 ? [all] : []), ...body];
    ms = sortMasks(want === 1 && withEnds.includes(0) && withEnds.includes(all) ? withEnds.filter((m) => m !== (r.next() < 0.5 ? 0 : all)) : withEnds);
    if (topologyFault(ms, n) === want) break;
  }
  const fault = topologyFault(ms, n);
  const S = w.top.space;
  const options = [word(S.topology), word(S.whole), word(S.unions), word(S.intersections)];
  const s = new Set(ms);
  const slips: [MistakeId, number][] =
    fault === 1
      ? [["emptyOrWholeMissing", topologyFault([...ms, 0, all], n)]]
      : fault === 2
        ? [["unionsNotChecked", [...s].every((a) => [...s].every((b) => s.has(a & b))) ? 0 : 3]]
        : fault === 3
          ? [["intersectionsNotChecked", 0]]
          : [];
  let steps: string[];
  if (fault === 0) steps = ["\\varnothing, X \\in \\tau", "U, V \\in \\tau \\Rightarrow U \\cup V, \\; U \\cap V \\in \\tau"];
  else if (fault === 1) steps = [s.has(0) ? "X \\notin \\tau" : "\\varnothing \\notin \\tau"];
  else {
    const [a, b] = faultPair(ms, fault);
    const op = fault === 2 ? "\\cup" : "\\cap";
    steps = ["\\varnothing, X \\in \\tau", `${subsetTex(a, n)} ${op} ${subsetTex(b, n)} = ${subsetTex(fault === 2 ? a | b : a & b, n)} \\notin \\tau`];
  }
  return { prompt: w.top.prompt.isTopology, q: `X = \\{a, b, c\\}, \\quad \\tau = ${collectionTex(ms, n)}`, ...pickOf(options, fault, slips), steps };
}

function subbasisPart(r: Rng, w: PracticeWords): Part {
  const n = 4;
  const all = 15;
  let sub: number[] = [];
  for (let tries = 0; tries < 200; tries++) {
    const k = r.int(2, 3);
    sub = sortMasks(Array.from({ length: k }, () => r.int(1, 14)));
    // Ask only when a skipped step changes the count.
    if (sub.length === k && generated(sub, n).length !== unionsOf([...sub, all]).length) break;
  }
  const tau = generated(sub, n);
  const finite = intersectionsOf(sub, n);
  return {
    prompt: w.top.prompt.generated,
    q: `X = \\{a, b, c, d\\}, \\quad \\mathcal{S} = ${collectionTex(sub, n)}`,
    ...wholeOf(tau.length, [
      ["subbasisIsTopology", sub.length + 2],
      ["intersectionsSkipped", unionsOf([...sub, all]).length],
    ]),
    steps: [`\\mathcal{B} = ${collectionTex(finite, n)}`, `\\tau = ${collectionTex(tau, n)}`, `|\\tau| = ${tau.length}`],
  };
}

const SPACES: { a: string; b: string; right: 0 | 1; slip?: MistakeId; steps: string[] }[] = [
  { a: "(0, 1)", b: "\\mathbb{R}", right: 0, slip: "boundednessNotTopological", steps: ["f(x) = \\tan\\left(\\pi x - \\tfrac{\\pi}{2}\\right)", "f^{-1}(y) = \\tfrac{1}{2} + \\tfrac{\\arctan y}{\\pi}"] },
  { a: "(0, 1)", b: "(0, \\infty)", right: 0, slip: "boundednessNotTopological", steps: ["f(x) = \\tfrac{x}{1 - x}", "f^{-1}(y) = \\tfrac{y}{1 + y}"] },
  { a: "\\{x^{2} + y^{2} < 1\\}", b: "\\mathbb{R}^{2}", right: 0, slip: "boundednessNotTopological", steps: ["f(p) = \\tfrac{p}{1 - |p|}", "f^{-1}(q) = \\tfrac{q}{1 + |q|}"] },
  { a: "[0, 1]", b: "[0, 5]", right: 0, steps: ["f(x) = 5x", "f^{-1}(y) = \\tfrac{y}{5}"] },
  { a: "\\{x^{2} + y^{2} = 1\\}", b: "\\{\\max(|x|, |y|) = 1\\}", right: 0, steps: ["f(p) = \\tfrac{p}{\\max(|p_{1}|, |p_{2}|)}", "f^{-1}(q) = \\tfrac{q}{|q|}"] },
  { a: "[0, 1]", b: "(0, 1)", right: 1, steps: ["x_{n} \\in [0, 1] \\Rightarrow x_{n_{k}} \\to x \\in [0, 1]", "(0, 1): \\; \\tfrac{1}{n} \\to 0 \\notin (0, 1)"] },
  { a: "[0, 1)", b: "(0, 1)", right: 1, slip: "cutPointIgnored", steps: ["[0, 1) \\setminus \\{0\\} = (0, 1)", "(0, 1) \\setminus \\{p\\} = (0, p) \\cup (p, 1)"] },
  { a: "\\mathbb{R}", b: "\\mathbb{R}^{2}", right: 1, slip: "cutPointIgnored", steps: ["\\mathbb{R} \\setminus \\{0\\} = (-\\infty, 0) \\cup (0, \\infty)", "\\mathbb{R}^{2} \\setminus \\{f(0)\\}: \\; 1"] },
  { a: "\\{x^{2} + y^{2} = 1\\}", b: "[0, 1]", right: 1, slip: "cutPointIgnored", steps: ["[0, 1] \\setminus \\{\\tfrac{1}{2}\\} = [0, \\tfrac{1}{2}) \\cup (\\tfrac{1}{2}, 1]", "S^{1} \\setminus \\{p\\} \\cong (0, 1)"] },
  { a: "(0, 1) \\cup (2, 3)", b: "(0, 1)", right: 1, steps: ["(0, 1) \\cup (2, 3): \\; 2", "(0, 1): \\; 1"] },
];

function mapPart(r: Rng, w: PracticeWords): Part {
  if (r.next() < 0.4) {
    const s = r.pick(SPACES);
    const options = [word(w.top.homeomorphic), word(w.top.notHomeomorphic)];
    return { prompt: w.top.prompt.homeomorphic, q: `${s.a}, \\quad ${s.b}`, ...pickOf(options, s.right, s.slip ? [[s.slip, 1 - s.right]] : []), steps: s.steps };
  }
  const n = 3;
  const want = r.next() < 0.5;
  let [tx, ty, f] = [TOPOLOGIES_3[1], TOPOLOGIES_3[1], [0, 0, 0]];
  for (let tries = 0; tries < 200; tries++) {
    tx = r.pick(TOPOLOGIES_3.slice(1, -1));
    ty = r.pick(TOPOLOGIES_3.slice(1, -1));
    f = [r.int(0, 2), r.int(0, 2), r.int(0, 2)];
    // Ask only when checking images instead of preimages gives the other answer half the time.
    if (isContinuous(f, tx, ty) === want && (tries > 100 || isOpenMap(f, tx, ty) !== want)) break;
  }
  const cont = isContinuous(f, tx, ty);
  const options = [word(w.top.continuous), word(w.top.notContinuous)];
  const L = (i: number) => "abc"[i];
  const bad = ty.find((v) => !tx.includes(preimage(f, v)));
  return {
    prompt: w.top.prompt.continuous,
    q: `\\tau_{X} = ${collectionTex(tx, n)}, \\quad \\tau_{Y} = ${collectionTex(ty, n)}, \\quad f = (a, b, c) \\mapsto (${f.map(L).join(", ")})`,
    ...pickOf(options, cont ? 0 : 1, [["imageForPreimage", isOpenMap(f, tx, ty) ? 0 : 1]]),
    steps:
      bad === undefined
        ? [ty.map((v) => `f^{-1}(${subsetTex(v, n)}) = ${subsetTex(preimage(f, v), n)}`).join(", \\; "), "f^{-1}(V) \\in \\tau_{X}"]
        : [`f^{-1}(${subsetTex(bad, n)}) = ${subsetTex(preimage(f, bad), n)} \\notin \\tau_{X}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? collectionPart(r, w) : L === 2 ? subbasisPart(r, w) : mapPart(r, w));

export default gen;
