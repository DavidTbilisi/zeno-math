// Practice: Expected value and variance. L1 E(X), L2 Var(X), L3 Var(aX + b) from a table. Since #739 half the
// questions at each level come from `more()`: L1 distributions built and read (coins counted, a table of homes' cars,
// which list is a distribution, a bar chart, what an expected value means); L2 the standard deviation, expected payoffs,
// fair decisions and an expected value from data; L3 new settings: insurance judged by expected cost, a variable
// transformed, and two independent variables combined.
import { fill } from "../chart";
import { probBarsSvg, tableSvg } from "../displays";
import type { Frac } from "../fraction";
import { inOrder, numPart, place, tf } from "../partKit";
import { dp, fr, num, plainFrac } from "../practiceKit";
import type { Exercise, Gen, Part, PracticeWords, Rng } from "../practiceTypes";
import { pickPart } from "../tTails";

/** Three or four values from −3 to 8, their probabilities a random split of 5, 8, 10 or 12. */
function smallDist(r: Rng): { xs: number[]; ps: Frac[] } {
  const k = r.pick([3, 4] as const);
  const xs: number[] = [];
  while (xs.length < k) {
    const x = r.int(-3, 8);
    if (!xs.includes(x)) xs.push(x);
  }
  xs.sort((a, b) => a - b);
  const d = r.pick([5, 8, 10, 12] as const);
  const cuts = new Set<number>();
  while (cuts.size < k - 1) cuts.add(r.int(1, d - 1));
  const cs = [0, ...[...cuts].sort((a, b) => a - b), d];
  return { xs, ps: cs.slice(1).map((c, i) => fr(c - cs[i], d)) };
}

/** A distribution as a table: x on top, P(X = x) beneath. */
const distTable = (xs: number[], ps: Frac[]) =>
  `\\begin{array}{c|${"c".repeat(xs.length)}} x & ${xs.join(" & ")} \\\\ \\hline P(X = x) & ${ps.map((p) => p.tex()).join(" & ")} \\end{array}`;

const choose = (n: number, k: number) => {
  let c = 1;
  for (let i = 1; i <= k; i++) c = (c * (n - k + i)) / i;
  return c;
};
/** Whole positive parts adding up to `total`, `k` of them. */
const split = (r: Rng, total: number, k: number) => {
  const cuts = new Set<number>();
  while (cuts.size < k - 1) cuts.add(r.int(1, total - 1));
  const cs = [0, ...[...cuts].sort((a, b) => a - b), total];
  return cs.slice(1).map((c, i) => c - cs[i]);
};
const tenth = (t: number) => (t < 0 ? `−${(-t / 10).toFixed(1)}` : (t / 10).toFixed(1));
const signed = (b: number) => (b < 0 ? `− ${-b}` : `+ ${b}`);

