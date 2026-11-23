// Vectors, lines and planes in space as a live piece (#566): the axes turned by hand, the vectors' tips and the
// lines' and planes' points dragged in the plane facing the viewer (snapping to whole numbers), and the working of the
// Vectors tool (src/math/vectors.ts) kept exact beside the picture: lengths as surds, the cross product by its
// determinant and the parallelogram it measures, the shadow of one vector on another, two lines meeting, parallel or
// skew (with the shortest way between them), and planes with their normals, the point where a line pierces one and
// the line where two meet. Drawn on the stage of the solid piece (#564): plain 3D in an SVG, no WebGL.
import { Frac } from "./fraction";
import { add, cross, dot, len, scale, sub, unit, type V3, type View } from "./solid";
import {
  angleTex, frac as F, integral, isZeroV, lenOf, plainF, ratioOf, rcap, rdiv, rmul, rnum, rplain, sqrtR, vadd, vcross, vdot,
  vecPlain, VEC_PRESETS, vscale, vsub, type FracV,
} from "./vectors";

export type { V3, View };

export type SpaceMode = "vector" | "dot" | "cross" | "lines" | "planes";
export const SPACE_MODES: readonly SpaceMode[] = ["vector", "dot", "cross", "lines", "planes"];
/** The cross product of two vectors from the origin, with a third (the box they make), or of the sides of a triangle
 * or a tetrahedron given by its corners. */
export type CrossWith = "pair" | "box" | "triangle" | "tetra";
export const CROSS_WITH: readonly CrossWith[] = ["pair", "box", "triangle", "tetra"];
export type LinesWith = "one" | "point" | "two";
export const LINES_WITH: readonly LinesWith[] = ["one", "point", "two"];
export type PlanesWith = "one" | "point" | "line" | "two";
export const PLANES_WITH: readonly PlanesWith[] = ["one", "point", "line", "two"];

export type LiveSpace = {
  mode: SpaceMode;
  /** How the axes are turned, whole degrees: round the upright, and up from level (90 looks straight down z). */
  yaw: number;
  pitch: number;
  vec: { a: V3 };
  dot: { a: V3; b: V3 };
  /** a, b and c start at the origin; for a triangle or tetrahedron, at the corner o (A), so B = o + a and so on. */
  cross: { with: CrossWith; o: V3; a: V3; b: V3; c: V3 };
  /** Line 1 through a1 along d1, line 2 through a2 along d2, and a point p. */
  lines: { with: LinesWith; a1: V3; d1: V3; p: V3; a2: V3; d2: V3 };
  /** The plane through a with normal n, a point p, the line through la along ld, and a second plane through b with
   * normal m. */
  planes: { with: PlanesWith; a: V3; n: V3; p: V3; la: V3; ld: V3; b: V3; m: V3 };
};

/** Every point stays within this many units of the origin, on each axis. */
export const LIM = 9;
export const PITCH: readonly [number, number] = [-90, 90];

