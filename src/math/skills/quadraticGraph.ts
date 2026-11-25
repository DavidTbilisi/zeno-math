// Practice: quadratic graphs (#658). Easy: a root, the axis of symmetry and the y-intercept from the factorised form.
// Medium: completing the square, and where the least value is. Hard: a from a graph, the number of roots by the
// discriminant, and, in a new setting, the greatest height of a thrown ball. The root's sign kept, the intercept's sign
// dropped, the axis not halved, the square added instead of taken, b not halved, the vertex's sign kept, the intercept
// taken for a, +4ac in the discriminant, the time given for the height and the starting height left out are slips.
import { fill } from "../chart";
import { num } from "../practiceKit";
import type { Gen, Part, Trap } from "../practiceTypes";
import { curvePoints } from "../quadraticGraph";
import { graphSvg, sgn } from "../readFunction";
import { pickPart } from "../tTails";

const place = (body: string) => (x: number, y: number) => `<g transform="translate(${x} ${y})">${body}</g>`;
const picOf = (p: { body: string; w: number; h: number }) => ({ svg: place(p.body), h: p.h, w: p.w });
/** (x + a), (x − a) or x written out. */
const factor = (r: number) => (r === 0 ? "x" : `(x ${r > 0 ? "−" : "+"} ${Math.abs(r)})`);
/** x² + bx + c written out. */
const quad = (b: number, c: number) => `x² ${b < 0 ? "−" : "+"} ${Math.abs(b)}x ${c < 0 ? "−" : "+"} ${Math.abs(c)}`;

const gen: Gen = (r, L, w) => {
  const W = w.qgr;
  const numQ = (prompt: string, v: number, traps: Trap[], steps: string[], pic?: Part["pic"]): Part => ({
    prompt, q: "", ...(pic ? { pic } : {}), answer: { ...num(v), traps: traps.filter((t) => t.a.k === "num" && Math.abs(t.a.v - v) > 1e-9) }, show: sgn(v), plain: String(v), format: "number", steps,
  });
  const slip = (id: Trap["id"], v: number, vars?: Record<string, string | number>): Trap => ({ id, a: num(v), vars });

  if (L === 1) {
    // y = (x + a)(x − q): roots −a and q.
    const a = r.int(1, 6);
    let q = r.int(1, 7);
    if (q === a) q += 1;
    const eq = `y = ${factor(-a)}${factor(q)}`;
    const t = r.pick(["root", "axis", "intercept"] as const);
    if (t === "root") return numQ(fill(W.rootQ, { eq }), -a, [slip("rootSignKept", a, { a })], [`x + ${a} = 0 \\Rightarrow x = ${sgn(-a)}`]);
    if (t === "axis") {
      const v = (q - a) / 2;
      return numQ(fill(W.axisQ, { eq }), v, [slip("axisNotHalved", q - a, { p: sgn(-a), q })], [`x = \\frac{${sgn(-a)} + ${q}}{2} = ${sgn(v)}`]);
    }
    return numQ(fill(W.interceptQ, { eq }), -a * q, [slip("interceptSignDropped", a * q, { a, q, v: sgn(-a * q) })], [`y = (0 + ${a})(0 - ${q}) = ${sgn(-a * q)}`]);
  }

  if (L === 2) {
    const h = r.pick([-4, -3, -2, -1, 1, 2, 3, 4, 5]);
    const b = 2 * h;
    const c = r.int(-9, 12);
    const k = c - h * h;
    if (r.next() < 0.6) {
      return numQ(fill(W.squareQ, { e: quad(b, c) }), k, [slip("kAddsSquare", c + h * h, { h: Math.abs(h), s: h * h }), slip("halfNotTaken", c - b * b, { b: Math.abs(b), h: Math.abs(h) })],
        [`${quad(b, c)} = (x ${h < 0 ? "−" : "+"} ${Math.abs(h)})^2 ${c < 0 ? "−" : "+"} ${Math.abs(c)} - ${h * h}`, `k = ${sgn(k)}`]);
    }
    return numQ(fill(W.leastAtQ, { e: quad(b, c) }), -h, [slip("vertexSignKept", h, { h: sgn(h), x: sgn(-h) })], [`(x ${h < 0 ? "−" : "+"} ${Math.abs(h)})^2 \\ge 0`, `x = ${sgn(-h)}`]);
  }

  const t = r.pick(["fromGraph", "roots", "ball"] as const);
  if (t === "fromGraph") {
    // y = a(x − p)(x − q) through whole-number roots and y-intercept a·p·q, its vertex on the picture.
    for (;;) {
      const a = r.pick([-2, -1, 1, 2, 0.5, -0.5]);
      const [p, q] = [r.int(-4, -1), r.int(1, 4)];
      const y0 = a * p * q;
      const vy = -a * ((q - p) / 2) ** 2;
      if (!Number.isInteger(y0) || Math.abs(y0) > 6 || Math.abs(vy) > 6 || Math.abs(y0) === Math.abs(a)) continue;
      const pts = curvePoints((x) => a * (x - p) * (x - q), -6, 6, 6);
      return numQ(W.fromGraphQ, a, [slip("aFromIntercept", y0, { y: sgn(y0), p: sgn(p), q: sgn(q), a: sgn(a) })],
        [`y = a(x ${p < 0 ? "+" : "−"} ${Math.abs(p)})(x − ${q})`, `${sgn(y0)} = a \\times ${sgn(-p)} \\times ${sgn(-q)} \\Rightarrow a = ${sgn(a)}`],
        picOf(graphSvg(pts, { lo: -6, hi: 6 })));
    }
  }
  if (t === "roots") {
    for (;;) {
      const A = r.pick([1, 2, 3]);
      const B = r.int(-8, 8);
      const C = r.int(1, 9);
      const d = B * B - 4 * A * C;
      const n = d > 0 ? 2 : d === 0 ? 1 : 0;
      const plus = B * B + 4 * A * C > 0 ? 2 : 1;
      if (n === plus && r.next() < 0.7) continue;
      const eq = `${A === 1 ? "" : A}${quad(B, C)} = 0`;
      return pickPart(r, ["0", "1", "2"], n, [{ id: "discriminantPlus", at: plus, vars: { d: d } }], fill(W.rootsQ, { eq }), [`b^2 - 4ac = ${B * B} - ${4 * A * C} = ${d}`]);
    }
  }
  // A new setting: a ball thrown upward, h = h₀ + vt − 5t².
  const v = r.pick([10, 20, 30]);
  const h0 = r.pick([1, 2, 5, 10, 15]);
  const top = h0 + (v * v) / 20;
  return numQ(fill(W.ballQ, { h: h0, v }), top, [slip("maxTimeForHeight", v / 10, { t: v / 10 }), slip("startHeightLeft", (v * v) / 20, { h: h0 })],
    [`t = \\frac{${v}}{10} = ${v / 10}`, `h = ${h0} + ${v} \\times ${v / 10} - 5 \\times ${v / 10}^2 = ${top}`]);
};

export default gen;
