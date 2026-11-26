// Practice: quadratic graphs (#658). Easy: a root, the axis of symmetry and the y-intercept from the factorised form.
// Medium: completing the square, and where the least value is. Hard: a from a graph, the number of roots by the
// discriminant, and, in a new setting, the greatest height of a thrown ball. The root's sign kept, the intercept's sign
// dropped, the axis not halved, the square added instead of taken, b not halved, the vertex's sign kept, the intercept
// taken for a, +4ac in the discriminant, the time given for the height and the starting height left out are slips.
// #727 added, four times in ten at the medium and hard levels: medium, y = a(x − h)² + k picked from its graph; hard,
// in a new setting, a fountain's jet read off its graph (when it lands, how high it gets, when it is highest), and
// which of f, written in vertex form, and g, drawn, has the greater maximum. The shift the wrong way, the two shifts
// swapped, the parabola opening the wrong way, the top taken for the landing, the vertex's two numbers swapped and
// the vertices compared by x are slips.
import { fill } from "../chart";
import { num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { curvePoints } from "../quadraticGraph";
import { graphSvg, sgn } from "../readFunction";
import { pickPart } from "../tTails";
import { polyText } from "../whichTool";

const place = (body: string) => (x: number, y: number) => `<g transform="translate(${x} ${y})">${body}</g>`;
const picOf = (p: { body: string; w: number; h: number }) => ({ svg: place(p.body), h: p.h, w: p.w });
/** (x + a), (x − a) or x written out. */
const factor = (r: number) => (r === 0 ? "x" : `(x ${r > 0 ? "−" : "+"} ${Math.abs(r)})`);
/** x² + bx + c written out. */
const quad = (b: number, c: number) => `x² ${b < 0 ? "−" : "+"} ${Math.abs(b)}x ${c < 0 ? "−" : "+"} ${Math.abs(c)}`;

const gen: Gen = (r, L, w) => {
  if (L > 1 && r.int(0, 9) >= 6) return more(r, L, w);
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

const mm = (v: number) => String(v).replace("-", "−");
const dot = (x: number, y: number, lo: number, hi: number) => `<circle cx="${20 + (x - lo) * 22}" cy="${20 + (hi - y) * 22}" r="4.5" fill="#1971c2"/>`;
/** "2", "−", "½" or nothing in front of the bracket. */
const coef = (a: number) => (a === 1 ? "" : a === -1 ? "−" : a === 0.5 ? "½" : a === -0.5 ? "−½" : mm(a));
const vForm = (a: number, h: number, k: number) => `y = ${coef(a)}${h ? `(${polyText(-h, 1)})` : "x"}²${k ? ` ${k < 0 ? "−" : "+"} ${Math.abs(k)}` : ""}`;

function more(r: Rng, L: number, w: PracticeWords): Part {
  const W = w.qgrP;
  const numQ = (prompt: string, v: number, traps: Trap[], steps: string[], pic?: Part["pic"]): Part => ({
    prompt, q: "", ...(pic ? { pic } : {}), show: sgn(v), plain: String(v), format: "number", steps,
    answer: { ...num(v), traps: traps.filter((t, i) => t.a.k === "num" && t.a.v !== v && !traps.slice(0, i).some((u) => u.a.k === "num" && t.a.k === "num" && u.a.v === t.a.v)) },
  });
  if (L === 2) {
    // y = a(x − h)² + k picked from its graph, the vertex dotted.
    const a = r.pick([1, -1, 2, -2, 0.5, -0.5]);
    const [h, k] = [r.pick([-4, -3, -2, -1, 1, 2, 3, 4]), r.int(-4, 4)];
    if (Math.abs(h) === Math.abs(k)) return more(r, L, w);
    const g = graphSvg(curvePoints((x) => a * (x - h) ** 2 + k, -6, 6, 6), { lo: -6, hi: 6 });
    const opts = [vForm(a, h, k), vForm(a, -h, k), vForm(a, k, h), vForm(-a, h, k)];
    return { ...pickPart(r, opts, 0, [
      { id: "shiftWrongWay", at: 1, vars: { g: `(${polyText(-h, 1)})²`, d: h > 0 ? w.qft.right : w.qft.left, h: Math.abs(h) } },
      { id: "shiftAxesSwapped", at: 2, vars: { h: mm(h), k: mm(k), v: opts[0] } },
      { id: "parabolaOpensWrongWay", at: 3, vars: { d: a > 0 ? W.up : W.down, v: opts[0] } },
    ], W.eqQ, [`\\text{${fill(W.vertexIs, { p: `(${mm(h)}, ${mm(k)})` })}}`]), pic: picOf({ ...g, body: g.body + dot(h, k, -6, 6) }) };
  }
  if (r.next() < 0.5) {
    // A new setting: a fountain's jet, height H at t = T/2, back down at t = T.
    for (;;) {
      const T = r.pick([4, 6, 8, 10, 12]);
      const H = r.int(3, 12);
      if (H === T / 2 || H === T) continue;
      const f = (t: number) => H - H * ((t - T / 2) / (T / 2)) ** 2;
      const g = graphSvg(curvePoints(f, 0, T, 12), { lo: 0, hi: 12 });
      // The axes named as the question names them: t across, h up.
      const pic = picOf({ ...g, body: g.body.replace(">x</text>", ">t</text>").replace(">y</text>", ">h</text>") + dot(T / 2, H, 0, 12) });
      const q = r.pick(["land", "top", "when"] as const);
      if (q === "land") return numQ(W.landQ, T, [{ id: "vertexTimeForLanding", a: num(T / 2), vars: { m: T / 2, H, v: T } }], [`h(${T}) = 0`], pic);
      const xw = W.time;
      const yw = W.height;
      if (q === "top") return numQ(W.topQ, H, [{ id: "vertexPartSwapped", a: num(T / 2), vars: { h: T / 2, k: H, xw, yw, v: H } }], [`\\text{${fill(W.topAt, { t: T / 2, H })}}`], pic);
      return numQ(W.whenQ, T / 2, [{ id: "vertexPartSwapped", a: num(H), vars: { h: T / 2, k: H, xw, yw, v: T / 2 } }], [`\\text{${fill(W.topAt, { t: T / 2, H })}}`], pic);
    }
  }
  // f in vertex form, g drawn: which has the greater maximum? The one further right is the lower one.
  for (;;) {
    const [h1, h2] = [r.int(-4, 4), r.int(-4, 4)];
    const [k1, k2] = [r.int(1, 5), r.int(1, 5)];
    if (h1 === h2 || k1 === k2 || (h1 > h2) === (k1 > k2)) continue;
    const a = r.pick([-1, -2]);
    const g = graphSvg(curvePoints((x) => -0.5 * (x - h2) ** 2 + k2, -6, 6, 6), { lo: -6, hi: 6 });
    const right = k1 > k2 ? 0 : 1;
    const opts = [W.f, W.g, W.same];
    const why = { f: `(${mm(h1)}, ${k1})`, g: `(${mm(h2)}, ${k2})` };
    return { ...pickPart(r, opts, right, [{ id: "vertexXCompared", at: 1 - right, vars: { ...why, v: opts[right] } }],
      fill(W.compareQ, { e: `f(x) = ${coef(a)}(${polyText(-h1, 1)})² + ${k1}`.replace("(x)²", "x²") }), [`\\text{${fill(W.compareWhy, why)}}`]),
      pic: picOf({ ...g, body: g.body + dot(h2, k2, -6, 6) }) };
  }
}

export default gen;