export const SPACE_START: LiveSpace = {
  mode: "cross", yaw: 235, pitch: 20,
  vec: { a: [2, -1, 2] },
  dot: { a: [1, 2, 2], b: [2, -1, 2] },
  cross: { with: "pair", o: [0, 0, 0], a: [2, -1, 1], b: [1, 3, -2], c: [2, 0, 1] },
  lines: { with: "two", a1: [1, 0, 0], d1: [1, 1, 0], p: [4, 3, 1], a2: [0, 1, 2], d2: [1, 0, 1] },
  planes: { with: "line", a: [2, 2, 2], n: [1, 1, 1], p: [4, 1, 5], la: [1, 0, 0], ld: [1, 2, 3], b: [1, 0, 1], m: [2, -1, 1] },
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const wrap360 = (v: number) => ((Math.round(v) % 360) + 360) % 360;
const isZero3 = (p: V3) => p[0] === 0 && p[1] === 0 && p[2] === 0;
const same = (p: V3, q: V3) => p[0] === q[0] && p[1] === q[1] && p[2] === q[2];

// ---- the view ------------------------------------------------------------------------------------------------------

/** The point that `seen` (solid.ts) shows at across, up and nearness s: the view turned back. */
export function unseen(s: V3, v: View): V3 {
  const [y, e] = [(v.yaw * Math.PI) / 180, (v.pitch * Math.PI) / 180];
  const x1 = s[0];
  const y1 = s[1] * Math.sin(e) - s[2] * Math.cos(e);
  const z = s[1] * Math.cos(e) + s[2] * Math.sin(e);
  return [x1 * Math.cos(y) + y1 * Math.sin(y), -x1 * Math.sin(y) + y1 * Math.cos(y), z];
}

export type Axis = "x" | "y" | "z";
export const AXES: readonly Axis[] = ["x", "y", "z"];
/** Looking straight down an axis gives the flat picture: down x shows y across and z up, down y shows x and z, down z
 * shows x and y. */
export const LOOK: Record<Axis, View> = { x: { yaw: 270, pitch: 0 }, y: { yaw: 0, pitch: 0 }, z: { yaw: 0, pitch: 90 } };
export const lookingDown = (v: View): Axis | null => AXES.find((k) => LOOK[k].yaw === wrap360(v.yaw) && LOOK[k].pitch === v.pitch) ?? null;

/** A point dragged across the screen by (dx, dy) units (y up): it moves in the plane facing the viewer, to whole numbers. */
export function dragTo(p0: V3, dx: number, dy: number, v: View): V3 {
  const d = unseen([dx, dy, 0], v);
  return p0.map((x, i) => clamp(Math.round(x + d[i] + 0) || 0, -LIM, LIM)) as V3;
}

/** One whole step for a key: the arrows along the axes that look most across and most up the screen, Page Up and
 * Page Down along the third, towards the viewer and away. */
export function keyStep(key: string, v: View): V3 | null {
  const way: Record<string, [number, 1 | -1]> = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowUp: [1, 1], ArrowDown: [1, -1], PageUp: [2, 1], PageDown: [2, -1] };
  const k = way[key];
  if (!k) return null;
  const screen = [unseen([1, 0, 0], v), unseen([0, 1, 0], v), unseen([0, 0, 1], v)];
  const across = [0, 1, 2].reduce((b, i) => (Math.abs(screen[0][i]) > Math.abs(screen[0][b]) + 1e-9 ? i : b), 0);
  const rest = [0, 1, 2].filter((i) => i !== across);
  const up = Math.abs(screen[1][rest[1]]) > Math.abs(screen[1][rest[0]]) + 1e-9 ? rest[1] : rest[0];
  const deep = 3 - across - up;
  const axis = [across, up, deep][k[0]];
  const step: V3 = [0, 0, 0];
  step[axis] = k[1] * (screen[k[0]][axis] < 0 ? -1 : 1);
  return step;
}

// ---- exact working -------------------------------------------------------------------------------------------------

const fv = (p: V3): FracV => p.map((x) => F(x));
const nv = (v: FracV): V3 => v.map((x) => x.toNumber()) as V3;
const par = (x: Frac) => (x.isNeg() ? `(${plainF(x)})` : plainF(x));
const XYZ = ["x", "y", "z"];
/** "(3, −1, 2)". */
export const vecText = (p: V3) => vecPlain(fv(p));
/** Σ cᵢ·nameᵢ with signs, ones and zeros left out: "2x − y + 3z"; "" names a constant. */
export function linPlain(cs: Frac[], names: string[]): string {
  const out: string[] = [];
  cs.forEach((c, i) => {
    if (c.isZero()) return;
    const a = c.abs();
    const body = !names[i] ? plainF(a) : a.isOne() ? names[i] : `${plainF(a)}${names[i]}`;
    out.push(out.length ? `${c.isNeg() ? "−" : "+"} ${body}` : `${c.isNeg() ? "−" : ""}${body}`);
  });
  return out.length ? out.join(" ") : "0";
}
const products = (a: FracV, b: FracV) => a.map((x, i) => `${par(x)}·${par(b[i])}`).join(" + ");

