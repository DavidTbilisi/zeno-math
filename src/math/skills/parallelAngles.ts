// Practice: Angles on parallel lines. Where two lines cross, the angles opposite each other are equal and the angles
// side by side make 180°; a right angle split in two gives complementary parts. Two parallel lines crossed by a third
// make the same angles at both crossings: corresponding and alternate angles are equal, co-interior ones make 180°.
// The hard level carries this on: a triangle's outside angle is its two far inside angles added, two angles written
// with x give an equation, and a line bent between two parallels has its bend found by a parallel through the corner.
// Equal angles taken to make 180° (and the other way round), complement and supplement swapped, a pair misnamed, the
// inside angle given for the outside one, and the bend taken for a triangle's angle are the slips.
import { fill, r2 } from "../chart";
import { num } from "../practiceKit";
import type { MistakeId } from "../mistakes";
import type { Gen, Part, Trap } from "../practiceTypes";
import { bendSvg, crossingSvg, exteriorSvg, pairEqual, pairOf, positionAngle, rightSplitSvg, type Corner, type Drawn, type Pair, type Place } from "../parallelAngles";

const CORNERS: Corner[] = ["tl", "tr", "bl", "br"];
const deg = (v: number) => `${v}^\\circ`;
/** A term ax + k as written in a figure: (3x + 10)°. */
const term = (a: number, k: number) => `(${a}x${k === 0 ? "" : k > 0 ? ` + ${k}` : ` − ${-k}`})°`;
const termTex = (a: number, k: number) => `${a}x${k === 0 ? "" : k > 0 ? ` + ${k}` : ` - ${-k}`}`;

