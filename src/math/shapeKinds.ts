// Shapes by their properties: polygons built from their kind (a square, a kite, a triangle from its angles), the
// marks that show what is true of them worked out from the points themselves (ticks on equal sides, arrows on
// parallel ones, a small square in a right angle), the names a quadrilateral earns, and pictures of solids, angles
// and pairs of lines. Used by the shapeKinds practice skill and the shape-sorting piece.
import { C } from "./chart";
import type { Rng } from "./practiceTypes";

export type Pt = [number, number];
export type QuadKind = "square" | "rectangle" | "rhombus" | "parallelogram" | "trapezium" | "kite" | "quadrilateral";
export type TriKind = "equilateral" | "isosceles" | "scalene" | "right" | "acute" | "obtuse";
export type SolidKind = "cube" | "cuboid" | "cylinder" | "cone" | "sphere" | "pyramid" | "prism";
/** The names a quadrilateral can earn, the widest first. */
export const QUAD_NAMES = ["quadrilateral", "parallelogram", "rectangle", "rhombus", "square"] as const;
export type QuadName = (typeof QUAD_NAMES)[number];

type Rand = Pick<Rng, "int" | "next" | "pick">;
const rad = (d: number) => (d * Math.PI) / 180;
const EPS = 1e-6;

/** Turned by `deg` about the origin. */
export const turn = (pts: Pt[], deg: number): Pt[] => pts.map(([x, y]) => [x * Math.cos(rad(deg)) - y * Math.sin(rad(deg)), x * Math.sin(rad(deg)) + y * Math.cos(rad(deg))]);

/** A quadrilateral of the kind asked, in proportions that do not make it a more special one by chance. */
export function quad(kind: QuadKind, r: Rand): Pt[] {
  const a = rad(r.int(55, 72));
  switch (kind) {
    case "square":
      return [[0, 0], [1, 0], [1, 1], [0, 1]];
    case "rectangle": {
      const h = r.int(45, 72) / 100;
      return [[0, 0], [1, 0], [1, h], [0, h]];
    }
    case "rhombus":
      return [[0, 0], [1, 0], [1 + Math.cos(a), Math.sin(a)], [Math.cos(a), Math.sin(a)]];
    case "parallelogram": {
      const s = r.int(55, 80) / 100;
      return [[0, 0], [1, 0], [1 + s * Math.cos(a), s * Math.sin(a)], [s * Math.cos(a), s * Math.sin(a)]];
    }
    case "trapezium": {
      const [top, left, h] = [r.int(40, 62) / 100, r.int(8, 30) / 100, r.int(48, 68) / 100];
      return [[0, 0], [1, 0], [left + top, h], [left, h]];
    }
    case "kite": {
      const [up, down, half] = [r.int(28, 40) / 100, r.int(75, 100) / 100, r.int(40, 52) / 100];
      return [[0, -up], [half, 0], [0, down], [-half, 0]];
    }
    case "quadrilateral":
      for (;;) {
        const p: Pt[] = [[r.int(0, 15) / 100, r.int(0, 15) / 100], [r.int(80, 105) / 100, r.int(-5, 20) / 100], [r.int(85, 110) / 100, r.int(60, 90) / 100], [r.int(-10, 20) / 100, r.int(55, 80) / 100]];
        if (quadNames(p).length === 1 && marks(p).equal.length === 0 && convex(p)) return p;
      }
  }
}

/** A triangle with angles A at the first corner and B at the second (whole degrees), its base along the bottom. */
export function triangleOf(A: number, B: number): Pt[] {
  const C3 = 180 - A - B;
  // Law of sines: the side from the first corner to the apex is sin B / sin C of the base.
  const s = Math.sin(rad(B)) / Math.sin(rad(C3));
  return [[0, 0], [1, 0], [s * Math.cos(rad(A)), s * Math.sin(rad(A))]];
}