/** A vector's length from its components, exact: "3² + (−1)² + 2² = 14" and "√14 ≈ 3.742". */
export function vectorFacts(a: V3) {
  const A = fv(a);
  const r = lenOf(A);
  return {
    squares: A.map((x) => `${par(x)}²`).join(" + "),
    len: rcap(r),
    unit: `(${A.map((x) => rplain(rdiv(x, r))).join(", ")})`,
  };
}

/** The dot product, the angle, and the shadow of a on b: its signed length and the vector it is. */
export function dotFacts(a: V3, b: V3) {
  const [A, B] = [fv(a), fv(b)];
  const k = vdot(A, B);
  const rb = lenOf(B);
  const cos = rdiv(k, rmul(lenOf(A), rb));
  const ang = angleTex(rnum(cos));
  const foot = vscale(B, k.div(vdot(B, B)));
  return {
    products: products(A, B), dot: plainF(k), right: k.isZero(), cos: rplain(cos), angle: ang.plain, deg: ang.deg,
    shadow: rcap(rdiv(k, rb)), foot: nv(foot), footText: vecPlain(foot),
  };
}

/** a × b by the determinant, the area of the parallelogram it measures and half of it, the triangle. */
export function crossFacts(a: V3, b: V3) {
  const [A, B] = [fv(a), fv(b)];
  const c = vcross(A, B);
  const minor = (i: number, j: number) => `${par(A[i])}·${par(B[j])} − ${par(A[j])}·${par(B[i])}`;
  const area = lenOf(c);
  return {
    c: nv(c), cText: vecPlain(c), work: `(${minor(1, 2)}, ${minor(2, 0)}, ${minor(0, 1)})`, zero: isZeroV(c),
    squares: c.map((x) => `${par(x)}²`).join(" + "),
    // The tool's surds take no root of 0: a flat pair has no area.
    area: isZeroV(c) ? "0" : rcap(area), half: isZeroV(c) ? "0" : rcap({ out: area.out.div(F(2)), inner: area.inner }),
    checks: [plainF(vdot(c, A)), plainF(vdot(c, B))] as [string, string],
  };
}

/** (a × b)·c: the box's volume, and a sixth of it, the tetrahedron's. */
export function tripleFacts(a: V3, b: V3, c: V3) {
  const n = vcross(fv(a), fv(b));
  const v = vdot(n, fv(c));
  return { products: products(n, fv(c)), v: plainF(v), flat: v.isZero(), volume: plainF(v.abs()), sixth: plainF(v.abs().div(F(6))) };
}

/** r = a + t·d. */
export const lineText = (a: V3, d: V3, t = "t") => `r = ${vecText(a)} + ${t}${vecText(d)}`;

/** The line's Cartesian equations: "(x − 1)/2 = (y + 1)/3 = z", a fixed coordinate after a comma. */
export function symmText(a: V3, d: V3): string {
  const part = (i: number) => {
    const top = a[i] === 0 ? XYZ[i] : `(${linPlain([F(1), F(-a[i])], [XYZ[i], ""])})`;
    return d[i] === 1 ? top.replace(/^\((.*)\)$/, "$1") : `${top}/${par(F(d[i]))}`;
  };
  const moving = [0, 1, 2].filter((i) => d[i] !== 0).map(part);
  const fixed = [0, 1, 2].filter((i) => d[i] === 0).map((i) => `${XYZ[i]} = ${plainF(F(a[i]))}`);
  return [moving.join(" = "), ...fixed].filter(Boolean).join(", ");
}

/** The foot of the perpendicular from p to the line a + t·d, and how far p is from it (or where on it p is). */
export function pointLine(a: V3, d: V3, p: V3) {
  const [A, D, P] = [fv(a), fv(d), fv(p)];
  const t = vdot(vsub(P, A), D).div(vdot(D, D));
  const foot = vadd(A, vscale(D, t));
  const fp = vsub(P, foot);
  return { t: plainF(t), foot: nv(foot), footText: vecPlain(foot), on: isZeroV(fp), dist: rcap(lenOf(fp)) };
}

