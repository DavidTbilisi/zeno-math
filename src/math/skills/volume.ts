// Practice: Surface area & volume. #711 gave it a primary level and stories: easy (P5), solids of unit cubes counted
// and compared, a box's volume from its edges, a step-shaped solid split into two boxes, fish tanks and boxes; medium
// (Sec 1), prisms and cylinders as before, boxes with fractional edges, a sandpit, nets (which solid, the surface area
// from one), the surface area of a box (its expression, an open box, a cube from its volume); hard (Sec 2), cones,
// pyramids and spheres and a length from the volume as before, and new settings: cans, balls and cones in stories, a
// cone or a ball against the cylinder round it, and how many cups a tank fills. The visible cubes only, the edges
// added, the base only, the box round a step-shaped solid, one edge of the base, a prism for a pyramid, each face once,
// the volume for the surface, a lid counted, one face of a cube, the cylinder for the cone, the related volume the
// wrong way round, a cup that cannot be filled and the diameter for the radius are the slips.
import { fill, r2 } from "../chart";
import { solidFigure } from "../euclid";
import { dp, num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { opt, pickOf, word, type Opt } from "../signedKit";
import { boxPic, isoBoxes, netPic, stepSolid, twoStacks, type NetKind } from "../volPics";

const ext = (r: Rng, a: number, b: number, n = 2) => {
  for (;;) {
    const xs = Array.from({ length: n }, () => r.int(a, b));
    if (new Set(xs).size === n) return xs;
  }
};
const times = (...xs: (number | string)[]) => xs.join(" \\times ");
/** Traps whose answer is the right one, or an earlier trap's, can't be told apart: only the first is kept. */
const uniq = (v: number, traps: Trap[]): Trap[] => {
  const seen = new Set([v]);
  return traps.filter((t) => {
    const x = (t.a as { v: number }).v;
    if (seen.has(x)) return false;
    seen.add(x);
    return true;
  });
};

/** The easy level (P5): unit cubes, a box from its edges, step-shaped solids, tanks and boxes. */
function p5(r: Rng, w: PracticeWords): Part {
  const A = w.volP;
  const kind = r.int(0, 6);
  const number = (prompt: string, p: Part["pic"], v: number, traps: Trap[], steps: string[], solution?: Part["solution"]): Part => ({ prompt, q: "", pic: p, answer: { ...num(v), traps: uniq(v, traps) }, show: String(v), plain: String(v), format: "number", steps, ...(solution ? { solution } : {}) });
  if (kind === 0) {
    // A box of unit cubes: those at the back and inside count too.
    const [l, wd, h] = [r.int(2, 5), r.int(2, 4), r.int(2, 4)];
    const v = l * wd * h;
    const seen = v - (l - 1) * (wd - 1) * (h - 1);
    return number(A.countCubes, isoBoxes([{ at: [0, 0, 0], size: [l, wd, h] }], { grid: true, s: 22 }), v, [{ id: "visibleCubesOnly", a: num(seen), vars: { x: seen, l, w: wd, h, v } }], [`${times(l, wd, h)} = ${v}`]);
  }
  if (kind === 1) {
    // Two boxes of cubes: the one with the longest edge is not always the bigger.
    for (;;) {
      const a: [number, number, number] = [r.int(2, 6), r.int(1, 3), r.int(1, 4)];
      const b: [number, number, number] = [r.int(2, 6), r.int(1, 3), r.int(1, 4)];
      const [va, vb] = [a[0] * a[1] * a[2], b[0] * b[1] * b[2]];
      const [la, lb] = [Math.max(...a), Math.max(...b)];
      if (la === lb || Math.abs(va - vb) > 8 || (va === vb && r.next() < 0.6)) continue;
      const names = [word("A"), word("B"), word(A.same)];
      const right = va > vb ? names[0] : vb > va ? names[1] : names[2];
      const longer = la > lb ? names[0] : names[1];
      const slips = longer !== right ? [{ o: longer, id: "longestEdgeNotBigger" as const, vars: { a: va, b: vb } }] : [];
      return pickOf(r, A.compareCubes, right, slips, names.filter((o) => o !== right && !slips.some((x) => x.o === o)), { pic: twoStacks(a, b), steps: [`A: ${times(...a)} = ${va}`, `B: ${times(...b)} = ${vb}`] });
    }
  }
  if (kind === 2) {
    // A box from its edges. The edges added, or the base only, are the slips.
    const [l, wd, h] = [r.int(2, 9), r.int(2, 9), r.int(2, 9)];
    const src = `cuboid ${l} x ${wd} x ${h}`;
    const f = solidFigure(src);
    const v = l * wd * h;
    const traps: Trap[] = [{ id: "edgesAdded", a: num(l + wd + h), vars: { x: l + wd + h, e: `${l} × ${wd} × ${h}`, v } }, { id: "baseOnly", a: num(l * wd), vars: { x: l * wd, l, w: wd, h, v } }];
    return number(w.prompts.volume, f ? { svg: (x, y) => `<g transform="translate(${r2(x)} ${r2(y)})">${f.svg}</g>`, h: f.h, w: f.w } : undefined, v, traps, [`${times(l, wd, h)} = ${v}`], { kind: "euclid", spec: { topic: "solids", src } });
  }
  if (kind <= 5) {
    // A step: a tall box with a lower one beside it. Its volume is the two added; the box round it is the slip.
    const cubes = kind === 3;
    const [a1, a2] = cubes ? [r.int(1, 4), r.int(1, 4)] : [r.int(3, 8), r.int(3, 6)];
    const wd = cubes ? r.int(1, 3) : r.int(2, 5);
    const h1 = cubes ? r.int(3, 5) : r.int(4, 9);
    const h2 = r.int(1, h1 - 1);
    const [p1, p2] = [a1 * wd * h1, a2 * wd * h2];
    const v = p1 + p2;
    const box = (a1 + a2) * wd * h1;
    const e = `${a1} × ${wd} × ${h1} + ${a2} × ${wd} × ${h2}`;
    const steps = [`${times(a1, wd, h1)} + ${times(a2, wd, h2)} = ${p1} + ${p2} = ${v}`];
    const pic = stepSolid(a1, a2, wd, h1, h2, cubes, cubes ? "" : "cm");
    if (kind !== 5) return number(cubes ? A.stepCubes : A.stepVol, pic, v, [{ id: "boxRoundSolid", a: num(box), vars: { x: box, e, v } }], steps);
    const right = opt(`${times(a1, wd, h1)} + ${times(a2, wd, h2)}`);
    return pickOf(r, A.stepExpr, right, [{ o: opt(times(a1 + a2, wd, h1)), id: "boxRoundSolid", vars: { e, v } }], [opt(`${times(a1, wd, h1)} \\times ${times(a2, wd, h2)}`), opt(times(a1 + a2, wd, h1 + h2))], { pic, steps });
  }
  // A fish tank's volume, or a box's height from its volume and base.
  const [l, wd] = ext(r, 10, 60).map((x) => Math.round(x / 5) * 5 || 5);
  const h = 5 * r.int(2, 8);
  const v = l * wd * h;
  if (r.next() < 0.5)
    return number(fill(A.tank, { l, w: wd, h }), undefined, v, [{ id: "baseOnly", a: num(l * wd), vars: { x: l * wd, l, w: wd, h, v } }, { id: "edgesAdded", a: num(l + wd + h), vars: { x: l + wd + h, e: `${l} × ${wd} × ${h}`, v } }], [`${times(l, wd, h)} = ${v}`]);
  const traps: Trap[] = Number.isInteger(v / l) && v / l !== h ? [{ id: "dividedByOneEdge", a: num(v / l), vars: { x: v / l, l, w: wd, b: l * wd, V: v, v: h } }] : [];
  return number(fill(A.tankH, { v, l, w: wd }), undefined, h, traps, [`${l} \\times ${wd} = ${l * wd}`, `${v} \\div ${l * wd} = ${h}`]);
}

/** The medium level's new kinds (Sec 1): fractional edges, a sandpit, nets, the surface area of a box. */
function sec1(r: Rng, kind: number, w: PracticeWords): Part {
  const A = w.volP;
  const number = (prompt: string, p: Part["pic"], v: number, traps: Trap[], steps: string[], show = String(v)): Part => ({ prompt, q: "", pic: p, answer: { ...num(v), traps: uniq(v, traps) }, show, plain: String(v), format: "number", steps });
  if (kind === 3) {
    // A box with halves on its edges.
    for (;;) {
      const halves = [r.int(1, 9), r.int(1, 9), r.int(1, 9)];
      if (!halves.some((x) => x % 2) || halves.some((x) => x === 2)) continue;
      const [l, wd, h] = halves.map((x) => x / 2);
      const lab = (x: number) => (Number.isInteger(x) ? `${x} m` : x < 1 ? "½ m" : `${Math.floor(x)}½ m`);
      const tex = (x: number) => (Number.isInteger(x) ? String(x) : `\\tfrac{${2 * x}}{2}`);
      const v = l * wd * h;
      const traps: Trap[] = l * wd !== v ? [{ id: "baseOnly", a: num(l * wd), vars: { x: l * wd, l, w: wd, h, v } }] : [];
      return number(A.fracBox, boxPic([Math.max(1, l), Math.max(1, wd), Math.max(1, h)], [lab(l), lab(wd), lab(h)]), v, traps, [`${times(tex(l), tex(wd), tex(h))} = \\tfrac{${halves[0] * halves[1] * halves[2]}}{8} = ${v}`]);
    }
  }
  if (kind === 4) {
    // A sandpit with decimal edges.
    const [l, wd, h] = [r.int(15, 40) / 10, r.int(8, 25) / 10, r.int(2, 6) / 10];
    const v = Math.round(l * wd * h * 1000) / 1000;
    return number(fill(A.sandpit, { l, w: wd, h }), undefined, v, [{ id: "baseOnly", a: num(Math.round(l * wd * 100) / 100), vars: { x: Math.round(l * wd * 100) / 100, l, w: wd, h, v } }], [`${times(l, wd, h)} = ${v}`]);
  }
  if (kind === 5) {
    // Which solid a net folds into: a prism for a pyramid (or the other way) is the slip.
    const k = r.pick(["cuboid", "cube", "triPrism", "sqPyramid", "triPyramid"] as NetKind[]);
    const dims = k === "cuboid" ? [r.int(3, 5), 2, r.int(2, 3)] : k === "cube" ? [3] : k === "triPrism" ? [3, 4, 5, r.int(5, 7)] : [];
    const all: NetKind[] = ["cube", "cuboid", "triPrism", "sqPyramid", "triPyramid"];
    const swap: Partial<Record<NetKind, NetKind>> = { triPrism: "triPyramid", triPyramid: "triPrism", sqPyramid: "cuboid" };
    const name = (t: NetKind) => word(A[t]);
    const right = name(k);
    const slips = swap[k] ? [{ o: name(swap[k]!), id: "prismPyramidSwapped" as const, vars: { v: A[k] } }] : [];
    const taken = [k, swap[k]];
    const others = all.filter((t) => !taken.includes(t)).slice(0, 3 - slips.length).map(name);
    return pickOf(r, A.netSolid, right, slips, others, { pic: netPic(k, dims), steps: [`\\text{${A[k]}}`] });
  }
  if (kind === 6 || kind === 7) {
    // A box's surface area: from its net, or the expression for it. The longer base edge first, so the net is compact.
    const [e1, e2, h] = ext(r, 2, 9, 3);
    const [l, wd] = [Math.max(e1, e2), Math.min(e1, e2)];
    const half = l * wd + l * h + wd * h;
    const v = 2 * half;
    const e = `${l} × ${wd} + ${l} × ${h} + ${wd} × ${h}`;
    if (kind === 6) {
      if (r.next() < 0.35) {
        // A triangular prism: two right triangles and three rectangles.
        const [a, b, c] = r.pick([[3, 4, 5], [6, 8, 10], [5, 12, 13]] as const);
        const L = r.int(4, 9);
        const sa = a * b + (a + b + c) * L;
        return number(A.netArea, netPic("triPrism", [a, b, c, L], [`${L} cm`, `${a} cm`, `${b} cm`, `${c} cm`]), sa, [{ id: "volumeForSurface", a: num((a * b * L) / 2), vars: { x: (a * b * L) / 2, v: sa } }], [`2 \\times \\tfrac{${a} \\times ${b}}{2} + (${a} + ${b} + ${c}) \\times ${L} = ${a * b} + ${(a + b + c) * L} = ${sa}`]);
      }
      const traps: Trap[] = [{ id: "halfSurface", a: num(half), vars: { x: half, e, v } }, { id: "volumeForSurface", a: num(l * wd * h), vars: { x: l * wd * h, v } }];
      return number(A.netArea, netPic("cuboid", [l, wd, h], [`${l} cm`, `${wd} cm`, `${h} cm`]), v, traps, [`2 \\times (${times(l, wd)} + ${times(l, h)} + ${times(wd, h)}) = 2 \\times ${half} = ${v}`]);
    }
    const right = opt(`2 \\times (${times(l, wd)} + ${times(l, h)} + ${times(wd, h)})`);
    const slips: { o: Opt; id: "halfSurface" | "volumeForSurface"; vars: Record<string, string | number> }[] = [
      { o: opt(`${times(l, wd)} + ${times(l, h)} + ${times(wd, h)}`), id: "halfSurface", vars: { e, v } },
      { o: opt(times(l, wd, h)), id: "volumeForSurface", vars: { v } },
    ];
    return pickOf(r, A.saExpr, right, slips, [opt(times(6, l, wd))], { pic: boxPic([l, wd, h], [`${l} cm`, `${wd} cm`, `${h} cm`]), steps: [`2 \\times (${l * wd} + ${l * h} + ${wd * h}) = ${v}`] });
  }
  if (kind === 8) {
    // An open box: five faces.
    const [l, wd, h] = ext(r, 3, 12, 3);
    const v = l * wd + 2 * l * h + 2 * wd * h;
    const all = v + l * wd;
    return number(fill(A.openBox, { l, w: wd, h }), boxPic([l, wd, h], [`${l} cm`, `${wd} cm`, `${h} cm`]), v, [{ id: "lidCounted", a: num(all), vars: { x: all, v } }], [`${times(l, wd)} + 2 \\times ${times(l, h)} + 2 \\times ${times(wd, h)} = ${v}`]);
  }
  // A cube from its volume to its surface area.
  const e = r.int(2, 9);
  const V = e ** 3;
  return number(fill(A.cubeSA, { v: V }), undefined, 6 * e * e, [{ id: "oneFaceOnly", a: num(e * e), vars: { x: e * e, f: e * e, v: 6 * e * e } }], [`${e}^3 = ${V}`, `6 \\times ${e}^2 = ${6 * e * e}`]);
}

/** The hard level's new settings (Sec 2): stories, related volumes, cups from a tank. */
function sec2(r: Rng, kind: number, w: PracticeWords): Part {
  const A = w.volP;
  const deci = (prompt: string, v: number, traps: Trap[], steps: string[]): Part => ({ prompt, q: "", answer: { ...num(v, 0.0051), traps: uniq(v, traps) }, show: dp(v, 2), plain: dp(v, 2), format: "dp2", steps });
  const whole = (prompt: string, v: number, traps: Trap[], steps: string[]): Part => ({ prompt, q: "", answer: { ...num(v), traps: uniq(v, traps) }, show: String(v), plain: String(v), format: "number", steps });
  const pi = Math.PI;
  if (kind === 7) {
    // A can, a ball or an ice-cream cone, by its diameter: the diameter for the radius is the slip.
    const what = r.pick(["can", "ball", "cone"] as const);
    const d = 2 * r.int(2, 6);
    const rr = d / 2;
    const h = r.int(6, 15);
    const f = (x: number) => (what === "can" ? pi * x * x * h : what === "ball" ? (4 / 3) * pi * x ** 3 : (pi * x * x * h) / 3);
    const v = f(rr);
    const steps = [`r = ${d} \\div 2 = ${rr}`, what === "can" ? `\\pi \\times ${rr}^2 \\times ${h} \\approx ${dp(v, 2)}` : what === "ball" ? `\\tfrac{4}{3} \\pi \\times ${rr}^3 \\approx ${dp(v, 2)}` : `\\tfrac{1}{3} \\pi \\times ${rr}^2 \\times ${h} \\approx ${dp(v, 2)}`];
    return deci(fill(A[what], { d, h }), v, [{ id: "diameterForRadius", a: num(f(d), 0.0051), vars: { x: dp(f(d), 2), d, r: rr, v: dp(v, 2) } }], steps);
  }
  if (kind === 8) {
    // A cone against the cylinder round it (a third), or a ball (two thirds).
    const ball = r.next() < 0.3;
    if (ball) {
      const V = 30 * r.int(2, 30);
      const v = (2 * V) / 3;
      return whole(fill(A.ballIn, { v: V }), v, [{ id: "relatedInverted", a: num((3 * V) / 2), vars: { x: (3 * V) / 2, s: w.shapes.names.sphere, e: `${V} × 2/3`, v } }], [`${V} \\times \\tfrac{2}{3} = ${v}`]);
    }
    const toCone = r.next() < 0.6;
    const V = toCone ? 3 * r.int(10, 300) : r.int(10, 300);
    const v = toCone ? V / 3 : 3 * V;
    const traps: Trap[] = toCone
      ? [{ id: "coneSameAsCylinder", a: num(V), vars: { x: V, c: V, v } }, { id: "relatedInverted", a: num(3 * V), vars: { x: 3 * V, s: w.shapes.names.cone, e: `${V} ÷ 3`, v } }]
      : [{ id: "relatedInverted", a: num(V / 3), vars: { x: Math.round((V / 3) * 100) / 100, s: w.shapes.names.cone, e: `${V} × 3`, v } }];
    return whole(fill(toCone ? A.coneOf : A.cylOf, { v: V }), v, traps, [toCone ? `${V} \\div 3 = ${v}` : `${V} \\times 3 = ${v}`]);
  }
  // How many full cups a tank fills: rounded down.
  for (;;) {
    const d = 10 * r.int(2, 6);
    const h = 10 * r.int(2, 8);
    const c = r.pick([150, 200, 250, 300, 330, 500]);
    const t = pi * (d / 2) ** 2 * h;
    const v = Math.floor(t / c);
    if (t / c - v < 0.05 || t / c - v > 0.95) continue;
    return whole(fill(A.cups, { d, h, c }), v, [{ id: "cupsRoundedUp", a: num(v + 1), vars: { x: v + 1, t: dp(t, 2), v } }], [`\\pi \\times ${d / 2}^2 \\times ${h} \\approx ${dp(t, 2)}`, `${dp(t, 2)} \\div ${c} \\approx ${dp(t / c, 2)}`, `${v}`]);
  }
}

const gen: Gen = (r, L, w) => {
  if (L === 1) return p5(r, w);
  if (L === 2) {
    const extra = r.int(0, 9);
    if (extra > 2) return sec1(r, extra, w);
    return old(r, 1, w);
  }
  const extra = r.int(0, 9);
  if (extra > 6) return sec2(r, extra, w);
  return old(r, extra < 4 ? 2 : 3, w);
};

/** The kinds the skill had before #711, by their old levels: 1 now at the medium level, 2 and 3 at the hard one. */
const old: Gen = (r, L, w) => {
  const sol = (src: string) => ({ kind: "euclid" as const, spec: { topic: "solids", src } });
  const pic = (src: string, ask?: string) => {
    const f = solidFigure(src, ask);
    return f ? { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${f.svg}</g>`, h: f.h, w: f.w } : undefined;
  };
  const out = (prompt: string, q: string, v: number, src: string, figSrc: string, ask?: string) => {
    const whole = Math.abs(v - Math.round(v)) < 1e-9;
    return {
      prompt,
      q,
      pic: pic(figSrc, ask),
      answer: num(v, whole ? 1e-9 : 0.0051),
      show: whole ? String(Math.round(v)) : dp(v, 2),
      plain: whole ? String(Math.round(v)) : dp(v, 2),
      format: whole ? ("number" as const) : ("dp2" as const),
      solution: sol(src),
    };
  };
  if (L === 1) {
    const kind = r.int(0, 2);
    if (kind === 0) {
      const [l, wd, h] = [r.int(2, 9), r.int(2, 9), r.int(2, 9)];
      const src = `cuboid ${l} x ${wd} x ${h}`;
      return out(w.prompts.volume, "", l * wd * h, src, src);
    }
    if (kind === 1) {
      const [b, h, l] = [2 * r.int(2, 5), r.int(2, 8), r.int(4, 12)];
      const src = `prism b = ${b} h = ${h} l = ${l}`;
      return out(w.prompts.volume, "", (b * h * l) / 2, src, src);
    }
    const [rr, h] = [r.int(2, 8), r.int(3, 15)];
    const src = `cylinder r = ${rr} h = ${h}`;
    return out(w.prompts.volume, "", Math.PI * rr * rr * h, src, src);
  }
  if (L === 2) {
    const kind = r.int(0, 3);
    if (kind === 0) {
      const [rr, h] = [r.int(2, 8), r.int(3, 15)];
      const src = `cylinder r = ${rr} h = ${h}`;
      return out(w.prompts.surface, "", 2 * Math.PI * rr * rr + 2 * Math.PI * rr * h, src, src);
    }
    if (kind === 1) {
      const [rr, h, l] = r.pick([[3, 4, 5], [5, 12, 13], [6, 8, 10], [8, 15, 17], [9, 12, 15]] as const);
      const src = `cone r = ${rr} h = ${h}`;
      return r.next() < 0.5 ? out(w.prompts.volume, "", (Math.PI * rr * rr * h) / 3, src, src) : out(w.prompts.surface, "", Math.PI * rr * rr + Math.PI * rr * l, src, src);
    }
    if (kind === 2) {
      const rr = r.int(2, 10);
      const src = `sphere r = ${rr}`;
      return r.next() < 0.5 ? out(w.prompts.volume, "", (4 / 3) * Math.PI * rr ** 3, src, src) : out(w.prompts.surface, "", 4 * Math.PI * rr * rr, src, src);
    }
    const [a, h] = [2 * r.int(2, 6), r.int(3, 12)];
    const src = `pyramid a = ${a} h = ${h}`;
    return out(w.prompts.volume, "", (a * a * h) / 3, src, src);
  }
  // A length from the volume.
  const kind = r.int(0, 2);
  if (kind === 0) {
    const rr = r.int(2, 8);
    const V = r.int(100, 900);
    const h = V / (Math.PI * rr * rr);
    return out(fill(w.prompts.solidDim, { V, d: "h" }), `V = ${V}`, h, `cylinder r = ${rr} V = ${V}`, `cylinder r = ${rr} h = ${h}`, "h");
  }
  if (kind === 1) {
    const V = r.int(100, 2000);
    const rr = Math.cbrt((3 * V) / (4 * Math.PI));
    return out(fill(w.prompts.solidDim, { V, d: "r" }), `V = ${V}`, rr, `sphere V = ${V}`, `sphere r = ${rr}`, "r");
  }
  const rr = r.int(2, 8);
  const V = r.int(50, 600);
  const h = (3 * V) / (Math.PI * rr * rr);
  return out(fill(w.prompts.solidDim, { V, d: "h" }), `V = ${V}`, h, `cone r = ${rr} V = ${V}`, `cone r = ${rr} h = ${h}`, "h");
};

export default gen;
