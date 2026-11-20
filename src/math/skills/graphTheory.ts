// Practice: Graph theory. Easy counts the edges from a degree sequence (the degree sum not halved, named); medium the
// edges of a tree or of Kₙ, or whether Kₙ or Kₘ,ₙ has an Euler circuit (vertices for edges, Kₙ not halved, odd
// degrees ignored, named); hard the faces of a connected plane graph by Euler's formula (the outer face forgotten,
// named), or the perfect matchings of K₂ₙ (ordered pairs, named).
import { pickOf, word } from "../calculusTwo";
import { factorial, graphical, matchings, sub } from "../discrete";
import { wholeOf } from "../realAnalysis";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

function degreesPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const n = r.int(5, 7);
    const ds = Array.from({ length: n }, () => r.int(1, n - 1)).sort((a, b) => b - a);
    const total = ds.reduce((s, x) => s + x, 0);
    if (!graphical(ds)) continue;
    return {
      prompt: w.dm.prompt.edgesFromDegrees,
      q: `(${ds.join(", ")})`,
      ...wholeOf(total / 2, [["degreeSumNotHalved", total]]),
      steps: [`\\sum \\deg v = 2|E|`, `${ds.join(" + ")} = ${total}, \\quad |E| = \\frac{${total}}{2} = ${total / 2}`],
    };
  }
}

function edgesPart(r: Rng, w: PracticeWords): Part {
  const kind = r.int(0, 2);
  if (kind === 0) {
    const n = r.int(6, 30);
    return {
      prompt: fill(w.dm.prompt.treeEdges, { n }),
      q: `|V| = ${n}`,
      ...wholeOf(n - 1, [["treeEdgesEqualVertices", n]]),
      steps: [`|E| = |V| - 1`, `${n} - 1 = ${n - 1}`],
    };
  }
  if (kind === 1) {
    const n = r.int(5, 15);
    return {
      prompt: fill(w.dm.prompt.completeEdges, { k: `K${sub(n)}` }),
      q: `K_{${n}}`,
      ...wholeOf((n * (n - 1)) / 2, [["completeEdgesNotHalved", n * (n - 1)]]),
      steps: [`|E| = \\binom{${n}}{2} = \\frac{${n} \\cdot ${n - 1}}{2}`, `= ${(n * (n - 1)) / 2}`],
    };
  }
  const options = [word(w.dm.yes), word(w.dm.no)];
  if (r.next() < 0.5) {
    const n = r.int(4, 9);
    const even = (n - 1) % 2 === 0;
    return {
      prompt: fill(w.dm.prompt.eulerCircuit, { g: `K${sub(n)}` }),
      q: `K_{${n}}, \\quad \\deg v = ${n - 1}`,
      ...pickOf(options, even ? 0 : 1, [["eulerOddDegreesIgnored", even ? 1 : 0]]),
      steps: [`\\deg v = ${n} - 1 = ${n - 1}`, `${n - 1} \\equiv ${(n - 1) % 2} \\pmod 2`],
    };
  }
  const m = r.int(2, 6);
  const n = r.int(2, 6);
  const even = m % 2 === 0 && n % 2 === 0;
  return {
    prompt: fill(w.dm.prompt.eulerCircuit, { g: `K${sub(m)},${sub(n)}` }),
    q: `K_{${m},${n}}`,
    ...pickOf(options, even ? 0 : 1, [["eulerOddDegreesIgnored", even ? 1 : 0]]),
    steps: [`\\deg = ${n} \\; (${m}), \\quad \\deg = ${m} \\; (${n})`, `${n} \\equiv ${n % 2}, \\; ${m} \\equiv ${m % 2} \\pmod 2`],
  };
}

function hardPart(r: Rng, w: PracticeWords): Part {
  if (r.next() < 0.5) {
    const V = r.int(5, 12);
    const E = r.int(V, 3 * V - 6);
    const F = E - V + 2;
    return {
      prompt: w.dm.prompt.faces,
      q: `|V| = ${V}, \\quad |E| = ${E}`,
      ...wholeOf(F, [["outerFaceForgotten", F - 1]]),
      steps: [`|V| - |E| + |F| = 2`, `|F| = 2 - ${V} + ${E} = ${F}`],
    };
  }
  const n = r.int(2, 5);
  const v = matchings(n);
  const odds = Array.from({ length: n }, (_, i) => 2 * n - 1 - 2 * i).join(" \\cdot ");
  return {
    prompt: fill(w.dm.prompt.matchings, { k: `K${sub(2 * n)}` }),
    q: `K_{${2 * n}}`,
    ...wholeOf(v, [["matchingsOrdered", factorial(2 * n) / 2 ** n]]),
    steps: [`(${2 * n} - 1)!! = ${odds}`, `= ${v}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? degreesPart(r, w) : L === 2 ? edgesPart(r, w) : hardPart(r, w));

export default gen;