export type TwoLines =
  | { kind: "same" }
  | { kind: "parallel"; dist: string; foot: V3 }
  | { kind: "meet"; t: string; s: string; x: V3; xText: string; angle: string }
  | { kind: "skew"; dist: string; n: string; p: V3; q: V3; angle: string };

/** Two lines: the same, parallel (how far apart), meeting (where) or skew (how far apart, along the common
 * perpendicular from p on line 1 to q on line 2), as the tool works them. */
export function twoLines(a1: V3, d1: V3, a2: V3, d2: V3): TwoLines {
  const [A1, D1, A2, D2] = [fv(a1), fv(d1), fv(a2), fv(d2)];
  if (ratioOf(D1, D2)) {
    const f = pointLine(a1, d1, a2);
    return f.on ? { kind: "same" } : { kind: "parallel", dist: f.dist, foot: f.foot };
  }
  const cos = rdiv(vdot(D1, D2).abs(), rmul(lenOf(D1), lenOf(D2)));
  const angle = angleTex(rnum(cos)).plain;
  // t·d₁ − s·d₂ = a₂ − a₁, from two rows with a non-zero determinant, then the third row checked.
  const rhs = vsub(A2, A1);
  const detOf = (i: number, j: number) => D1[i].mul(D2[j].neg()).sub(D2[i].neg().mul(D1[j]));
  const [i, j] = ([[0, 1], [0, 2], [1, 2]] as const).find(([i, j]) => !detOf(i, j).isZero())!;
  const det = detOf(i, j);
  const tv = rhs[i].mul(D2[j].neg()).sub(D2[i].neg().mul(rhs[j])).div(det);
  const sv = D1[i].mul(rhs[j]).sub(rhs[i].mul(D1[j])).div(det);
  const X = vadd(A1, vscale(D1, tv));
  const Y = vadd(A2, vscale(D2, sv));
  if (isZeroV(vsub(X, Y))) return { kind: "meet", t: plainF(tv), s: plainF(sv), x: nv(X), xText: vecPlain(X), angle };
  const n = vcross(D1, D2);
  const dist = rdiv(vdot(rhs, n).abs(), sqrtR(vdot(n, n)));
  const w0 = vsub(A1, A2);
  const [a, b, c, d, e] = [vdot(D1, D1), vdot(D1, D2), vdot(D2, D2), vdot(D1, w0), vdot(D2, w0)];
  const den = a.mul(c).sub(b.mul(b));
  const sc = b.mul(e).sub(c.mul(d)).div(den);
  const tc = a.mul(e).sub(b.mul(d)).div(den);
  return { kind: "skew", dist: rcap(dist), n: vecPlain(n), p: nv(vadd(A1, vscale(D1, sc))), q: nv(vadd(A2, vscale(D2, tc))), angle };
}

/** The plane through a with normal n as an equation in whole, coprime numbers: "2x − y + 2z = 6". */
export function planeEq(n: V3, a: V3): string {
  const N = fv(n);
  const z = integral([...N, vdot(N, fv(a))]);
  return `${linPlain(z.slice(0, 3), XYZ)} = ${plainF(z[3])}`;
}

/** A point and the plane: on it, or how far off and the foot of the perpendicular. */
export function pointPlane(n: V3, a: V3, p: V3) {
  const [N, P] = [fv(n), fv(p)];
  const d = vdot(N, fv(a));
  const v = vdot(N, P);
  const off = v.sub(d);
  const foot = vsub(P, vscale(N, off.div(vdot(N, N))));
  return { np: products(N, P), value: plainF(v), on: off.isZero(), dist: rcap(rdiv(off.abs(), lenOf(N))), foot: nv(foot), footText: vecPlain(foot) };
}