/** The angles of a triangle of the kind asked (whole degrees, A, B and the third). */
export function triangleAngles(kind: TriKind, r: Rand): [number, number, number] {
  const third = (a: number, b: number): [number, number, number] => [a, b, 180 - a - b];
  const distinct = (t: number[]) => new Set(t).size === 3;
  switch (kind) {
    case "equilateral":
      return [60, 60, 60];
    case "isosceles": {
      const base = r.pick([r.int(35, 54), r.int(66, 78)]);
      return third(base, base);
    }
    case "right":
      for (;;) {
        const a = r.int(25, 65);
        if (a !== 45) return third(90, a);
      }
    case "obtuse":
      for (;;) {
        const big = r.int(105, 135);
        const a = r.int(15, 180 - big - 15);
        const t = third(big, a);
        if (distinct(t)) return t;
      }
    case "acute":
    case "scalene":
      for (;;) {
        const t = third(r.int(40, 80), r.int(40, 80));
        // Every angle well short of a right angle, all three different.
        if (t[2] >= 35 && t[2] <= 80 && distinct(t) && Math.min(Math.abs(t[0] - t[1]), Math.abs(t[1] - t[2]), Math.abs(t[0] - t[2])) >= 6) return t;
      }
  }
}

/** A polygon of n sides: regular, or (irregular) with corners pushed in and out so no two sides match. */
export function polygon(n: number, r: Rand, irregular = false): Pt[] {
  for (;;) {
    const pts: Pt[] = Array.from({ length: n }, (_, i) => {
      const t = rad(-90 + (360 * i) / n + (irregular ? r.int(-12, 12) : 0));
      const k = irregular ? r.int(75, 100) / 100 : 1;
      return [k * Math.cos(t), k * Math.sin(t)];
    });
    if (!irregular || convex(pts)) return pts;
  }
}

/** True when every turn goes the same way. */
export function convex(pts: Pt[]): boolean {
  const n = pts.length;
  const signs = pts.map((p, i) => {
    const [q, s] = [pts[(i + 1) % n], pts[(i + 2) % n]];
    return Math.sign((q[0] - p[0]) * (s[1] - q[1]) - (q[1] - p[1]) * (s[0] - q[0]));
  });
  return signs.every((s) => s === signs[0]);
}

const len = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const sides = (pts: Pt[]) => pts.map((p, i) => [p, pts[(i + 1) % pts.length]] as [Pt, Pt]);

/** The interior angle at each corner, in degrees. */
export function anglesOf(pts: Pt[]): number[] {
  const n = pts.length;
  return pts.map((p, i) => {
    const [a, b] = [pts[(i + n - 1) % n], pts[(i + 1) % n]];
    const u = [a[0] - p[0], a[1] - p[1]];
    const v = [b[0] - p[0], b[1] - p[1]];
    return (Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1]))))) * 180) / Math.PI;
  });
}

/**
 * What is true of a polygon, worked out from its points: groups of sides of equal length (as side indexes, only
 * groups of two or more), pairs of parallel sides, and the corners that are right angles.
 */
export function marks(pts: Pt[]): { equal: number[][]; parallel: [number, number][]; right: number[] } {
  const ss = sides(pts);
  const ls = ss.map(([a, b]) => len(a, b));
  const equal: number[][] = [];
  ls.forEach((l, i) => {
    const g = equal.find((grp) => Math.abs(ls[grp[0]] - l) < EPS * 10);
    if (g) g.push(i);
    else equal.push([i]);
  });
  const parallel: [number, number][] = [];
  for (let i = 0; i < ss.length; i++)
    for (let j = i + 1; j < ss.length; j++) {
      const [[a, b], [c, d]] = [ss[i], ss[j]];
      const cross = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]);
      if (Math.abs(cross) < EPS * 10 * ls[i] * ls[j]) parallel.push([i, j]);
    }
  const right = anglesOf(pts).flatMap((t, i) => (Math.abs(t - 90) < 1e-4 ? [i] : []));
  return { equal: equal.filter((g) => g.length > 1), parallel, right };
}

/** Every name in QUAD_NAMES that fits a quadrilateral (a square earns all five). */
export function quadNames(pts: Pt[]): QuadName[] {
  const m = marks(pts);
  const pairs = m.parallel.length;
  const allEqual = m.equal.some((g) => g.length === 4);
  const fours = m.right.length === 4;
  const out: QuadName[] = ["quadrilateral"];
  if (pairs >= 2) out.push("parallelogram");
  if (fours) out.push("rectangle");
  if (allEqual) out.push("rhombus");
  if (fours && allEqual) out.push("square");
  return out;
}

