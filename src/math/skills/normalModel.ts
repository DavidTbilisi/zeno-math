// Practice: The normal model (#740), a data skill after spread. L1 (grade 10) a percentile from a list of scores,
// z-scores worked out and compared, and the spread of transformed data; L2 (grade 10) what a density curve is, areas
// under a uniform and a triangular density, and the empirical rule; L3 (grade 12) normal probabilities and the reverse
// look-up, then a new setting: the share of a factory's bolts rejected at both ends.
import { fill } from "../chart";
import { dataGridSvg, densitySvg } from "../displays";
import { zUpper } from "../distributions";
import { normCdf } from "../inference";
import { fracPart, inOrder, numPart, place, tf } from "../partKit";
import { dp } from "../practiceKit";
import type { Gen, Part, Rng } from "../practiceTypes";
import { pickPart } from "../tTails";

const r4 = (v: number) => Math.round(v * 10000) / 10000;
const BANDS = [68, 95, 99.7];

const gen: Gen = (r: Rng, L, w): Part => {
  const K = w.nmK;
  if (L === 1) {
    const t = r.pick(["percentile", "z", "compare", "transform"] as const);
    if (t === "percentile") {
      const xs = new Set<number>();
      while (xs.size < 20) xs.add(r.int(40, 99));
      const sorted = [...xs].sort((a, b) => a - b);
      const i = r.int(2, 18);
      const v = i * 5;
      const vars = { b: i, n: 20, v };
      return numPart(fill(K.pctQ, { x: sorted[i] }), v, [tf("percentileIncludesSelf", (i + 1) * 5, vars), tf("rankNotPercent", i, vars)],
        [`\\frac{${i}}{20} \\times 100 = ${v}`], 1e-9, place(dataGridSvg(r.next() < 0.5 ? sorted.map(String) : [...sorted].sort(() => r.next() - 0.5).map(String), 10)));
    }
    if (t === "z") {
      const s = r.pick([4, 6, 8, 10, 12]);
      const m = r.int(50, 80);
      const z = r.pick([-2.5, -2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2, 2.5]);
      const x = m + z * s;
      const vars = { x, m, s, v: z };
      return numPart(fill(K.zQ, { m, s, x }), z, [tf("zSignFlipped", -z, vars), tf("zNoMean", x / s, vars, 0.006), tf("zOverMean", (x - m) / m, vars, 0.006)],
        [`z = \\frac{${x} - ${m}}{${s}} = ${z}`]);
    }
    if (t === "compare") {
      for (;;) {
        const [za, zb] = [r.pick([0.5, 1, 1.5, 2]), r.pick([0.5, 1, 1.5, 2])];
        const [s1, s2] = [r.pick([4, 5, 8, 10]), r.pick([4, 5, 8, 10])];
        const [m1, m2] = [r.int(50, 75), r.int(50, 75)];
        const [a, b] = [m1 + za * s1, m2 + zb * s2];
        if (za === zb || a === b || a - b > 0 === za - zb > 0) continue;
        const vars = { za, zb, a, b, m1, s1, m2, s2, hi: a > b ? K.ana : K.ben };
        return inOrder([K.ana, K.ben, K.same], za > zb ? 0 : 1, [{ id: "rawScoresCompared", at: za > zb ? 1 : 0, vars }], fill(K.cmpQ, { a, m1, s1, b, m2, s2 }),
          [`z_A = \\frac{${a} - ${m1}}{${s1}} = ${za}, \\quad z_B = \\frac{${b} - ${m2}}{${s2}} = ${zb}`]);
      }
    }
    const m = r.int(20, 60);
    const s = r.int(3, 9);
    if (r.next() < 0.5) {
      const c = r.int(5, 20);
      return numPart(fill(K.addQ, { m, s, c }), s, [tf("shiftChangesSpread", s + c, { s, c, v: s })], [`\\text{SD} = ${s}`]);
    }
    const k = r.pick([2, 3, 10]);
    const vars = { s, k, v: k * s };
    return numPart(fill(K.mulQ, { m, s, k }), k * s, [tf("scaleSkipsSpread", s, vars), tf("spreadSquared", k * k * s, vars)], [`${k} \\times ${s} = ${k * s}`]);
  }
  if (L === 2) {
    const t = r.pick(["props", "uniform", "triangle", "empirical"] as const);
    if (t === "props")
      return pickPart(r, [K.denRight, K.denHeightOne, K.denAreaAny], 0, [{ id: "peakAtOne", at: 1 }, { id: "densityAreaAny", at: 2 }], K.denQ, [`\\text{${K.denRight}}`]);
    if (t === "uniform") {
      const b = r.pick([5, 8, 10, 12, 20]);
      const c = r.int(1, b - 2);
      const d = r.int(c + 1, b - 1);
      const vars = { c, d, b, wd: d - c, v: `${d - c}/${b}` };
      return fracPart(fill(K.uniQ, { b, c, d }), d - c, b, [tf("heightIgnored", d - c, vars), tf("lowerCutIgnored", d / b, vars)],
        [`(${d} - ${c}) \\times \\tfrac{1}{${b}} = \\tfrac{${d - c}}{${b}}`], place(densitySvg("uniform", b, c, d, `1/${b}`)));
    }
    if (t === "triangle") {
      const b = r.pick([4, 5, 6, 8, 10]);
      const c = r.int(1, b - 1);
      const vars = { c, b, rest: b - c, v: `${(b - c) ** 2}/${b * b}` };
      return fracPart(fill(K.triQ, { b, c }), (b - c) ** 2, b * b, [tf("widthShare", (b - c) / b, vars)],
        [`\\tfrac{1}{2} \\times ${b - c} \\times \\tfrac{2 \\times ${b - c}}{${b * b}} = \\tfrac{${(b - c) ** 2}}{${b * b}}`], place(densitySvg("triangle", b, c, b, `2/${b}`)));
    }
    const m = r.pick([330, 500, 750, 1000]);
    const s = r.pick([2, 4, 5, 8, 10]);
    const how = r.pick(["between", "above", "half"] as const);
    if (how === "between") {
      const k = r.int(1, 3);
      const v = BANDS[k - 1];
      return numPart(fill(K.empBetweenQ, { m, s, a: m - k * s, b: m + k * s }), v, BANDS.filter((x) => x !== v).map((x) => tf("wrongBandUsed", x, { k, v })),
        [`${m} \\pm ${k} \\times ${s}: \\quad ${v}\\%`]);
    }
    const k = r.int(1, 2);
    const p = BANDS[k - 1];
    if (how === "above") {
      const v = (100 - p) / 2;
      const vars = { k, p, v };
      return numPart(fill(K.empAboveQ, { m, s, a: m + k * s }), v, [tf("bothTailsCounted", 100 - p, vars), tf("belowForAbove", 100 - v, vars)], [`\\frac{100 - ${p}}{2} = ${v}`]);
    }
    const v = p / 2;
    return numPart(fill(K.empHalfQ, { m, s, a: m, b: m + k * s }), v, [tf("bandNotHalved", p, { k, p, v })], [`\\frac{${p}}{2} = ${v}`]);
  }
  const t = r.pick(["prob", "reverse", "bolts"] as const);
  const m = r.int(40, 160);
  const s = r.pick([4, 5, 6, 8, 10, 12, 15]);
  if (t === "prob") {
    const z = r.pick([-1, 1]) * r.pick([0.4, 0.6, 0.8, 1.2, 1.5, 1.8, 2.2]);
    const x = r4(m + z * s);
    const below = r.next() < 0.5;
    const v = below ? normCdf(z) : 1 - normCdf(z);
    const vars = { z, v: dp(v, 3) };
    return numPart(fill(below ? K.belowQ : K.aboveQ, { m, s, x }), v, [tf("tailSwapped", 1 - v, vars, 0.003)],
      [`z = \\frac{${x} - ${m}}{${s}} = ${z}`, `P = ${dp(v, 3)}`], 0.003);
  }
  if (t === "reverse") {
    const p = r.pick([1, 2.5, 5, 10, 20, 25]);
    const z = zUpper(p / 100);
    const v = m + z * s;
    const vars = { p, z: dp(z, 2), m, s, v: dp(v, 1) };
    return { ...numPart(fill(K.topQ, { m, s, p }), v, [tf("reverseTailSwapped", m - z * s, vars, 0.15), tf("zAsScore", z, vars, 0.15)], [`z = ${dp(z, 2)}`, `${m} + ${dp(z, 2)} \\times ${s} = ${dp(v, 1)}`], 0.15),
      show: dp(v, 1), plain: dp(v, 1), format: "number" };
  }
  const [k1, k2] = [r.pick([1, 1.5, 2]), r.pick([1, 1.5, 2])];
  const [lo, hi] = [r4(m - k1 * s), r4(m + k2 * s)];
  const [pl, ph] = [normCdf(-k1), normCdf(-k2)];
  const v = pl + ph;
  const vars = { lo, hi, pl: dp(pl, 3), ph: dp(ph, 3), v: dp(v, 3) };
  return numPart(fill(K.boltQ, { m, s, lo, hi }), v, [tf("oneTailOnly", pl, vars, 0.003), tf("oneTailOnly", ph, vars, 0.003), tf("keptForRejected", 1 - v, vars, 0.003)],
    [`P(X < ${lo}) + P(X > ${hi}) = ${dp(pl, 3)} + ${dp(ph, 3)} = ${dp(v, 3)}`], 0.003);
};

export default gen;
