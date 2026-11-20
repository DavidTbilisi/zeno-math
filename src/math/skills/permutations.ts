// Practice: Permutations. Easy finds the order of a permutation from its cycles or two-line notation (the sum or the
// product of the cycle lengths, named); medium composes στ, τ first (σ first, named); hard says whether a product of
// cycles is even or odd (a k-cycle counted as k transpositions, named) or counts the k-cycles in Sₙ (each cycle counted
// once for every place it can start, named).
import { pickOf, word } from "../calculusTwo";
import { compose, cyclesOf, cyclesTex, permOrder, rowOf, signOf, twoLineTex, type Perm } from "../groups";
import { fact, wholeOf } from "../realAnalysis";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** 1, …, n in a random order. */
function shuffled(r: Rng, n: number): number[] {
  const xs = Array.from({ length: n }, (_, i) => i + 1);
  for (let i = n - 1; i > 0; i--) {
    const j = r.int(0, i);
    [xs[i], xs[j]] = [xs[j], xs[i]];
  }
  return xs;
}

/** Disjoint cycles of the given lengths on n points, each written from its smallest element. */
function cyclesOfType(r: Rng, lengths: number[], n: number): number[][] {
  const xs = shuffled(r, n);
  let at = 0;
  return lengths.map((k) => {
    const c = xs.slice(at, (at += k));
    const i = c.indexOf(Math.min(...c));
    return [...c.slice(i), ...c.slice(0, i)];
  });
}

function orderPart(r: Rng, w: PracticeWords): Part {
  const lengths = r.pick([[2, 3], [2, 4], [3, 3], [2, 2], [3, 4], [2, 6], [4, 4], [2, 2, 3], [3, 5], [2, 3, 4], [3, 6], [2, 4, 3]]);
  const used = lengths.reduce((s, k) => s + k, 0);
  const n = Math.min(9, used + r.int(0, 2));
  const cycles = cyclesOfType(r, lengths, n);
  const p = (() => {
    const q: Perm = Array.from({ length: n }, (_, i) => i + 1);
    for (const c of cycles) c.forEach((x, i) => (q[x - 1] = c[(i + 1) % c.length]));
    return q;
  })();
  const twoLine = r.int(0, 1) === 1;
  const v = permOrder(p);
  const sorted = cyclesOf(p);
  return {
    prompt: w.group.prompt.permOrder,
    q: `\\sigma = ${twoLine ? twoLineTex(p) : cyclesTex(cycles)}`,
    ...wholeOf(v, [["orderSumNotLcm", used], ["orderProductNotLcm", lengths.reduce((s, k) => s * k, 1)]]),
    steps: [
      ...(twoLine ? [`\\sigma = ${cyclesTex(sorted)}`] : []),
      `|\\sigma| = \\operatorname{lcm}(${sorted.map((c) => c.length).join(", ")}) = ${v}`,
    ],
  };
}

/** A permutation of 1, …, n that moves something. */
function randomPerm(r: Rng, n: number): Perm {
  for (;;) {
    const p = shuffled(r, n);
    if (p.some((x, i) => x !== i + 1)) return p;
  }
}

function composePart(r: Rng, w: PracticeWords): Part {
  const n = r.int(4, 6);
  let [s, t] = [randomPerm(r, n), randomPerm(r, n)];
  while (compose(s, t).every((x, i) => x === compose(t, s)[i])) [s, t] = [randomPerm(r, n), randomPerm(r, n)];
  const st = compose(s, t);
  return {
    prompt: fill(w.group.prompt.compose, { n }),
    q: `\\sigma = ${cyclesTex(cyclesOf(s))}, \\quad \\tau = ${cyclesTex(cyclesOf(t))} \\in S_{${n}}`,
    ...rowOf(st, [["composedLeftToRight", compose(t, s)]]),
    steps: [
      st.map((x, i) => `${i + 1} \\xrightarrow{\\tau} ${t[i]} \\xrightarrow{\\sigma} ${x}`).join(", \\quad "),
      `\\sigma\\tau = ${twoLineTex(st)} = ${cyclesTex(cyclesOf(st))}`,
    ],
  };
}

function signPart(r: Rng, w: PracticeWords): Part {
  if (r.int(0, 1) === 0) {
    const n = r.int(5, 7);
    const count = r.pick([1, 3]);
    const cycles = Array.from({ length: count }, () => cyclesOfType(r, [r.int(2, 5)], n)[0]);
    const right = signOf(cycles) === 1 ? 0 : 1;
    const options = [word(w.group.even), word(w.group.odd)];
    const k = cycles.reduce((s, c) => s + c.length - 1, 0);
    return {
      prompt: w.group.prompt.sign,
      q: `\\sigma = ${cyclesTex(cycles)} \\in S_{${n}}`,
      ...pickOf(options, right, [["cycleLengthParity", 1 - right]]),
      steps: [`${cycles.map((c) => `(${c.length} - 1)`).join(" + ")} = ${k}`, `\\text{${options[right].text}}`],
    };
  }
  const n = r.int(4, 7);
  const k = r.int(2, Math.min(n, 5));
  const ordered = fact(n) / fact(n - k);
  const v = ordered / k;
  return {
    prompt: fill(w.group.prompt.cycleCount, { k, n }),
    q: `S_{${n}}`,
    ...wholeOf(v, [["cycleRotationsCounted", ordered]]),
    steps: [`${Array.from({ length: k }, (_, i) => n - i).join(" \\cdot ")} = ${ordered}`, `\\frac{${ordered}}{${k}} = ${v}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? orderPart(r, w) : L === 2 ? composePart(r, w) : signPart(r, w));

export default gen;