export type LinePlane =
  | { kind: "inside" | "parallel"; nd: string }
  | { kind: "meet"; nd: string; t: string; x: V3; xText: string; angle: string };

/** Where the line la + t·ld pierces the plane, and the angle between them; or that it lies in it or runs beside it. */
export function linePlane(n: V3, a: V3, la: V3, ld: V3): LinePlane {
  const [N, LA, LD] = [fv(n), fv(la), fv(ld)];
  const d = vdot(N, fv(a));
  const nd = vdot(N, LD);
  const na = vdot(N, LA);
  const ndText = `${products(N, LD)} = ${plainF(nd)}`;
  if (nd.isZero()) return { kind: na.sub(d).isZero() ? "inside" : "parallel", nd: ndText };
  const t = d.sub(na).div(nd);
  const X = vadd(LA, vscale(LD, t));
  const sin = rdiv(nd.abs(), rmul(lenOf(N), lenOf(LD)));
  return { kind: "meet", nd: ndText, t: plainF(t), x: nv(X), xText: vecPlain(X), angle: angleTex(Math.sqrt(Math.max(0, 1 - rnum(sin) ** 2))).plain };
}

export type TwoPlanes =
  | { kind: "same" }
  | { kind: "parallel"; dist: string }
  | { kind: "meet"; point: V3; dir: V3; line: string; angle: string; cos: string };

/** Two planes: the same, parallel (how far apart), or meeting in a line (a point of it with a coordinate 0, the
 * direction n₁ × n₂) at an angle. */
export function twoPlanes(n1: V3, a1: V3, n2: V3, a2: V3): TwoPlanes {
  const [N1, N2] = [fv(n1), fv(n2)];
  const [d1, d2] = [vdot(N1, fv(a1)), vdot(N2, fv(a2))];
  const dir = vcross(N1, N2);
  if (isZeroV(dir)) {
    const k = ratioOf(N1, N2)!;
    const d2s = d2.div(k);
    return d2s.sub(d1).isZero() ? { kind: "same" } : { kind: "parallel", dist: rcap(rdiv(d2s.sub(d1).abs(), lenOf(N1))) };
  }
  const z = [0, 1, 2].find((i) => !dir[i].isZero())!;
  const [i, j] = [0, 1, 2].filter((q) => q !== z);
  const det = N1[i].mul(N2[j]).sub(N1[j].mul(N2[i]));
  const A: FracV = [F(0), F(0), F(0)];
  A[i] = d1.mul(N2[j]).sub(d2.mul(N1[j])).div(det);
  A[j] = N1[i].mul(d2).sub(N2[i].mul(d1)).div(det);
  const cos = rdiv(vdot(N1, N2).abs(), rmul(lenOf(N1), lenOf(N2)));
  return { kind: "meet", point: nv(A), dir: nv(dir), line: `r = ${vecPlain(A)} + t${vecPlain(dir)}`, angle: angleTex(rnum(cos)).plain, cos: rplain(cos) };
}

// ---- the picture's geometry ------------------------------------------------------------------------------------------

/** The point of the line a + t·d nearest q. */
export const nearestOn = (a: V3, d: V3, q: V3): V3 => add(a, scale(d, dot(sub(q, a), d) / (dot(d, d) || 1)));

/** Where the line a + t·d is inside the ball of radius r round the origin: its two ends, or null when it misses. */
export function clipLine(a: V3, d: V3, r: number): [V3, V3] | null {
  const [p, q, c] = [dot(d, d), dot(a, d), dot(a, a) - r * r];
  const disc = q * q - p * c;
  if (p < 1e-12 || disc <= 1e-12) return null;
  const root = Math.sqrt(disc);
  return [add(a, scale(d, (-q - root) / p)), add(a, scale(d, (-q + root) / p))];
}

/** Two directions across the plane with normal n, at right angles to each other. */
export function planeAxes(n: V3): [V3, V3] {
  const u = unit(n);
  const least = [0, 1, 2].reduce((b, i) => (Math.abs(u[i]) < Math.abs(u[b]) ? i : b), 0);
  const e: V3 = [0, 0, 0];
  e[least] = 1;
  const e1 = unit(cross(u, e));
  return [e1, cross(u, e1)];
}