const gen: Gen = (r, L, w) => {
  const W = w.parAngles;
  const pic = (d: Drawn) => ({ svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${d.body}</g>`, h: d.h, w: d.w });
  const ask = (prompt: string, d: Drawn | null, v: number, traps: Trap[], steps: string[]): Part => ({
    prompt, q: "", ...(d ? { pic: pic(d) } : {}), answer: { ...num(v), traps }, show: deg(v), plain: String(v), format: "number", steps,
  });
  const trap = (id: MistakeId, v: number, vars: Record<string, string | number>): Trap[] => [{ id, a: num(v), vars }];
  /** The transversal's slope, never upright: 35° to 145°. */
  const slope = () => r.pick([35, 40, 50, 55, 60, 65, 70, 110, 115, 120, 125, 130, 140, 145]);
  /** The slip for a pair: the equal ones taken to make 180°, the ones making 180° taken to be equal. */
  const slipOf = (p: Pair, given: number, v: number): Trap[] =>
    pairEqual(p) ? trap("supplementedEqual", 180 - given, { pair: W.pairs[p] }) : given === v ? [] : trap("equaledSupplement", given, { pair: W.pairs[p] });
  const why = (p: Pair, given: number, v: number) => (pairEqual(p) ? `\\text{${W.pairs[p]}}: ? = ${deg(given)}` : `\\text{${W.pairs[p]}}: ? = 180^\\circ - ${deg(given)} = ${deg(v)}`);

  if (L === 1) {
    const kind = r.int(0, 2);
    if (kind === 0) {
      // Two lines crossing: the angle opposite, or the one beside it on the line.
      const theta = slope();
      const g: Corner = r.pick(CORNERS);
      const q = r.pick(CORNERS.filter((c) => c !== g));
      const [a, v] = [positionAngle(theta, g), positionAngle(theta, q)];
      const p = pairOf({ at: "p", c: g }, { at: "p", c: q })!;
      const d = crossingSvg(theta, [{ place: { at: "p", c: g }, text: `${a}°` }, { place: { at: "p", c: q }, text: "?", color: "#e8590c" }], false);
      return ask(W.cross, d, v, slipOf(p, a, v), [why(p, a, v)]);
    }
    if (kind === 1) {
      // A right angle split in two: the parts are complementary.
      const a = r.int(15, 75);
      const first = r.next() < 0.5;
      const d = first ? rightSplitSvg(a, `${a}°`, "?") : rightSplitSvg(a, "?", `${90 - a}°`);
      const [given, v] = first ? [a, 90 - a] : [90 - a, a];
      return ask(W.rightSplit, d, v, trap("complementSupplementSwapped", 180 - given, {}), [`? = 90^\\circ - ${deg(given)} = ${deg(v)}`]);
    }
    // The complement or the supplement of an angle, named.
    const a = r.int(12, 80);
    const supp = r.next() < 0.5;
    const v = supp ? 180 - a : 90 - a;
    return ask(fill(supp ? W.suppOf : W.compOf, { a }), null, v, trap("complementSupplementSwapped", supp ? 90 - a : 180 - a, {}), [`${supp ? 180 : 90}^\\circ - ${deg(a)} = ${deg(v)}`]);
  }

  /** A place at the top crossing and one at the bottom crossing that make a named pair, not vertically opposite. */
  const twoPlaces = (want?: Pair): [Place, Place, Pair] => {
    for (;;) {
      const a: Place = { at: "p", c: r.pick(CORNERS) };
      const b: Place = { at: "q", c: r.pick(CORNERS) };
      const p = pairOf(a, b);
      if (p && (!want || p === want)) return r.next() < 0.5 ? [a, b, p] : [b, a, p];
    }
  };

  if (L === 2) {
    const theta = slope();
    if (r.next() < 0.6) {
      // An angle at one crossing found from the other.
      const [g, q, p] = twoPlaces(r.pick(["corresponding", "alternate", "coInterior"] as const));
      const [a, v] = [positionAngle(theta, g.c), positionAngle(theta, q.c)];
      const d = crossingSvg(theta, [{ place: g, text: `${a}°` }, { place: q, text: "?", color: "#e8590c" }], true);
      return ask(W.find, d, v, slipOf(p, a, v), [why(p, a, v)]);
    }
    // The pair named. Calling it one of the others is the slip.
    const [g, q, p] = twoPlaces(r.pick(["corresponding", "alternate", "coInterior"] as const));
    const d = crossingSvg(theta, [{ place: g, text: "1", color: "#9c36b5" }, { place: q, text: "2", color: "#9c36b5" }], true);
    const names: Pair[] = ["corresponding", "alternate", "coInterior"];
    const options = names.map((n) => ({ text: W.pairs[n], plain: W.pairs[n], tex: `\\text{${W.pairs[n]}}` }));
    const traps: Trap[] = names.filter((n) => n !== p).map((n) => ({ id: "pairMisnamed", a: { k: "pick", options, right: names.indexOf(n) }, vars: { v: W.pairs[p], x: W.pairs[n] } }));
    const rule = pairEqual(p) ? `\\angle 1 = \\angle 2` : `\\angle 1 + \\angle 2 = 180^\\circ`;
    return { prompt: W.name, q: "", pic: pic(d), answer: { k: "pick", options, right: names.indexOf(p), traps }, show: options[names.indexOf(p)].tex, plain: W.pairs[p], format: "pick", steps: [rule] };
  }

  const kind = r.int(0, 2);
  if (kind === 0) {
    // A triangle's outside angle: the two inside angles away from it, added.
    // Never a right angle outside, where the outside and inside angles would be the same.
    const A = r.int(30, 75);
    let B = r.int(35, 80);
    if (A + B === 90) B += 5;
    const ext = A + B;
    if (r.next() < 0.6) {
      const d = exteriorSvg(A, B, { a: `${A}°`, b: `${B}°`, ext: "?" });
      return ask(W.ext, d, ext, trap("exteriorIsInterior", 180 - ext, { a: A, b: B, v: ext }), [`? = ${deg(A)} + ${deg(B)} = ${deg(ext)}`]);
    }
    const d = exteriorSvg(A, B, { a: `${A}°`, b: "?", ext: `${ext}°` });
    return ask(W.extIn, d, B, trap("exteriorIsInterior", 180 - ext, { a: A, b: B, v: ext }), [`${deg(A)} + ? = ${deg(ext)}`, `? = ${deg(ext)} - ${deg(A)} = ${deg(B)}`]);
  }
  if (kind === 1) {
    // Two angles written with x: equal ones give one equation, co-interior ones another. The transversal is steep
    // enough for the expressions to fit beside it.
    const theta = r.pick([55, 60, 65, 70, 110, 115, 120, 125]);
    const [g, q, p] = twoPlaces(r.pick(["corresponding", "alternate", "coInterior"] as const));
    const [a1, a2] = [positionAngle(theta, g.c), positionAngle(theta, q.c)];
    const x = r.int(8, 25);
    const m1 = r.int(2, 5);
    const m2 = r.pick([2, 3, 4, 5, 6].filter((m) => m !== m1));
    const [k1, k2] = [a1 - m1 * x, a2 - m2 * x];
    const d = crossingSvg(theta, [{ place: g, text: term(m1, k1) }, { place: q, text: term(m2, k2), color: "#2f9e44" }], true);
    const eq = pairEqual(p);
    const wrong = eq ? (180 - k1 - k2) / (m1 + m2) : (k2 - k1) / (m1 - m2);
    const traps: Trap[] = Number.isInteger(wrong) && wrong > 0 && wrong !== x ? trap(eq ? "supplementedEqual" : "equaledSupplement", wrong, { pair: W.pairs[p] }) : [];
    const steps = eq
      ? [`\\text{${W.pairs[p]}}: ${termTex(m1, k1)} = ${termTex(m2, k2)}`, ...(Math.abs(m1 - m2) === 1 ? [] : [m1 > m2 ? `${m1 - m2}x = ${k2 - k1}` : `${m2 - m1}x = ${k1 - k2}`]), `x = ${x}`]
      : [`\\text{${W.pairs[p]}}: ${termTex(m1, k1)} + ${termTex(m2, k2)} = 180`, `${m1 + m2}x = ${180 - k1 - k2}`, `x = ${x}`];
    return { prompt: W.solveX, q: "", pic: pic(d), answer: { ...num(x), traps }, show: `x = ${x}`, plain: String(x), format: "number", steps };
  }
  // The bend between two parallels: a parallel through the corner splits it into two alternate angles.
  // Never a right-angled bend, where it and 180° less the two would be the same.
  const a = r.int(25, 65);
  let b = r.int(25, 65);
  if (a + b === 90) b += 5;
  const d = bendSvg(a, b, { a: `${a}°`, b: `${b}°`, bend: "?" });
  return ask(W.bend, d, a + b, trap("bendAsTriangle", 180 - a - b, { a, b, v: a + b }), [`\\text{${W.through}}`, `? = ${deg(a)} + ${deg(b)} = ${deg(a + b)}`]);
};

export default gen;
