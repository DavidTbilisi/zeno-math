// 3D model specs and their formula captions. No three.js imports here so the
// board page can reference these types without pulling three.js into its bundle.

export type View = { azimuth: number; polar: number; zoom: number };
export const DEFAULT_VIEW: View = { azimuth: Math.PI / 5, polar: 1.1, zoom: 1 };

export type SolidShape = "cuboid" | "prism" | "pyramid" | "cylinder" | "cone" | "sphere";
export const SOLID_SHAPES: SolidShape[] = ["cuboid", "prism", "pyramid", "cylinder", "cone", "sphere"];

/**
 * Dimensions by shape — cuboid: a length, b width, c height; prism: a base side, c height, `sides`-gon base;
 * pyramid: a base side, c height;
 * cylinder/cone: a radius, c height; sphere: a radius.
 */
export type SolidSpec = {
  type: "solid";
  shape: SolidShape;
  a: number;
  b: number;
  c: number;
  sides?: number; // prism: sides of the regular base polygon (3–8), default 3
  unit: string;
  unfold: number; // 0 = closed, 1 = flat net (cuboid & pyramid only)
  seeThrough: boolean;
  labels: boolean;
  formulas: boolean;
  view?: View;
};

export type CubesSpec = {
  type: "cubes";
  mode: "cuboid" | "stacks";
  a: number; // cuboid mode: cubes along length
  b: number; // … width
  c: number; // … height
  heights: number[][]; // stacks mode: [row][col] stack heights
  formulas: boolean;
  view?: View;
};

/** A 3×3 matrix acting on space (math axes: x right, y back, z up). */
export type Transform3DSpec = {
  type: "transform3d";
  m: number[]; // 9 entries, row-major
  t: number; // 0 = identity, 1 = full transformation
  grid: boolean;
  formulas: boolean;
  view?: View;
};

export type Spec3D = SolidSpec | CubesSpec | Transform3DSpec;

export const DEFAULT_TRANSFORM3D: Transform3DSpec = {
  type: "transform3d",
  m: [2, 1, 0, 0, 1, 1, 1, 0, 1],
  t: 1,
  grid: true,
  formulas: true,
};

export const TRANSFORM3D_PRESETS: { key: string; m: number[] }[] = [
  { key: "identity", m: [1, 0, 0, 0, 1, 0, 0, 0, 1] },
  { key: "scale", m: [2, 0, 0, 0, 2, 0, 0, 0, 2] },
  { key: "stretchZ", m: [1, 0, 0, 0, 1, 0, 0, 0, 2] },
  { key: "rotateZ", m: [0, -1, 0, 1, 0, 0, 0, 0, 1] },
  { key: "shear", m: [1, 0, 1, 0, 1, 0, 0, 0, 1] },
  { key: "reflect", m: [1, 0, 0, 0, 1, 0, 0, 0, -1] },
  { key: "project", m: [1, 0, 0, 0, 1, 0, 0, 0, 0] },
  { key: "mixed", m: [2, 1, 0, 0, 1, 1, 1, 0, 1] },
];

/** The matrix at animation time t: (1 − t)·I + t·M. */
export function interpolated(spec: Transform3DSpec): number[] {
  const t = Math.min(1, Math.max(0, spec.t));
  return spec.m.map((v, i) => (i % 4 === 0 ? 1 + (v - 1) * t : v * t));
}

export function det3(m: number[]): number {
  const [a, b, c, d, e, f, g, h, i] = m;
  return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
}

export const SOLID_DEFAULT_DIMS: Record<SolidShape, { a: number; b: number; c: number }> = {
  cuboid: { a: 4, b: 3, c: 2 },
  prism: { a: 3, b: 3, c: 4 },
  pyramid: { a: 4, b: 4, c: 3 },
  cylinder: { a: 2, b: 2, c: 4 },
  cone: { a: 2, b: 2, c: 4 },
  sphere: { a: 2, b: 2, c: 2 },
};

export const DEFAULT_SOLID: SolidSpec = {
  type: "solid",
  shape: "cuboid",
  ...SOLID_DEFAULT_DIMS.cuboid,
  unit: "cm",
  unfold: 0,
  seeThrough: false,
  labels: true,
  formulas: true,
};