/** A square of the plane with normal n round c, half as wide as `half`. */
export function planePatch(n: V3, c: V3, half: number): V3[] {
  const [e1, e2] = planeAxes(n);
  return [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([u, v]) => add(c, add(scale(e1, u * half), scale(e2, v * half))));
}

/** An arc of radius r round c from the way u to the way v (both from c), as points; none when they are parallel. */
export function arc(c: V3, u: V3, v: V3, r: number, n = 24): V3[] {
  const a = unit(u);
  const w0 = sub(unit(v), scale(a, dot(a, unit(v))));
  if (len(w0) < 1e-9) return [];
  const w = unit(w0);
  const theta = Math.acos(clamp(dot(a, unit(v)), -1, 1));
  return Array.from({ length: n + 1 }, (_, k) => {
    const t = (theta * k) / n;
    return add(c, add(scale(a, r * Math.cos(t)), scale(w, r * Math.sin(t))));
  });
}

// ---- the handles ---------------------------------------------------------------------------------------------------

/** A point the hand moves: its name, where it is, and the piece as it is with the point moved there (null when that
 * would make a vector, direction or normal zero). */
export type SpaceHandle = { id: string; name: string; at: V3; color: "blue" | "red" | "orange" | "green" | "ink"; to: (p: V3) => LiveSpace | null };

export function handlesOf(s: LiveSpace): SpaceHandle[] {
  const O: V3 = [0, 0, 0];
  /** A vector's tip: from `base`, never at it. */
  const tip = (id: string, name: string, base: V3, v: V3, color: SpaceHandle["color"], put: (v: V3) => LiveSpace): SpaceHandle =>
    ({ id, name, at: add(base, v), color, to: (p) => (same(p, base) ? null : put(sub(p, base))) });
  switch (s.mode) {
    case "vector":
      return [tip("a", "a", O, s.vec.a, "blue", (a) => ({ ...s, vec: { a } }))];
    case "dot":
      return [
        tip("a", "a", O, s.dot.a, "blue", (a) => ({ ...s, dot: { ...s.dot, a } })),
        tip("b", "b", O, s.dot.b, "red", (b) => ({ ...s, dot: { ...s.dot, b } })),
      ];
    case "cross": {
      const x = s.cross;
      const put = (patch: Partial<LiveSpace["cross"]>) => ({ ...s, cross: { ...x, ...patch } });
      if (x.with === "pair" || x.with === "box") {
        const out = [tip("a", "a", O, x.a, "blue", (a) => put({ a })), tip("b", "b", O, x.b, "red", (b) => put({ b }))];
        if (x.with === "box") out.push(tip("c", "c", O, x.c, "orange", (c) => put({ c })));
        return out;
      }
      // Corners: A moves alone, the others staying where they are.
      const corners: SpaceHandle[] = [
        {
          id: "A", name: "A", at: x.o, color: "ink", to: (p) => {
            const [a, b, c] = [add(x.o, x.a), add(x.o, x.b), add(x.o, x.c)].map((q) => sub(q, p));
            return isZero3(a) || isZero3(b) || (x.with === "tetra" && isZero3(c)) ? null : put({ o: p, a, b, c });
          },
        },
        tip("B", "B", x.o, x.a, "blue", (a) => put({ a })),
        tip("C", "C", x.o, x.b, "red", (b) => put({ b })),
      ];
      if (x.with === "tetra") corners.push(tip("D", "D", x.o, x.c, "orange", (c) => put({ c })));
      return corners;
    }
    case "lines": {
      const l = s.lines;
      const put = (patch: Partial<LiveSpace["lines"]>) => ({ ...s, lines: { ...l, ...patch } });
      const out: SpaceHandle[] = [
        { id: "A1", name: l.with === "two" ? "A₁" : "A", at: l.a1, color: "blue", to: (p) => put({ a1: p }) },
        tip("d1", l.with === "two" ? "d₁" : "d", l.a1, l.d1, "blue", (d1) => put({ d1 })),
      ];
      if (l.with === "point") out.push({ id: "P", name: "P", at: l.p, color: "green", to: (p) => put({ p }) });
      if (l.with === "two") {
        out.push({ id: "A2", name: "A₂", at: l.a2, color: "red", to: (p) => put({ a2: p }) });
        out.push(tip("d2", "d₂", l.a2, l.d2, "red", (d2) => put({ d2 })));
      }
      return out;
    }
    case "planes": {
      const q = s.planes;
      const put = (patch: Partial<LiveSpace["planes"]>) => ({ ...s, planes: { ...q, ...patch } });
      const two = q.with === "two";
      const out: SpaceHandle[] = [
        { id: "A", name: "A", at: q.a, color: "blue", to: (p) => put({ a: p }) },
        tip("n", two ? "n₁" : "n", q.a, q.n, "blue", (n) => put({ n })),
      ];
      if (q.with === "point") out.push({ id: "P", name: "P", at: q.p, color: "green", to: (p) => put({ p }) });
      if (q.with === "line") {
        out.push({ id: "L", name: "L", at: q.la, color: "red", to: (p) => put({ la: p }) });
        out.push(tip("ld", "d", q.la, q.ld, "red", (ld) => put({ ld })));
      }
      if (two) {
        out.push({ id: "B", name: "B", at: q.b, color: "orange", to: (p) => put({ b: p }) });
        out.push(tip("m", "n₂", q.b, q.m, "orange", (m) => put({ m })));
      }
      return out;
    }
  }
}

