// Congruent triangles. Three parts of a triangle fix it when they are three sides (SSS), two sides and the angle between
// them (SAS), two angles and a side (ASA, AAS), or a right angle, the hypotenuse and a side (RHS). Two sides and an angle
// not between them (SSA) can fit two different triangles, and three angles (AAA) fit every size. `pairSvg` draws two
// triangles with the same parts written on them; the piece `buildTriangle` lets the learner put a triangle's top corner
// where the given parts allow, and count the places.
import { C } from "./chart";
import { polySvg, triangleOf, turn, type Pt } from "./shapeKinds";

export type Test = "SSS" | "SAS" | "ASA" | "AAS" | "RHS" | "SSA" | "AAA";
export const TESTS: readonly Test[] = ["SSS", "SAS", "ASA", "AAS", "RHS"];
/** Which sides (0: between the first two corners, 1: opposite the first, 2: opposite the second) and which corners
 * carry their measure for each set of parts. */
export const PARTS: Record<Test, { sides: number[]; angles: number[] }> = {
  SSS: { sides: [0, 1, 2], angles: [] },
  SAS: { sides: [0, 2], angles: [0] },
  ASA: { sides: [0], angles: [0, 1] },
  AAS: { sides: [1], angles: [0, 1] },
  RHS: { sides: [0, 1], angles: [2] },
  SSA: { sides: [0, 1], angles: [0] },
  AAA: { sides: [], angles: [0, 1, 2] },
};

const rad = (d: number) => (d * Math.PI) / 180;
const len = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const dec = (v: number) => String(Math.round(v * 10) / 10);
const mirror = (ps: Pt[]): Pt[] => ps.map(([x, y]) => [-x, y]);

/**
 * Two triangles side by side with the parts of `test` written on both, the second turned and perhaps flipped. For SSA
 * the second is the other triangle with the same parts; for AAA it is a different size.
 */
export function pairSvg(test: Test, A: number, B: number, base: number, tilt: number, flipped: boolean): { body: string; w: number; h: number } {
  const unit = triangleOf(A, B);
  const scale = (ps: Pt[], k: number): Pt[] => ps.map(([x, y]) => [x * k, y * k]);
  const first = scale(unit, base / len(unit[0], unit[1]));
  let second = first;
  if (test === "AAA") second = scale(first, 1.4);
  if (test === "SSA") {
    // The other place for the third corner: on the same ray from the first corner, as far from the second.
    const a = len(first[1], first[2]);
    const t = (2 * base * Math.cos(rad(A))) - len(first[0], first[2]);
    if (t > 0 && Math.abs(len([t * Math.cos(rad(A)), t * Math.sin(rad(A))], first[1]) - a) < 1e-6) second = [first[0], first[1], [t * Math.cos(rad(A)), t * Math.sin(rad(A))]];
  }
  const label = (ps: Pt[]) => {
    const parts = PARTS[test];
    const sides = [len(ps[0], ps[1]), len(ps[1], ps[2]), len(ps[2], ps[0])];
    const angle = (i: number) => {
      const [p, q, r] = [ps[i], ps[(i + 1) % 3], ps[(i + 2) % 3]];
      const u = [q[0] - p[0], q[1] - p[1]], v = [r[0] - p[0], r[1] - p[1]];
      return Math.round((Math.acos((u[0] * v[0] + u[1] * v[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1]))) * 180) / Math.PI);
    };
    return {
      sideLabels: [0, 1, 2].map((i) => (parts.sides.includes(i) ? `${dec(sides[i])} cm` : "")),
      angleLabels: [0, 1, 2].map((i) => (parts.angles.includes(i) ? `${angle(i)}°` : "")),
    };
  };
  // The second triangle has the same parts (for SSA as well, which is the point); for AAA only the same angles.
  const l1 = label(first);
  const l2 = test === "AAA" ? label(second) : l1;
  // One scale for both, so that sizes compare: each is drawn in a box its own size at that scale (polySvg fits a shape
  // to its box, which then gives back the same scale).
  const shown2 = turn(flipped ? mirror(second) : second, tilt);
  const ext = (ps: Pt[]) => [Math.max(...ps.map((q) => q[0])) - Math.min(...ps.map((q) => q[0])), Math.max(...ps.map((q) => q[1])) - Math.min(...ps.map((q) => q[1]))];
  const [e1, e2] = [ext(first), ext(shown2)];
  const PAD = 30;
  const k = Math.min(...[e1, e2].map(([dx, dy]) => Math.min(190 / dx, 140 / dy)));
  const box = ([dx, dy]: number[]) => ({ w: dx * k + 2 * PAD, h: dy * k + 2 * PAD });
  const [b1, b2] = [box(e1), box(e2)];
  const d1 = polySvg(first, { ...b1, ...l1, fill: "#e7f5ff", pad: PAD });
  const d2 = polySvg(shown2, { ...b2, ...l2, fill: "#fff4e6", pad: PAD });
  const h = Math.max(b1.h, b2.h);
  const gap = b1.w + 24;
  return {
    body: `<g transform="translate(0 ${(h - b1.h) / 2})">${d1.body}</g><g transform="translate(${gap} ${(h - b2.h) / 2})">${d2.body}</g><line x1="${b1.w + 12}" y1="16" x2="${b1.w + 12}" y2="${h - 16}" stroke="${C.grey}" stroke-dasharray="3 5"/>`,
    w: Math.round(gap + b2.w), h: Math.round(h),
  };
}

