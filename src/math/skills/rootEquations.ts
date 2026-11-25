// Practice: equations with roots and fractions (#661). Easy: √(x + a) = b and a/x = b. Medium: a root equation that
// squares to a quadratic with one answer that does not fit, and a fraction equation whose second answer is excluded.
// Hard: two roots, an equation solved where its two graphs cross, and, in a new setting, the height a stone falls
// from. The root not squared, the constant added back, the fraction multiplied or upside down, the answer that does
// not fit kept, the excluded value kept, the last square forgotten, the crossing's y given and h divided instead of
// multiplied are slips.
import { fill } from "../chart";
import { num } from "../practiceKit";
import type { Gen, Part, Trap } from "../practiceTypes";
import { factorText } from "../polyGraph";
import { graphSvg, sgn } from "../readFunction";
import { plusText } from "../rootEquations";

const place = (body: string) => (x: number, y: number) => `<g transform="translate(${x} ${y})">${body}</g>`;
const m = (v: number) => String(v).replace("-", "−");

const gen: Gen = (r, L, w) => {
  const W = w.qre;
  const numQ = (prompt: string, v: number, traps: (Trap | false)[], steps: string[], pic?: Part["pic"]): Part => ({
    prompt, q: "", ...(pic ? { pic } : {}), answer: { ...num(v), traps: traps.filter((t): t is Trap => !!t && t.a.k === "num" && Math.abs(t.a.v - v) > 1e-9) }, show: sgn(v), plain: String(v), format: "number", steps,
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

export default gen;