// ---- the tool's examples -------------------------------------------------------------------------------------------

/** One of the Vectors tool's examples, opened as a scene: its label in the tool and the piece set to it. */
export type SpaceExample = { label: string; to: (s: LiveSpace) => LiveSpace };

/** An example opens turned to the starting view, or (a flat one) seen straight down z. */
const ex = (label: string, to: (s: LiveSpace) => LiveSpace, flat = false): SpaceExample =>
  ({ label, to: (s) => ({ ...to(s), ...(flat ? LOOK.z : { yaw: SPACE_START.yaw, pitch: SPACE_START.pitch }) }) });
const P = VEC_PRESETS;
const crossAs = (s: LiveSpace, c: Partial<LiveSpace["cross"]>): LiveSpace => ({ ...s, cross: { ...s.cross, o: [0, 0, 0], ...c } });
/** Corners A, B, C (and D) as the corner A and the sides from it. */
const corners = (s: LiveSpace, w: CrossWith, A: V3, B: V3, C: V3, D: V3 = s.cross.c): LiveSpace =>
  ({ ...s, cross: { with: w, o: A, a: sub(B, A), b: sub(C, A), c: w === "tetra" ? sub(D, A) : s.cross.c } });
const lines = (s: LiveSpace, l: Partial<LiveSpace["lines"]>): LiveSpace => ({ ...s, lines: { ...s.lines, ...l } });
const planes = (s: LiveSpace, q: Partial<LiveSpace["planes"]>): LiveSpace => ({ ...s, planes: { ...s.planes, ...q } });

/** The tool's examples for each mode (its 3D ones; its 2D lines lie in z = 0, seen straight down z). Planes given by
 * an equation are held by a whole point of them: 2x − y + 2z = 6 through (1, 0, 2), x + y + z = 6 through (2, 2, 2). */