/** The build-a-triangle piece: the parts given, the top corner where the learner holds it, the places found so far. */
export type LiveBuildTriangle = { test: "SSS" | "SAS" | "ASA" | "SSA" | "AAA"; c: [number, number]; found: number[]; bx: number };
export const BUILD_TESTS: readonly LiveBuildTriangle["test"][] = ["SSS", "SAS", "ASA", "SSA", "AAA"];
/** The base's left end, in the piece's own drawing; its right end is `bx`. */
export const BASE_A: [number, number] = [150, 330];
export const BASE_LEN = 260;
export const BUILD_START: LiveBuildTriangle = { test: "SSS", c: [300, 150], found: [], bx: BASE_A[0] + BASE_LEN };
/** The given parts, in pixels and degrees. */
export const GIVEN = { b: 200, a: 172, A: 50, B: 62, ssaA: 35 };

/** Where the top corner may go for the parts given, above the base (for AAA, wherever the base's end is). */
export function spots(s: LiveBuildTriangle): [number, number][] {
  const [ax, ay] = BASE_A;
  const bx = s.test === "AAA" ? s.bx : ax + BASE_LEN;
  const c = bx - ax;
  const ray = (deg: number, t: number): [number, number] => [ax + t * Math.cos(rad(deg)), ay - t * Math.sin(rad(deg))];
  if (s.test === "SSS") {
    const x = (GIVEN.b ** 2 - GIVEN.a ** 2 + c * c) / (2 * c);
    return [[ax + x, ay - Math.sqrt(GIVEN.b ** 2 - x * x)]];
  }
  if (s.test === "SAS") return [ray(GIVEN.A, GIVEN.b)];
  if (s.test === "SSA") {
    // On the ray at A, as far as `a` from the base's right end: t² − 2tc·cos A + c² − a² = 0.
    const k = Math.cos(rad(GIVEN.ssaA));
    const disc = (c * k) ** 2 - (c * c - GIVEN.a ** 2);
    return [c * k - Math.sqrt(disc), c * k + Math.sqrt(disc)].filter((t) => t > 0).map((t) => ray(GIVEN.ssaA, t));
  }
  // Two angles: the rays from both ends meet at one point, wherever the base ends.
  const C3 = 180 - GIVEN.A - GIVEN.B;
  const t = (c * Math.sin(rad(GIVEN.B))) / Math.sin(rad(C3));
  return [ray(GIVEN.A, t)];
}
/** How close the corner must come to a place to sit in it, in pixels. */
export const SNAP = 14;
