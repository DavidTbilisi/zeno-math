// Practice: Shapes by their properties. Flat and solid shapes named, sides and corners counted, the faces, edges and
// corners of a solid; then angles (acute, right, obtuse), lines, rays and segments, two lines parallel or
// perpendicular, and triangles named by their sides and by their angles; then the family of quadrilaterals: the name
// that says the most, how many names fit one shape, and whether a sentence about the family is true always,
// sometimes or never. A solid called by its face, the faces at the back left out, acute and obtuse swapped, any
// crossing taken for perpendicular, two equal sides missed, a triangle named by an acute angle, the names taken to
// shut each other out, one example taken for always, a wider name for the most exact one, and only one name for a
// shape are the slips.
import { fill, r2 } from "../chart";
import { num } from "../practiceKit";
import type { MistakeId } from "../mistakes";
import type { Gen, Part, PracticeWords, Trap } from "../practiceTypes";
import { angleSvg, circleSvg, lineKindSvg, polygon, polySvg, quad, QUAD_NAMES, quadNames, SOLID_COUNTS, solidSvg, triangleAngles, triangleOf, turn, twoLinesSvg, type Drawn, type QuadKind, type SolidKind } from "../shapeKinds";

type Words = PracticeWords["shapes"];
export type FlatName = "triangle" | "square" | "rectangle" | "pentagon" | "hexagon" | "octagon" | "circle";
/** The flat shape a solid's face (or its outline) is, the name a solid is wrongly given. */
export const FACE_OF: Record<SolidKind, FlatName> = { cube: "square", cuboid: "rectangle", cylinder: "circle", cone: "circle", sphere: "circle", pyramid: "triangle", prism: "triangle" };
/** Sentences about the family of shapes and whether they are true always, sometimes or never. */
export const FAMILY = {
  squareRect: "always", squareRhombus: "always", rectPara: "always", rhombusPara: "always", equiIso: "always",
  rectSquare: "sometimes", rhombusSquare: "sometimes", paraRect: "sometimes", paraRhombus: "sometimes", isoEqui: "sometimes",
  rightObtuse: "never", twoRight: "never",
} as const;
export type FamilyKey = keyof typeof FAMILY;
const WHEN = ["always", "sometimes", "never"] as const;

