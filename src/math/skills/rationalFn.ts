// Practice: rational functions (#660). Easy: the vertical asymptote, the zero and a value left out of the domain.
// Medium: the horizontal asymptote from the degrees, and the y of a hole. Hard: a slant asymptote, the sign between the
// zeros and walls, and, in a new setting, the cost per copy for many copies. The asymptote from the top or with its
// sign kept, the zero from the bottom, the domain from the top or not rooted, the horizontal asymptote from the
// constants, upside down or with the degrees ignored, a hole at y = 0, the slant's sign kept or the top's term alone,
// no sign change at a wall, an average falling to nothing and the fixed cost kept are slips.
import { fill } from "../chart";
import { num } from "../practiceKit";
import type { Gen, Part, Trap } from "../practiceTypes";
import { expanded, factorText } from "../polyGraph";
import { sgn } from "../readFunction";
import { pickPart } from "../tTails";

const NICE = [1, 2, 4, 5, 8];

const gen: Gen = (r, L, w) => {
  const W = w.qrf;
  const numQ = (prompt: string, v: number, traps: (Trap | false)[], steps: string[]): Part => ({
    prompt, q: "", answer: { ...num(v), traps: traps.filter((t): t is Trap => !!t && t.a.k === "num" && Math.abs(t.a.v - v) > 1e-9) }, show: sgn(v), plain: String(v), format: "number", steps,
  });
  const slip = (id: Trap["id"], v: number, vars?: Record<string, string | number>): Trap => ({ id, a: num(v), vars });

  if (L === 1) {
    const t = r.pick(["wall", "zero", "domain"] as const);
    if (t === "domain") {
      const k = r.int(2, 6);
      let p = r.int(1, 9);
      if (p === k) p += 1;
      const eq = `y = ${factorText(p, 1)}/(x² − ${k * k})`;
      return numQ(fill(W.domainQ, { eq }), k, [slip("domainFromNumerator", p, { p }), slip("domainNotRooted", k * k, { s: k * k, k })], [`x^2 - ${k * k} = 0`, `x = \\pm ${k}`]);
    }
    const a = r.pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]);
    let p = r.int(-6, 6);
    while (p === a || p === -a || p === 0) p = r.int(-6, 6);
    const eq = `y = ${factorText(p, 1)}/${factorText(a, 1)}`;
    if (t === "wall")
      return numQ(fill(W.wallQ, { eq }), a, [slip("vaFromNumerator", p), slip("vaSignKept", -a, { a: sgn(a) })], [`${factorText(a, 1)} = 0 \\Rightarrow x = ${sgn(a)}`]);
    return numQ(fill(W.zeroQ, { eq }), p, [slip("zeroFromDenominator", a)], [`${factorText(p, 1)} = 0 \\Rightarrow x = ${sgn(p)}`]);
  }

  if (L === 2) {
    if (r.next() < 0.6) {
      const n = r.int(1, 2);
      const m = r.next() < 0.6 ? n : 2;
      const lo = m > n;
      const [c, d] = [r.pick(NICE) * r.pick([1, -1]), r.pick(NICE)];
      const e = r.int(-9, 9);
      const f = r.pick([1, 2, 4, 5, 3, 7]);
      const eq = `y = (${expanded([[c, n], [e, 0]])})/(${expanded([[d, m], [f, 0]])})`;
      const v = lo ? 0 : c / d;
      return numQ(fill(W.flatQ, { eq }), v, [
        !lo && NICE.includes(f) && e !== 0 && slip("haFromConstants", e / f, { e: sgn(e), f }),
        !lo && Math.abs(c) !== d && slip("haUpsideDown", d / c, { c: sgn(c), d }),
        lo && slip("haDegreesIgnored", c / d, { n, m }),
      ], lo ? [`\\text{degree } ${n} < ${m}`, `y \\to 0`] : [`y \\approx \\frac{${c}x${n > 1 ? "^2" : ""}}{${d}x${n > 1 ? "^2" : ""}} = ${sgn(c / d)}`]);
    }
    for (;;) {
      const a = r.pick([-4, -3, -2, -1, 1, 2, 3, 4]);
      const c = r.int(-5, 5);
      const b = r.int(-5, 5);
      if (c === a || b === -c || b === -a || (a + b) % (a - c) !== 0) continue;
      const v = (a + b) / (a - c);
      const top = expanded([[1, 2], [b - a, 1], [-a * b, 0]]);
      const bottom = expanded([[1, 2], [-(a + c), 1], [a * c, 0]]);
      return numQ(fill(W.holeQ, { eq: `y = (${top})/(${bottom})`, a: sgn(a) }), v, [slip("holeAsZero", 0, { a: sgn(a) })],
        [`y = \\frac{${factorText(a, 1)}${factorText(-b, 1)}}{${factorText(a, 1)}${factorText(c, 1)}} = \\frac{${factorText(-b, 1)}}{${factorText(c, 1)}}`, `x = ${sgn(a)}:\\ y = ${sgn(v)}`]);
    }
  }

  const t = r.pick(["slant", "sign", "cost"] as const);
  if (t === "slant") {
    for (;;) {
      const a = r.pick([-4, -3, -2, -1, 1, 2, 3, 4]);
      const p = r.int(-6, 6);
      const q = r.int(-9, 9);
      const k = p + a;
      if (q + a * k === 0) continue;
      return numQ(fill(W.slantQ, { eq: `y = (${expanded([[1, 2], [p, 1], [q, 0]])})/${factorText(a, 1)}` }), k, [slip("slantSignKept", p - a, { a: sgn(a) }), slip("slantNumeratorOnly", p, { p: sgn(p) })],
        [`x^2 ${p < 0 ? "-" : "+"} ${Math.abs(p)}x ${q < 0 ? "-" : "+"} ${Math.abs(q)} = ${factorText(a, 1)}(x ${k < 0 ? "-" : "+"} ${Math.abs(k)}) ${q + a * k < 0 ? "-" : "+"} ${Math.abs(q + a * k)}`, `k = ${sgn(k)}`]);
    }
  }
  if (t === "sign") {
    const seen = new Set<number>();
    while (seen.size < 3) seen.add(r.int(-5, 5));
    const [a, b, c] = [...seen];
    const s = r.pick([1, -1]);
    const zs = [a, b, c].sort((u, v) => u - v);
    const j = r.int(0, 3);
    const x = j === 0 ? zs[0] - 1 : j === 3 ? zs[2] + 1 : (zs[j - 1] + zs[j]) / 2;
    const truth = Math.sign((s * (x - a)) / ((x - b) * (x - c)));
    const alt = Math.sign(s * (x - a));
    const where = j === 0 ? `x < ${sgn(zs[0])}` : j === 3 ? `x > ${sgn(zs[2])}` : `${sgn(zs[j - 1])} < x < ${sgn(zs[j])}`;
    const eq = `y = ${s < 0 ? "−" : ""}${factorText(a, 1)}/(${factorText(b, 1)}${factorText(c, 1)})`;
    return pickPart(r, [W.positive, W.negative], truth > 0 ? 0 : 1, alt !== truth ? [{ id: "asymptoteNoSignChange", at: alt > 0 ? 0 : 1 }] : [],
      fill(W.signQ, { eq, where }), [`x = ${sgn(x)}:\\ y ${truth > 0 ? ">" : "<"} 0`]);
  }
  // A new setting: the cost per copy, (F + vn)/n, settles towards v.
  const F = r.pick([200, 500, 1200, 3000]);
  const v = r.pick([2, 3, 5, 8]);
  return numQ(fill(W.costQ, { F, v }), v, [slip("averageToZero", 0, { F, v }), slip("fixedCostKept", F, { F })], [`\\frac{${F} + ${v}n}{n} = \\frac{${F}}{n} + ${v} \\to ${v}`]);
};

export default gen;