export type Drawn = { body: string; w: number; h: number };

/** Points fitted into a box w × h with room `pad` around, y pointing down. */
function fit(pts: Pt[], w: number, h: number, pad: number): Pt[] {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => -p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const k = Math.min((w - 2 * pad) / Math.max(x1 - x0, EPS), (h - 2 * pad) / Math.max(y1 - y0, EPS));
  const [ox, oy] = [(w - k * (x1 - x0)) / 2, (h - k * (y1 - y0)) / 2];
  return pts.map(([x, y]) => [ox + k * (x - x0), oy + k * (-y - y0)]);
}
const f1 = (v: number) => Math.round(v * 10) / 10;
const text = (x: number, y: number, s: string, o: { size?: number; color?: string; anchor?: string } = {}) =>
  `<text x="${f1(x)}" y="${f1(y)}" font-size="${o.size ?? 15}" text-anchor="${o.anchor ?? "middle"}" fill="${o.color ?? C.ink}" font-family="Helvetica, Arial, 'Noto Sans Georgian', sans-serif">${s}</text>`;

/**
 * A polygon drawn with what is true of it: ticks on equal sides, arrows on parallel ones, squares in right angles
 * (`marked`); or with a label beside each side (`sideLabels`, outside the shape) or in each corner (`angleLabels`).
 */
export function polySvg(pts: Pt[], o: { w?: number; h?: number; marked?: boolean; sideLabels?: string[]; angleLabels?: string[]; fill?: string; pad?: number } = {}): Drawn {
  const [W, H] = [o.w ?? 240, o.h ?? 170];
  const P = fit(pts, W, H, o.pad ?? (o.sideLabels || o.angleLabels ? 30 : 16));
  const n = P.length;
  const out: string[] = [`<polygon points="${P.map((p) => p.map(f1).join(",")).join(" ")}" fill="${o.fill ?? "#e7f5ff"}" stroke="${C.blue}" stroke-width="2.5" stroke-linejoin="round"/>`];
  const cx = P.reduce((s, p) => s + p[0], 0) / n;
  const cy = P.reduce((s, p) => s + p[1], 0) / n;
  if (o.marked) {
    const m = marks(pts);
    m.equal.forEach((g, gi) =>
      g.forEach((i) => {
        const [a, b] = [P[i], P[(i + 1) % n]];
        const [mx, my] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const l = len(a, b);
        const [ux, uy] = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
        for (let t = 0; t <= gi; t++) {
          const off = (t - gi / 2) * 6;
          const [px, py] = [mx + ux * off, my + uy * off];
          out.push(`<line x1="${f1(px - uy * 7)}" y1="${f1(py + ux * 7)}" x2="${f1(px + uy * 7)}" y2="${f1(py - ux * 7)}" stroke="${C.ink}" stroke-width="2"/>`);
        }
      }),
    );
    m.parallel.forEach((pair, pi) =>
      pair.forEach((i) => {
        const [a, b] = [P[i], P[(i + 1) % n]];
        const l = len(a, b);
        // Both arrows of a pair point the same way.
        const dir = pair[0] === i ? 1 : -1;
        const [ux, uy] = [((b[0] - a[0]) / l) * dir, ((b[1] - a[1]) / l) * dir];
        const [mx, my] = [a[0] + (b[0] - a[0]) * 0.3, a[1] + (b[1] - a[1]) * 0.3];
        for (let t = 0; t <= pi; t++) {
          const [px, py] = [mx + ux * t * 7, my + uy * t * 7];
          out.push(`<path d="M${f1(px - ux * 6 - uy * 5)},${f1(py - uy * 6 + ux * 5)} L${f1(px)},${f1(py)} L${f1(px - ux * 6 + uy * 5)},${f1(py - uy * 6 - ux * 5)}" fill="none" stroke="${C.orange}" stroke-width="2"/>`);
        }
      }),
    );
    for (const i of m.right) {
      const [p, a, b] = [P[i], P[(i + n - 1) % n], P[(i + 1) % n]];
      const u = [(a[0] - p[0]) / len(p, a), (a[1] - p[1]) / len(p, a)];
      const v = [(b[0] - p[0]) / len(p, b), (b[1] - p[1]) / len(p, b)];
      const s = 12;
      out.push(`<path d="M${f1(p[0] + u[0] * s)},${f1(p[1] + u[1] * s)} L${f1(p[0] + (u[0] + v[0]) * s)},${f1(p[1] + (u[1] + v[1]) * s)} L${f1(p[0] + v[0] * s)},${f1(p[1] + v[1] * s)}" fill="none" stroke="${C.ink}" stroke-width="1.6"/>`);
    }
  }
  o.sideLabels?.forEach((s, i) => {
    const [a, b] = [P[i], P[(i + 1) % n]];
    const [mx, my] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const d = Math.hypot(mx - cx, my - cy) || 1;
    out.push(text(mx + ((mx - cx) / d) * 16, my + ((my - cy) / d) * 16 + 5, s));
  });
  const corner = anglesOf(P);
  o.angleLabels?.forEach((s, i) => {
    const [p, a, b] = [P[i], P[(i + n - 1) % n], P[(i + 1) % n]];
    // Along the bisector, further in where the corner is narrow, so the label clears both arms.
    const u = [(a[0] - p[0]) / len(p, a) + (b[0] - p[0]) / len(p, b), (a[1] - p[1]) / len(p, a) + (b[1] - p[1]) / len(p, b)];
    const d = Math.hypot(u[0], u[1]) || 1;
    const k = Math.min(64, 15 / Math.sin(rad(corner[i] / 2)));
    out.push(text(p[0] + (u[0] / d) * k, p[1] + (u[1] / d) * k + 5, s, { size: 14, color: C.purple }));
  });
  return { body: out.join(""), w: W, h: H };
}

