// Practice: Moving shapes. Where a point lands under a translation, a reflection in an axis or in y = x, a turn about
// the origin, an enlargement from the origin; which one move takes a shape onto another; then two moves in a row, a
// centre off the origin, a negative or a fractional scale factor, and what an enlargement does to an area. The vector's
// numbers swapped, the wrong axis, a quarter turn the wrong way or a bare swap, a scale factor added, a half turn taken
// for a flip, the moves done in the other order, the centre ignored, the minus of the scale factor dropped, and the area
// scaled like a length are the slips.
// #713 added moves worked backwards and what they keep. Easy: the vector of a translation and the mirror of a
// reflection read off a picture, and a side or an angle after a rigid move. Medium: the turn read off a picture, a
// side or an angle after an enlargement, the scale factor from two lengths, and rotational symmetry (the order, the
// smallest turn). Hard: the centre of an enlargement, a mirror line x = c or y = c, the two moves that map one shape
// onto another, and new settings: photos and prints (similar or not) and what must be true after a move. The vector
// the wrong way, the turn's angle added to the shape's, the angle scaled with the lengths, the scale factor upside
// down or taken as a difference, the midpoint for the centre, the gap for the mirror, the same difference taken for
// similar, a reflection taken to keep sides parallel, the lines of symmetry for the order and the interior angle for
// the turn are the slips.
import { C, fill } from "../chart";
import { enlarge, flip, planeSvg, turnAbout, type Mirror, type P2 } from "../moveShape";
import type { MistakeId } from "../mistakes";
import { num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { pickOf, word, type Opt } from "../signedKit";
import { mirrorsOf, symSvg, SYM_IDS, turnOrder } from "../symmetry";

const neg = (v: number) => (v < 0 ? `−${-v}` : String(v));
const pt = ([x, y]: P2) => `(${neg(x)}, ${neg(y)})`;
const ptTex = ([x, y]: P2) => `(${x}, ${y})`;
const kText = (k: number) => (k === 0.5 ? "½" : k === -0.5 ? "−½" : neg(k));
const same = (a: P2, b: P2) => a[0] === b[0] && a[1] === b[1];
/** A number in a step, bracketed when negative; a half as a fraction. */
const tn = (v: number) => (Math.abs(v) === 0.5 ? `${v < 0 ? "-" : ""}\\tfrac{1}{2}` : v < 0 ? `(${v})` : String(v));

type Slip = { o: Opt; id: MistakeId; vars: Record<string, string | number> };
const LSHAPE: P2[] = [[0, 0], [3, 0], [3, 1], [1, 1], [1, 2], [0, 2]];
const at = (ps: P2[], [a, b]: P2): P2[] => ps.map(([x, y]) => [x + a, y + b]);
const drawn = (d: { body: string; w: number; h: number }): Part["pic"] => ({ svg: (x: number, y: number) => `<g transform="translate(${x} ${y})">${d.body}</g>`, h: d.h, w: d.w });
const fit = (...ps: P2[][]) => Math.max(6, ...ps.flat().flatMap(([x, y]) => [Math.abs(x), Math.abs(y)]));
const both = (base: P2[], image: P2[]) => {
  const n = fit(base, image);
  return drawn(planeSvg(n, [{ pts: base, color: C.blue }, { pts: image, color: C.orange }], undefined, n > 6 ? 14 : 18));
};
const KS: [number, string, string][] = [[0.5, "1/2", "\\tfrac{1}{2}"], [1.5, "3/2", "\\tfrac{3}{2}"], [2.5, "5/2", "\\tfrac{5}{2}"], [2, "2", "2"], [3, "3", "3"], [0.25, "1/4", "\\tfrac{1}{4}"], [0.75, "3/4", "\\tfrac{3}{4}"]];

/** The kinds #713 added. */
function more(r: Rng, L: 1 | 2 | 3, kind: number, w: PracticeWords): Part {
  const W = w.moves;
  const A = w.movP;
  const number = (prompt: string, v: number, traps: Trap[], steps: string[], pic?: Part["pic"], show = String(v), plain = String(v)): Part => ({ prompt, q: "", pic, answer: { ...num(v), traps: traps.filter((t) => (t.a as { v: number }).v !== v) }, show, plain, format: "number", steps });
  const tuple = (prompt: string, v: P2, traps: Trap[], steps: string[], pic?: Part["pic"]): Part => ({ prompt, q: "", pic, answer: { k: "tuple", vs: v, tol: 1e-9, traps: traps.filter((t) => t.a.k === "tuple" && !(t.a.vs[0] === v[0] && t.a.vs[1] === v[1])) }, show: `(${v[0]}, \\; ${v[1]})`, plain: `(${v[0]}, ${v[1]})`, format: "point", steps });
  const off = (): P2 => [r.pick([-5, -4, -3, 1, 2]), r.pick([-4, -3, 1, 2])];
  if (L === 1 && kind <= 6) {
    // The vector of a translation, read off a picture: from the blue shape to the orange one.
    const base = at(LSHAPE, off());
    let [a, b] = [0, 0];
    while (!a || !b || Math.abs(a) === Math.abs(b)) [a, b] = [r.int(-5, 5), r.int(-4, 4)];
    const image = at(base, [a, b]);
    return tuple(A.whichVector, [a, b], [{ id: "translationReversed", a: { k: "tuple", vs: [-a, -b], tol: 1e-9 }, vars: { x: `(${-a}, ${-b})`, v: `(${a}, ${b})` } }, { id: "translateSwapped", a: { k: "tuple", vs: [b, a], tol: 1e-9 }, vars: { a, b } }], [`x: ${base[0][0]} \\to ${image[0][0]}, \\; y: ${base[0][1]} \\to ${image[0][1]}`, `(${a}, ${b})`], both(base, image));
  }
  if (L === 1 && kind <= 8) {
    // The mirror line of a reflection, read off a picture.
    const axis = r.pick(["x", "y"] as const);
    let base = at(LSHAPE, off());
    while (base.some(([x, y]) => (axis === "x" ? y === 0 : x === 0))) base = at(LSHAPE, off());
    const image = base.map((p) => flip(p, { dir: axis === "x" ? "h" : "v", c: 0 }));
    const nm = (t: "x" | "y" | "yx") => word(W.lines[t]);
    const other = axis === "x" ? "y" : "x";
    return pickOf(r, A.whichMirror, nm(axis), [{ o: nm(other), id: "reflectWrongAxis", vars: { line: W.lines[axis] } }], [nm("yx")], { pic: both(base, image), steps: [axis === "x" ? `(x, y) \\to (x, -y)` : `(x, y) \\to (-x, y)`] });
  }
  if (L === 1) {
    // A side or an angle after a rigid move: a turn does not add to the angle.
    const move = r.pick(["turn", "flip", "slide"] as const);
    const [side, ang] = [r.int(3, 12), r.pick([35, 40, 50, 55, 65, 70, 75])];
    const t = move === "turn" ? r.pick([90, 180]) : 0;
    const how = move === "turn" ? fill(A.turned, { t }) : move === "flip" ? A.flipped : A.slid;
    if (r.next() < 0.35) return number(fill(A.rigidSide, { how, s: side }), side, [], [`A'B' = AB = ${side}`]);
    const traps: Trap[] = t ? [{ id: "angleTurnedToo", a: num(ang + t), vars: { x: ang + t, t, v: `${ang}°` } }] : [];
    return number(fill(A.rigidAngle, { how, a: ang }), ang, traps, [`\\angle A' = \\angle A = ${ang}^\\circ`]);
  }
  if (L === 2 && kind === 5) {
    // The turn about the origin, read off a picture.
    const q = r.pick([1, 2, 3]);
    let base = at(LSHAPE, off());
    while (base.some(([x, y]) => x === 0 && y === 0)) base = at(LSHAPE, off());
    const image = base.map((p) => turnAbout(p, [0, 0], q));
    const opts = [fill(W.quarter, { way: W.anti }), A.halfTurn, fill(W.quarter, { way: W.clock })].map(word);
    const right = opts[q - 1];
    const slips: Slip[] = q === 2 ? [] : [{ o: opts[3 - q], id: "turnWrongWay", vars: {} }];
    return pickOf(r, A.whichTurn, right, slips, opts.filter((o) => o !== right && !slips.some((x) => x.o === o)), { pic: both(base, image), steps: [q === 2 ? `(x, y) \\to (-x, -y)` : q === 1 ? `(x, y) \\to (-y, x)` : `(x, y) \\to (y, -x)`] });
  }
  if (L === 2 && kind === 6) {
    // A side or an angle after an enlargement: lengths times k, angles kept.
    const k = r.pick([2, 3, 4]);
    const [side, ang] = [r.int(2, 9), r.pick([30, 35, 40, 50, 55, 70])];
    if (r.next() < 0.5) return number(fill(A.dilSide, { k, s: side }), side * k, [{ id: "enlargeAdded", a: num(side + k), vars: { k } }], [`${side} \\times ${k} = ${side * k}`]);
    return number(fill(A.dilAngle, { k, a: ang }), ang, [{ id: "dilationAngleScaled", a: num(ang * k), vars: { x: ang * k, k, v: ang } }], [`\\angle A' = \\angle A = ${ang}^\\circ`]);
  }
  if (L === 2 && kind === 7) {
    // The scale factor from a length and its image.
    const [k, kp, kt] = r.pick(KS);
    let a = r.int(2, 12);
    while (!Number.isInteger(a * k) || !Number.isInteger(a * k * 2) || a * k < 1) a = r.int(2, 12);
    const b = a * k;
    const inv = a / b;
    const traps: Trap[] = [{ id: "scaleFactorInverted", a: num(inv), vars: { x: `${a}/${b}`, a, b, v: kp } }, { id: "scaleDifference", a: num(Math.abs(b - a)), vars: { x: Math.abs(b - a), a, b, v: kp } }];
    return number(fill(A.scale, { a, b }), k, traps, [`k = \\tfrac{${b}}{${a}} = ${kt}`], undefined, kt, kp);
  }
  if (L === 2) {
    // Rotational symmetry: the order, or the smallest turn that fits the shape onto itself.
    const shape = r.pick(SYM_IDS);
    const t = { shape, turn: 0 };
    const n = turnOrder(t);
    const lines = mirrorsOf(t).length;
    const d = symSvg(t, 200);
    const pic = drawn(d);
    const regular = ({ square: 4, equilateral: 3, pentagon: 5, hexagon: 6, octagon: 8 } as Record<string, number>)[shape];
    if (kind === 8 || n === 1) return number(A.order, n, lines !== n ? [{ id: "linesForOrder", a: num(lines), vars: { x: lines, v: n } }] : [], [`360^\\circ \\div ${360 / n}^\\circ = ${n}`], pic);
    const v = 360 / n;
    const inner = regular ? ((regular - 2) * 180) / regular : 0;
    return number(A.smallestTurn, v, inner ? [{ id: "interiorForTurn", a: num(inner), vars: { x: inner, n, v } }] : [], [`360^\\circ \\div ${n} = ${v}^\\circ`], pic);
  }
  if (kind === 5) {
    // The centre of an enlargement from a point and its image.
    const k = r.pick([2, 3]);
    const c: P2 = [r.int(-4, 4), r.int(-4, 4)];
    let P: P2 = [c[0] + r.int(-2, 2), c[1] + r.int(-2, 2)];
    while (P[0] === c[0] || P[1] === c[1]) P = [c[0] + r.int(-2, 2), c[1] + r.int(-2, 2)];
    const Q = enlarge(P, c, k);
    const mid: P2 = [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2];
    return tuple(fill(A.centre, { k, a: `(${P[0]}, ${P[1]})`, b: `(${Q[0]}, ${Q[1]})` }), c, [{ id: "centreAsMidpoint", a: { k: "tuple", vs: mid, tol: 1e-9 }, vars: { x: `(${mid[0]}, ${mid[1]})`, k, v: `(${c[0]}, ${c[1]})` } }], [`A' - C = ${k}(A - C)`, `C = \\frac{${k}A - A'}{${k - 1}} = (${c[0]}, \\; ${c[1]})`]);
  }
  if (kind === 6) {
    // A mirror line x = c or y = c, read off a picture.
    const across = r.next() < 0.5;
    const c = r.pick([-3, -2, -1, 1, 2, 3]);
    const base = at(LSHAPE, across ? [c - r.int(4, 6), r.int(-3, 1)] : [r.int(-3, 1), c - r.int(4, 5)]);
    const image = base.map((p) => flip(p, { dir: across ? "v" : "h", c }));
    const [a, b] = across ? [base[0][0], image[0][0]] : [base[0][1], image[0][1]];
    return number(across ? A.mirrorX : A.mirrorY, c, [{ id: "gapForMirror", a: num(Math.abs(b - a)), vars: { x: Math.abs(b - a), a, b, v: c } }], [`\\tfrac{${a} + ${b}}{2} = ${c}`], both(base, image));
  }
  if (kind === 7) {
    // Two moves in a row that map one shape onto another: the other order is the slip.
    const axis = r.pick(["x", "y"] as const);
    const m: Mirror = { dir: axis === "x" ? "h" : "v", c: 0 };
    // The two shapes apart, so that each can be seen whole.
    const box = (ps: P2[]) => [Math.min(...ps.map((p) => p[0])), Math.max(...ps.map((p) => p[0])), Math.min(...ps.map((p) => p[1])), Math.max(...ps.map((p) => p[1]))];
    const apart = (P: P2[], Q: P2[]) => {
      const [p, q] = [box(P), box(Q)];
      return p[1] < q[0] || q[1] < p[0] || p[3] < q[2] || q[3] < p[2];
    };
    let base: P2[], image: P2[], a: number, b: number;
    do {
      base = at(LSHAPE, [r.int(1, 3), r.int(-3, 1)]);
      [a, b] = [r.int(-3, 3), r.int(-3, 3)];
      image = base.map((p) => flip(p, m)).map(([x, y]) => [x + a, y + b] as P2);
    } while (!a || !b || Math.abs(a) === Math.abs(b) || !apart(base, image));
    const R = fill(W.reflected, { line: W.lines[axis] });
    const T = fill(W.translated, { a, b });
    const seq = (p: string, q: string) => word(fill(A.then, { first: p, second: q }));
    const right = seq(R, T);
    const other = axis === "x" ? "y" : "x";
    return pickOf(r, A.mapping, right, [{ o: seq(T, R), id: "orderSwapped", vars: {} }], [seq(fill(W.reflected, { line: W.lines[other] }), T), seq(R, fill(W.translated, { a: b, b: a }))], { pic: both(base, image), steps: [`(x, y) \\to ${axis === "x" ? "(x, -y)" : "(-x, y)"} \\to ${axis === "x" ? `(x + ${a}, -y + ${b})` : `(-x + ${a}, y + ${b})`}`] });
  }
  if (kind === 8) {
    // A photo and a print: similar when both sides scale by the same factor, not when the same is added.
    const [p, q] = r.pick([[4, 6], [6, 9], [8, 12], [10, 15], [6, 8], [9, 12], [5, 7], [10, 14]] as const);
    const yes = r.next() < 0.5;
    const k = r.pick([1.5, 2, 2.5, 3]);
    const add = r.int(2, 6);
    const [c, d] = yes ? [p * k, q * k] : [p + add, q + add];
    const Y = word(A.yes);
    const N = word(A.no);
    return pickOf(r, fill(A.photo, { a: p, b: q, c, d }), yes ? Y : N, yes ? [] : [{ o: Y, id: "sameDifferenceSimilar", vars: { a: p, b: q, c, d, e: add } }], [yes ? N : Y].filter(() => yes), { steps: [`\\tfrac{${c}}{${p}} = ${Math.round((c / p) * 100) / 100}, \\; \\tfrac{${d}}{${q}} = ${Math.round((d / q) * 100) / 100}`] });
  }
  // After a reflection or a quarter turn, what must be true: lengths kept, sides not parallel.
  const move = r.pick(["flip", "turn"] as const);
  const how = move === "flip" ? A.reflectedIn : A.turnedQuarter;
  const right = word("DE = AB");
  const slips: Slip[] = [{ o: word("DE ∥ AB"), id: "reflectionKeepsDirection", vars: {} }];
  if (move === "turn") slips.push({ o: word("∠D = ∠A + 90°"), id: "angleTurnedToo", vars: { t: 90, v: "∠A" } });
  const others = [word("DE = 2 × AB"), ...(move === "flip" ? [word("∠D = 180° − ∠A")] : [])];
  return pickOf(r, fill(A.mustBe, { how }), right, slips, others, { steps: [`\\text{${A.rigidKeeps}}`] });
}

const gen: Gen = (r, L, w) => {
  const extra = r.int(0, 9);
  if (extra >= 5) return more(r, L, extra, w);
  return old(r, L, w);
};

/** The kinds the skill had before #713. */
const old: Gen = (r, L, w) => {
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