function more(r: Rng, L: 1 | 2 | 3, w: PracticeWords): Part {
  const K = w.exK;
  if (L === 1) {
    const t = r.pick(["build", "cars", "valid", "graph", "interpret"] as const);
    if (t === "build") {
      const n = r.pick([2, 3]);
      const k = r.int(0, n);
      const [c, tt] = [choose(n, k), 2 ** n];
      const p = fr(c, tt);
      const vars = { m: n + 1, c, t: tt, k };
      return {
        prompt: fill(K.buildQ, { n, k }), q: "",
        answer: { ...num(p.toNumber(), 1e-9, { lowest: true }), traps: [tf("valuesEquallyLikely", 1 / (n + 1), vars), tf("waysAsProbability", c, vars)].filter((x) => x.a.k === "num" && Math.abs(x.a.v - p.toNumber()) > 1e-9) },
        show: p.tex(), plain: plainFrac(p), format: "fraction", steps: [`P(X = ${k}) = \\frac{${c}}{${tt}} = ${p.tex()}`],
      };
    }
    if (t === "cars") {
      const n = r.pick([20, 25, 40, 50]);
      const fs = split(r, n, 4);
      const k = r.int(0, 3);
      const p = fr(fs[k], n);
      return {
        prompt: fill(K.carsQ, { n, k }), q: "", pic: place(tableSvg([K.carsHead, K.homesHead], fs.map((f, i) => [i, f]))),
        answer: { ...num(p.toNumber(), 1e-9, { lowest: true }), traps: [tf("countAsProbability", fs[k], { c: fs[k], n })] },
        show: p.tex(), plain: plainFrac(p), format: "fraction", steps: [`P(X = ${k}) = \\frac{${fs[k]}}{${n}} = ${p.tex()}`],
      };
    }
    if (t === "valid") {
      const ok = split(r, 10, 3);
      const d = r.pick([1, -1]);
      const i = r.int(0, 2);
      const off = ok.map((x, j) => (j === i ? x + d : x));
      if (off[i] === 0) off[i] += 2;
      const s = off.reduce((a, b) => a + b, 0) / 10;
      const neg = [-1, ...split(r, 11, 2)];
      const say = (xs: number[]) => xs.map(tenth).join("; ");
      return pickPart(r, [say(ok), say(off), say(neg)], 0, [{ id: "sumNotOne", at: 1, vars: { s: s.toFixed(1) } }, { id: "negativeProbability", at: 2 }], K.validQ,
        [`${ok.map(tenth).join(" + ")} = 1`]);
    }
    if (t === "graph") {
      const ts = split(r, 10, 5);
      const k = r.int(1, 3);
      const sum = (a: number) => ts.slice(a).reduce((x, y) => x + y, 0) / 10;
      const v = sum(k);
      const top = Math.ceil(Math.max(...ts) + 0.5) / 10;
      return numPart(fill(K.graphQ, { k }), v, [tf("strictForInclusive", sum(k + 1), { k, v }), tf("onlyOneBar", ts[k] / 10, { k, v })],
        [`${ts.slice(k).map((x) => (x / 10).toFixed(1)).join(" + ")} = ${v}`], 1e-9, place(probBarsSvg([0, 1, 2, 3, 4], ts.map((x) => x / 10), top)));
    }
    const e = r.pick([0.8, 1.2, 1.4, 1.6, 2.3]);
    return pickPart(r, [fill(K.evLong, { e }), fill(K.evEvery, { e }), fill(K.evLikely, { e })], 0, [{ id: "expectedAsEveryTime", at: 1, vars: { e } }, { id: "expectedAsMostLikely", at: 2, vars: { e } }],
      fill(K.interpQ, { e }), [`\\text{${fill(K.evLong, { e })}}`]);
  }
  if (L === 2) {
    const t = r.pick(["sd", "pay", "fair", "books"] as const);
    if (t === "sd") {
      for (;;) {
        const { xs, ps } = smallDist(r);
        const E = xs.reduce((s, x, i) => s.add(ps[i].mul(fr(x))), fr(0));
        const E2 = xs.reduce((s, x, i) => s.add(ps[i].mul(fr(x * x))), fr(0));
        const V = E2.sub(E.mul(E)).toNumber();
        if (V < 0.5) continue;
        const v = Math.sqrt(V);
        const vars = { V: plainFrac(E2.sub(E.mul(E))), x2: plainFrac(E2), m: plainFrac(E), v: dp(v, 2) };
        return { ...numPart(K.sdQ, v, [tf("varianceForSd", V, vars, 0.005), tf("noMeanSquared", Math.sqrt(E2.toNumber()), vars, 0.005)],
          [`E(X) = ${E.tex()}, \\quad E(X^2) = ${E2.tex()}`, `\\sigma = \\sqrt{${E2.tex()} - \\left(${E.tex()}\\right)^2} = ${dp(v, 2)}`], 0.005), q: distTable(xs, ps) };
      }
    }
    if (t === "pay") {
      const d = r.pick([4, 5, 10, 20]);
      const m = r.int(1, 6);
      const W = d * m;
      const c = r.int(1, 8);
      const v = m - c;
      const vars = { W, c, m, p: `1/${d}`, v };
      return numPart(fill(K.payQ, { c, W, p: `1/${d}` }), v, [tf("costIgnored", m, vars), tf("probabilityNotWeighted", W - c, vars)],
        [`\\tfrac{1}{${d}} \\times ${W} - ${c} = ${m} - ${c} = ${v}`]);
    }
    if (t === "fair") {
      const right = r.pick([K.fairDie, K.fairCoins]);
      return pickPart(r, [right, K.unfairSix, K.unfairSum], 0, [{ id: "oneSideFewer", at: 1 }, { id: "totalsNotEqual", at: 2 }], K.fairQ, [`P(\\text{Ana}) = P(\\text{Ben}) = \\tfrac{1}{2}`]);
    }
    for (;;) {
      const n = r.pick([20, 25, 40]);
      const fs = split(r, n, 5);
      const s = fs.reduce((a, f, i) => a + i * f, 0);
      const v = s / n;
      if (Math.abs(v - 2) < 0.15 || Math.abs(v - s / 5) < 0.15) continue;
      const vars = { s, n, v: dp(v, 2) };
      return numPart(fill(K.booksQ, { n }), v, [tf("meanOfValues", 2, vars, 0.005), tf("dividedByValues", s / 5, vars, 0.005)],
        [`\\frac{${fs.map((f, i) => `${i} \\times ${f}`).join(" + ")}}{${n}} = \\frac{${s}}{${n}} = ${dp(v, 2)}`], 0.005, place(tableSvg([K.booksHead, K.pupilsHead], fs.map((f, i) => [i, f]))));
    }
  }
  const t = r.pick(["phone", "trans", "combine"] as const);
  if (t === "phone") {
    const c = r.pick([30, 40, 50, 60]);
    const d = r.pick([4, 5, 10]);
    const e = c + r.pick([-20, -10, 10, 20]);
    const L_ = e * d;
    const vars = { c, L: L_, p: `1/${d}`, e };
    const right = e < c ? 1 : 0;
    return inOrder([K.buy, K.skip, K.same], right, right ? [{ id: "lossNotWeighted", at: 0, vars }] : [{ id: "insuranceSkipped", at: 1, vars }],
      fill(K.phoneQ, { c, L: L_, p: `1/${d}` }), [`\\tfrac{1}{${d}} \\times ${L_} = ${e} ${e < c ? "<" : ">"} ${c}`]);
  }
  if (t === "trans") {
    const m = r.int(10, 50);
    const s = r.int(2, 8);
    const a = r.pick([2, 3, 4, -2]);
    const b = r.nz(-10, 10);
    const e = `${a}X ${signed(b)}`;
    if (r.next() < 0.5) {
      const v = a * m + b;
      return numPart(fill(K.transMeanQ, { m, s, e }), v, [tf("shiftDropped", a * m, { a, m, b: b < 0 ? `(−${-b})` : b, v })], [`${a} \\times ${m} ${signed(b)} = ${v}`]);
    }
    const v = Math.abs(a) * s;
    const vars = { a, s, b, v };
    return numPart(fill(K.transSdQ, { m, s, e }), v, [tf("shiftAddedToSd", v + b, vars), tf("sdScaledBySquare", a * a * s, vars)], [`|${a}| \\times ${s} = ${v}`]);
  }
  const [x, y, z] = r.pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15]] as const);
  const [a, b] = r.next() < 0.5 ? [x, y] : [y, x];
  const minus = r.next() < 0.5;
  const vars = { a, b, v: z };
  return numPart(fill(K.combQ, { a, b, e: minus ? "X − Y" : "X + Y" }), z,
    [tf("sdsAdded", a + b, vars), ...(minus ? [tf("variancesSubtracted", Math.sqrt(Math.abs(a * a - b * b)), vars)] : [])], [`\\sqrt{${a}^2 + ${b}^2} = ${z}`]);
}

