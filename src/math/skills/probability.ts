// Practice: Probability. L1 one die; L2 two dice summing to k; L3 two reds without replacement. Since #738 half the
// questions at each level come from `more()`: L1 probability from data and models (an experiment's result, two bags
// compared, a prediction, a model's missing probability, a valid claim, a simulation read); L2 rules and sample spaces
// (outcomes counted, set notation, adding with the overlap taken away, a Venn diagram, independent events multiplied,
// a complement, at least one success, which events are independent); L3 new settings: two cards from a deck, faulty
// bulbs and the general multiplication rule.
import { fill } from "../chart";
import { dataGridSvg, vennSvg } from "../displays";
import { fracPart, fp, ft, inOrder, numPart, place, tf } from "../partKit";
import { dp, fr, num, plainFrac } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";
import { pickPart } from "../tTails";

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

function more(r: Rng, L: 1 | 2 | 3, w: PracticeWords): Part {
  const K = w.pbK;
  if (L === 1) {
    const t = r.pick(["experiment", "compare", "predict", "model", "claim", "simulate"] as const);
    if (t === "experiment") {
      for (;;) {
        const n = r.pick([20, 25, 40, 50]);
        const k = r.int(3, Math.floor(n / 2));
        if (k * 4 === n) continue;
        return fracPart(fill(K.spunQ, { n, k }), k, n, [tf("experimentalAsOdds", k / (n - k), { k, m: n - k, n }), tf("theoryForExperiment", 1 / 4, { k, n })],
          [`P = \\frac{${k}}{${n}} = ${ft(k, n)}`]);
      }
    }
    if (t === "compare") {
      for (;;) {
        // Bag X has more red counters but the smaller chance of red.
        const [a, n1, c, n2] = [r.int(5, 9), r.int(12, 20), r.int(2, 5), r.int(4, 10)];
        if (a <= c || c >= n2 || a / n1 > c / n2 - 0.06) continue;
        const xFirst = r.next() < 0.5;
        const [ra, na, rb, nb] = xFirst ? [a, n1, c, n2] : [c, n2, a, n1];
        const [x, y] = xFirst ? ["A", "B"] : ["B", "A"];
        return inOrder([K.bagA, K.bagB, K.same], xFirst ? 1 : 0, [{ id: "moreByCount", at: xFirst ? 0 : 1, vars: { x, a, n1, y, c, n2 } }],
          fill(K.compareQ, { ra, na, rb, nb }), [`A: ${ft(ra, na)} \\approx ${dp(ra / na, 2)}`, `B: ${ft(rb, nb)} \\approx ${dp(rb / nb, 2)}`]);
      }
    }
    if (t === "predict") {
      for (;;) {
        const b = r.pick([4, 5, 8, 10]);
        const a = r.int(1, b - 1);
        if (gcd(a, b) !== 1) continue;
        const n = b * r.int(10, 60);
        const v = (n * a) / b;
        const vars = { n, a, b, v };
        return numPart(fill(K.predictQ, { p: `${a}/${b}`, n }), v, [tf("predictionOnePart", n / b, vars), tf("predictedComplement", n - v, vars)], [`${n} \\times ${ft(a, b)} = ${v}`]);
      }
    }
    if (t === "model") {
      for (;;) {
        const ps = [r.int(1, 8), r.int(1, 8), r.int(1, 8)].map((x) => x * 5);
        const s = ps[0] + ps[1] + ps[2];
        if (s >= 95 || s <= 40 || s === 75) continue;
        const v = (100 - s) / 100;
        const vars = { s: s / 100, v };
        return numPart(fill(K.modelQ, { a: ps[0] / 100, b: ps[1] / 100, c: ps[2] / 100 }), v, [tf("modelMissingAsSum", s / 100, vars), tf("modelEqualShares", 0.25, vars)],
          [`1 - (${ps.map((p) => p / 100).join(" + ")}) = 1 - ${s / 100} = ${v}`]);
      }
    }
    if (t === "claim") {
      const h = r.int(6, 8);
      return pickPart(r, [K.claimOk, fill(K.claimSmall, { h }), K.claimDue], 0, [{ id: "smallSampleClaim", at: 1, vars: { h } }, { id: "gamblersFallacy", at: 2 }],
        fill(K.claimQ, { h }), [`\\text{${K.claimWhy}}`]);
    }
    for (;;) {
      const hi = r.int(1, 4);
      const ds = Array.from({ length: 20 }, () => r.int(0, 9));
      const k = ds.filter((d) => d <= hi).length;
      if (k === 0 || k * 10 === (hi + 1) * 20 || k === 10) continue;
      const vars = { hi, k, t: fp(hi + 1, 10) };
      return fracPart(fill(K.simQ, { hi }), k, 20, [tf("theoryForSimulation", (hi + 1) / 10, vars), tf("simulationComplement", (20 - k) / 20, vars)],
        [`\\text{${fill(K.simWhy, vars)}}`, `P \\approx \\frac{${k}}{20} = ${ft(k, 20)}`], place(dataGridSvg(ds.map(String), 10)));
    }
  }

  if (L === 2) {
    const t = r.pick(["space", "sets", "union", "venn", "indep", "complement", "atLeast", "depPick"] as const);
    if (t === "space") {
      const s = r.int(3, 5);
      const [q, fs] = r.pick([[K.spaceQ0, [2, 6]], [K.spaceQ1, [6, s]], [K.spaceQ2, [2, 2, 2]], [K.spaceQ3, [4, 2]]] as const);
      const v = fs.reduce((a, b) => a * b, 1);
      const f = fs.join(" × ");
      return numPart(fill(q, { s }), v, [tf("outcomesAdded", fs.reduce((a, b) => a + b, 0), { f, v })], [`${fs.join(" \\times ")} = ${v}`]);
    }
    if (t === "sets") {
      const S = Array.from({ length: 12 }, (_, i) => i + 1);
      const ia = r.int(0, 1);
      const ib = r.int(0, 1);
      const inA = (x: number) => (ia ? x % 4 === 0 : x % 2 === 0);
      const inB = (x: number) => (ib ? x > 8 : x % 3 === 0);
      const l = (xs: number[]) => xs.join(", ");
      const both = S.filter((x) => inA(x) && inB(x));
      const any = S.filter((x) => inA(x) || inB(x));
      const sym = any.filter((x) => !both.includes(x));
      const a = S.filter(inA);
      const ask = (op: string) => fill(K.setsQ, { a: [K.setA0, K.setA1][ia], b: [K.setB0, K.setB1][ib], op });
      const op = r.pick(["and", "or", "not"] as const);
      if (op === "and") return pickPart(r, [l(both), l(any), l(S.filter(inB))], 0, [{ id: "unionForIntersection", at: 1, vars: { v: l(both) } }], ask("A ∩ B"), [`\\text{${K.andWhy}}`]);
      if (op === "or") return pickPart(r, [l(any), l(both), l(sym)], 0, [{ id: "intersectionForUnion", at: 1, vars: { v: l(any) } }, { id: "unionOverlapDropped", at: 2, vars: { v: l(any), c: l(both) } }], ask("A ∪ B"), [`\\text{${K.orWhy}}`]);
      return pickPart(r, [l(S.filter((x) => !inA(x))), l(a)], 0, [{ id: "complementAsSet", at: 1, vars: { v: l(S.filter((x) => !inA(x))) } }], ask("A′"), [`\\text{${K.notWhy}}`]);
    }
    if (t === "union") {
      for (;;) {
        const [p, q] = r.pick([[2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [4, 6]] as const);
        const n = r.pick([20, 24, 30, 36, 40, 60]);
        const both = (p * q) / gcd(p, q);
        const [a, b, c] = [Math.floor(n / p), Math.floor(n / q), Math.floor(n / both)];
        if (!c) continue;
        const v = a + b - c;
        return fracPart(fill(K.unionQ, { n, p, q }), v, n, [tf("bothCountedTwice", (a + b) / n, { a, b, c, n })],
          [`\\frac{${a}}{${n}} + \\frac{${b}}{${n}} - \\frac{${c}}{${n}} = \\frac{${v}}{${n}} = ${ft(v, n)}`]);
      }
    }
    if (t === "venn") {
      const [a, c, b, d] = [r.int(3, 12), r.int(2, 8), r.int(3, 12), r.int(2, 10)];
      const n = a + b + c + d;
      const pic = place(vennSvg([K.football, K.chess], [a, c, b, d]));
      if (r.next() < 0.5)
        return fracPart(fill(K.vennA, { n }), a + c, n, [tf("vennOnlyRegion", a / n, { a, c, n })], [`\\frac{${a} + ${c}}{${n}} = ${ft(a + c, n)}`], pic);
      return fracPart(fill(K.vennOr, { n }), a + b + c, n, [tf("vennBothDropped", (a + b) / n, { a, b, c, n })], [`\\frac{${a} + ${c} + ${b}}{${n}} = ${ft(a + b + c, n)}`], pic);
    }
    if (t === "indep") {
      const s = r.int(3, 5);
      const coin = r.next() < 0.5;
      const pa = coin ? [1, 2] : [1, s];
      const [e, k] = r.pick([[K.eSix, 1], [K.eEven, 3], [K.eLess, 2]] as const);
      const [n, d] = [pa[0] * k, pa[1] * 6];
      const vars = { pa: fp(pa[0], pa[1]), pb: fp(k, 6), v: fp(n, d) };
      return fracPart(fill(coin ? K.indepQ0 : K.indepQ1, { e, s }), n, d, [tf("independentAdded", pa[0] / pa[1] + k / 6, vars)], [`${ft(pa[0], pa[1])} \\times ${ft(k, 6)} = ${ft(n, d)}`]);
    }
    if (t === "complement") {
      const d = r.pick([20, 25, 40, 50, 100]);
      let k = r.int(1, Math.floor(d / 3));
      while (gcd(k, d) !== 1) k++;
      const vars = { p: fp(k, d), v: fp(d - k, d) };
      return fracPart(fill(K.compQ, { p: fp(k, d) }), d - k, d, [tf("complementAsOdds", k / (d - k), vars)], [`1 - ${ft(k, d)} = ${ft(d - k, d)}`]);
    }
    if (t === "atLeast") {
      // From 4 rolls on, k/6 is more than 20 × the tolerance from the answer, so it is named rather than taken for rounding.
      const k = r.int(4, 6);
      const v = 1 - (5 / 6) ** k;
      const vars = { k, v: dp(v, 2) };
      return numPart(fill(K.atLeastQ, { k }), v, [tf("atLeastOneAdded", k / 6, vars, 0.006), tf("atLeastAsAll", (1 / 6) ** k, vars, 0.0006)],
        [`1 - \\left(\\frac{5}{6}\\right)^{${k}} = ${dp(v, 2)}`], 0.006);
    }
    const k = r.int(0, 1);
    return pickPart(r, [[K.ind0, K.ind1][k], [K.dep0, K.dep1][k]], 0, [{ id: "withoutReplacementIndependent", at: 1 }], K.depQ, [`\\text{${K.depWhy}}`]);
  }

  const t = r.pick(["cards", "bulbs", "rule"] as const);
  if (t === "cards") {
    const [e, k] = r.pick([[K.hearts, 13], [K.aces, 4], [K.faces, 12]] as const);
    const vars = { f1: `${k}/52`, f2: `${k - 1}/51`, v: fp(k * (k - 1), 52 * 51) };
    return fracPart(fill(K.cardsQ, { e }), k * (k - 1), 52 * 51, [tf("replacementIgnored", (k / 52) ** 2, vars)],
      [`\\frac{${k}}{52} \\times \\frac{${k - 1}}{51} = \\frac{${k * (k - 1)}}{${52 * 51}} = ${ft(k * (k - 1), 52 * 51)}`]);
  }
  if (t === "bulbs") {
    const [n, f] = [r.int(15, 25), r.int(2, 5)];
    const g = n - f;
    const [num_, den] = [n * (n - 1) - g * (g - 1), n * (n - 1)];
    const vars = { f1: `${g}/${n}`, f2: `${g - 1}/${n - 1}`, v: fp(num_, den) };
    return fracPart(fill(K.bulbsQ, { n, f }), num_, den, [tf("atLeastReplaced", 1 - (g / n) ** 2, vars)],
      [`1 - \\frac{${g}}{${n}} \\times \\frac{${g - 1}}{${n - 1}} = 1 - \\frac{${g * (g - 1)}}{${den}} = ${ft(num_, den)}`]);
  }
  const pa = r.pick([0.4, 0.5, 0.6, 0.8]);
  const pb = r.pick([0.25, 0.3, 0.5, 0.75]);
  const v = Math.round(pa * pb * 10000) / 10000;
  const vars = { pa, pb, v };
  return numPart(fill(K.ruleQ, { pa, pb }), v, [tf("conditionalAsJoint", pb, vars), tf("generalRuleAdded", pa + pb, vars)], [`${pa} \\times ${pb} = ${v}`]);
}

const gen: Gen = (r, L, w) => {
  if (r.int(0, 9) >= 5) return more(r, L, w);
  if (L === 1) {
    const kind = r.pick(["even", "greater", "prime", "mult3"] as const);
    const k = r.int(2, 5);
    const good = kind === "even" ? [2, 4, 6] : kind === "greater" ? [1, 2, 3, 4, 5, 6].filter((x) => x > k) : kind === "prime" ? [2, 3, 5] : [3, 6];
    const p = fr(good.length, 6);
    return {
      prompt: fill(w.prompts.die, { event: fill(w.events[kind], { k }) }),
      q: "",
      answer: num(p.toNumber(), 1e-9, { lowest: true }),
      show: p.tex(),
      plain: plainFrac(p),
      format: "fraction",
      steps: [`\\{${good.join(", ")}\\}: \\quad P = \\frac{${good.length}}{6} = ${p.tex()}`],
    };
  }
  if (L === 2) {
    const k = r.int(2, 12);
    const pairs: string[] = [];
    for (let a = 1; a <= 6; a++) if (k - a >= 1 && k - a <= 6) pairs.push(`(${a}, ${k - a})`);
    const p = fr(pairs.length, 36);
    return {
      prompt: fill(w.prompts.dice, { k }),
      q: "",
      answer: num(p.toNumber(), 1e-9, { lowest: true }),
      show: p.tex(),
      plain: plainFrac(p),
      format: "fraction",
      steps: [`${pairs.join(",\\ ")}`, `P = \\frac{${pairs.length}}{36} = ${p.tex()}`],
    };
  }
  const [red, blue] = [r.int(3, 8), r.int(2, 7)];
  const n = red + blue;
  const p = fr(red * (red - 1), n * (n - 1));
  return {
    prompt: fill(w.prompts.marbles, { r: red, b: blue }),
    q: "",
    answer: num(p.toNumber(), 1e-9, { lowest: true }),
    show: p.tex(),
    plain: plainFrac(p),
    format: "fraction",
    steps: [`P = \\frac{${red}}{${n}} \\cdot \\frac{${red - 1}}{${n - 1}} = \\frac{${red * (red - 1)}}{${n * (n - 1)}} = ${p.tex()}`],
    solution: { kind: "statistics", spec: { topic: "tree", pA: `${red}/${n}`, pBA: `${red - 1}/${n - 1}`, pBnotA: `${red}/${n - 1}`, nameA: w.marbleNames.first, nameB: w.marbleNames.second } },
  };
};

export default gen;
