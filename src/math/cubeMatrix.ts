// A 3×3 matrix worked by hand (#567): the unit cube is carried to the solid the matrix makes of it, its three edges
// from the origin being the matrix's columns. A column's tip is dragged and the cube shears with it; its volume is
// |det M|, flattening it takes det M to 0, and pushing a column through the plane of the other two turns the cube
// inside out as the sign flips. A slider runs from I to M. Pure geometry here; the piece draws it (src/live/CubeMatrix.tsx).
import { cross, type V3 } from "./solid";

export type LiveCubeMatrix = {
  /** Row-major: column j (where the j-th unit vector lands) is m[j], m[3 + j], m[6 + j]. Whole numbers. */
  m: number[];
  /** 0 = the identity, 100 = the whole of M. */
  t: number;
  yaw: number;
  pitch: number;
};

export const ENTRY: readonly [number, number] = [-3, 3];
export const CUBE_MATRIX_START: LiveCubeMatrix = { m: [2, 1, 0, 0, 1, 1, 1, 0, 1], t: 100, yaw: 30, pitch: 20 };

/** The 3D tool's examples, kept. */
export const CUBE_PRESETS = [
  { key: "identity", m: [1, 0, 0, 0, 1, 0, 0, 0, 1] },
  { key: "scale", m: [2, 0, 0, 0, 2, 0, 0, 0, 2] },
  { key: "stretchZ", m: [1, 0, 0, 0, 1, 0, 0, 0, 2] },
  { key: "rotateZ", m: [0, -1, 0, 1, 0, 0, 0, 0, 1] },
  { key: "shear", m: [1, 0, 1, 0, 1, 0, 0, 0, 1] },
  { key: "reflect", m: [1, 0, 0, 0, 1, 0, 0, 0, -1] },
  { key: "project", m: [1, 0, 0, 0, 1, 0, 0, 0, 0] },
  { key: "mixed", m: [2, 1, 0, 0, 1, 1, 1, 0, 1] },
] as const;
export type CubePreset = (typeof CUBE_PRESETS)[number]["key"];

/** The matrix part of the way from I to M: (1 − t)·I + t·M. */
export function between(m: readonly number[], t: number): number[] {
  const k = Math.min(1, Math.max(0, t / 100));
  return m.map((v, i) => (i % 4 === 0 ? 1 + (v - 1) * k : v * k));
}

export function det3(m: readonly number[]): number {
  const [a, b, c, d, e, f, g, h, i] = m;
  return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
}

export const column = (m: readonly number[], j: number): V3 => [m[j], m[3 + j], m[6 + j]];
export const apply = (m: readonly number[], p: V3): V3 => [
  m[0] * p[0] + m[1] * p[1] + m[2] * p[2],
  m[3] * p[0] + m[4] * p[1] + m[5] * p[2],
  m[6] * p[0] + m[7] * p[1] + m[8] * p[2],
];

/** A column set to a new tip (whole numbers, kept in range). */
export function setColumn(m: readonly number[], j: number, tip: V3): number[] {
  const out = [...m];
  for (let r = 0; r < 3; r++) out[3 * r + j] = Math.max(ENTRY[0], Math.min(ENTRY[1], Math.round(tip[r])));
  return out;
}

export function setEntry(m: readonly number[], i: number, v: number): number[] {
  const out = [...m];
  out[i] = Math.max(ENTRY[0], Math.min(ENTRY[1], Math.round(v)));
  return out;
}

/** The unit cube's corners, and its six faces as corner indices, each going round anticlockwise seen from outside. */
const CORNERS: V3[] = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
const FACES = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 4, 7, 3]];

export type CubeFace = { pts: V3[]; n: V3 };

/** The image of the unit cube under m: six faces, each with the way out (which turns in when det < 0). */
export function cubeImage(m: readonly number[]): CubeFace[] {
  const pts = CORNERS.map((p) => apply(m, p));
  return FACES.map((f) => {
    const q = f.map((i) => pts[i]);
    const n = cross([q[1][0] - q[0][0], q[1][1] - q[0][1], q[1][2] - q[0][2]], [q[3][0] - q[0][0], q[3][1] - q[0][1], q[3][2] - q[0][2]]);
    return { pts: q, n };
  });
}

/** The determinant worked along the top row, with the numbers in. */
export function detWorking(m: readonly number[]): string {
  const [a, b, c, d, e, f, g, h, i] = m;
  const sg = (v: number) => (v < 0 ? `(−${-v})` : `${v}`);
  const D = det3(m);
  return `det M = ${sg(a)}·${sg(e * i - f * h)} − ${sg(b)}·${sg(d * i - f * g)} + ${sg(c)}·${sg(d * h - e * g)} = ${D < 0 ? `−${-D}` : D}`;
}

/** What det M says about the cube: bigger, flattened, or turned inside out. */
export type DetSays = "flat" | "flipped" | "same" | "grown";
export function detSays(m: readonly number[]): DetSays {
  const D = det3(m);
  if (Math.abs(D) < 1e-9) return "flat";
  if (D < 0) return "flipped";
  return Math.abs(D - 1) < 1e-9 ? "same" : "grown";
}