/** A circle, the one flat shape with no sides. */
export const circleSvg = (w = 240, h = 170): Drawn => ({ body: `<circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) / 2 - 18}" fill="#e7f5ff" stroke="${C.blue}" stroke-width="2.5"/>`, w, h });

/** A solid in an oblique view: the edges at the back dashed. */
export function solidSvg(kind: SolidKind, w = 240, h = 180): Drawn {
  const st = `fill="none" stroke="${C.blue}" stroke-width="2.5" stroke-linejoin="round"`;
  const back = `fill="none" stroke="${C.blue}" stroke-width="1.5" stroke-dasharray="5 4"`;
  const face = `fill="#e7f5ff" stroke="none"`;
  const P = (pts: number[][]) => pts.map((p) => p.join(",")).join(" ");
  const box = (bw: number, bh: number, d: number) => {
    const [x, y] = [(w - bw - d) / 2, (h - bh + d) / 2];
    const [dx, dy] = [d, -d];
    const F = [[x, y], [x + bw, y], [x + bw, y + bh], [x, y + bh]];
    const B = F.map(([px, py]) => [px + dx, py + dy]);
    return [
      `<polygon points="${P([F[0], F[1], B[1], B[0]])}" ${face}/>`, `<polygon points="${P([F[1], B[1], B[2], F[2]])}" ${face}/>`, `<polygon points="${P(F)}" ${face}/>`,
      `<polyline points="${P([B[3], B[0]])}" ${back}/>`, `<polyline points="${P([B[3], B[2]])}" ${back}/>`, `<polyline points="${P([B[3], F[3]])}" ${back}/>`,
      `<polygon points="${P(F)}" ${st}/>`, `<polyline points="${P([F[0], B[0], B[1], B[2], F[2]])}" ${st}/>`, `<line x1="${F[1][0]}" y1="${F[1][1]}" x2="${B[1][0]}" y2="${B[1][1]}" ${st}/>`,
    ].join("");
  };
  const [cx, cy] = [w / 2, h / 2];
  switch (kind) {
    case "cube":
      return { body: box(110, 110, 45), w, h };
    case "cuboid":
      return { body: box(150, 80, 40), w, h };
    case "cylinder": {
      const [rx, ry, top, bot] = [60, 18, cy - 55, cy + 55];
      return {
        body: `<path d="M${cx - rx},${top} L${cx - rx},${bot} A${rx},${ry} 0 0 0 ${cx + rx},${bot} L${cx + rx},${top}" fill="#e7f5ff" stroke="none"/><ellipse cx="${cx}" cy="${top}" rx="${rx}" ry="${ry}" fill="#d0ebff" stroke="${C.blue}" stroke-width="2.5"/><path d="M${cx - rx},${bot} A${rx},${ry} 0 0 1 ${cx + rx},${bot}" ${back}/><path d="M${cx - rx},${bot} A${rx},${ry} 0 0 0 ${cx + rx},${bot}" ${st}/><line x1="${cx - rx}" y1="${top}" x2="${cx - rx}" y2="${bot}" ${st}/><line x1="${cx + rx}" y1="${top}" x2="${cx + rx}" y2="${bot}" ${st}/>`,
        w, h,
      };
    }
    case "cone": {
      const [rx, ry, apex, bot] = [62, 18, cy - 70, cy + 52];
      return {
        body: `<path d="M${cx},${apex} L${cx - rx},${bot} A${rx},${ry} 0 0 0 ${cx + rx},${bot} Z" fill="#e7f5ff" stroke="none"/><path d="M${cx - rx},${bot} A${rx},${ry} 0 0 1 ${cx + rx},${bot}" ${back}/><path d="M${cx},${apex} L${cx - rx},${bot} A${rx},${ry} 0 0 0 ${cx + rx},${bot} Z" ${st}/>`,
        w, h,
      };
    }
    case "sphere": {
      const R = 68;
      return {
        body: `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#e7f5ff" stroke="none"/><path d="M${cx - R},${cy} A${R},${R * 0.28} 0 0 1 ${cx + R},${cy}" ${back}/><path d="M${cx - R},${cy} A${R},${R * 0.28} 0 0 0 ${cx + R},${cy}" ${st} stroke-width="1.5"/><circle cx="${cx}" cy="${cy}" r="${R}" ${st}/>`,
        w, h,
      };
    }
    case "pyramid": {
      // A square base seen from above the front, its back corner hidden.
      const b = [[cx - 70, cy + 45], [cx + 40, cy + 45], [cx + 75, cy + 15], [cx - 35, cy + 15]];
      const top = [cx + 2, cy - 75];
      return {
        body: `<polygon points="${P([b[0], b[1], top])}" ${face}/><polygon points="${P([b[1], b[2], top])}" ${face}/><polyline points="${P([b[2], b[3], b[0]])}" ${back}/><line x1="${b[3][0]}" y1="${b[3][1]}" x2="${top[0]}" y2="${top[1]}" ${back}/><polyline points="${P([b[0], b[1], b[2], top, b[0]])}" ${st}/><line x1="${b[1][0]}" y1="${b[1][1]}" x2="${top[0]}" y2="${top[1]}" ${st}/>`,
        w, h,
      };
    }
    case "prism": {
      // A triangle at the front, carried back.
      const F = [[cx - 80, cy + 50], [cx + 10, cy + 50], [cx - 35, cy - 35]];
      const B = F.map(([x, y]) => [x + 70, y - 35]);
      return {
        body: `<polygon points="${P([F[1], B[1], B[2], F[2]])}" ${face}/><polygon points="${P(F)}" ${face}/><polyline points="${P([F[0], B[0], B[1]])}" ${back}/><line x1="${B[0][0]}" y1="${B[0][1]}" x2="${B[2][0]}" y2="${B[2][1]}" ${back}/><polygon points="${P(F)}" ${st}/><polyline points="${P([F[1], B[1], B[2], F[2]])}" ${st}/>`,
        w, h,
      };
    }
  }
}

