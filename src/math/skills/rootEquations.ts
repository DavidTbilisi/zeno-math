// Practice: equations with roots and fractions (#661). Easy: √(x + a) = b and a/x = b. Medium: a root equation that
// squares to a quadratic with one answer that does not fit, and a fraction equation whose second answer is excluded.
// (Of two slips giving the same number only the first is kept.) Hard: two roots, an equation solved where its two graphs cross, and, in a new setting, the height a stone falls
// from. The root not squared, the constant added back, the fraction multiplied or upside down, the answer that does
// not fit kept, the excluded value kept, the last square forgotten, the crossing's y given and h divided instead of
// multiplied are slips. #724 added, about 40 % of the time: easy, a linear equation solved where its two sides'
// graphs cross; medium, how many points a parabola and a line meet at, from b² − 4ac; hard, a quadratic system's
// larger x read and checked on its graph, and in a new setting, when a thrown ball first reaches a drone's height.
// The crossing's y given, the meeting count misread and the later time given are slips.
import { fill } from "../chart";
import { num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { pickPart } from "../tTails";
import { factorText } from "../polyGraph";
import { graph2Svg, graphSvg, lineIn, sgn } from "../readFunction";
import { plusText } from "../rootEquations";

const place = (body: string) => (x: number, y: number) => `<g transform="translate(${x} ${y})">${body}</g>`;
const m = (v: number) => String(v).replace("-", "−");

const gen: Gen = (r, L, w) => {
  if (r.int(0, 9) >= 6) return more(r, L, w);
  const W = w.qre;
  const numQ = (prompt: string, v: number, traps: (Trap | false)[], steps: string[], pic?: Part["pic"]): Part => ({
    prompt, q: "", ...(pic ? { pic } : {}), answer: { ...num(v), traps: traps.filter((t, i): t is Trap => !!t && t.a.k === "num" && Math.abs(t.a.v - v) > 1e-9 && !traps.slice(0, i).some((u) => u && u.a.k === "num" && t.a.k === "num" && u.a.v === t.a.v)) }, show: sgn(v), plain: String(v), format: "number", steps,
  });
  const slip = (id: Trap["id"], v: number, vars?: Record<string, string | number>): Trap => ({ id, a: num(v), vars });
  // √(x + a) = x + c with a fitting answer g and one that does not fit, h.
  const rootEq = () => {
    const c = r.int(-4, 3);
    const k = r.int(1, 3);
    const h = -c - k;
    const g = 1 - c + k;
    return { a: c * c - g * h, c, g, h };
  };

  if (L === 1) {
    if (r.next() < 0.55) {
      const a = r.int(-9, 12);
      const b = r.int(2, 9);
      return numQ(fill(W.solveQ, { eq: `√(${plusText(a)}) = ${b}` }), b * b - a,
        [slip("rootNotSquared", b - a, { b }), a !== 0 && slip("constantAddedBack", b * b + a, { a: m(a), s: b * b })],
        [`x ${a < 0 ? "-" : "+"} ${Math.abs(a)} = ${b}^2 = ${b * b}`, `x = ${b * b - a}`]);
    }
    const b = r.pick([2, 3, 4, 5, 6, -2, -3]);
    const v = r.pick([2, 3, 4, 5, 7, -2]);
    const a = b * v;
    return numQ(fill(W.solveQ, { eq: `${m(a)}/x = ${m(b)}` }), v,
      [slip("fractionMultiplied", a * b, { a: m(a), b: m(b) }), Number.isInteger((b / a) * 100) && slip("fractionUpsideDown", b / a, { a: m(a), b: m(b) })],
      [`${a} = ${b}x`, `x = ${sgn(v)}`]);
  }

  if (L === 2) {
    if (r.next() < 0.55) {
      const { a, c, g, h } = rootEq();
      return numQ(fill(W.solveQ, { eq: `√(${plusText(a)}) = ${plusText(c)}` }), g,
        [slip("extraneousKept", h, { h: m(h), s: m(Math.sqrt(h + a)), r: m(h + c) })],
        [`${plusText(a)} = (${plusText(c)})^2`, `x = ${sgn(g)} \\text{ or } x = ${sgn(h)}`, `x = ${sgn(h)}:\\ \\sqrt{${h + a}} \\ne ${h + c}`]);
    }
    const k = r.int(2, 7);
    let a = r.pick([-3, -2, -1, 1, 2, 3, 4, 5, 6]);
    if (a === k) a = -a;
    return numQ(fill(W.solveQ, { eq: `${k}x/${factorText(a, 1)} = ${m(k * a)}/${factorText(a, 1)} + x` }), k,
      [slip("excludedKept", a, { a: m(a) })],
      [`${k}x = ${k * a} + x${factorText(a, 1)}`, `${factorText(a, 1)}(${k} - x) = 0`, `x \\ne ${sgn(a)} \\Rightarrow x = ${k}`]);
  }

  const t = r.pick(["two", "graph", "stone"] as const);
  if (t === "two") {
    const k = r.int(2, 6);
    const a = 2 * k + 1;
    return numQ(fill(W.solveQ, { eq: `√(x + ${a}) = √x + 1` }), k * k, [slip("lastSquareForgotten", k, { k })],
      [`x + ${a} = x + 2\\sqrt{x} + 1`, `\\sqrt{x} = ${k}`, `x = ${k * k}`]);
  }
  if (t === "graph") {
    for (;;) {
      const { a, c, g, h } = rootEq();
      if (a > 6 || g > 6 || g + c > 6) continue;
      const curve = Array.from({ length: 241 }, (_, i) => -a + (i / 240) * (6 + a)).map((x) => [x, Math.sqrt(x + a)] as const).filter(([x]) => x >= -6);
      const line = [Math.max(-6, -6 - c), Math.min(6, 6 - c)].map((x) => [x, x + c] as const);
      const one = graphSvg(curve, { lo: -6, hi: 6 });
      const two = graphSvg(line, { lo: -6, hi: 6 });
      // The line drawn over the curve's picture, in orange.
      const body = one.body + two.body.slice(two.body.lastIndexOf("<polyline")).replace(/stroke="[^"]*"/, 'stroke="#e8590c"');
      return numQ(fill(W.graphQ, { eq: `√(${plusText(a)}) = ${plusText(c)}` }), g,
        [slip("extraneousKept", h, { h: m(h), s: m(Math.sqrt(h + a)), r: m(h + c) }), slip("crossingYGiven", g + c)],
        [`\\text{they cross at } (${g}, ${g + c})`, `x = ${sgn(g)}`], { svg: place(body), w: one.w, h: one.h });
    }
  }
  // A new setting: a stone dropped from h metres falls for t = √(h ÷ 5) seconds.
  const s = r.pick([2, 3, 4, 6]);
  return numQ(fill(W.stoneQ, { t: s }), 5 * s * s, [slip("rootNotSquared", 5 * s, { b: s }), slip("rootDividedNotTimes", (s * s) / 5, { t: s })],
    [`${s} = \\sqrt{h \\div 5}`, `${s * s} = h \\div 5`, `h = ${5 * s * s}`]);
};

/** y = mx + c as read, with true minus signs. */
const lineSay = (k: number, c: number): string => !k ? m(c) : `${k === 1 ? "" : k === -1 ? "−" : m(k)}x${c ? ` ${c < 0 ? "−" : "+"} ${Math.abs(c)}` : ""}`;
/** y = x² + bx + c as read. */
const quadSay = (b: number, c: number) => `x²${b ? ` ${b < 0 ? "−" : "+"} ${Math.abs(b) === 1 ? "" : Math.abs(b)}x` : ""}${c ? ` ${c < 0 ? "−" : "+"} ${Math.abs(c)}` : ""}`;

function more(r: Rng, L: number, w: PracticeWords): Part {
  const W = w.qreP;
  const numQ = (prompt: string, v: number, slips: [Trap["id"], number, Record<string, string | number>][], steps: string[], pic?: Part["pic"]): Part => ({
    prompt, q: "", ...(pic ? { pic } : {}), show: sgn(v), plain: String(v), format: "number", steps,
    answer: { ...num(v), traps: slips.filter(([, s]) => s !== v).map(([id, s, vars]) => ({ id, a: num(s), vars: { v: m(v), ...vars } })) },
  });
  if (L === 1) {
    // mx + c = d solved where y = mx + c and the level line y = d cross.
    for (;;) {
      const [k, c, x0] = [r.nz(-3, 3), r.int(-4, 4), r.int(-4, 4)];
      const d = k * x0 + c;
      if (Math.abs(d) > 5 || d === x0) continue;
      const p = graph2Svg(lineIn(k, c, -6, 6), [[-6, d], [6, d]], { lo: -6, hi: 6 });
      return numQ(fill(W.lineGraph, { a: lineSay(k, c), d: m(d) }), x0, [["crossingYGiven", d, {}]],
        [`\\text{they cross at } (${x0}, ${d})`, `x = ${sgn(x0)}`], { svg: place(p.body), w: p.w, h: p.h });
    }
  }
  if (L === 2) {
    // How many points y = x² + bx + c and y = kx + e meet at: x² + (b − k)x + (c − e) = 0, from its discriminant.
    const opts = [W.two, W.one, W.zero];
    const sort = r.pick([0, 1, 2]);
    const [b, k] = [r.int(-3, 3), r.int(-3, 3)];
    const B = b - k;
    // Discriminant B² − 4C: positive, zero (B even, C = B²/4) or negative.
    const C = sort === 1 && B % 2 === 0 ? (B * B) / 4 : sort === 1 ? null : sort === 0 ? Math.floor((B * B) / 4) - r.int(1, 4) : Math.floor((B * B) / 4) + r.int(1, 4);
    if (C === null) return more(r, L, w);
    const c = r.int(-4, 4);
    const e = c - C;
    const disc = B * B - 4 * C;
    const say = `x² ${B < 0 ? "−" : "+"} ${Math.abs(B)}x ${C < 0 ? "−" : "+"} ${Math.abs(C)} = 0:  b² − 4ac = ${B * B} − ${4 * C < 0 ? `(${m(4 * C)})` : 4 * C} = ${m(disc)}`;
    return pickPart(r, opts, sort, [{ id: "quadMeetCount", at: [1, 0, 0][sort], vars: { w: say, v: opts[sort] } }],
      fill(W.meetCount, { a: quadSay(b, c), b: lineSay(k, e) || "0" }), [`x^2 ${B < 0 ? "-" : "+"} ${Math.abs(B)}x ${C < 0 ? "-" : "+"} ${Math.abs(C)} = 0`, `b^2 - 4ac = ${disc}`]);
  }
  if (r.next() < 0.6) {
    // y = x² + p and y = kx + q meeting at x = s < t: the larger x, read off the graph and checked.
    for (;;) {
      const [s, t] = [r.int(-3, 2), r.int(-2, 3)];
      const p = r.int(-3, 2);
      if (s >= t) continue;
      const [k, q] = [s + t, p - s * t];
      if (Math.abs(q) > 6 || t * t + p > 6) continue;
      const curve = Array.from({ length: 121 }, (_, i) => -6 + i / 10).map((x) => [x, x * x + p] as const).filter(([, y]) => y <= 6.2);
      const g = graph2Svg(curve, lineIn(k, q, -6, 6), { lo: -6, hi: 6 });
      return numQ(fill(W.quadSystem, { a: quadSay(0, p), b: lineSay(k, q) || "0" }), t, [["crossingYGiven", t * t + p, {}]],
        [`x^2 ${p < 0 ? "-" : "+"} ${Math.abs(p)} = ${k}x ${q < 0 ? "-" : "+"} ${Math.abs(q)}`, `(x ${s < 0 ? "+" : "-"} ${Math.abs(s)})(x ${t < 0 ? "+" : "-"} ${Math.abs(t)}) = 0`, `x = ${sgn(s)} \\text{ or } x = ${sgn(t)}`],
        { svg: place(g.body), w: g.w, h: g.h });
    }
  }
  // A new setting: a ball thrown up is at h = −5t² + 5(a + b)t metres; a drone hovers at 5ab metres.
  const a = r.int(1, 2);
  const b = r.int(a + 1, 4);
  return numQ(fill(W.drone, { u: 5 * (a + b), d: 5 * a * b }), a, [["laterMeetingGiven", b, { a, b }]],
    [`-5t^2 + ${5 * (a + b)}t = ${5 * a * b}`, `t^2 - ${a + b}t + ${a * b} = 0`, `(t - ${a})(t - ${b}) = 0`, `t = ${a}`]);
}

export default gen;
