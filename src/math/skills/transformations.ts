// Practice: Moving shapes. Where a point lands under a translation, a reflection in an axis or in y = x, a turn about
// the origin, an enlargement from the origin; which one move takes a shape onto another; then two moves in a row, a
// centre off the origin, a negative or a fractional scale factor, and what an enlargement does to an area. The vector's
// numbers swapped, the wrong axis, a quarter turn the wrong way or a bare swap, a scale factor added, a half turn taken
// for a flip, the moves done in the other order, the centre ignored, the minus of the scale factor dropped, and the area
// scaled like a length are the slips.
import { C, fill } from "../chart";
import { enlarge, flip, planeSvg, turnAbout, type Mirror, type P2 } from "../moveShape";
import type { MistakeId } from "../mistakes";
import type { Gen, Part, Trap } from "../practiceTypes";

const neg = (v: number) => (v < 0 ? `−${-v}` : String(v));
const pt = ([x, y]: P2) => `(${neg(x)}, ${neg(y)})`;
const ptTex = ([x, y]: P2) => `(${x}, ${y})`;
const kText = (k: number) => (k === 0.5 ? "½" : k === -0.5 ? "−½" : neg(k));
const same = (a: P2, b: P2) => a[0] === b[0] && a[1] === b[1];
/** A number in a step, bracketed when negative; a half as a fraction. */
const tn = (v: number) => (Math.abs(v) === 0.5 ? `${v < 0 ? "-" : ""}\\tfrac{1}{2}` : v < 0 ? `(${v})` : String(v));

