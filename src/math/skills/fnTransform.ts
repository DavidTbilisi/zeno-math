// Practice: transformations of functions (#662). Easy: where a point goes under f(x − h), f(x + h) and f(x) + k.
// Medium: under −f(x), f(−x), a·f(x) and f(bx), and h from a picture. Hard: several in order, even or odd, and, in a
// new setting, when a schedule run later peaks. A shift the wrong way, the two reflections swapped, a stretch on the
// wrong axis, f(bx) not divided, the shift before the stretch, the factor inside not taken out, a constant thought to
// spoil evenness, odd called even and odd with a constant are slips.
import { fill } from "../chart";
import { num } from "../practiceKit";
import type { Gen, Part, Trap } from "../practiceTypes";
import { expanded } from "../polyGraph";
import { curvePoints } from "../quadraticGraph";
import { graphSvg, sgn } from "../readFunction";
import { pickPart } from "../tTails";

const place = (body: string) => (x: number, y: number) => `<g transform="translate(${x} ${y})">${body}</g>`;
const m = (v: number) => String(v).replace("-", "−");
const pt = (x: number, y: number) => `(${m(x)}, ${m(y)})`;
const nz = (r: Parameters<Gen>[0], lo: number, hi: number) => {
  let v = 0;
  while (v === 0) v = r.int(lo, hi);
  return v;
};

const gen: Gen = (r, L, w) => {
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

export default gen;