const gen: Gen = (r, L, w) => {
  if (r.int(0, 9) >= 5) return more(r, L, w);
  // Three or four values, their probabilities a split of a small denominator.
  const { xs, ps } = smallDist(r);
  const E = xs.reduce((s, x, i) => s.add(ps[i].mul(fr(x))), fr(0));
  const V = xs.reduce((s, x, i) => s.add(ps[i].mul(fr(x * x))), fr(0)).sub(E.mul(E));
  const src = [xs.join(", "), ps.map(plainFrac).join(", ")];
  const out = (prompt: string, v: Frac, solution: Exercise["solution"]) => ({
    prompt, q: distTable(xs, ps), answer: num(v.toNumber(), 1e-9, { lowest: true }), show: v.tex(), plain: plainFrac(v), format: "fraction" as const, solution,
  });
  if (L === 1) return out(w.prompts.expMean, E, { kind: "randvar", spec: { topic: "discrete", src } });
  if (L === 2) return out(w.prompts.expVar, V, { kind: "randvar", spec: { topic: "discrete", src } });
  // Var(aX + b) = a² Var(X): b moves the values, a stretches them.
  const [a, b] = [r.pick([-3, -2, 2, 3, 4] as const), r.nz(-6, 6)];
  return out(fill(w.prompts.expRule, { e: `Var(${a < 0 ? `−${-a}` : a}X ${b < 0 ? "−" : "+"} ${Math.abs(b)})` }), V.mul(fr(a * a)), { kind: "randvar", spec: { topic: "rules", src: [...src, String(a), String(b)] } });
};

export default gen;
