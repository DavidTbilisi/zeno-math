// Practice: polynomial graphs (#659). Easy: the zeros from the factorised form, and the two ends from the degree and
// the leading sign. Medium: cross or touch at a zero, and the sign between zeros. Hard: the equation of a drawn graph,
// the most turning points, and, in a new setting, the cuts that make a real open box. A zero's sign kept, the ends by
// the leading sign alone or by the degree alone, an even power crossing or an odd one touching, the sign changed at
// every zero, a plain sign slip, n turning points, a positive volume with negative sides and the shorter side forgotten
// are slips.
import { fill } from "../chart";
import { num } from "../practiceKit";
import type { Gen, Part, Trap } from "../practiceTypes";
import { endsOf, expanded, polyAt, polyText, scaleFor } from "../polyGraph";
import { curvePoints } from "../quadraticGraph";
import { graphSvg, sgn } from "../readFunction";
import { pickPart } from "../tTails";

const place = (body: string) => (x: number, y: number) => `<g transform="translate(${x} ${y})">${body}</g>`;
/** Distinct whole numbers from lo to hi, sorted. */
function distinct(r: Parameters<Gen>[0], n: number, lo: number, hi: number) {
  const out = new Set<number>();
  while (out.size < n) out.add(r.int(lo, hi));
  return [...out].sort((a, b) => a - b);
}

