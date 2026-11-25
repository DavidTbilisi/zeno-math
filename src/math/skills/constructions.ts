// Practice: Ruler-and-compass constructions. Easy: a finished construction, its compass arcs left on, named (the
// perpendicular bisector, the angle bisector, the perpendicular from a point, the equilateral triangle, the hexagon in a
// circle). Medium: what a construction gives, in numbers: half a segment or an angle, 60° in the equilateral triangle,
// the hexagon's side or perimeter from the radius, a point on the perpendicular bisector as far from both ends. Hard:
// why a construction works, a proof put in order with a look-alike line left out, or the steps of a 30° angle in
// order; or an angle bisected again and again. Taking one perpendicular for the other, an angle or segment not halved,
// the diameter for the hexagon's side and halving once for every bisection are the slips.
import { fill } from "../chart";
import { constructSvg, type Shown } from "../compass";
import { num } from "../practiceKit";
import type { Exercise, Gen, Part, Trap } from "../practiceTypes";
import { orderLines } from "./proofs";

const KINDS: readonly Shown[] = ["bisect", "angle", "perp", "equi", "hexagon"];
const pic = (kind: Shown, turn: number, labels = true): Exercise["pic"] => {
  const d = constructSvg(kind, turn, labels);
  return { svg: (x: number, y: number) => `<g transform="translate(${x} ${y})">${d.body}</g>`, h: d.h, w: d.w };
};

const gen: Gen = (r, L, w) => {
  const W = w.cons;
  if (L === 1) {
    const kind = r.pick(KINDS);
    const options = KINDS.map((k) => ({ text: W.names[k], plain: W.names[k], tex: `\\text{${W.names[k]}}` }));
    const right = KINDS.indexOf(kind);
    const traps: Trap[] =
      kind === "perp" ? [{ id: "perpAsBisector", a: { k: "pick", options, right: 0 }, vars: {} }]
      : kind === "bisect" ? [{ id: "bisectorAsPerp", a: { k: "pick", options, right: 2 }, vars: {} }]
      : [];
    return {
      prompt: W.which, q: "", pic: pic(kind, r.pick([0, 0, 20, -25, 90])),
      answer: { k: "pick", options, right, traps }, show: options[right].tex, plain: W.names[kind], format: "pick",
      steps: [`\\text{${W.how[kind]}}`],
    };
  }

  if (L === 2) {
    const t = r.pick(["half", "halfAngle", "equiAngle", "hexSide", "hexPerim", "equidist"] as const);
    if (t === "half") {
      const n = r.int(6, 15);
      return ask(fill(W.half, { n }), n / 2, [{ id: "constructionNotHalved", a: num(n), vars: {} }], ["AM = \\tfrac{1}{2}AB", `AM = ${n} \\div 2 = ${n / 2}`], pic("bisect", 0));
    }
    if (t === "halfAngle") {
      const n = 2 * r.int(20, 75);
      return ask(fill(W.halfAngle, { n }), n / 2, [{ id: "constructionNotHalved", a: num(n), vars: {} }], [`${n}^\\circ \\div 2 = ${n / 2}^\\circ`], pic("angle", 0, false));
    }
    if (t === "equiAngle") return ask(W.equiAngle, 60, [], ["AC = AB = BC", "180^\\circ \\div 3 = 60^\\circ"], pic("equi", 0));
    if (t === "equidist") {
      const n = r.int(4, 14);
      return ask(fill(W.equidist, { n }), n, [], [`PB = PA = ${n}`], pic("bisect", 0));
    }
    const rr = r.int(3, 12);
    if (t === "hexSide") return ask(fill(W.hexSide, { r: rr }), rr, [{ id: "hexSideDiameter", a: num(2 * rr), vars: {} }], [`\\text{${W.how.hexagon}}`, `\\text{side} = r = ${rr}`], pic("hexagon", 0));
    return ask(fill(W.hexPerim, { r: rr }), 6 * rr, [{ id: "hexSideDiameter", a: num(12 * rr), vars: {} }], [`\\text{side} = r = ${rr}`, `6 \\times ${rr} = ${6 * rr}`], pic("hexagon", 0));
  }

  if (r.next() < 0.6) {
    // Why it works, or how it is done, in order.
    const id = r.pick(["bisect", "angle", "thirty"] as const);
    const p = W.proofs[id];
    return { ...orderLines(p, id === "thirty" ? 1 : 2, r), prompt: fill(W.order, { claim: p.claim }) };
  }
  // An angle bisected again and again: halved each time.
  const [a, k] = r.pick([[60, 3], [90, 3], [120, 3], [120, 4], [90, 4]] as const);
  const v = a / 2 ** k;
  const lin = a / (2 * k);
  return ask(fill(W.twice, { a, k }), v, lin !== v ? [{ id: "bisectLinear", a: num(lin), vars: {} }] : [],
    [`${a}^\\circ \\div ${Array(k).fill(2).join(" \\div ")} = ${a}^\\circ \\div ${2 ** k} = ${v}^\\circ`]);
};

function ask(prompt: string, v: number, traps: Trap[], steps: string[], picture?: Exercise["pic"]): Part {
  return { prompt, q: "", pic: picture, answer: { ...num(v), traps }, show: String(v), plain: String(v), format: "number", steps };
}

export default gen;
