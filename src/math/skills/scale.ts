// Practice: Scale drawings and maps. Easy: a real distance from a map at 1 cm : k m (or km), or the map distance from
// the real one. Medium: a map at 1 : n with the change of unit to kilometres, or the scale 1 : n found from a drawing.
// Hard: an area on a plan (each square centimetre is a k-by-k block), the plan's area from the real one, or a drawing
// redrawn at another scale. Dividing where the scale multiplies, a wrong change of unit, mixing metres with
// centimetres when finding n, an area scaled by k instead of k², and a redrawing turned upside down are the slips.
import { fill } from "../chart";
import { num } from "../practiceKit";
import type { Exercise, Gen, Part, Trap } from "../practiceTypes";
import { mapSvg, planSvg } from "../scaleMaps";

const asPic = (d: { body: string; w: number; h: number }): Exercise["pic"] => ({ svg: (x: number, y: number) => `<g transform="translate(${x} ${y})">${d.body}</g>`, h: d.h, w: d.w });
const r2 = (v: number) => Math.round(v * 1000) / 1000;
const tn = (v: number) => String(r2(v));

const gen: Gen = (r, L, w) => {
  const W = w.maps;
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