/** Faces, edges and corners (vertices) of the solids with flat faces only. */
export const SOLID_COUNTS: Partial<Record<SolidKind, { faces: number; edges: number; vertices: number; seen: number }>> = {
  cube: { faces: 6, edges: 12, vertices: 8, seen: 3 },
  cuboid: { faces: 6, edges: 12, vertices: 8, seen: 3 },
  pyramid: { faces: 5, edges: 8, vertices: 5, seen: 2 },
  prism: { faces: 5, edges: 9, vertices: 6, seen: 2 },
};

/** An angle of `deg` degrees between two arms from one corner, the first arm turned by `tilt`. */
export function angleSvg(deg: number, tilt: number, w = 240, h = 170): Drawn {
  const pts: Pt[] = [[0, 0], [Math.cos(rad(tilt)), Math.sin(rad(tilt))], [Math.cos(rad(tilt + deg)), Math.sin(rad(tilt + deg))]];
  const P = fit([...pts, [0, 0]], w, h, 22);
  const [o, a, b] = P;
  const arc = 26;
  const ua = [(a[0] - o[0]) / len(o, a), (a[1] - o[1]) / len(o, a)];
  const ub = [(b[0] - o[0]) / len(o, b), (b[1] - o[1]) / len(o, b)];
  return {
    body: `<path d="M${f1(o[0] + ua[0] * arc)},${f1(o[1] + ua[1] * arc)} A${arc},${arc} 0 0 0 ${f1(o[0] + ub[0] * arc)},${f1(o[1] + ub[1] * arc)}" fill="none" stroke="${C.purple}" stroke-width="2"/><polyline points="${f1(a[0])},${f1(a[1])} ${f1(o[0])},${f1(o[1])} ${f1(b[0])},${f1(b[1])}" fill="none" stroke="${C.blue}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${f1(o[0])}" cy="${f1(o[1])}" r="3.5" fill="${C.ink}"/>`,
    w, h,
  };
}

