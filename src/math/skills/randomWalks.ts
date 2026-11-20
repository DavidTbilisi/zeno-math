// Practice: random walks. Easy finds P(Sₙ = k) for a walk stepping up with probability p (k used for the up steps,
// the paths not counted, named) or the mean or variance of Sₙ (np for the mean, np(1 − p) for the variance, named);
// medium is the fair gambler's ruin, the chance to win or go broke (the two swapped, named) or the expected length of
// the game (the straight run to the nearer end, named); hard is the biased ruin, its chances (q/p inverted, the fair
// formula, the two swapped, named) and expected length (the fair formula, named).
import { exact } from "../calculusTwo";
import type { Frac } from "../fraction";
import { F, choose, ruinDuration, ruinWin, upSteps, walkProb } from "../stochastic";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const STEPS = [F(1, 2), F(1, 3), F(2, 3), F(1, 4), F(3, 4), F(2, 5), F(3, 5)];
const BIASED = STEPS.slice(1);

function positionPart(r: Rng, w: PracticeWords): Part {
  const n = r.int(4, 8);
  const u = r.int(1, n - 1);
  const k = 2 * u - n;
  const p = r.pick(STEPS);
  const q = F(1).sub(p);
  const v = walkProb(n, k, p);
  const raw = p.tex() === q.tex() ? `(${p.tex()})^{${n}}` : `(${p.tex()})^{${u}} (${q.tex()})^{${n - u}}`;
  /** c paths, each of probability p^u (1 − p)^(n − u). */
  const paths = (c: number) => F(c).mul(walkProb(n, k, p)).div(F(choose(n, upSteps(n, k)!)));
  return {
    prompt: w.sp.prompt.walkProb,
    q: `p = ${p.tex()}, \\quad P(S_{${n}} = ${k})`,
    ...exact(v, [["walkPathNotCounted", paths(1)], ["walkStepsNotHalved", paths(choose(n, Math.abs(k)))]]),
    steps: [
      `u - d = ${k}, \\quad u + d = ${n} \\implies u = ${u}, \\quad d = ${n - u}`,
      `P(S_{${n}} = ${k}) = \\binom{${n}}{${u}} ${raw} = ${choose(n, u)} \\cdot ${paths(1).tex()} = ${v.tex()}`,
    ],
  };
}

function momentsPart(r: Rng, w: PracticeWords): Part {
  const n = r.int(4, 30);
  const p = r.pick(BIASED);
  const q = F(1).sub(p);
  const head = `p = ${p.tex()}, \\quad n = ${n}`;
  if (r.next() < 0.5) {
    const m = F(n).mul(p.sub(q));
    return {
      prompt: w.sp.prompt.walkMean,
      q: head,
      ...exact(m, [["walkMeanUpOnly", F(n).mul(p)]]),
      steps: [`E(X_{i}) = p - (1 - p) = ${p.sub(q).tex()}`, `E(S_{${n}}) = ${n} \\cdot ${p.sub(q).texP()} = ${m.tex()}`],
    };
  }
  const v = F(4 * n).mul(p).mul(q);
  return {
    prompt: w.sp.prompt.walkVar,
    q: head,
    ...exact(v, [["walkVarNotFour", F(n).mul(p).mul(q)]]),
    steps: [
      `\\operatorname{Var}(X_{i}) = E(X_{i}^{2}) - (2p - 1)^{2} = 1 - (${p.sub(q).tex()})^{2} = ${F(4).mul(p).mul(q).tex()}`,
      `\\operatorname{Var}(S_{${n}}) = ${n} \\cdot ${F(4).mul(p).mul(q).tex()} = ${v.tex()}`,
    ],
  };
}

/** A start i and a target N, the start off the middle (so the chance to win and to go broke differ). */
function game(r: Rng, lo: number, hi: number) {
  for (;;) {
    const N = r.int(lo, hi);
    const i = r.int(1, N - 1);
    if (2 * i !== N) return { i, N };
  }
}

function fairPart(r: Rng, w: PracticeWords): Part {
  const { i, N } = game(r, 5, 12);
  const kind = r.pick(["win", "lose", "duration"] as const);
  const q = `i = ${i}, \\quad N = ${N}`;
  const win = F(i, N);
  if (kind === "duration") {
    const d = F(i * (N - i));
    return {
      prompt: w.sp.prompt.ruinDuration,
      q,
      ...exact(d, [["durationAsDistance", Math.min(i, N - i)]]),
      steps: [`D_{j} = 1 + \\tfrac{1}{2} D_{j-1} + \\tfrac{1}{2} D_{j+1}, \\quad D_{0} = D_{${N}} = 0 \\implies D_{j} = j(${N} - j)`, `D_{${i}} = ${i} \\cdot ${N - i} = ${d.tex()}`],
    };
  }
  const v = kind === "win" ? win : F(1).sub(win);
  return {
    prompt: kind === "win" ? w.sp.prompt.ruinWin : w.sp.prompt.ruinLose,
    q,
    ...exact(v, [["ruinFlipped", F(1).sub(v)]]),
    steps: [`${N} \\cdot P_{${i}} + 0 \\cdot (1 - P_{${i}}) = ${i} \\implies P_{${i}} = ${win.tex()}`, ...(kind === "lose" ? [`1 - ${win.tex()} = ${v.tex()}`] : [])],
  };
}

function biasedPart(r: Rng, w: PracticeWords): Part {
  const { i, N } = game(r, 3, 6);
  const p = r.pick(BIASED);
  const q = F(1).sub(p);
  const kind = r.pick(["win", "lose", "duration"] as const);
  const head = `p = ${p.tex()}, \\quad i = ${i}, \\quad N = ${N}`;
  const ratio = q.div(p);
  const win = ruinWin(i, N, p);
  const base = ratio.d === 1 ? ratio.tex() : `(${ratio.tex()})`;
  const winSteps = [`r = \\frac{1 - p}{p} = ${ratio.tex()}`, `P_{${i}} = \\frac{1 - r^{${i}}}{1 - r^{${N}}} = \\frac{1 - ${base}^{${i}}}{1 - ${base}^{${N}}} = ${win.tex()}`];
  if (kind === "duration") {
    const d = ruinDuration(i, N, p);
    return {
      prompt: w.sp.prompt.biasedDuration,
      q: head,
      ...exact(d, [["durationFairFormula", i * (N - i)]]),
      steps: [...winSteps, `D_{${i}} = \\frac{i - N P_{${i}}}{q - p} = \\frac{${i} - ${N} \\cdot ${win.tex()}}{${q.sub(p).tex()}} = ${d.tex()}`],
    };
  }
  const flip = (x: Frac) => (kind === "win" ? x : F(1).sub(x));
  const v = flip(win);
  return {
    prompt: kind === "win" ? w.sp.prompt.biasedWin : w.sp.prompt.biasedLose,
    q: head,
    ...exact(v, [["ruinRatioInverted", flip(ruinWin(i, N, q))], ["ruinFairFormula", flip(F(i, N))], ["ruinFlipped", F(1).sub(v)]]),
    steps: [...winSteps, ...(kind === "lose" ? [`1 - ${win.tex()} = ${v.tex()}`] : [])],
  };
}

const gen: Gen = (r, L, w) => {
  if (L === 1) return r.next() < 0.5 ? positionPart(r, w) : momentsPart(r, w);
  if (L === 2) return fairPart(r, w);
  return biasedPart(r, w);
};

export default gen;
