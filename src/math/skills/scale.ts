// Practice: Scale drawings and maps. Easy: a real distance from a map at 1 cm : k m (or km), or the map distance from
// the real one. Medium: a map at 1 : n with the change of unit to kilometres, or the scale 1 : n found from a drawing.
// Hard: an area on a plan (each square centimetre is a k-by-k block), the plan's area from the real one, or a drawing
// redrawn at another scale. Dividing where the scale multiplies, a wrong change of unit, mixing metres with
// centimetres when finding n, an area scaled by k instead of k², and a redrawing turned upside down are the slips.
// #714 added scale copies: easy, which shape on squared paper is a scale copy of another, and the scale factor read
// off two shapes; medium, a side of a scale copy, and a side of the original from the copy and its scale factor. The
// same amount added to each side, a shape stretched one way only, the factor upside down or taken as a difference, and
// the copy multiplied again for the original are the slips.
import { fill } from "../chart";
import { fr, num, plainFrac } from "../practiceKit";
import type { Exercise, Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { shuffled } from "../mulDivKit";
import { mapSvg, planSvg } from "../scaleMaps";
import type { MistakeId } from "../mistakes";
import { pickOf, word, type Opt } from "../signedKit";
import { gridShapes, type P2 } from "../simPics";

const asPic = (d: { body: string; w: number; h: number }): Exercise["pic"] => ({ svg: (x: number, y: number) => `<g transform="translate(${x} ${y})">${d.body}</g>`, h: d.h, w: d.w });
const r2 = (v: number) => Math.round(v * 1000) / 1000;
const tn = (v: number) => String(r2(v));

/** A rectangle w × h, or a right triangle with legs w and h, as corners on squared paper. */
const shapeOf = (tri: boolean, w: number, h: number): P2[] => (tri ? [[0, 0], [w, 0], [0, h]] : [[0, 0], [w, 0], [w, h], [0, h]]);

/** The kinds #714 added. */
function copies(r: Rng, L: 1 | 2, kind: number, w: PracticeWords): Part {
  const A = w.simP;
  if (L === 1 && kind <= 7) {
    // Which is a scale copy: one multiplied, one with the same added, one stretched one way.
    const tri = r.next() < 0.4;
    const [a, b] = r.pick([[2, 3], [3, 2], [1, 2], [2, 1], [3, 4], [4, 3], [2, 5], [5, 2]] as const);
    const k = Math.max(a, b) > 3 ? 2 : r.pick([2, 3]);
    const d = r.int(1, 2) + (k === 3 ? 1 : 0);
    const kinds = shuffled(r, ["copy", "added", "oneWay"] as ("copy" | "added" | "oneWay")[]);
    const names = ["A", "B", "C"];
    const dims = (t: (typeof kinds)[number]): [number, number] => (t === "copy" ? [a * k, b * k] : t === "added" ? [a + d, b + d] : a <= b ? [a * k, b] : [a, b * k]);
    const shapes = [{ pts: shapeOf(tri, a, b), name: A.original }, ...kinds.map((t, i) => ({ pts: shapeOf(tri, ...dims(t)), name: names[i] }))];
    const at = (t: (typeof kinds)[number]) => word(names[kinds.indexOf(t)]);
    const [ow, oh] = dims("oneWay");
    const slips: { o: Opt; id: MistakeId; vars: Record<string, string | number> }[] = [
      { o: at("added"), id: "addedNotScaled", vars: { a, b: a + d, k: plainFrac(fr(a + d, a)) } },
      { o: at("oneWay"), id: "oneWayScaled", vars: { k, w: `${ow} ÷ ${a} = ${ow / a}, ${oh} ÷ ${b} = ${oh / b}` } },
    ];
    return pickOf(r, A.copyWhich, at("copy"), slips, [], { pic: gridShapes(shapes, 14), steps: [`${a * k} \\div ${a} = ${b * k} \\div ${b} = ${k}`] });
  }
  if (L === 1) {
    // The scale factor read off two shapes on squared paper: bigger or smaller.
    const tri = r.next() < 0.4;
    const [p, q] = r.pick([[2, 1], [3, 1], [3, 2], [1, 2], [1, 3], [2, 3]] as const);
    let [a, b] = [r.int(1, 3) * q, r.int(1, 3) * q];
    while (a === b) [a, b] = [r.int(1, 3) * q, r.int(1, 3) * q];
    const [c, e] = [(a * p) / q, (b * p) / q];
    const v = p / q;
    const kp = plainFrac(fr(p, q));
    const traps: Trap[] = [{ id: "scaleFactorInverted", a: num(q / p), vars: { x: plainFrac(fr(q, p)), a, b: c, v: kp } }, { id: "scaleDifference", a: num(Math.abs(c - a)), vars: { x: Math.abs(c - a), a, b: c, v: kp } }];
    const kt = q === 1 ? String(p) : `\\tfrac{${p}}{${q}}`;
    return {
      prompt: A.copyFactor, q: "", pic: gridShapes([{ pts: shapeOf(tri, a, b), name: A.original }, { pts: shapeOf(tri, c, e), name: A.copy }], 14),
      answer: { ...num(v, 1e-6), traps: traps.filter((t, i) => ![v, ...traps.slice(0, i).map((u) => (u.a as { v: number }).v)].includes((t.a as { v: number }).v)) }, show: kt, plain: kp, format: "number", steps: [`k = \\tfrac{${c}}{${a}} = ${kt}`],
    };
  }
  if (kind <= 7) {
    // A side of a scale copy of a rectangle.
    const [a, b] = r.pick([[4, 6], [3, 5], [2, 7], [6, 9], [4, 10], [5, 8], [8, 6], [6, 4]] as const);
    const k = r.pick([2, 3, 1.5, 0.5, 2.5].filter((x) => Number.isInteger(a * x) && Number.isInteger(b * x * 2)));
    const c = a * k;
    const v = b * k;
    return ask(fill(A.copySide, { a, b, c }), v, [{ id: "addedNotScaled", a: num(b + c - a), vars: { a, b: c, k: plainFrac(fr(c, a)) } }], [`k = \\tfrac{${c}}{${a}}`, `${b} \\times \\tfrac{${c}}{${a}} = ${tn(v)}`]);
  }
  // The original from a copy and its scale factor.
  const [p, q] = r.pick([[2, 1], [3, 1], [5, 2], [3, 2], [1, 2], [1, 3], [3, 4], [1, 4]] as const);
  const v = q * r.int(2, 6);
  const c = (v * p) / q;
  const kp = plainFrac(fr(p, q));
  return ask(fill(A.copyBack, { k: kp, c: tn(c) }), v, [{ id: "scaledWrongWay", a: num((c * p) / q), vars: { k: kp, c: tn(c), v } }], [`${tn(c)} \\div ${kp} = ${v}`]);
}

const gen: Gen = (r, L, w) => {
  const W = w.maps;
  if (L < 3) {
    const extra = r.int(0, 9);
    if (extra >= 6) return copies(r, L as 1 | 2, extra, w);
  }
  if (L === 1) {
    const km = r.next() < 0.4;
    const u = km ? W.km : W.m;
    const k = km ? r.int(2, 9) : r.pick([2, 3, 4, 5, 10, 20, 25, 50]);
    const d = r.int(2, 12);
    if (r.next() < 0.6) {
      const v = d * k;
      const traps: Trap[] = d !== k ? [{ id: "scaleInverted", a: num(r2(d / k)), vars: { k, u } }] : [];
      return ask(fill(W.real, { k, u, d }), v, traps, [`1\\text{ cm} \\to ${k}\\text{ ${u}}`, `${d} \\times ${k} = ${v}`], asPic(mapSvg(d, k, u)));
    }
    const D = d * k;
    return ask(fill(W.onMap, { k, u, D }), d, [{ id: "scaleInverted", a: num(D * k), vars: { k, u } }], [`1\\text{ cm} \\to ${k}\\text{ ${u}}`, `${D} \\div ${k} = ${d}`], asPic(mapSvg(d, k, u, false)));
  }

  if (L === 2) {
    if (r.next() < 0.55) {
      // 1 : n, n centimetres for each one on the map; kilometres asked.
      const n = r.pick([25000, 50000, 100000, 200000, 250000]);
      const d = r.int(2, 12);
      const v = r2((d * n) / 100000);
      const traps: Trap[] = [r2((d * n) / 100), r2((d * n) / 1000)].filter((x) => x !== v).map((x) => ({ id: "mapUnitSlip", a: num(x), vars: {} }));
      return ask(fill(W.ratioMap, { n: n.toLocaleString("en").replace(/,/g, " "), d }), v, traps,
        [`${d} \\times ${n} = ${d * n}\\text{ cm}`, `${d * n} \\div 100\\,000 = ${tn(v)}\\text{ km}`], asPic(mapSvg(d, n / 100000, W.km)));
    }
    // The scale from a drawing: both lengths in centimetres first.
    const n = r.pick([20, 25, 50, 100, 200]);
    const d = r.int(2, 12);
    const len = r2((d * n) / 100);
    const traps: Trap[] = [{ id: "scaleUnitsMixed", a: num(r2(len / d)), vars: { l: tn(len), c: tn(len * 100), d } }];
    return ask(fill(W.findScale, { l: tn(len), d }), n, traps, [`${tn(len)}\\text{ m} = ${tn(len * 100)}\\text{ cm}`, `${tn(len * 100)} \\div ${d} = ${n}`, `1 : ${n}`]);
  }

  const t = r.pick(["area", "area", "back", "redraw"] as const);
  if (t === "redraw") {
    const [a, b] = r.pick([[50, 20], [20, 50], [100, 25], [25, 100], [200, 50], [50, 200]]);
    let len: number;
    do len = r.int(2, 12);
    while ((len * a * 10) % b !== 0);
    const v = r2((len * a) / b);
    const real = len * a;
    return ask(fill(W.redraw, { a, b, l: len }), v, [{ id: "rescaleInverted", a: num(r2((len * b) / a)), vars: { l: len, a, b, real } }],
      [`${len} \\times ${a} = ${real}\\text{ cm}`, `${real} \\div ${b} = ${tn(v)}\\text{ cm}`]);
  }
  const k = r.int(2, 5);
  // The scale written either way: 1 cm : k m, or 1 : 100k.
  const sc = r.next() < 0.5 ? fill(W.cmToM, { k }) : `1 : ${100 * k}`;
  const [a, b] = [r.int(2, 6), r.int(2, 5)];
  const vars = { k, k2: k * k };
  const steps = [...(sc.startsWith("1 :") ? [`1\\text{ cm} \\to ${100 * k}\\text{ cm} = ${k}\\text{ m}`] : []), `1\\text{ cm}^2 \\to ${k} \\times ${k} = ${k * k}\\text{ m}^2`];
  if (t === "area")
    return ask(fill(W.area, { s: sc, a, b }), a * b * k * k, [{ id: "areaScaledByK", a: num(a * b * k), vars }],
      [...steps, `${a} \\times ${b} = ${a * b}\\text{ cm}^2`, `${a * b} \\times ${k * k} = ${a * b * k * k}\\text{ m}^2`], asPic(planSvg(a, b, sc)));
  const R = a * b * k * k;
  return ask(fill(W.areaBack, { s: sc, R }), a * b, [{ id: "areaScaledByK", a: num(a * b * k), vars }], [...steps, `${R} \\div ${k * k} = ${a * b}\\text{ cm}^2`]);
};

function ask(prompt: string, v: number, traps: Trap[], steps: string[], pic?: Exercise["pic"]): Part {
  return { prompt, q: "", pic, answer: { ...num(v), traps }, show: tn(v), plain: tn(v), format: "number", steps };
}

export default gen;
