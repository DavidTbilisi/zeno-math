// Practice: Slicing solids, and density. Easy: the shape of a level or upright slice through a cuboid, a prism, a
// pyramid, a cylinder, a cone or a sphere, drawn cut open (named by the solids piece's own `cutName`). Medium: the
// solid a flat shape sweeps out when it turns about a line, its volume, and a leaning stack of coins (equal slices,
// equal volume). Hard: density as mass over volume, a mass from a cuboid's volume, and people per square kilometre.
// The base taken for an upright slice, the side for a level one, a turned triangle taken for a cylinder, the radius and
// height swapped, the cone's third left out and density turned upside down are the slips.
import { fill } from "../chart";
import { revolvePic, sliceName, slicePic, type Revolve, type SliceSpec } from "../crossSections";
import { num } from "../practiceKit";
import type { Exercise, Gen, Part, Trap } from "../practiceTypes";

const asPic = (d: { body: string; w: number; h: number }): Exercise["pic"] => ({ svg: (x: number, y: number) => `<g transform="translate(${x} ${y})">${d.body}</g>`, h: d.h, w: d.w });
const SHAPES = ["circle", "triangle", "square", "rectangle", "trapezium", "hexagon"] as const;
type Shape = (typeof SHAPES)[number];
const SOLIDS: Omit<SliceSpec, "tilt" | "cutAt">[] = [
  { shape: "cuboid", n: 4, a: 5, b: 3, c: 4 },
  { shape: "cuboid", n: 4, a: 4, b: 4, c: 4 },
  { shape: "prism", n: 3, a: 4, b: 4, c: 5 },
  { shape: "prism", n: 6, a: 3, b: 3, c: 5 },
  { shape: "pyramid", n: 4, a: 4, b: 4, c: 5 },
  { shape: "pyramid", n: 3, a: 5, b: 5, c: 5 },
  { shape: "cylinder", n: 4, a: 2, b: 2, c: 5 },
  { shape: "cone", n: 4, a: 3, b: 3, c: 5 },
  { shape: "sphere", n: 4, a: 3, b: 3, c: 6 },
];
const r1 = (v: number) => Math.round(v * 10) / 10;