const gen: Gen = (r, L, w) => {
  const W = w.qpg;
  const numQ = (prompt: string, v: number, traps: Trap[], steps: string[]): Part => ({
    prompt, q: "", answer: { ...num(v), traps }, show: sgn(v), plain: String(v), format: "number", steps,
  });

  if (L === 1) {
    if (r.next() < 0.45) {
      const a = r.int(1, 5);
      const [b, c] = distinct(r, 2, 1, 6);
      const eq = `y = ${r.pick(["", "2", "3"])}(x + ${a})(x − ${b})(x − ${c})`;
      const v = -a + b + c;
      return numQ(fill(W.sumQ, { eq }), v, [{ id: "zeroSignKept", a: num(a + b + c) }], [`x = ${sgn(-a)},\\ ${b},\\ ${c}`, `${sgn(-a)} + ${b} + ${c} = ${sgn(v)}`]);
    }
    const n = r.int(2, 5);
    const s = r.pick([1, -1]);
    const terms: [number, number][] = [[s * r.pick([1, 2, 3, 5]), n], [r.int(-6, 6), n - 1], [r.int(-9, 9), 0]];
    const opts = [W.upUp, W.downDown, W.downUp, W.upDown];
    const idx = (lr: [number, number]) => (lr[0] > 0 ? (lr[1] > 0 ? 0 : 3) : lr[1] > 0 ? 2 : 1);
    const right = idx(endsOf(n, s));
    return pickPart(r, opts, right, [
      { id: "endsByLeadingOnly", at: s > 0 ? 0 : 1 },
      { id: "endsByDegreeOnly", at: idx(endsOf(n, 1)) },
    ], fill(W.endsQ, { eq: `y = ${expanded(terms)}` }), [`\\text{degree } ${n},\\ \\text{leading } ${s > 0 ? "+" : "-"}`]);
  }

  if (L === 2) {
    if (r.next() < 0.5) {
      const [z, o] = distinct(r, 2, -4, 4);
      const [at, other] = r.next() < 0.5 ? [z, o] : [o, z];
      const m = r.int(1, 3);
      const eq = polyText([at, other], [m, 1], 1);
      const even = m % 2 === 0;
      return pickPart(r, [W.crosses, W.touches], even ? 1 : 0, [{ id: even ? "touchAsCross" : "crossAsTouch", at: even ? 0 : 1, vars: { m } }],
        fill(W.touchQ, { eq, x: sgn(at) }), [`\\text{power } ${m} \\text{ is ${even ? "even" : "odd"}}`]);
    }
    const zs = distinct(r, 3, -5, 5);
    const m = [r.pick([1, 2]), 1, 1];
    if (r.next() < 0.5) m.reverse();
    const s = r.pick([1, -1]);
    const j = r.int(0, 3);
    // A test point in the interval: between two zeros, or one past the outer one.
    const t = j === 0 ? zs[0] - 1 : j === 3 ? zs[2] + 1 : (zs[j - 1] + zs[j]) / 2;
    const truth = Math.sign(polyAt(zs, m, s, t));
    const alt = s * (-1) ** (3 - j);
    const where = j === 0 ? `x < ${sgn(zs[0])}` : j === 3 ? `x > ${sgn(zs[2])}` : `${sgn(zs[j - 1])} < x < ${sgn(zs[j])}`;
    return pickPart(r, [W.positive, W.negative], truth > 0 ? 0 : 1, [alt !== truth ? { id: "multiplicityDropped", at: alt > 0 ? 0 : 1 } : { id: "signBetweenWrong", at: truth > 0 ? 1 : 0, vars: { t: sgn(t) } }],
      fill(W.signQ, { eq: polyText(zs, m, s), where }), [`x = ${sgn(t)}:\\ y ${truth > 0 ? ">" : "<"} 0`]);
  }

  const t = r.pick(["fromGraph", "turns", "box"] as const);
  if (t === "fromGraph") {
    for (;;) {
      const n = r.pick([2, 3]);
      const zs = distinct(r, n, -4, 4);
      const m = zs.map(() => 1);
      m[r.int(0, n - 1)] = 2;
      const s = r.pick([1, -1]);
      const flipped = zs.map((z) => -z);
      const swapped = m.map((p) => (p === 2 ? 1 : 2));
      const opts = [polyText(zs, m, s), polyText(flipped, m, s), polyText(zs, swapped, s), polyText(zs, m, -s)];
      if (new Set(opts).size < 4) continue;
      const k = scaleFor(zs, m, 4);
      const pic = graphSvg(curvePoints((x) => k * polyAt(zs, m, s, x), -6, 6, 6), { lo: -6, hi: 6 });
      return {
        ...pickPart(r, opts, 0, [{ id: "zeroSignKept", at: 1 }, { id: "multiplicityDropped", at: 2 }, { id: "endsByDegreeOnly", at: 3 }], W.graphQ,
          [`\\text{zeros } ${zs.map(sgn).join(",\\ ")}`, `\\text{right end } ${s > 0 ? "\\uparrow" : "\\downarrow"}`]),
        pic: { svg: place(pic.body), w: pic.w, h: pic.h },
      };
    }
  }
  if (t === "turns") {
    const n = r.int(3, 7);
    const terms: [number, number][] = [[r.pick([1, -1, 2, -2, 3]), n], [r.int(-5, 5), r.int(1, n - 1)], [r.int(-9, 9), 0]];
    return numQ(fill(W.turnsQ, { eq: `y = ${expanded(terms)}` }), n - 1, [{ id: "turningPointsDegree", a: num(n), vars: { n } }], [`\\text{degree } ${n} \\Rightarrow \\le ${n - 1}`]);
  }
  // A new setting: an open box folded from an a by b card after cutting squares of side x from the corners.
  const a = r.pick([12, 16, 20]);
  const b = r.pick([20, 24, 30].filter((v) => v > a));
  const [h, H] = [a / 2, b / 2];
  return pickPart(r, [`0 < x < ${h}`, `${h} < x < ${H}`, `x > ${H}`, `0 < x < ${H}`], 0, [
    { id: "positiveNotReal", at: 2, vars: { a, b } },
    { id: "widthLimitMissed", at: 3, vars: { a, h } },
  ], fill(W.boxQ, { a, b }), [`V = 0 \\text{ at } x = 0,\\ ${h},\\ ${H}`, `${a} - 2x > 0 \\Rightarrow x < ${h}`]);
};

export default gen;