export const SPACE_EXAMPLES: Record<SpaceMode, SpaceExample[]> = {
  vector: [
    ex(P.basics[3].label, (s) => ({ ...s, vec: { a: [2, -1, 2] } })),
    ex(P.basics[4].label, (s) => ({ ...s, vec: { a: [3, -2, 6] } })),
  ],
  dot: [
    ex(P.dot[1].label, (s) => ({ ...s, dot: { a: [1, 2, 2], b: [2, -1, 2] } })),
    ex(P.dot[2].label, (s) => ({ ...s, dot: { a: [2, 1, -1], b: [1, 1, 3] } })),
    ex(P.dot[3].label, (s) => ({ ...s, dot: { a: [1, 1, 0], b: [0, 1, 1] } })),
    // ∠ABC: the vectors from B to A and to C.
    ex(P.dot[4].label, (s) => ({ ...s, dot: { a: [-1, -1, 2], b: [2, -2, 1] } })),
  ],
  cross: [
    ex(P.cross[0].label, (s) => crossAs(s, { with: "pair", a: [1, 2, 3], b: [4, 5, 6] })),
    ex(P.cross[1].label, (s) => crossAs(s, { with: "pair", a: [2, -1, 1], b: [1, 3, -2] })),
    ex(P.cross[2].label, (s) => corners(s, "triangle", [1, 0, 0], [0, 2, 0], [0, 0, 3])),
    ex(P.cross[3].label, (s) => crossAs(s, { with: "box", a: [1, 2, 0], b: [0, 1, 3], c: [2, 0, 1] })),
    ex(P.cross[4].label, (s) => corners(s, "tetra", [0, 0, 0], [2, 0, 0], [0, 3, 0], [1, 1, 4])),
  ],
  lines: [
    ex(P.lines[0].label, (s) => lines(s, { with: "one", a1: [1, 2, 3], d1: [2, -1, 1] })),
    ex(P.lines[1].label, (s) => lines(s, { with: "point", a1: [1, 0, 2], d1: [2, -1, 1], p: [4, 3, 1] })),
    ex(P.lines[2].label, (s) => lines(s, { with: "two", a1: [1, 2, 0], d1: [1, -1, 2], a2: [2, 4, 1], d2: [0, 3, -1] })),
    ex(P.lines[3].label, (s) => lines(s, { with: "two", a1: [1, 0, 0], d1: [1, 1, 0], a2: [0, 1, 2], d2: [1, 0, 1] })),
    ex(P.lines[4].label, (s) => lines(s, { with: "one", a1: [1, -1, 0], d1: [2, 3, 1] })),
    ex(P.lines[5].label, (s) => lines(s, { with: "point", a1: [1, 2, 0], d1: [3, 1, 0], p: [2, 6, 0] }), true),
    ex(P.lines[6].label, (s) => lines(s, { with: "two", a1: [0, 1, 0], d1: [2, 1, 0], a2: [5, 0, 0], d2: [-1, 2, 0] }), true),
  ],
  planes: [
    ex(P.planes[0].label, (s) => planes(s, { with: "point", a: [1, 0, 2], n: [2, -1, 2], p: [4, 1, 5] })),
    // Through A(1, 0, 0), B(0, 2, 0), C(0, 0, 3): n = AB × AC = (6, 3, 2).
    ex(P.planes[1].label, (s) => planes(s, { with: "one", a: [1, 0, 0], n: [6, 3, 2] })),
    ex(P.planes[2].label, (s) => planes(s, { with: "one", a: [1, 2, -1], n: [3, 1, 2] })),
    ex(P.planes[3].label, (s) => planes(s, { with: "line", a: [2, 2, 2], n: [1, 1, 1], la: [1, 0, 0], ld: [1, 2, 3] })),
    ex(P.planes[4].label, (s) => planes(s, { with: "two", a: [2, 2, 2], n: [1, 1, 1], b: [1, 0, 1], m: [2, -1, 1] })),
    // r = (1, 1, 0) + λ(1, 0, 2) + μ(0, 1, −1): n = (1, 0, 2) × (0, 1, −1) = (−2, 1, 1).
    ex(P.planes[5].label, (s) => planes(s, { with: "one", a: [1, 1, 0], n: [-2, 1, 1] })),
  ],
};

/** A whole-number point inside the box, for keys that step past its side. */
export const clampPoint = (p: V3): V3 => p.map((x) => clamp(x, -LIM, LIM)) as V3;
