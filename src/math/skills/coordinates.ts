// Practice: Coordinates. #712 added, at the easy level (first quadrant): the distance between two points on a grid
// line, bare or on a town map, and the best name for the shape some points make; at the medium level (all four
// quadrants): the distance across an axis, bare, a diver under a boat or a road on a map, and a rectangle's perimeter
// or area on the grid; at the hard level, new settings: a rectangle's corner from its area and a robot's walk. One
// point's coordinate for the distance, the numbers taken from each other across an axis, the sides not compared, a
// slanted shape taken for a rectangle and the height taken for the coordinate are the slips.
import { fill, r2 } from "../chart";
import { plotSteps, plotSvg, plotTask, polyOnGrid, ptText, signed, swapped, type Pt } from "../plotPoint";
import { num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { pickOf, word, type Opt } from "../signedKit";

const named = (pts: Pt[]) => pts.map((p, k) => "ABCD"[k] + ptText(p)).join(", ");
const tuple = (p: Pt, traps: Trap[], steps: string[], prompt: string): Part => ({
  prompt,
  q: "",
  answer: { k: "tuple", vs: p, tol: 1e-9, traps },
  show: `(${p[0]}, \\; ${p[1]})`,
  plain: `(${p[0]}, ${p[1]})`,
  format: "point",
  steps,
});
const tp = (p: Pt) => ({ k: "tuple" as const, vs: p, tol: 1e-9 });

/** The kinds #712 added. */
function more(r: Rng, L: 1 | 2 | 3, kind: number, w: PracticeWords): Part {
  const A = w.coordP;
  const number = (prompt: string, v: number, traps: Trap[], steps: string[], pic?: Part["pic"]): Part => ({ prompt, q: "", pic, answer: { ...num(v), traps: traps.filter((t) => (t.a as { v: number }).v !== v) }, show: String(v), plain: String(v), format: "number", steps });
  if (L === 1 && kind <= 7) {
    // Two points on one grid line in the first quadrant: the far point's coordinate is the slip.
    const along = r.next() < 0.5;
    const c = r.int(1, 9);
    let [a, b] = [r.int(0, 10), r.int(0, 10)];
    while (a === b || Math.min(a, b) === 0) [a, b] = [r.int(0, 10), r.int(0, 10)];
    const [P, Q]: Pt[] = along ? [[a, c], [b, c]] : [[c, a], [c, b]];
    const [lo, hi] = [Math.min(a, b), Math.max(a, b)];
    const v = hi - lo;
    const traps: Trap[] = [{ id: "coordinateNotDistance", a: num(hi), vars: { x: hi, a: lo, b: hi, v } }];
    const prompt = kind <= 5 ? fill(A.apart, { a: ptText(P), b: ptText(Q) }) : fill(r.next() < 0.5 ? A.mapSchool : A.mapPark, { a: ptText(P), b: ptText(Q) });
    return number(prompt, v, traps, [`${hi} - ${lo} = ${v}`]);
  }
  if (L === 1) {
    // The points of a shape in the first quadrant, joined in order: its best name.
    const k = r.pick(["square", "rectangle", "parallelogram", "rightTri"] as const);
    const [x0, y0] = [r.int(0, 3), r.int(0, 3)];
    const wd = r.int(2, 5);
    let h = k === "square" ? wd : r.int(2, 5);
    while (k !== "square" && h === wd) h = r.int(2, 5);
    const sl = r.int(1, 2);
    const pts: Pt[] =
      k === "rightTri" ? [[x0, y0], [x0 + wd, y0], [x0, y0 + h]] : k === "parallelogram" ? [[x0, y0], [x0 + wd, y0], [x0 + wd + sl, y0 + h], [x0 + sl, y0 + h]] : [[x0, y0], [x0 + wd, y0], [x0 + wd, y0 + h], [x0, y0 + h]];
    const nm = (t: "square" | "rectangle" | "parallelogram" | "rightTri") => word(A[t]);
    const all = (["square", "rectangle", "parallelogram", "rightTri"] as const).map(nm);
    const right = nm(k);
    const e = `AB = ${wd}, AD = ${h}`;
    const slips: { o: Opt; id: "sidesNotCompared" | "slantMissed"; vars: Record<string, string | number> }[] =
      k === "rectangle" ? [{ o: nm("square"), id: "sidesNotCompared", vars: { e, v: A.rectangle } }] : k === "square" ? [{ o: nm("rectangle"), id: "sidesNotCompared", vars: { e, v: A.square } }] : k === "parallelogram" ? [{ o: nm("rectangle"), id: "slantMissed", vars: { e: fill(A.slid, { s: sl }), v: A.parallelogram } }] : [];
    const others = all.filter((o) => o.text !== right.text && !slips.some((x) => x.o.text === o.text));
    return pickOf(r, fill(A.shape, { p: named(pts) }), right, slips, others, { steps: [k === "parallelogram" ? `AB = ${wd}, \\; D = (${x0} + ${sl}, \\; ${y0 + h})` : k === "rightTri" ? `AB = ${wd}, \\; AC = ${h}` : `AB = ${wd}, \\; AD = ${h}`] });
  }
  if (L === 2 && kind <= 7) {
    // Two points on either side of an axis: the numbers taken from each other is the slip.
    let [a, b] = [-r.int(1, 7), r.int(1, 7)];
    while (a === -b) [a, b] = [-r.int(1, 7), r.int(1, 7)];
    if (r.next() < 0.5) [a, b] = [b, a];
    const c = r.int(-6, 6) || 2;
    const story = kind >= 6;
    const along = r.next() < 0.5;
    const [P, Q]: Pt[] = along ? [[a, c], [b, c]] : [[c, a], [c, b]];
    const v = Math.abs(a - b);
    const x = Math.abs(Math.abs(a) - Math.abs(b));
    const traps: Trap[] = [{ id: "distanceAcrossAxis", a: num(x), vars: { x, a: signed(Math.min(a, b)), b: signed(Math.max(a, b)), p: Math.abs(Math.min(a, b)), q: Math.max(a, b), v } }];
    const prompt = !story ? fill(A.apart, { a: ptText(P), b: ptText(Q) }) : along ? fill(A.road, { a: ptText(P), b: ptText(Q) }) : fill(A.diver, { a: ptText([c, Math.max(a, b)]), b: ptText([c, Math.min(a, b)]) });
    return number(prompt, v, traps, [`${Math.max(a, b)} - (${Math.min(a, b)}) = ${v}`]);
  }
  if (L === 2) {
    // A rectangle across the axes: its perimeter or its area.
    const [x1, x2, y1, y2] = [-r.int(1, 5), r.int(1, 5), -r.int(1, 5), r.int(1, 5)];
    const [W, H] = [x2 - x1, y2 - y1];
    const pts: Pt[] = [[x1, y2], [x2, y2], [x2, y1], [x1, y1]];
    const [per, area] = [2 * (W + H), W * H];
    const steps = [`AB = ${x2} - (${x1}) = ${W}, \\; BC = ${y2} - (${y1}) = ${H}`, kind === 8 ? `2 \\times (${W} + ${H}) = ${per}` : `${W} \\times ${H} = ${area}`];
    if (kind === 8) return number(fill(A.rectPer, { p: named(pts) }), per, [{ id: "areaNotPerimeter", a: num(area), vars: { x: area, v: per } }], steps, polyOnGrid(-6, 6, pts));
    return number(fill(A.rectArea, { p: named(pts) }), area, [{ id: "perimeterNotArea", a: num(per), vars: { x: per, v: area } }], steps, polyOnGrid(-6, 6, pts));
  }
  if (kind <= 6) {
    // A rectangle's corner from its area: the height taken for the coordinate is the slip.
    const y = r.int(-4, 4) || 3;
    const x1 = r.int(-5, 0);
    const W = r.int(2, 6);
    const x2 = x1 + W;
    const H = r.int(2, 5);
    const up = r.next() < 0.5;
    const C: Pt = [x2, up ? y + H : y - H];
    const wrong: Pt = [x2, up ? H : -H];
    const traps: Trap[] = wrong[1] !== C[1] ? [{ id: "heightAsCoordinate", a: tp(wrong), vars: { x: ptText(wrong), h: H, y: signed(y), v: ptText(C) } }] : [];
    const prompt = fill(up ? A.cornerAbove : A.cornerBelow, { a: ptText([x1, y]), b: ptText([x2, y]), s: W * H });
    return tuple(C, traps, [`AB = ${W}`, `${W * H} \\div ${W} = ${H}`, `y = ${y} ${up ? "+" : "-"} ${H} = ${C[1]}`], prompt);
  }
  // A robot's walk from a point: x first, then y.
  const S: Pt = [r.int(-4, 4), r.int(-4, 4)];
  const [dx, dy] = [r.int(1, 6) * r.sign(), r.int(1, 6) * r.sign()];
  const E: Pt = [S[0] + dx, S[1] + dy];
  const traps: Trap[] = E[0] !== E[1] ? [{ id: "swappedXY", a: tp(swapped(E)), vars: { x: E[0], y: E[1], p: ptText(E), s: ptText(swapped(E)) } }] : [];
  const prompt = fill(A.walk, { p: ptText(S), a: Math.abs(dx), h: dx > 0 ? A.right : A.left, b: Math.abs(dy), u: dy > 0 ? A.up : A.down });
  return tuple(E, traps, [`x = ${S[0]} ${dx > 0 ? "+" : "-"} ${Math.abs(dx)} = ${E[0]}`, `y = ${S[1]} ${dy > 0 ? "+" : "-"} ${Math.abs(dy)} = ${E[1]}`], prompt);
}

const gen: Gen = (r, L, w) => {
  const extra = r.int(0, 9);
  if (extra >= 4) return more(r, L, extra, w);
  return old(r, L, w);
};

/** The kinds the skill had before #712: a point to read, or the fourth corner of a rectangle. */
const old: Gen = (r, L, w) => {
  // A point drawn on a grid, its coordinates to read (src/math/plotPoint.ts); at the hard level the fourth corner of
  // a rectangle whose other three are drawn.
  const t = plotTask(L, r.next);
  const [x, y] = t.p;
  const pic = plotSvg(t, { asked: true, cell: 26 });
  return {
    prompt: L === 3 ? w.prompts.coordCorner : w.prompts.coordinates,
    q: "",
    pic: { svg: (px: number, py: number) => `<g transform="translate(${r2(px)} ${r2(py)})">${pic.body}</g>`, h: pic.h, w: pic.w },
    answer: { k: "tuple", vs: [x, y], tol: 1e-9, traps: x !== y ? [{ id: "swappedXY", a: { k: "tuple", vs: swapped(t.p), tol: 1e-9 }, vars: { x, y, p: ptText(t.p), s: ptText(swapped(t.p)) } }] : [] },
    show: `(${x}, \\; ${y})`,
    plain: `(${x}, ${y})`,
    format: "point",
    solution: { kind: "plot", spec: { task: t, steps: plotSteps(t) } },
  };
};

export default gen;