const gen: Gen = (r, L, w) => {
  const W = w.slices;
  if (L === 1) {
    for (;;) {
      const solid = r.pick(SOLIDS);
      const tilt = r.pick([0, 90] as const);
      const cutAt = tilt === 0 ? r.int(35, 65) : r.pick([50, 50, 30]);
      const spec: SliceSpec = { ...solid, tilt, cutAt };
      const name = sliceName(spec);
      if (!(SHAPES as readonly string[]).includes(name)) continue;
      // The slice the other way, through the middle: what is picked when the cut's direction is misread.
      const other = sliceName({ ...solid, tilt: tilt === 0 ? 90 : 0, cutAt: 50 });
      const options = SHAPES.map((s) => ({ text: W.shapes[s], plain: W.shapes[s], tex: `\\text{${W.shapes[s]}}` }));
      const right = SHAPES.indexOf(name as Shape);
      const at = SHAPES.indexOf(other as Shape);
      const traps: Trap[] = at >= 0 && at !== right ? [{ id: tilt === 90 ? "sliceAsBase" : "sliceAsSide", a: { k: "pick", options, right: at }, vars: {} }] : [];
      return {
        prompt: W.which, q: "", pic: asPic(slicePic(spec)),
        answer: { k: "pick", options, right, traps }, show: options[right].tex, plain: W.shapes[name as Shape], format: "pick",
        steps: [`\\text{${tilt === 0 ? W.level : W.upright}}`],
      };
    }
  }

  if (L === 2) {
    const t = r.pick(["which", "cylinder", "cone", "stack"] as const);
    if (t === "which") {
      const kind = r.pick(["rectangle", "rightTriangle", "semicircle", "isosceles"] as const satisfies readonly Revolve[]);
      const SOLID = ["cylinder", "cone", "sphere", "twoCones"] as const;
      const right = { rectangle: 0, rightTriangle: 1, semicircle: 2, isosceles: 3 }[kind];
      const options = SOLID.map((s) => ({ text: W.solids[s], plain: W.solids[s], tex: `\\text{${W.solids[s]}}` }));
      const traps: Trap[] = kind === "rightTriangle" ? [{ id: "triangleTurnsCylinder", a: { k: "pick", options, right: 0 }, vars: {} }] : [];
      return {
        prompt: fill(W.turnWhich, { shape: W.flat[kind] }), q: "", pic: asPic(revolvePic(kind, 3, 5)),
        answer: { k: "pick", options, right, traps }, show: options[right].tex, plain: W.solids[SOLID[right]], format: "pick",
        steps: [`\\text{${W.sweeps[kind]}}`],
      };
    }
    if (t === "stack") {
      const n = r.int(12, 40);
      const v = r1(n * r.pick([0.4, 0.5, 0.8, 1.2]));
      return ask(fill(W.stack, { n, v }), v, [], [`\\text{${W.cavalieri}}`, `V = ${v}`]);
    }
    let p: number, q: number;
    do [p, q] = [r.int(2, 6), r.int(3, 9)];
    while (p === q);
    if (t === "cylinder") {
      const v = r1(Math.PI * p * p * q);
      return ask(fill(W.turnCylinder, { p, q }), v, [{ id: "axisSwapped", a: num(r1(Math.PI * q * q * p), 0.051), vars: { r: p, h: q } }],
        [`r = ${p},\\ h = ${q}`, `V = \\pi r^2 h = \\pi \\times ${p}^2 \\times ${q} \\approx ${v}`], asPic(revolvePic("rectangle", p, q)), 0.051);
    }
    const v = r1((Math.PI * p * p * q) / 3);
    const [noThird, swapped] = [r1(Math.PI * p * p * q), r1((Math.PI * q * q * p) / 3)];
    // When q = 3p the two slips give the same number: it is named as the third left out.
    const traps: Trap[] = [
      { id: "coneThirdMissing", a: num(noThird, 0.051), vars: {} },
      ...(swapped !== noThird ? [{ id: "axisSwapped" as const, a: num(swapped, 0.051), vars: { r: p, h: q } }] : []),
    ];
    return ask(fill(W.turnCone, { p, q }), v, traps, [`r = ${p},\\ h = ${q}`, `V = \\tfrac{1}{3}\\pi r^2 h = \\tfrac{1}{3}\\pi \\times ${p}^2 \\times ${q} \\approx ${v}`], asPic(revolvePic("rightTriangle", p, q)), 0.051);
  }

  const t = r.pick(["density", "mass", "people", "area"] as const);
  if (t === "density") {
    const [mat, rho] = r.pick([["aluminium", 2.7], ["iron", 7.9], ["ice", 0.9], ["oak", 0.7], ["glass", 2.5]] as const);
    const v = r.int(2, 30) * 10;
    const m = r1(rho * v);
    return ask(fill(W.density, { mat: W.materials[mat], m, v }), rho, [{ id: "densityInverted", a: num(r1(v / m), 0.051), vars: {} }],
      [`\\rho = \\dfrac{m}{V} = \\dfrac{${m}}{${v}} = ${rho}`]);
  }
  if (t === "mass") {
    const [a, b, c] = [r.int(2, 10), r.int(2, 10), r.int(2, 10)];
    const rho = r.pick([0.5, 0.8, 2, 2.5, 3, 8]);
    const V = a * b * c;
    const m = r1(rho * V);
    return ask(fill(W.mass, { a, b, c, r: rho }), m, [{ id: "densityInverted", a: num(r1(V / rho), 0.051), vars: {} }],
      [`V = ${a} \\times ${b} \\times ${c} = ${V}\\text{ cm}^3`, `m = \\rho V = ${rho} \\times ${V} = ${m}\\text{ g}`]);
  }
  const area = r.int(3, 40);
  const per = r.int(2, 60) * 50;
  const people = area * per;
  if (t === "people") return ask(fill(W.people, { p: people, a: area }), per, [], [`${people} \\div ${area} = ${per}`]);
  return ask(fill(W.areaFrom, { p: people, r: per }), area, [{ id: "densityInverted", a: num(people * per), vars: {} }], [`${people} \\div ${per} = ${area}\\text{ km}^2`]);
};

function ask(prompt: string, v: number, traps: Trap[], steps: string[], pic?: Exercise["pic"], tol?: number): Part {
  return { prompt, q: "", pic, answer: { ...(tol ? num(v, tol) : num(v)), traps }, show: String(v), plain: String(v), format: "number", steps };
}

export default gen;
