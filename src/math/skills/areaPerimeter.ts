// Practice: Area and perimeter from the measurements (the Area on a grid skill counts squares). A drawn rectangle or
// square with its sides marked and its perimeter or area asked; then a side found from the area or the perimeter and
// the area of a triangle; then the circumference and the area of a circle. The other measure given, two sides for
// four, the triangle's half left out and the diameter used as the radius are the slips. #709 added more kinds at each
// level; see more() below.
import { C, fill, FONT, r2 } from "../chart";
import { circleInSquare, circlePart, housePic, lShape, parallelogramPic, partialArray, pathPic, polygonPic, slantTriangle, splitRect, unitShapes } from "../areaPics";
import { dp, num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { opt, pickOf, word } from "../signedKit";

type Pic = NonNullable<Part["pic"]>;
const FILL = "#e7f5ff";
const text = (x: number, y: number, s: string, anchor = "middle", color = C.ink) =>
  `<text x="${r2(x)}" y="${r2(y)}" font-size="15" text-anchor="${anchor}" fill="${color}">${s}</text>`;
const pic = (body: string, w: number, h: number): Pic => ({ svg: (x, y) => `<g transform="translate(${r2(x)} ${r2(y)})" ${FONT}>${body}</g>`, w, h });

/** A rectangle a wide and b high, drawn to scale (within reason), its bottom and its left side marked. */
export function rectPic(a: number, b: number, bottom: string, side: string): Pic {
  const s = Math.min(200 / a, 110 / b, 26);
  const [w, h] = [Math.max(a * s, 60), Math.max(b * s, 36)];
  const x0 = 84;
  return pic(
    `<rect x="${x0}" y="8" width="${r2(w)}" height="${r2(h)}" fill="${FILL}" stroke="${C.ink}" stroke-width="2"/>` + text(x0 + w / 2, h + 28, bottom) + text(x0 - 8, 8 + h / 2 + 5, side, "end"),
    x0 + w + 16, h + 38,
  );
}
/** A triangle on its base b with height h, the top over the point `foot` of the way along (0: a right angle there). */
export function trianglePic(b: number, h: number, foot: number, base: string, height: string): Pic {
  const s = Math.min(200 / b, 110 / h, 26);
  const [w, H] = [Math.max(b * s, 80), Math.max(h * s, 50)];
  const [x0, y0] = [84, 8];
  const fx = x0 + foot * w;
  const mark = `<path d="M ${r2(fx)} ${r2(y0 + H - 10)} h 10 v 10" fill="none" stroke="${C.ink}" stroke-width="1.2"/>`;
  return pic(
    `<polygon points="${x0},${r2(y0 + H)} ${r2(x0 + w)},${r2(y0 + H)} ${r2(fx)},${y0}" fill="${FILL}" stroke="${C.ink}" stroke-width="2"/>` +
      (foot > 0 ? `<line x1="${r2(fx)}" y1="${y0}" x2="${r2(fx)}" y2="${r2(y0 + H)}" stroke="${C.red}" stroke-width="1.6" stroke-dasharray="5 4"/>` : "") +
      mark + text(x0 + w / 2, y0 + H + 20, base) +
      // The height's label beside its dashed line where the triangle is wide enough there, else outside on the left.
      (foot > 0 && ((1 - foot) * w) / 2 >= 54 ? text(fx + 6, y0 + H / 2 + 5, height, "start", C.red) : text(x0 - 8, y0 + H / 2 + 5, height, "end", foot > 0 ? C.red : C.ink)),
    x0 + w + 16, H + 38,
  );
}
/** A circle with its radius, or its diameter, drawn and marked. */
export function circlePic(label: string, diameter: boolean): Pic {
  const R = 58;
  const [cx, cy] = [R + 12, R + 8];
  return pic(
    `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${FILL}" stroke="${C.ink}" stroke-width="2"/>` +
      `<line x1="${diameter ? cx - R : cx}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="${C.red}" stroke-width="2"/>` +
      `<circle cx="${cx}" cy="${cy}" r="3" fill="${C.ink}"/>` + text(diameter ? cx : cx + R / 2, cy - 8, label, "middle", C.red),
    2 * R + 24, 2 * R + 16,
  );
}

/** A length (sq false) or an area in unit u: the unit may be typed after it, with ² or 2 on an area. */
const outIn = (u: string) => (prompt: string, picture: Pic | undefined, v: number, sq: boolean, steps: string[], traps: Trap[] = []): Part => {
  const whole = Math.abs(v - Math.round(v)) < 1e-9;
  const shown = whole ? String(Math.round(v)) : dp(v, 2);
  return {
    prompt, q: "", ...(picture ? { pic: picture } : {}),
    answer: { k: "num", v, tol: whole ? 1e-9 : 0.0051, units: u ? (sq ? [`${u}²`, `${u}^2`, `${u}2`, u] : [u]) : [], traps },
    show: u ? `${shown}\\ \\text{${u}}${sq ? "^2" : ""}` : shown, plain: shown, format: whole ? "number" : "dp2", steps,
  };
};
/** The slips that differ from the answer and from each other, each with {x} the slip and {v} the answer. */
function slips(v: number, list: [Trap["id"], number, Record<string, string | number>][]): Trap[] {
  const out: Trap[] = [];
  for (const [id, x, vars] of list) {
    if (Math.abs(x - v) > 0.02 && !out.some((o) => o.a.k === "num" && Math.abs(o.a.v - x) <= 0.02)) out.push({ id, a: num(x, Number.isInteger(x) ? 1e-9 : 0.0051), vars: { x: Number.isInteger(x) ? x : dp(x, 2), v: Number.isInteger(v) ? v : dp(v, 2), ...vars } });
  }
  return out;
}
const pyth = [[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13]] as const;

/**
 * The kinds #709 added. Easy (P3): which of two shapes of unit squares is bigger (the longer one taken for the bigger
 * a slip), a rectangle with only some squares drawn (only those counted), a rectangle split in two by the
 * distributive property, picked as an expression or worked (only the first part multiplied), an L-shape (the whole
 * rectangle round it), a polygon's perimeter (a side left out) and a missing side from it (the known sides added),
 * a fence and a carpet (area and perimeter swapped), and two rectangles compared, by area (the longer way round taken
 * for more area) or with the same area by perimeter ("the same" a slip). Medium (P5): the width of a fenced pen (the
 * two widths not halved) and a triangle with a sloping side beside its height (the sloping side used). Hard (P6), new
 * settings: a parallelogram (the sloping side, or half of base × height), a height from the area (of a triangle not
 * doubled, of a parallelogram doubled), a house (its roof not halved), half and quarter circles (only the curved
 * part; the whole circle), a wheel turning, a circle's area from its circumference (the diameter for the radius), a
 * circle in a square and a path round a pool (the whole shape, nothing taken away).
 */
function more(r: Rng, L: number, kind: number, w: PracticeWords): Part {
  const W = w.basics;
  const A = w.areaP;
  const m = w.units.m;
  if (L === 1) {
    const u = w.units[r.pick(["cm", "m"] as const)];
    const out = outIn(u);
    const len = (n: number | string) => `${n} ${u}`;
    const choice = (right: "A" | "B" | "same", slip: { o: "A" | "B" | "same"; id: Trap["id"]; vars: Record<string, string | number> } | null, prompt: string, more: { pic?: Pic; steps: string[] }) => {
      const o = { A: word(A.shapeA), B: word(A.shapeB), same: word(A.same) };
      const rest = (["A", "B", "same"] as const).filter((k) => k !== right && k !== slip?.o).map((k) => o[k]);
      return pickOf(r, prompt, o[right], slip ? [{ o: o[slip.o], id: slip.id, vars: slip.vars }] : [], rest, more);
    };
    if (kind === 1) {
      // Unit squares: a long thin shape against a squarer one.
      const n = r.int(6, 9);
      let a: number, b: number;
      do [a, b] = [r.int(2, 4), r.int(2, 4)];
      while (a * b === n || Math.abs(a * b - n) > 4);
      const longFirst = r.next() < 0.5;
      const shapes: [number, number][] = longFirst ? [[n, 1], [a, b]] : [[a, b], [n, 1]];
      const [sa, sb] = shapes.map(([x, y]) => x * y);
      const long = longFirst ? "A" : "B";
      const right = sa > sb ? "A" : "B";
      return choice(right, right === long ? null : { o: long, id: "longerNotBigger", vars: { a: sa, b: sb } }, A.unitCompare, { pic: unitShapes(shapes[0], shapes[1]), steps: [`A: ${shapes[0][0]} \\times ${shapes[0][1]} = ${sa}`, `B: ${shapes[1][0]} \\times ${shapes[1][1]} = ${sb}`] });
    }
    if (kind === 2) {
      // A partial array: one row and one column of squares drawn.
      const [c, h] = [r.int(3, 9), r.int(3, 6)];
      return outIn("")(A.partial, partialArray(c, h), c * h, true, [`${h} \\times ${c} = ${c * h}`], slips(c * h, [["drawnSquaresOnly", c + h - 1, { c, h }]]));
    }
    if (kind === 3 || kind === 4) {
      // The distributive property: a × (b + c) = a × b + a × c.
      const a = r.int(2, 9);
      const b = r.int(4, 10);
      let c = r.int(2, 6);
      if (c === b) c++;
      const v = a * (b + c);
      const vars = { a, b, c, v };
      const steps = [`${a} \\times (${b} + ${c}) = ${a} \\times ${b} + ${a} \\times ${c} = ${a * b} + ${a * c} = ${v}`];
      if (kind === 4) return out(W.area, splitRect(a, b, c, u), v, true, steps, slips(v, [["distributeOnce", a * b + c, vars]]));
      const right = opt(`${a} \\times ${b} + ${a} \\times ${c}`);
      return pickOf(r, A.distPick, right, [{ o: opt(`${a} \\times ${b} + ${c}`), id: "distributeOnce", vars }], [opt(`${a} + ${b} + ${c}`), opt(`${a} \\times ${b} \\times ${c}`)], { pic: splitRect(a, b, c), steps });
    }
    if (kind === 5) {
      // An L-shape: the whole rectangle less the corner cut out.
      const [Wd, H] = [r.int(5, 10), r.int(4, 8)];
      const [cw, ch] = [r.int(2, Wd - 2), r.int(1, H - 2)];
      const v = Wd * H - cw * ch;
      const steps = [`${Wd} \\times ${H} - ${cw} \\times ${ch} = ${Wd * H} - ${cw * ch} = ${v}`, `${Wd - cw} \\times ${ch} + ${Wd} \\times ${H - ch} = ${v}`];
      return out(W.area, lShape(Wd, H, cw, ch, u), v, true, steps, slips(v, [["boundingBox", Wd * H, { W: Wd, H, w: cw, h: ch }]]));
    }
    if (kind === 6 || kind === 7) {
      // A polygon's sides: all of them added, or the missing one from the perimeter.
      const sides = Array.from({ length: r.int(4, 6) }, () => r.int(2, 12));
      const P = sides.reduce((s, x) => s + x, 0);
      const last = sides[sides.length - 1];
      if (kind === 6) return out(W.perimeter, polygonPic(sides.map(len)), P, false, [`${sides.join(" + ")} = ${P}`], slips(P, [["sideMissed", P - last, { n: sides.length, sum: sides.join(" + ") }]]));
      const known = P - last;
      return out(fill(A.missingSide, { p: len(P) }), polygonPic([...sides.slice(0, -1).map(len), "?"]), last, false, [`${sides.slice(0, -1).join(" + ")} = ${known}`, `${P} - ${known} = ${last}`], slips(last, [["knownSidesSum", known, { p: P, sum: sides.slice(0, -1).join(" + ") }]]));
    }
    if (kind === 8) {
      // A fence round a garden, or a carpet over a floor, in metres.
      const a = r.int(3, 15);
      let b = r.int(2, 10);
      if (b === a) b++;
      const [P, S] = [2 * (a + b), a * b];
      const o = outIn(m);
      if (r.next() < 0.5) return o(fill(A.fence, { a, b }), undefined, P, false, [`2 \\times (${a} + ${b}) = ${P}`], slips(P, [["areaNotPerimeter", S, {}], ["twoSidesOnly", a + b, { a, b }]]));
      return o(fill(A.carpet, { a, b }), undefined, S, true, [`${a} \\times ${b} = ${S}`], slips(S, [["perimeterNotArea", P, {}]]));
    }
    // Two rectangles: which has more area (the one with the longer way round has less), or, with the same area, which
    // has the longer perimeter.
    const sameArea = r.next() < 0.5;
    let p: number[];
    if (sameArea) {
      const pairs = r.pick([[[1, 12], [3, 4]], [[2, 8], [4, 4]], [[2, 9], [3, 6]], [[1, 16], [4, 4]], [[2, 12], [4, 6]], [[3, 8], [4, 6]]]);
      p = r.next() < 0.5 ? [...pairs[0], ...pairs[1]] : [...pairs[1], ...pairs[0]];
    } else {
      do p = [r.int(1, 3), r.int(8, 12), r.int(3, 6), r.int(3, 6)];
      while (!(p[0] * p[1] < p[2] * p[3] && p[0] + p[1] > p[2] + p[3]));
      if (r.next() < 0.5) p = [p[2], p[3], p[0], p[1]];
    }
    const [a, b, c, d] = p;
    const [aa, bb, pa, pb] = [a * b, c * d, 2 * (a + b), 2 * (c + d)];
    const prompt = fill(sameArea ? A.comparePerim : A.compareArea, { a, b, c, d });
    const steps = sameArea ? [`A: 2 \\times (${a} + ${b}) = ${pa}`, `B: 2 \\times (${c} + ${d}) = ${pb}`] : [`A: ${a} \\times ${b} = ${aa}`, `B: ${c} \\times ${d} = ${bb}`];
    if (sameArea) return choice(pa > pb ? "A" : "B", { o: "same", id: "sameAreaSamePerimeter", vars: { s: aa, pa, pb } }, prompt, { steps });
    return choice(aa > bb ? "A" : "B", { o: pa > pb ? "A" : "B", id: "comparedByPerimeter", vars: { a, b, c, d, aa, bb } }, prompt, { steps });
  }
  if (L === 2) {
    const u = w.units[r.pick(["cm", "m"] as const)];
    const out = outIn(u);
    if (kind === 2) {
      // A fenced pen: the perimeter and its length give its width.
      const a = r.int(5, 20);
      let b = r.int(2, 12);
      if (b === a) b++;
      const P = 2 * (a + b);
      return outIn(m)(fill(A.fenceSide, { p: P, a }), undefined, b, false, [`${P} - 2 \\times ${a} = ${P - 2 * a}`, `${P - 2 * a} \\div 2 = ${b}`], slips(b, [["pairNotHalved", 2 * b, {}]]));
    }
    // A triangle whose sloping side is marked beside its height.
    const [d, h, sl] = r.pick(pyth);
    const b = d + r.int(2, 8);
    const base = (b * h) % 2 ? b + 1 : b;
    const v = (base * h) / 2;
    return out(W.area, slantTriangle(base, h, d, { b: `${base} ${u}`, h: `${h} ${u}`, s: `${sl} ${u}` }), v, true, [`\\frac{1}{2} \\times ${base} \\times ${h} = ${v}`], slips(v, [["slantForHeight", (base * sl) / 2, { s: sl }], ["noHalf", base * h, {}]]));
  }
  const u = w.units[r.pick(["cm", "m"] as const)];
  const out = outIn(u);
  const len = (n: number | string) => `${n} ${u}`;
  const pi = Math.PI;
  if (kind === 2 || kind === 3) {
    // A parallelogram: base × height, the sloping side beside it.
    const [d, h, sl] = r.pick(pyth);
    const b = r.int(4, 12);
    if (kind === 2) return out(W.area, parallelogramPic(b, h, d, { b: len(b), h: len(h), s: len(sl) }), b * h, true, [`${b} \\times ${h} = ${b * h}`], slips(b * h, [["slantForHeight", b * sl, { s: sl }], ["parallelogramHalved", (b * h) / 2, { b, h }]]));
    const S = b * h;
    return out(fill(A.paraHeight, { v: `${S} ${u}²` }), parallelogramPic(b, h, d, { b: len(b), h: "h", s: len(sl) }), h, false, [`h = ${S} \\div ${b} = ${h}`], slips(h, [["parallelogramDoubled", (2 * S) / b, { s: S, b }]]));
  }
  if (kind === 4) {
    // A triangle's height from its area: twice the area over the base.
    const [d, h] = r.pick(pyth);
    let b = d + r.int(2, 8);
    if ((b * h) % 2) b++;
    const S = (b * h) / 2;
    return out(fill(A.triHeight, { v: `${S} ${u}²` }), slantTriangle(b, h, d, { b: len(b), h: "h", s: "" }), h, false, [`h = 2 \\times ${S} \\div ${b} = ${h}`], slips(h, [["heightNotDoubled", S / b, { s: S, b }]]));
  }
  if (kind === 5) {
    // A house: a rectangle and a triangle roof.
    let wd = r.int(4, 12);
    const [hh, t] = [r.int(3, 8), r.int(2, 6)];
    if ((wd * t) % 2) wd++;
    const v = wd * hh + (wd * t) / 2;
    return out(W.area, housePic(wd, hh, t, u), v, true, [`${wd} \\times ${hh} + \\frac{1}{2} \\times ${wd} \\times ${t} = ${wd * hh} + ${(wd * t) / 2} = ${v}`], slips(v, [["roofNotHalved", wd * hh + wd * t, { w: wd, h: hh, t }]]));
  }
  if (kind === 6 || kind === 7) {
    // Half a circle from its diameter, or a quarter from its radius: perimeter (6) or area (7).
    const half = r.next() < 0.5;
    const rad = r.int(2, 12);
    const d = 2 * rad;
    const p = circlePart(half, len(half ? d : rad));
    const n = half ? 2 : 4;
    if (kind === 6) {
      const arc = (2 * pi * rad) / n;
      const straight = half ? d : 2 * rad;
      const v = arc + straight;
      const work = half ? `\\frac{1}{2} \\times \\pi \\times ${d} + ${d}` : `\\frac{1}{4} \\times 2\\pi \\times ${rad} + ${rad} + ${rad}`;
      return out(half ? A.semiPerim : A.quarterPerim, p, v, false, [...(half ? [`r = ${rad}`] : []), `${work} \\approx ${dp(arc, 2)} + ${straight} = ${dp(v, 2)}`], slips(v, [["arcOnly", arc, { a: dp(arc, 2), d: half ? String(d) : `${rad} + ${rad}`, s: straight }]]));
    }
    const whole = pi * rad * rad;
    const v = whole / n;
    return out(half ? A.semiArea : A.quarterArea, p, v, true, [...(half ? [`r = ${d} \\div 2 = ${rad}`] : []), `\\frac{1}{${n}} \\times \\pi \\times ${rad}^2 \\approx ${dp(v, 2)}`], slips(v, [["circlePartWhole", whole, { n }]]));
  }
  if (kind === 8) {
    // A wheel: each turn rolls one circumference.
    const d = r.pick([40, 50, 56, 60, 64, 70]);
    const n = r.int(3, 20);
    const v = n * pi * d;
    return outIn(w.units.cm)(fill(A.wheel, { d, n }), undefined, v, false, [`\\pi \\times ${d} \\approx ${dp(pi * d, 2)}`, `${n} \\times \\pi \\times ${d} \\approx ${dp(v, 2)}`], slips(v, [["diameterForRadius", n * 2 * pi * d, { d, r: d / 2 }]]));
  }
  if (kind === 9) {
    // From the circumference back to the radius, then the area.
    const k = 2 * r.int(2, 10);
    const rad = k / 2;
    const v = pi * rad * rad;
    return outIn(w.units.cm)(fill(A.fromCirc, { c: `${k}π` }), undefined, v, true, [`2\\pi r = ${k}\\pi, \\; r = ${rad}`, `\\pi \\times ${rad}^2 = ${rad * rad}\\pi \\approx ${dp(v, 2)}`], slips(v, [["diameterForRadius", pi * k * k, { d: k, r: rad }]]));
  }
  if (kind === 10) {
    // A circle in a square: the square less the circle.
    const s = 2 * r.int(2, 10);
    const sq = s * s;
    const circ = pi * (s / 2) ** 2;
    const v = sq - circ;
    return outIn(w.units.cm)(fill(A.shadedCircle, { s }), circleInSquare(`${s} ${w.units.cm}`), v, true, [`${s}^2 - \\pi \\times ${s / 2}^2 \\approx ${sq} - ${dp(circ, 2)} = ${dp(v, 2)}`], slips(v, [["shadedWhole", sq, { o: sq, i: dp(circ, 2) }]]));
  }
  // A path round a pool: the outer rectangle less the pool.
  const [a, b, p] = [r.int(4, 12), r.int(3, 8), r.int(1, 3)];
  const outer = (a + 2 * p) * (b + 2 * p);
  const v = outer - a * b;
  return outIn(m)(fill(A.path, { a, b, p }), pathPic(a, b, p, m), v, true, [`(${a} + 2 \\times ${p}) \\times (${b} + 2 \\times ${p}) = ${outer}`, `${outer} - ${a} \\times ${b} = ${v}`], slips(v, [["shadedWhole", outer, { o: outer, i: a * b }]]));
}

const gen: Gen = (r, L, w) => {
  const extra = L === 1 ? r.int(0, 12) - 3 : L === 2 ? r.int(0, 3) : r.int(0, 11);
  if (extra > 1 || (L === 1 && extra > 0)) return more(r, L, extra, w);
  const W = w.basics;
  const u = w.units[r.pick(["cm", "m"] as const)];
  const len = (n: number | string) => `${n} ${u}`;
  const out = outIn(u);
  if (L === 1) {
    const kind = r.int(0, 2);
    if (kind === 2) {
      // A square: one side marked.
      const s = r.int(2, 12);
      const p = rectPic(s, s, len(s), len(s));
      if (r.next() < 0.5) return out(W.perimeter, p, 4 * s, false, [`4 \\times ${s} = ${4 * s}`], s !== 4 ? [{ id: "areaNotPerimeter", a: num(s * s), vars: { x: s * s, v: 4 * s } }] : []);
      return out(W.area, p, s * s, true, [`${s} \\times ${s} = ${s * s}`], s !== 4 ? [{ id: "perimeterNotArea", a: num(4 * s), vars: { x: 4 * s, v: s * s } }] : []);
    }
    const b = r.int(2, 9);
    let a = r.int(3, 12);
    if (a === b) a++;
    const [P, A] = [2 * (a + b), a * b];
    const p = rectPic(a, b, len(a), len(b));
    if (kind === 0) {
      const traps: Trap[] = [...(A !== P ? [{ id: "areaNotPerimeter" as const, a: num(A), vars: { x: A, v: P } }] : []), ...(a + b !== A ? [{ id: "twoSidesOnly" as const, a: num(a + b), vars: { x: a + b, a, b, v: P } }] : [])];
      return out(W.perimeter, p, P, false, [`2 \\times (${a} + ${b}) = 2 \\times ${a + b} = ${P}`], traps);
    }
    return out(W.area, p, A, true, [`${a} \\times ${b} = ${A}`], A !== P ? [{ id: "perimeterNotArea", a: num(P), vars: { x: P, v: A } }] : []);
  }
  if (L === 2) {
    const kind = r.int(0, 2);
    if (kind === 2) {
      // A triangle: half of base × height, the height dashed unless it is a side.
      const b = r.int(3, 12);
      let h = r.int(2, 10);
      if ((b * h) % 2) h++;
      const v = (b * h) / 2;
      const p = trianglePic(b, h, r.pick([0, 0.3, 0.6]), len(b), len(h));
      return out(W.area, p, v, true, [`\\frac{1}{2} \\times ${b} \\times ${h} = \\frac{${b * h}}{2} = ${v}`], [{ id: "noHalf", a: num(b * h), vars: { x: b * h, v } }]);
    }
    const [a, b] = [r.int(3, 12), r.int(2, 9)];
    const [P, A] = [2 * (a + b), a * b];
    const p = rectPic(a, b, len(a), "x");
    if (kind === 0) return out(fill(W.sideFromArea, { v: `${A} ${u}²` }), p, b, false, [`x = ${A} \\div ${a} = ${b}`]);
    return out(fill(W.sideFromPerimeter, { v: len(P) }), p, b, false, [`${P} \\div 2 = ${a + b}`, `x = ${a + b} - ${a} = ${b}`], [{ id: "pairNotHalved", a: num(2 * b), vars: { x: 2 * b, v: b } }]);
  }
  // A circle, from its radius or its diameter.
  const rad = r.int(2, 12);
  const [given, area] = [r.next() < 0.5, r.next() < 0.5];
  const d = 2 * rad;
  const p = circlePic(len(given ? d : rad), given);
  const [circ, A] = [2 * Math.PI * rad, Math.PI * rad * rad];
  const v = area ? A : circ;
  const trap = (id: "diameterForRadius" | "circleFormulaSwapped", x: number): Trap[] =>
    Math.abs(x - v) > 0.2 ? [{ id, a: num(x, 0.0051), vars: { x: dp(x, 2), d, r: rad, v: dp(v, 2) } }] : [];
  const traps = given ? trap("diameterForRadius", area ? Math.PI * d * d : 2 * Math.PI * d) : trap("circleFormulaSwapped", area ? circ : A);
  const half = given ? [`r = ${d} \\div 2 = ${rad}`] : [];
  if (area) return out(W.circleArea, p, A, true, [...half, `\\pi r^2 = \\pi \\times ${rad}^2 = ${rad * rad}\\pi \\approx ${dp(A, 2)}`], traps);
  return out(W.circumference, p, circ, false, [given ? `\\pi d = \\pi \\times ${d} \\approx ${dp(circ, 2)}` : `2\\pi r = 2 \\times \\pi \\times ${rad} = ${d}\\pi \\approx ${dp(circ, 2)}`], traps);
};

export default gen;
