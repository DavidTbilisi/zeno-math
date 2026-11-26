// Practice: transformations of functions (#662). Easy: where a point goes under f(x − h), f(x + h) and f(x) + k.
// Medium: under −f(x), f(−x), a·f(x) and f(bx), and h from a picture. Hard: several in order, even or odd, and, in a
// new setting, when a schedule run later peaks. A shift the wrong way, the two reflections swapped, a stretch on the
// wrong axis, f(bx) not divided, the shift before the stretch, the factor inside not taken out, a constant thought to
// spoil evenness, odd called even and odd with a constant are slips. #726 added graph families (four times in ten at
// the easy and medium levels, three at the hard one): easy, the equation of a square or cube root graph; medium, the
// equation of an exponential graph and even, odd or neither from a table or a graph; hard, h read off the graph of
// y = log₂(x − h). The shift the wrong way, the two shifts swapped, the root family confused, the start and the base
// swapped, growth and decay confused, parity misread and the x-intercept taken for the asymptote are slips.
import { fill } from "../chart";
import { num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { expanded } from "../polyGraph";
import { curvePoints } from "../quadraticGraph";
import { graphSvg, sgn } from "../readFunction";
import { pickPart } from "../tTails";
import { polyText } from "../whichTool";

const place = (body: string) => (x: number, y: number) => `<g transform="translate(${x} ${y})">${body}</g>`;
const m = (v: number) => String(v).replace("-", "−");
const pt = (x: number, y: number) => `(${m(x)}, ${m(y)})`;
const nz = (r: Parameters<Gen>[0], lo: number, hi: number) => {
  let v = 0;
  while (v === 0) v = r.int(lo, hi);
  return v;
};

const gen: Gen = (r, L, w) => {
  if (r.int(0, 9) >= (L === 3 ? 7 : 6)) return family(r, L, w);
  const W = w.qft;
  const numQ = (prompt: string, v: number, traps: (Trap | false)[], steps: string[], pic?: Part["pic"]): Part => ({
    prompt, q: "", ...(pic ? { pic } : {}), answer: { ...num(v), traps: traps.filter((t): t is Trap => !!t && t.a.k === "num" && Math.abs(t.a.v - v) > 1e-9) }, show: sgn(v), plain: String(v), format: "number", steps,
  });
  const slip = (id: Trap["id"], v: number, vars?: Record<string, string | number>): Trap => ({ id, a: num(v), vars });
  const [p, q] = [nz(r, -6, 6), nz(r, -6, 6)];

  if (L === 1) {
    const h = r.int(1, 5);
    const t = r.pick(["minus", "plus", "up"] as const);
    if (t === "up") {
      const k = nz(r, -5, 5);
      return numQ(fill(W.yQ, { p: pt(p, q), g: `f(x) ${k > 0 ? "+" : "−"} ${Math.abs(k)}` }), q + k, [], [`${pt(p, q)} \\to (${p}, ${q} ${k < 0 ? "-" : "+"} ${Math.abs(k)})`]);
    }
    const right = t === "minus";
    const g = `f(x ${right ? "−" : "+"} ${h})`;
    const v = right ? p + h : p - h;
    return numQ(fill(W.xQ, { p: pt(p, q), g }), v, [slip("shiftWrongWay", right ? p - h : p + h, { g, d: right ? w.qft.right : w.qft.left, h })],
      [`x ${right ? "-" : "+"} ${h} = ${p}`, `x = ${sgn(v)}`]);
  }

  if (L === 2) {
    const t = r.pick(["negF", "fNeg", "aF", "fB", "picture"] as const);
    if (t === "negF") return numQ(fill(W.yQ, { p: pt(p, q), g: "−f(x)" }), -q, [slip("reflectionAxesSwapped", q)], [`${pt(p, q)} \\to ${pt(p, -q)}`]);
    if (t === "fNeg") return numQ(fill(W.xQ, { p: pt(p, q), g: "f(−x)" }), -p, [slip("reflectionAxesSwapped", p)], [`${pt(p, q)} \\to ${pt(-p, q)}`]);
    if (t === "aF") {
      const a = r.pick([2, 3, 4]);
      return numQ(fill(W.yQ, { p: pt(p, q), g: `${a}f(x)` }), a * q, [slip("stretchWrongAxis", q, { a })], [`${pt(p, q)} \\to ${pt(p, a * q)}`]);
    }
    if (t === "fB") {
      const b = r.pick([2, 3]);
      const x = b * nz(r, -3, 3);
      return numQ(fill(W.xQ, { p: pt(x, q), g: `f(${b}x)` }), x / b, [slip("stretchNotInverted", b * x, { b, p: m(x) })], [`${b}x = ${x}`, `x = ${sgn(x / b)}`]);
    }
    // h from a picture: the dashed parent y = x² and the solid y = (x − h)² + k.
    const h = nz(r, -4, 4);
    const k = r.int(-3, 3);
    const one = graphSvg(curvePoints((x) => (x - h) ** 2 + k, -6, 6, 6), { lo: -6, hi: 6 });
    const two = graphSvg(curvePoints((x) => x * x, -6, 6, 6), { lo: -6, hi: 6 });
    const ghost = two.body.slice(two.body.lastIndexOf("<polyline")).replace(/stroke="[^"]*"/, 'stroke="#868e96" stroke-dasharray="6 5"');
    const body = one.body.replace("<polyline", `${ghost}<polyline`);
    return numQ(W.pictureQ, h, [slip("shiftWrongWay", -h, { g: `(x − h)²`, d: h > 0 ? w.qft.right : w.qft.left, h: Math.abs(h) })],
      [`\\text{the lowest point moved from } (0, 0) \\text{ to } (${h}, ${k})`, `h = ${sgn(h)}`], { svg: place(body), w: one.w, h: one.h });
  }

  const t = r.pick(["order", "inside", "parity", "schedule"] as const);
  if (t === "order") {
    const [a, h, k] = [r.pick([2, 3, -2]), nz(r, -4, 4), nz(r, -5, 5)];
    const g = `${m(a)}f(x ${h > 0 ? "−" : "+"} ${Math.abs(h)}) ${k > 0 ? "+" : "−"} ${Math.abs(k)}`;
    return numQ(fill(W.yQ, { p: pt(p, q), g }), a * q + k, [slip("stretchAfterShift", a * (q + k), { a: m(a), k: m(k) })],
      [`y: ${q} \\times ${a} = ${a * q}`, `${a * q} ${k < 0 ? "-" : "+"} ${Math.abs(k)} = ${a * q + k}`]);
  }
  if (t === "inside") {
    const b = r.pick([2, 3]);
    const c = b * r.int(1, 4);
    const x0 = b * nz(r, -3, 3);
    const v = (x0 + c) / b;
    return numQ(fill(W.xQ, { p: pt(x0, q), g: `f(${b}x − ${c})` }), v, [slip("insideFactorNotTaken", x0 / b + c, { b, c, s: c / b })],
      [`${b}x - ${c} = ${x0}`, `x = ${sgn(v)}`]);
  }
  if (t === "parity") {
    const kind = r.pick(["even", "odd", "neither"] as const);
    const [c1, c2, d] = [nz(r, -4, 4), nz(r, -6, 6), nz(r, -9, 9)];
    const f = kind === "even" ? expanded([[c1, 4], [c2, 2], [d, 0]]) : kind === "odd" ? expanded([[c1, 3], [c2, 1]]) : expanded([[c1, 3], [c2, 1], [d, 0]]);
    const right = kind === "even" ? 0 : kind === "odd" ? 1 : 2;
    const trap = kind === "even" ? { id: "constantBreaksEven" as const, at: 2, vars: { d: m(d) } } : kind === "odd" ? { id: "oddCalledEven" as const, at: 0 } : { id: "oddWithConstant" as const, at: 1, vars: { d: m(d) } };
    return pickPart(r, [W.even, W.odd, W.neither], right, [trap], fill(W.parityQ, { f: `f(x) = ${f}` }),
      [kind === "even" ? "f(-x) = f(x)" : kind === "odd" ? "f(-x) = -f(x)" : "f(-x) \\ne \\pm f(x)"]);
  }
  // A new setting: a heating schedule run later.
  const pk = r.int(6, 15);
  const h = r.int(2, 5);
  return numQ(fill(W.scheduleQ, { p: pk, h }), pk + h, [slip("shiftWrongWay", pk - h, { g: `T(t − ${h})`, d: w.qft.right, h })], [`t - ${h} = ${pk}`, `t = ${pk + h}`]);
};

/** " + k" or " − k", nothing for 0. */
const plusK = (k: number) => (k ? ` ${k < 0 ? "−" : "+"} ${Math.abs(k)}` : "");
const picOf = (g: { body: string; w: number; h: number }) => ({ svg: place(g.body), w: g.w, h: g.h });

function family(r: Rng, L: number, w: PracticeWords): Part {
  const W = w.qftP;
  if (L === 1) {
    // The equation of y = √(x − h) + k or y = ∛(x − h) + k from its graph.
    const cube = r.next() < 0.4;
    const [h, k] = [nz(r, -4, 4), r.int(-3, 3)];
    if (h === k) return family(r, L, w);
    const f = (x: number) => (cube ? Math.cbrt(x - h) : Math.sqrt(x - h)) + k;
    const g = graphSvg(curvePoints(f, cube ? -6 : h, 6, 6), { lo: -6, hi: 6 });
    const dotted = `${g.body}<circle cx="${20 + (h + 6) * 22}" cy="${20 + (6 - k) * 22}" r="4.5" fill="#1971c2"/>`;
    const eq = (hh: number, kk: number, c: boolean) => `y = ${c ? "∛" : "√"}(${polyText(-hh, 1)})${plusK(kk)}`;
    const opts = [eq(h, k, cube), eq(-h, k, cube), eq(k, h, cube), eq(h, k, !cube)];
    return { ...pickPart(r, opts, 0, [
      { id: "shiftWrongWay", at: 1, vars: { g: `(${polyText(-h, 1)})`, d: h > 0 ? w.qft.right : w.qft.left, h: Math.abs(h) } },
      { id: "shiftAxesSwapped", at: 2, vars: { h: m(h), k: m(k), v: opts[0] } },
      { id: "graphFamilyConfused", at: 3, vars: { v: opts[0] } },
    ], W.rootQ, [`\\text{${fill(W.keyAt, { p: pt(h, k) })}}`]), pic: picOf({ ...g, body: dotted }) };
  }
  if (L === 2) {
    const t = r.pick(["exp", "table", "graph"] as const);
    if (t === "exp") {
      // y = a·bˣ from its graph through (0, a) and (1, ab).
      const a = r.pick([1, 2, 3]);
      const grow = r.next() < 0.6;
      const b = grow ? r.pick([2, 3]) : 2;
      if (a === b) return family(r, L, w);
      const base = grow ? b : 1 / b;
      const g = graphSvg(curvePoints((x) => a * base ** x, -6, 6, 6), { lo: -6, hi: 6 });
      const dots = [[0, a], [1, a * base]].map(([x, y]) => `<circle cx="${20 + (x + 6) * 22}" cy="${20 + (6 - y) * 22}" r="4.5" fill="#1971c2"/>`).join("");
      const bs = (v: number, up: boolean) => (up ? String(v) : `(1/${v})`);
      const eq = (aa: number, bb: string) => `y = ${aa === 1 ? "" : `${aa} · `}${bb}ˣ`;
      const opts = [eq(a, bs(b, grow)), eq(b, grow ? String(a) : `(1/${a})`), eq(a, bs(b, !grow)), `y = ${b}x${plusK(a)}`];
      if (a === 1 && !grow) opts[1] = `y = ${b} · 1ˣ`;
      return { ...pickPart(r, opts, 0, [
        { id: "baseStartSwapped", at: 1, vars: { a, n: m(Math.round(a * base * 100) / 100), b: bs(b, grow), v: opts[0] } },
        { id: "growthDecayConfused", at: 2, vars: { d: grow ? W.rises : W.falls, c: grow ? W.more : W.less, v: opts[0] } },
      ], W.expQ, [`y(0) = ${a}`, `y(1) = ${a} \\times ${grow ? b : `\\tfrac{1}{${b}}`}`]), pic: picOf({ ...g, body: g.body + dots }) };
    }
    const kind = r.pick(["even", "odd", "neither"] as const);
    const opts = [w.qft.even, w.qft.odd, w.qft.neither];
    const right = ["even", "odd", "neither"].indexOf(kind);
    if (t === "table") {
      // f at −3 … 3: mirrored, mirrored with the sign turned, or matching one pair only.
      const v = [r.int(-9, 9), r.int(-9, 9), r.int(-9, 9)];
      if (kind === "odd" && v.every((x) => x === 0)) return family(r, L, w);
      const f0 = kind === "odd" ? 0 : r.int(-5, 5);
      const left = kind === "even" ? [...v].reverse() : kind === "odd" ? [...v].reverse().map((x) => -x) : [v[2] + r.pick([2, 3, -3]), v[1] === 0 ? 4 : -v[1], v[0]];
      if (kind === "neither" && left[0] === v[2] && left[1] === v[1]) return family(r, L, w);
      const ys = [...left, f0, ...v];
      const xs = [-3, -2, -1, 0, 1, 2, 3];
      const pairs = [1, 2, 3].map((x) => `f(−${x}) = ${m(ys[3 - x])}, f(${x}) = ${m(ys[3 + x])}`).join("; ");
      const slipAt = kind === "even" ? 1 : kind === "odd" ? 0 : 0;
      return {
        ...pickPart(r, opts, right, [{ id: "parityMisread", at: slipAt, vars: { w: pairs, v: opts[right] } }], W.tableQ, [`\\text{${pairs.replace(/−/g, "-")}}`]),
        q: `\\begin{array}{c|ccccccc} x & ${xs.join(" & ")} \\\\ \\hline f(x) & ${ys.join(" & ")} \\end{array}`,
      };
    }
    // Even, odd or neither from a graph.
    const k = r.int(-3, 2);
    const h = nz(r, -2, 2);
    const f = kind === "even" ? (x: number) => (x * x) / 4 + k : kind === "odd" ? (x: number) => (x ** 3) / 20 - x : (x: number) => ((x - h) ** 2) / 4 + k;
    const g = graphSvg(curvePoints(f, -6, 6, 6), { lo: -6, hi: 6 });
    const why = [W.mirrorY, W.mirrorO, W.mirrorNone][right];
    return { ...pickPart(r, opts, right, [{ id: "parityMisread", at: right === 0 ? 1 : 0, vars: { w: why, v: opts[right] } }], W.graphQ, [`\\text{${why}}`]), pic: picOf(g) };
  }
  // h read off the graph of y = log₂(x − h): the asymptote x = h, the x-intercept h + 1.
  const h = nz(r, -4, 3);
  const g = graphSvg(curvePoints((x) => Math.log2(x - h), h + 0.02, 6, 6), { lo: -6, hi: 6 });
  const X = 20 + (h + 6) * 22;
  const body = `${g.body}<line x1="${X}" y1="20" x2="${X}" y2="284" stroke="#868e96" stroke-dasharray="6 5"/>`;
  return {
    prompt: W.logQ, q: "", pic: picOf({ ...g, body }), show: sgn(h), plain: String(h), format: "number",
    answer: { ...num(h), traps: [
      { id: "asymptoteForIntercept", a: num(h + 1), vars: { c: m(h + 1), v: m(h) } },
      { id: "shiftWrongWay", a: num(-h), vars: { g: `(${polyText(-h, 1)})`, d: h > 0 ? w.qft.right : w.qft.left, h: Math.abs(h) } },
    ] },
    steps: [`x = ${h} \\text{ is the asymptote}`, `y = \\log_2(x ${h < 0 ? "+" : "-"} ${Math.abs(h)})`],
  };
}

export default gen;