export const DEFAULT_CUBES: CubesSpec = {
  type: "cubes",
  mode: "cuboid",
  a: 4,
  b: 3,
  c: 2,
  heights: [
    [3, 2, 1],
    [2, 1, 0],
    [1, 0, 0],
  ],
  formulas: true,
};

export const canUnfold = (s: SolidShape) => s === "cuboid" || s === "prism" || s === "pyramid" || s === "cylinder" || s === "cone";

/** Stack heights for the current cubes spec (cuboid mode expands to a full grid). */
export function cubeHeights(spec: CubesSpec): number[][] {
  return spec.mode === "cuboid" ? Array.from({ length: spec.b }, () => Array<number>(spec.a).fill(spec.c)) : spec.heights;
}

const fmt = (v: number) => String(Math.round(v * 100) / 100);

export function captionLines(spec: Spec3D, cubesWord: string): string[] {
  if (spec.type === "transform3d") {
    const d = det3(interpolated(spec));
    const f = (v: number) => fmt(v).replace("-", "−");
    return [`det M = ${f(d)}`, `V = |det M| = ${fmt(Math.abs(d))}`];
  }
  if (spec.type === "cubes") {
    const n = cubeHeights(spec).flat().reduce((s, h) => s + h, 0);
    return spec.mode === "cuboid"
      ? [`V = ${spec.a} × ${spec.b} × ${spec.c} = ${n} ${cubesWord}`]
      : [`V = ${n} ${cubesWord}`];
  }
  const { a, b, c } = spec;
  const u = spec.unit.trim();
  const u2 = u ? ` ${u}²` : "";
  const u3 = u ? ` ${u}³` : "";
  const PI = Math.PI;
  switch (spec.shape) {
    case "cuboid":
      return [
        `V = ${fmt(a)} × ${fmt(b)} × ${fmt(c)} = ${fmt(a * b * c)}${u3}`,
        `S = 2(ab + bc + ca) = ${fmt(2 * (a * b + b * c + c * a))}${u2}`,
      ];
    case "prism": {
      const n = spec.sides ?? 3;
      const base = (n * a * a) / (4 * Math.tan(Math.PI / n)); // regular n-gon area
      return [
        `B ≈ ${fmt(base)}${u2}`,
        `V = B × h ≈ ${fmt(base)} × ${fmt(c)} ≈ ${fmt(base * c)}${u3}`,
        `S = 2B + ${n}·a·h ≈ ${fmt(2 * base + n * a * c)}${u2}`,
      ];
    }
    case "pyramid": {
      const slant = Math.hypot(c, a / 2);
      return [`V = ⅓ × ${fmt(a)}² × ${fmt(c)} = ${fmt((a * a * c) / 3)}${u3}`, `S = a² + 2·a·l ≈ ${fmt(a * a + 2 * a * slant)}${u2}`];
    }
    case "cylinder":
      return [`V = π × ${fmt(a)}² × ${fmt(c)} ≈ ${fmt(PI * a * a * c)}${u3}`, `S = 2πr² + 2πrh ≈ ${fmt(2 * PI * a * a + 2 * PI * a * c)}${u2}`];
    case "cone": {
      const l = Math.hypot(a, c);
      return [
        `l = √(r² + h²) ≈ ${fmt(l)}${u ? " " + u : ""}`,
        `V = ⅓ × π × ${fmt(a)}² × ${fmt(c)} ≈ ${fmt((PI * a * a * c) / 3)}${u3}`,
        `S = πr² + πrl ≈ ${fmt(PI * a * a + PI * a * l)}${u2}`,
        `θ = 360° · r / l ≈ ${fmt((360 * a) / l)}°`,
      ];
    }
    case "sphere":
      return [`V = ⁴⁄₃ × π × ${fmt(a)}³ ≈ ${fmt((4 / 3) * PI * a ** 3)}${u3}`, `S = 4πr² ≈ ${fmt(4 * PI * a * a)}${u2}`];
  }
}