const arrowHead = (x: number, y: number, ux: number, uy: number) => `<path d="M${f1(x - ux * 11 - uy * 6)},${f1(y - uy * 11 + ux * 6)} L${f1(x)},${f1(y)} L${f1(x - ux * 11 + uy * 6)},${f1(y - uy * 11 - ux * 6)}" fill="none" stroke="${C.blue}" stroke-width="2.5" stroke-linejoin="round"/>`;
/** A straight figure from p to q: a line (arrows both ends), a ray (a dot, then an arrow) or a segment (two dots). */
function straight(p: Pt, q: Pt, kind: "line" | "ray" | "segment"): string {
  const l = len(p, q);
  const [ux, uy] = [(q[0] - p[0]) / l, (q[1] - p[1]) / l];
  const dot = (x: number, y: number) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="5" fill="${C.ink}"/>`;
  return [
    `<line x1="${f1(p[0])}" y1="${f1(p[1])}" x2="${f1(q[0])}" y2="${f1(q[1])}" stroke="${C.blue}" stroke-width="3" stroke-linecap="round"/>`,
    kind === "line" ? arrowHead(p[0], p[1], -ux, -uy) : dot(p[0], p[1]),
    kind === "segment" ? dot(q[0], q[1]) : arrowHead(q[0], q[1], ux, uy),
  ].join("");
}

/** A line, a ray or a segment, at a slant `tilt`. */
export function lineKindSvg(kind: "line" | "ray" | "segment", tilt: number, w = 240, h = 120): Drawn {
  const [c, s] = [Math.cos(rad(tilt)), -Math.sin(rad(tilt))];
  const half = Math.min(w / 2 - 20, (h / 2 - 16) / Math.max(Math.abs(s), 0.01));
  return { body: straight([w / 2 - c * half, h / 2 - s * half], [w / 2 + c * half, h / 2 + s * half], kind), w, h };
}

/** Two lines: parallel, perpendicular (crossing at a right angle) or crossing at `cross` degrees. */
export function twoLinesSvg(kind: "parallel" | "perpendicular" | "crossing", tilt: number, cross = 50, w = 240, h = 170): Drawn {
  const L = Math.min(w, h) / 2 - 8;
  const at = (cx: number, cy: number, deg: number): [Pt, Pt] => [[cx - Math.cos(rad(deg)) * L, cy + Math.sin(rad(deg)) * L], [cx + Math.cos(rad(deg)) * L, cy - Math.sin(rad(deg)) * L]];
  const [cx, cy] = [w / 2, h / 2];
  if (kind === "parallel") {
    const [nx, ny] = [Math.sin(rad(tilt)) * 30, Math.cos(rad(tilt)) * 30];
    const [a, b] = at(cx - nx, cy - ny, tilt);
    const [c, d] = at(cx + nx, cy + ny, tilt);
    return { body: straight(a, b, "line") + straight(c, d, "line"), w, h };
  }
  const [a, b] = at(cx, cy, tilt);
  const [c, d] = at(cx, cy, tilt + (kind === "perpendicular" ? 90 : cross));
  return { body: straight(a, b, "line") + straight(c, d, "line"), w, h };
}