const gen: Gen = (r, L, w) => {
  const W = w.moves;
  const pic = (d: { body: string; w: number; h: number }) => ({ svg: (x: number, y: number) => `<g transform="translate(${x} ${y})">${d.body}</g>`, h: d.h, w: d.w });
  /** A question whose answer is where a point lands; each slip is a wrong landing place, left out when it is right. */
  const land = (prompt: string, A: P2, v: P2, slips: [MistakeId, P2, Record<string, string | number>][], steps: string[], extra: { pts: P2[]; color: string; label?: string }[] = [], mirror?: Mirror): Part => {
    const traps: Trap[] = [];
    for (const [id, p, vars] of slips)
      if (!same(p, v) && !traps.some((t) => t.a.k === "tuple" && same(t.a.vs as P2, p))) traps.push({ id, a: { k: "tuple", vs: p, tol: 1e-9 }, vars });
    const n = Math.max(6, ...[A, v, ...extra.flatMap((e) => e.pts)].flatMap(([x, y]) => [Math.abs(x), Math.abs(y)]));
    const d = planeSvg(n, [...extra, { pts: [A], color: C.blue, label: "A" }], mirror, n > 6 ? 14 : 18);
    return { prompt, q: "", pic: pic(d), answer: { k: "tuple", vs: v, tol: 1e-9, traps }, show: `A' = ${ptTex(v)}`, plain: `(${v[0]}; ${v[1]})`, format: "point", steps };
  };
  const point = (lo: number, hi: number): P2 => {
    for (;;) {
      const p: P2 = [r.int(lo, hi), r.int(lo, hi)];
      if (p[0] !== 0 && p[1] !== 0 && Math.abs(p[0]) !== Math.abs(p[1])) return p;
    }
  };

  if (L === 1) {
    const A = point(-5, 5);
    if (r.next() < 0.5) {
      // A translation by a vector: across by the first number, up by the second.
      let [a, b] = [0, 0];
      while (a === 0 || b === 0 || a === b) [a, b] = [r.int(-4, 4), r.int(-4, 4)];
      const v: P2 = [A[0] + a, A[1] + b];
      return land(fill(W.translate, { p: pt(A), a: neg(a), b: neg(b) }), A, v, [["translateSwapped", [A[0] + b, A[1] + a], { a: neg(a), b: neg(b) }]], [`(${A[0]} + ${tn(a)},\\ ${A[1]} + ${tn(b)}) = ${ptTex(v)}`]);
    }
    // A reflection in an axis: the other coordinate changes sign.
    const axis = r.pick(["x", "y"] as const);
    const v: P2 = axis === "x" ? [A[0], -A[1]] : [-A[0], A[1]];
    const wrong: P2 = axis === "x" ? [-A[0], A[1]] : [A[0], -A[1]];
    return land(fill(W.reflect, { p: pt(A), line: W.lines[axis] }), A, v, [["reflectWrongAxis", wrong, { line: W.lines[axis] }]], [axis === "x" ? `(x, y) \\to (x, -y)` : `(x, y) \\to (-x, y)`, ptTex(v)], [], { dir: axis === "x" ? "h" : "v", c: 0 });
  }

  if (L === 2) {
    const kind = r.int(0, 3);
    const A = point(-5, 5);
    if (kind === 0) {
      // A turn about the origin: 90° either way, or 180°.
      const q = r.pick([1, 2, 3]);
      const v = turnAbout(A, [0, 0], q);
      const turn = q === 2 ? W.half : fill(W.quarter, { way: q === 1 ? W.anti : W.clock });
      return land(fill(W.rotate, { p: pt(A), turn, c: "(0, 0)" }), A, v, [
        ...(q === 2 ? [] : [["turnWrongWay", turnAbout(A, [0, 0], 4 - q), {}] as [MistakeId, P2, Record<string, string>]]),
        ["rotateSwapOnly", [A[1], A[0]], {}],
      ], [q === 2 ? `(x, y) \\to (-x, -y)` : q === 1 ? `(x, y) \\to (-y, x)` : `(x, y) \\to (y, -x)`, ptTex(v)], [{ pts: [[0, 0]], color: C.purple }]);
    }
    if (kind === 1) {
      // A reflection in y = x: the coordinates swap.
      const v: P2 = [A[1], A[0]];
      return land(fill(W.reflect, { p: pt(A), line: W.lines.yx }), A, v, [["reflectWrongAxis", [-A[0], -A[1]], { line: W.lines.yx }]], [`(x, y) \\to (y, x)`], [], { dir: "d1", c: 0 });
    }
    if (kind === 2) {
      // An enlargement from the origin: both coordinates times the scale factor.
      const B = point(-3, 3);
      const k = r.pick([2, 3]);
      const v = enlarge(B, [0, 0], k);
      return land(fill(W.enlarge, { p: pt(B), k: kText(k), c: "(0, 0)" }), B, v, [["enlargeAdded", [B[0] + k, B[1] + k], { k }]], [`(${k} \\times ${tn(B[0])},\\ ${k} \\times ${tn(B[1])}) = ${ptTex(v)}`], [{ pts: [[0, 0]], color: C.purple }]);
    }
    // The one move that takes a shape onto another, from the picture.
    const [ox, oy] = [r.pick([-4, -3, 1]), r.pick([-4, -3, 1])];
    const base: P2[] = ([[0, 0], [3, 0], [3, 1], [1, 1], [1, 2], [0, 2]] as P2[]).map(([x, y]) => [x + ox, y + oy]);
    const names = ["translation", "reflection", "rotation", "enlargement"] as const;
    const which = r.pick(names);
    const image =
      which === "translation" ? base.map(([x, y]) => [x + r.pick([-3, 3]), y + r.pick([-2, 2, 3])] as P2)
      : which === "reflection" ? base.map((p) => flip(p, { dir: r.pick(["v", "h"] as const), c: 0 }))
      : which === "rotation" ? base.map((p) => turnAbout(p, [0, 0], 2))
      : base.map((p) => enlarge(p, [0, 0], 2));
    const n = Math.max(6, ...[...base, ...image].flatMap(([x, y]) => [Math.abs(x), Math.abs(y)]));
    const d = planeSvg(n, [{ pts: base, color: C.blue }, { pts: image, color: C.orange }], undefined, n > 6 ? 14 : 18);
    const options = names.map((t) => ({ text: W.names[t], plain: W.names[t], tex: `\\text{${W.names[t]}}` }));
    const traps: Trap[] = which === "rotation" ? [{ id: "halfTurnIsFlip", a: { k: "pick", options, right: 1 }, vars: {} }] : [];
    return { prompt: W.name, q: "", pic: pic(d), answer: { k: "pick", options, right: names.indexOf(which), traps }, show: options[names.indexOf(which)].tex, plain: W.names[which], format: "pick", steps: [`\\text{${W.tells[which]}}`] };
  }

  const kind = r.int(0, 3);
  if (kind === 0) {
    // Two moves in a row: a reflection in an axis and a translation, in either order.
    const A = point(-4, 4);
    const axis = r.pick(["x", "y"] as const);
    const m: Mirror = { dir: axis === "x" ? "h" : "v", c: 0 };
    const [a, b] = [r.pick([-3, -2, 2, 3, 4]), r.pick([-3, -1, 1, 2, 3])];
    const reflectFirst = r.next() < 0.5;
    const doR = (p: P2) => flip(p, m);
    const doT = (p: P2): P2 => [p[0] + a, p[1] + b];
    const v = reflectFirst ? doT(doR(A)) : doR(doT(A));
    const wrong = reflectFirst ? doR(doT(A)) : doT(doR(A));
    const [m1, m2] = [fill(W.reflected, { line: W.lines[axis] }), fill(W.translated, { a: neg(a), b: neg(b) })];
    const prompt = fill(W.two, { p: pt(A), first: reflectFirst ? m1 : m2, second: reflectFirst ? m2 : m1 });
    const mid = reflectFirst ? doR(A) : doT(A);
    return land(prompt, A, v, [["orderSwapped", wrong, {}]], [`${ptTex(A)} \\to ${ptTex(mid)} \\to ${ptTex(v)}`], [], m);
  }
  if (kind === 1) {
    // A centre off the origin: a half turn, or an enlargement by 2.
    const c: P2 = [r.pick([-3, -2, -1, 1, 2, 3]), r.pick([-3, -2, -1, 1, 2, 3])];
    const A: P2 = [c[0] + r.pick([-3, -2, -1, 1, 2, 3]), c[1] + r.pick([-2, -1, 1, 2])];
    if (r.next() < 0.5) {
      const v = turnAbout(A, c, 2);
      return land(fill(W.rotate, { p: pt(A), turn: W.half, c: pt(c) }), A, v, [["centreIgnored", turnAbout(A, [0, 0], 2), { c: pt(c) }]], [
        `${ptTex(A)} - ${ptTex(c)} = ${ptTex([A[0] - c[0], A[1] - c[1]])}`, `${ptTex(c)} - ${ptTex([A[0] - c[0], A[1] - c[1]])} = ${ptTex(v)}`,
      ], [{ pts: [c], color: C.purple, label: "C" }]);
    }
    const v = enlarge(A, c, 2);
    return land(fill(W.enlarge, { p: pt(A), k: "2", c: pt(c) }), A, v, [["centreIgnored", enlarge(A, [0, 0], 2), { c: pt(c) }], ["enlargeAdded", [A[0] + 2, A[1] + 2], { k: 2 }]], [
      `${ptTex(A)} - ${ptTex(c)} = ${ptTex([A[0] - c[0], A[1] - c[1]])}`, `${ptTex(c)} + 2 \\times ${ptTex([A[0] - c[0], A[1] - c[1]])} = ${ptTex(v)}`,
    ], [{ pts: [c], color: C.purple, label: "C" }]);
  }
  if (kind === 2) {
    // A negative or a fractional scale factor from the origin.
    const k = r.pick([-1, -2, 0.5, -0.5]);
    const A: P2 = Number.isInteger(k) ? point(-3, 3) : (([x, y]) => [2 * x, 2 * y] as P2)(point(-3, 3));
    const v = enlarge(A, [0, 0], k);
    const slips: [MistakeId, P2, Record<string, string | number>][] = k < 0 ? [["negativeScaleIgnored", enlarge(A, [0, 0], -k), { k: kText(k) }]] : [["enlargeAdded", [A[0] + k, A[1] + k], { k: kText(k) }]];
    return land(fill(W.enlarge, { p: pt(A), k: kText(k), c: "(0, 0)" }), A, v, slips, [`(${tn(k)} \\times ${tn(A[0])},\\ ${tn(k)} \\times ${tn(A[1])}) = ${ptTex(v)}`], [{ pts: [[0, 0]], color: C.purple }]);
  }
  // What an enlargement does to an area: lengths times k, so the area times k².
  const k = r.pick([2, 3, 4]);
  const area = r.pick([3, 4, 5, 6, 8, 10, 12]);
  const v = area * k * k;
  return {
    prompt: fill(W.area, { a: area, k }), q: "",
    answer: { k: "num", v, tol: 1e-9, traps: [{ id: "areaScaledOnce", a: { k: "num", v: area * k, tol: 1e-9 }, vars: { k, kk: k * k } }] },
    show: `${v}\\ \\text{cm}^2`, plain: String(v), format: "number",
    steps: [`\\text{${fill(W.areaWhy, { k, kk: k * k })}}`, `${area} \\times ${k * k} = ${v}`],
  };
};

export default gen;