const gen: Gen = (r, L, w) => {
  const W: Words = w.shapes;
  const pic = (d: Drawn) => ({ svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${d.body}</g>`, h: d.h, w: d.w });
  const option = (t: string) => ({ text: t, plain: t, tex: `\\text{${t}}` });
  /** A question answered by picking one of `names`; `slips` name a wrong pick. */
  const pick = (prompt: string, d: Drawn | null, names: string[], right: string, slips: [MistakeId, string, Record<string, string | number>][], steps: string[] = []): Part => {
    const options = names.map(option);
    const at = (t: string) => names.indexOf(t);
    const traps: Trap[] = slips.filter(([, t]) => at(t) >= 0 && t !== right).map(([id, t, vars]) => ({ id, a: { k: "pick", options, right: at(t) }, vars }));
    return { prompt, q: "", ...(d ? { pic: pic(d) } : {}), answer: { k: "pick", options, right: at(right), traps }, show: option(right).tex, plain: right, format: "pick", steps };
  };
  const count = (prompt: string, d: Drawn, v: number, traps: Trap[] = [], steps: string[] = []): Part => ({ prompt, q: "", pic: pic(d), answer: { ...num(v), traps }, show: String(v), plain: String(v), format: "number", steps });
  /** `right` and three others from `pool`, shuffled by the seed. */
  const four = (right: string, pool: string[], must: string[] = []): string[] => {
    const rest = pool.filter((t) => t !== right && !must.includes(t));
    const others = [...must];
    while (others.length < 3 && rest.length) others.push(rest.splice(r.int(0, rest.length - 1), 1)[0]);
    const all = [right, ...others];
    for (let i = all.length - 1; i > 0; i--) {
      const j = r.int(0, i);
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all;
  };
  const words = (s: string) => `\\text{${s}}`;

  if (L === 1) {
    const kind = r.int(0, 3);
    if (kind === 0) {
      // Sides or corners of a polygon, regular or not: always the same number.
      const n = r.int(3, 8);
      const d = polySvg(n === 3 ? triangleOf(...(triangleAngles("scalene", r).slice(0, 2) as [number, number])) : polygon(n, r, r.next() < 0.5));
      return count(r.next() < 0.5 ? W.sides : W.corners, d, n);
    }
    if (kind === 1) {
      // A flat shape named; a square is never offered "rectangle", which would also be true.
      const k = r.pick(["triangle", "square", "rectangle", "pentagon", "hexagon", "octagon", "circle"] as const);
      const pts = k === "triangle" ? triangleOf(...(triangleAngles(r.pick(["equilateral", "isosceles", "scalene"] as const), r).slice(0, 2) as [number, number])) : k === "square" || k === "rectangle" ? quad(k, r) : null;
      const d = k === "circle" ? circleSvg() : polySvg(pts ?? polygon({ pentagon: 5, hexagon: 6, octagon: 8 }[k as "pentagon"], r));
      const pool = (["triangle", "square", "rectangle", "pentagon", "hexagon", "octagon", "circle"] as const).filter((t) => !(k === "square" && t === "rectangle")).map((t) => W.names[t]);
      return pick(W.name, d, four(W.names[k], pool), W.names[k], []);
    }
    if (kind === 3) {
      // Faces, edges or corners of a solid with flat faces. Only the faces in sight is the slip.
      const solid = r.pick(["cube", "cuboid", "pyramid", "prism"] as const);
      const counts = SOLID_COUNTS[solid]!;
      const what = r.pick(["faces", "edges", "vertices"] as const);
      const v = counts[what];
      const traps: Trap[] = what === "faces" ? [{ id: "onlyVisibleFaces", a: num(counts.seen), vars: { x: counts.seen, v, s: W.names[solid] } }] : [];
      return count(W[what], solidSvg(solid), v, traps);
    }
    // A solid named. The flat shape of its face is the slip, offered among the choices.
    const solid = r.pick(["cube", "cuboid", "cylinder", "cone", "sphere", "pyramid", "prism"] as const);
    const face = W.names[FACE_OF[solid]];
    const pool = (["cube", "cuboid", "cylinder", "cone", "sphere", "pyramid", "prism"] as const).map((t) => W.names[t]);
    const right = W.names[solid];
    return pick(W.name, solidSvg(solid), four(right, pool, [face]), right, [["faceForSolid", face, { v: right, x: face }]]);
  }

  if (L === 2) {
    const kind = r.int(0, 4);
    if (kind === 0) {
      // An angle by its size, against a right angle: acute and obtuse swapped is the slip.
      const k = r.pick(["acute", "right", "obtuse"] as const);
      const deg = k === "right" ? 90 : k === "acute" ? r.int(20, 70) : r.int(110, 160);
      const names = [W.kinds.acute, W.kinds.right, W.kinds.obtuse];
      const other = k === "acute" ? W.kinds.obtuse : W.kinds.acute;
      return pick(W.angleKind, angleSvg(deg, r.int(0, 40)), names, W.kinds[k], k === "right" ? [] : [["acuteObtuseSwapped", other, { v: W.kinds[k] }]]);
    }
    if (kind === 1) {
      // Two lines: parallel, perpendicular, or crossing at another angle (any crossing taken for perpendicular).
      const k = r.pick(["parallel", "perpendicular", "crossing"] as const);
      const names = [W.kinds.parallel, W.kinds.perpendicular, W.kinds.crossing];
      return pick(W.lines, twoLinesSvg(k, r.int(-20, 30), r.pick([35, 45, 55, 125, 135])), names, W.kinds[k], k === "crossing" ? [["crossingIsPerpendicular", W.kinds.perpendicular, {}]] : []);
    }
    if (kind === 2) {
      const k = r.pick(["line", "ray", "segment"] as const);
      return pick(W.lineKind, lineKindSvg(k, r.int(-25, 25)), [W.kinds.line, W.kinds.ray, W.kinds.segment], W.kinds[k], []);
    }
    if (kind === 3) {
      // A triangle by its sides, lengths written on them: isosceles or scalene (equilateral waits for the family).
      const iso = r.next() < 0.55;
      for (;;) {
        const [A, B] = triangleAngles(iso ? "isosceles" : "scalene", r);
        const pts = triangleOf(A, B);
        const base = r.int(5, 10);
        const ls = pts.map((p, i) => Math.hypot(pts[(i + 1) % 3][0] - p[0], pts[(i + 1) % 3][1] - p[1]) * base);
        const cm = ls.map((l) => Math.round(l));
        if (cm.some((c) => c < 2) || new Set(cm).size !== (iso ? 2 : 3)) continue;
        const names = [W.kinds.equilateral, W.kinds.isosceles, W.kinds.scalene];
        const same = cm.find((c, i) => cm.indexOf(c) !== i);
        const d = polySvg(pts, { sideLabels: cm.map((c) => `${c} cm`) });
        return pick(W.bySides, d, names, iso ? W.kinds.isosceles : W.kinds.scalene, iso ? [["equalSidesMissed", W.kinds.scalene, { s: `${same} cm` }]] : []);
      }
    }
    // A triangle by its angles, written in its corners: named by the largest. An acute name for it is the slip.
    const k = r.pick(["acute", "right", "obtuse"] as const);
    const [A, B, C] = triangleAngles(k, r);
    const names = [W.kinds.acuteTri, W.kinds.rightTri, W.kinds.obtuseTri];
    const right = { acute: W.kinds.acuteTri, right: W.kinds.rightTri, obtuse: W.kinds.obtuseTri }[k];
    const big = Math.max(A, B, C);
    return pick(W.byAngles, polySvg(triangleOf(A, B), { angleLabels: [`${A}°`, `${B}°`, `${C}°`] }), names, right, k === "acute" ? [] : [["oneAcuteAngle", W.kinds.acuteTri, { big, kind: W.kinds[k], v: right }]], [`${A}° + ${B}° + ${C}° = 180°`]);
  }

  const kind = r.int(0, 2);
  if (kind === 0) {
    // Always, sometimes or never: names that do not shut each other out.
    const key = r.pick(Object.keys(FAMILY) as FamilyKey[]);
    const truth = FAMILY[key];
    const names = WHEN.map((t) => W.when[t]);
    const why = W.family[key].why;
    const slips: [MistakeId, string, Record<string, string | number>][] = truth === "always" ? [["namesExclusive", W.when.never, { why }]] : truth === "sometimes" ? [["oneExampleEnough", W.when.always, { why }]] : [];
    // The reason, a sentence to a line.
    return pick(fill(W.familyPrompt, { s: W.family[key].s }), null, names, W.when[truth], slips, why.split(/(?<=[.:])\s+/).map(words));
  }
  // A quadrilateral with its marks, turned any way: the most exact name, or how many names fit.
  const k = r.pick(kind === 1 ? (["square", "rectangle", "rhombus", "parallelogram"] as QuadKind[]) : (["square", "rectangle", "rhombus", "parallelogram", "kite", "trapezium"] as QuadKind[]));
  const pts = turn(quad(k, r), r.pick([0, 0, 15, 30, 45, -20]));
  const fits = quadNames(pts);
  const d = polySvg(pts, { marked: true });
  const named = fits.map((t) => W.names[t]);
  if (kind === 1) {
    const right = named[named.length - 1];
    const options = QUAD_NAMES.slice(1).map((t) => W.names[t]);
    const wider: [MistakeId, string, Record<string, string | number>][] = named.slice(1, -1).map((t) => ["nameTooGeneral", t, { x: t, v: right }]);
    return pick(W.exact, d, options, right, wider, [words(named.join(", "))]);
  }
  const traps: Trap[] = fits.length > 1 ? [{ id: "onlyOneName", a: num(1), vars: { v: named[named.length - 1], list: named.slice(0, -1).join(", ") } }] : [];
  return count(W.namesFit, d, fits.length, traps, [words(named.join(", "))]);
};

export default gen;
