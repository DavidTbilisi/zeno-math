// Plane geometry on a grid: triangles, quadrilaterals, circles and a Pythagoras view.
// Points live in grid units (y up); everything is measured from them and drawn to SVG.
import type { RenderedSvg } from "./latex";

export type Pt = [number, number];
export type GeoShape = "triangle" | "quad" | "circle" | "pythagoras";
export const GEO_SHAPES: GeoShape[] = ["triangle", "quad", "circle", "pythagoras"];

export type GeometrySpec = {
  type: "geometry";
  shape: GeoShape;
  pts: Pt[]; // triangle A B C · quad A B C D · circle O P · pythagoras C (right angle) A B
  lengths: boolean;
  angles: boolean;
  area: boolean;
  grid: boolean;
  snap: boolean;
  caption?: string; // classification in the UI language, stored at insert time
};

export const POINT_NAMES: Record<GeoShape, string[]> = {
  triangle: ["A", "B", "C"],
  quad: ["A", "B", "C", "D"],
  circle: ["O", "P"],
  pythagoras: ["C", "A", "B"],
};

// ---------- Plane ↔ pixels ----------

export const PLANE = { w: 16, h: 12, u: 36, pad: 14 };
export const PLANE_PX = { w: PLANE.w * PLANE.u + 2 * PLANE.pad, h: PLANE.h * PLANE.u + 2 * PLANE.pad };
export const toPx = ([x, y]: Pt): [number, number] => [PLANE.pad + x * PLANE.u, PLANE.pad + (PLANE.h - y) * PLANE.u];
export const fromPx = (px: number, py: number): Pt => [(px - PLANE.pad) / PLANE.u, PLANE.h - (py - PLANE.pad) / PLANE.u];

// ---------- Vector helpers ----------

const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
const mul = (a: Pt, k: number): Pt => [a[0] * k, a[1] * k];
const dot = (a: Pt, b: Pt) => a[0] * b[0] + a[1] * b[1];
const cross = (a: Pt, b: Pt) => a[0] * b[1] - a[1] * b[0];
const len = (a: Pt) => Math.hypot(a[0], a[1]);
const dist = (a: Pt, b: Pt) => len(sub(a, b));

const nearInt = (v: number) => Math.abs(v - Math.round(v)) < 1e-9;
export const fmt = (v: number) => (Number.isFinite(v) ? String(Math.round(v * 100) / 100) : "—");
/** "P = 3 + 4 + 5 = 12" or "P = √52 + √52 + 8 ≈ 22.42". */
const sumLine = (name: string, parts: { short: string; value: number }[]) => {
  const total = parts.reduce((t, x) => t + x.value, 0);
  const exact = parts.every((x) => !x.short.startsWith("√")) && nearInt(total);
  return `${name} = ${parts.map((x) => x.short).join(" + ")} ${exact ? "=" : "≈"} ${fmt(total)}`;
};
const deg = (v: number) => (Number.isFinite(v) ? `${Math.round(v * 10) / 10}°` : "—");

/** A length as "5", "√13" (short, for the drawing) and "√13 ≈ 3.61" (long, for formulas). */
function lengthText(p: Pt, q: Pt): { short: string; long: string; value: number } {
  const [dx, dy] = sub(q, p);
  const value = Math.hypot(dx, dy);
  if (nearInt(dx) && nearInt(dy)) {
    const sq = Math.round(dx * dx + dy * dy);
    const root = Math.round(Math.sqrt(sq));
    if (root * root === sq) return { short: String(root), long: String(root), value };
    return { short: `√${sq}`, long: `√${sq} ≈ ${fmt(value)}`, value };
  }
  return { short: fmt(value), long: fmt(value), value };
}

/** Unsigned angle at v between rays v→p and v→n, in degrees. */
function angleAt(p: Pt, v: Pt, n: Pt): number {
  const a = sub(p, v);
  const b = sub(n, v);
  if (len(a) === 0 || len(b) === 0) return NaN;
  return (Math.atan2(Math.abs(cross(a, b)), dot(a, b)) * 180) / Math.PI;
}

const polyArea2 = (pts: Pt[]) => pts.reduce((s, p, i) => s + cross(p, pts[(i + 1) % pts.length]), 0);

/** Interior angles of a simple polygon (handles reflex corners). */
function interiorAngles(pts: Pt[]): number[] {
  const orient = Math.sign(polyArea2(pts));
  return pts.map((v, i) => {
    const p = pts[(i + pts.length - 1) % pts.length];
    const n = pts[(i + 1) % pts.length];
    const theta = angleAt(p, v, n);
    const convex = Math.sign(cross(sub(v, p), sub(n, v))) === orient;
    return convex ? theta : 360 - theta;
  });
}

// ---------- Measurements ----------

export type ClassKey =
  | "equilateral" | "isosceles" | "scalene" | "right" | "acute" | "obtuse"
  | "square" | "rectangle" | "rhombus" | "parallelogram" | "trapezium" | "kite" | "quadrilateral" | "degenerate";

export type Measured = { lines: string[]; classes: ClassKey[] };

const EPS = 1e-6;
const eq = (a: number, b: number) => Math.abs(a - b) < EPS * Math.max(1, Math.abs(a), Math.abs(b)) * 1000;

function footOnLine(c: Pt, a: Pt, b: Pt): { foot: Pt; t: number } {
  const ab = sub(b, a);
  const t = dot(sub(c, a), ab) / dot(ab, ab);
  return { foot: add(a, mul(ab, t)), t };
}

export function measure(spec: GeometrySpec): Measured {
  const p = spec.pts;
  switch (spec.shape) {
    case "triangle": {
      const [A, B, C] = p;
      const area = Math.abs(polyArea2(p)) / 2;
      if (area < 1e-9) return { lines: [], classes: ["degenerate"] };
      const a = lengthText(B, C), b = lengthText(C, A), c = lengthText(A, B);
      const angA = angleAt(B, A, C), angB = angleAt(A, B, C), angC = angleAt(A, C, B);
      const h = (2 * area) / c.value;
      const sides = [a.value, b.value, c.value];
      const equalPairs = [eq(sides[0], sides[1]), eq(sides[1], sides[2]), eq(sides[0], sides[2])].filter(Boolean).length;
      const maxAng = Math.max(angA, angB, angC);
      return {
        lines: [
          `∠A + ∠B + ∠C = ${deg(angA)} + ${deg(angB)} + ${deg(angC)} = 180°`,
          sumLine("P = a + b + c", [a, b, c]),
          `S = ½ · c · h = ½ · ${fmt(c.value)} · ${fmt(h)} = ${fmt(area)}`,
        ],
        classes: [Math.abs(maxAng - 90) < 0.05 ? "right" : maxAng > 90 ? "obtuse" : "acute", equalPairs === 3 ? "equilateral" : equalPairs ? "isosceles" : "scalene"],
      };
    }
    case "quad": {
      const area = Math.abs(polyArea2(p)) / 2;
      if (area < 1e-9) return { lines: [], classes: ["degenerate"] };
      const sides = p.map((q, i) => lengthText(q, p[(i + 1) % 4]));
      const angs = interiorAngles(p);
      const [AB, BC, CD, DA] = p.map((q, i) => sub(p[(i + 1) % 4], q));
      const par = (u: Pt, v: Pt) => Math.abs(cross(u, v)) < 1e-6 * len(u) * len(v) + 1e-9;
      const s = sides.map((x) => x.value);
      const allEqual = eq(s[0], s[1]) && eq(s[1], s[2]) && eq(s[2], s[3]);
      const rightAngles = angs.every((x) => Math.abs(x - 90) < 0.05);
      const twoPar = par(AB, CD) && par(BC, DA);
      const kind: ClassKey =
        rightAngles && allEqual ? "square"
        : rightAngles ? "rectangle"
        : allEqual ? "rhombus"
        : twoPar ? "parallelogram"
        : par(AB, CD) || par(BC, DA) ? "trapezium"
        : (eq(s[0], s[1]) && eq(s[2], s[3])) || (eq(s[1], s[2]) && eq(s[3], s[0])) ? "kite"
        : "quadrilateral";
      return {
        lines: [
          `∠A + ∠B + ∠C + ∠D = ${angs.map(deg).join(" + ")} = 360°`,
          sumLine("P", sides),
          `S = ${fmt(area)}`,
        ],
        classes: [kind],
      };
    }
    case "circle": {
      const [O, P] = p;
      const r = lengthText(O, P);
      const rv = r.value;
      return {
        lines: [
          `r = ${r.long},  d = 2r = ${fmt(2 * rv)}`,
          `C = 2πr ≈ ${fmt(2 * Math.PI * rv)}`,
          `S = πr² ≈ ${fmt(Math.PI * rv * rv)}`,
          `C : d = π ≈ 3.14`,
        ],
        classes: [],
      };
    }
    case "pythagoras": {
      const [C, A, B] = p;
      const a = lengthText(C, B), b = lengthText(C, A), c = lengthText(A, B);
      const a2 = a.value ** 2, b2 = b.value ** 2;
      return {
        lines: [
          `a² + b² = c²`,
          `${a.short}² + ${b.short}² = ${fmt(a2)} + ${fmt(b2)} = ${fmt(a2 + b2)}`,
          `c = √${fmt(a2 + b2)}${c.short.startsWith("√") ? ` ≈ ${fmt(c.value)}` : ` = ${c.short}`}`,
        ],
        classes: ["right"],
      };
    }
  }
}

// ---------- Drawing ----------

const INK = "#1e1e1e";
const FONT = `font-family="Segoe UI, Helvetica, Arial, sans-serif"`;
const HALO = `stroke="#ffffff" stroke-width="4" stroke-linejoin="round" paint-order="stroke"`;
const r1 = (v: number) => Math.round(v * 10) / 10;

const label = (x: number, y: number, s: string, o: { size?: number; color?: string; bold?: boolean; italic?: boolean } = {}) =>
  `<text x="${r1(x)}" y="${r1(y)}" text-anchor="middle" dominant-baseline="central" font-size="${o.size ?? 14}" fill="${o.color ?? INK}"${o.bold ? ' font-weight="700"' : ""}${o.italic ? ' font-style="italic"' : ""} ${HALO}>${s}</text>`;

function centroidPx(pts: Pt[]): [number, number] {
  const px = pts.map(toPx);
  return [px.reduce((s, q) => s + q[0], 0) / px.length, px.reduce((s, q) => s + q[1], 0) / px.length];
}

/** Label placed at the midpoint of p→q, pushed away from the shape's centre. */
function sideLabel(p: Pt, q: Pt, text: string, centre: [number, number], color = INK) {
  const [x1, y1] = toPx(p);
  const [x2, y2] = toPx(q);
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  let nx = -(y2 - y1), ny = x2 - x1;
  const l = Math.hypot(nx, ny) || 1;
  nx /= l; ny /= l;
  if (nx * (mx - centre[0]) + ny * (my - centre[1]) < 0) { nx = -nx; ny = -ny; }
  return label(mx + nx * 14, my + ny * 14, text, { color, bold: true });
}

/** Angle arc (or right-angle square) at v, on the interior side, with its value. */
function angleMark(prev: Pt, v: Pt, next: Pt, interior: number, color = "#e8590c") {
  if (!Number.isFinite(interior)) return "";
  const [vx, vy] = toPx(v);
  const [px, py] = toPx(prev);
  const [nx, ny] = toPx(next);
  const a1 = Math.atan2(py - vy, px - vx);
  let delta = Math.atan2(ny - vy, nx - vx) - a1;
  while (delta <= -Math.PI) delta += 2 * Math.PI;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  const reflex = interior > 180 + 1e-9;
  const mid = a1 + delta / 2 + (reflex ? Math.PI : 0);
  const txt = label(vx + Math.cos(mid) * 36, vy + Math.sin(mid) * 36, `${Math.round(interior * 10) / 10}°`, { size: 12, color });
  if (Math.abs(interior - 90) < 0.05) {
    const s = 12;
    const u = [Math.cos(a1), Math.sin(a1)], w = [Math.cos(a1 + delta), Math.sin(a1 + delta)];
    return `<path d="M${r1(vx + u[0] * s)},${r1(vy + u[1] * s)} L${r1(vx + (u[0] + w[0]) * s)},${r1(vy + (u[1] + w[1]) * s)} L${r1(vx + w[0] * s)},${r1(vy + w[1] * s)}" fill="none" stroke="${color}" stroke-width="1.8"/>` + txt;
  }
  const R = 20;
  const end = a1 + delta;
  const sweep = reflex ? (delta > 0 ? 0 : 1) : delta > 0 ? 1 : 0;
  return (
    `<path d="M${r1(vx + Math.cos(a1) * R)},${r1(vy + Math.sin(a1) * R)} A${R},${R} 0 ${reflex ? 1 : 0} ${sweep} ${r1(vx + Math.cos(end) * R)},${r1(vy + Math.sin(end) * R)}" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="1.8"/>` +
    txt
  );
}

const poly = (pts: Pt[], fill: string, stroke: string, opacity = 0.35) =>
  `<polygon points="${pts.map((q) => toPx(q).map(r1).join(",")).join(" ")}" fill="${fill}" fill-opacity="${opacity}" stroke="${stroke}" stroke-width="2.5" stroke-linejoin="round"/>`;
const seg = (p: Pt, q: Pt, stroke: string, extra = "", width = 2) => {
  const [x1, y1] = toPx(p);
  const [x2, y2] = toPx(q);
  return `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" stroke="${stroke}" stroke-width="${width}" ${extra}/>`;
};
const dotAt = (p: Pt, color = INK) => {
  const [x, y] = toPx(p);
  return `<circle cx="${r1(x)}" cy="${r1(y)}" r="4" fill="${color}"/>`;
};
function vertexNames(pts: Pt[], names: string[]) {
  const c = centroidPx(pts);
  return pts
    .map((q, i) => {
      const [x, y] = toPx(q);
      let dx = x - c[0], dy = y - c[1];
      const l = Math.hypot(dx, dy) || 1;
      dx /= l; dy /= l;
      return label(x + dx * 18, y + dy * 18, names[i], { size: 16, bold: true, italic: true });
    })
    .join("");
}

/** Right-angle square at `at`, between directions to p and q. */
function rightMark(at: Pt, p: Pt, q: Pt, color: string) {
  return angleMark(p, at, q, 90, color).replace(/<text[\s\S]*<\/text>/, "");
}

/** The squares on a, b and c of the Pythagoras triangle [C, A, B], each built outward. */
export function pythagorasSquares([C, A, B]: Pt[]): Pt[][] {
  const square = (s: Pt, q: Pt, away: Pt): Pt[] => {
    const d = sub(q, s);
    let n: Pt = [-d[1], d[0]];
    if (dot(n, sub(away, s)) > 0) n = mul(n, -1);
    return [s, q, add(q, n), add(s, n)];
  };
  return [square(C, B, A), square(C, A, B), square(A, B, C)];
}

/** True if every point (and, for Pythagoras, every square corner) lies on the plane. */
export function fitsPlane(shape: GeoShape, pts: Pt[]): boolean {
  const all = shape === "pythagoras" ? pythagorasSquares(pts).flat() : pts;
  return all.every(([x, y]) => x >= -1e-9 && y >= -1e-9 && x <= PLANE.w + 1e-9 && y <= PLANE.h + 1e-9);
}

function drawShape(spec: GeometrySpec): string {
  const p = spec.pts;
  const out: string[] = [];
  const blue = { fill: "#a5d8ff", stroke: "#1971c2" };
  switch (spec.shape) {
    case "triangle":
    case "quad": {
      const names = POINT_NAMES[spec.shape];
      out.push(poly(p, blue.fill, blue.stroke));
      const centre = centroidPx(p);
      if (spec.shape === "triangle" && spec.area && Math.abs(polyArea2(p)) > 1e-9) {
        // Height from C onto line AB, with the base extended if the foot falls outside.
        const [A, B, C] = p;
        const { foot, t } = footOnLine(C, A, B);
        if (t < 0) out.push(seg(A, foot, "#adb5bd", 'stroke-dasharray="4 4"'));
        if (t > 1) out.push(seg(B, foot, "#adb5bd", 'stroke-dasharray="4 4"'));
        out.push(seg(C, foot, "#e8590c", 'stroke-dasharray="6 5"'));
        if (dist(C, foot) > 1e-9 && dist(foot, t > 0.5 ? A : B) > 1e-9) out.push(rightMark(foot, t > 0.5 ? A : B, C, "#e8590c"));
        // Side labels sit outside the shape, so the height label goes inside (towards the centre).
        const [hx, hy] = toPx([(C[0] + foot[0]) / 2, (C[1] + foot[1]) / 2]);
        const [dx, dy] = [centre[0] - hx, centre[1] - hy];
        const dl = Math.hypot(dx, dy) || 1;
        out.push(label(hx + (dx / dl) * 26, hy + (dy / dl) * 26, `h = ${fmt(dist(C, foot))}`, { size: 13, color: "#e8590c", bold: true }));
      }
      if (spec.angles) {
        const ints = spec.shape === "quad" ? interiorAngles(p) : p.map((v, i) => angleAt(p[(i + 2) % 3], v, p[(i + 1) % 3]));
        p.forEach((v, i) => out.push(angleMark(p[(i + p.length - 1) % p.length], v, p[(i + 1) % p.length], ints[i])));
      }
      if (spec.lengths) p.forEach((q, i) => out.push(sideLabel(q, p[(i + 1) % p.length], lengthText(q, p[(i + 1) % p.length]).short, centre)));
      p.forEach((q) => out.push(dotAt(q)));
      out.push(vertexNames(p, names));
      break;
    }
    case "circle": {
      const [O, P] = p;
      const r = dist(O, P);
      const [ox, oy] = toPx(O);
      out.push(`<circle cx="${r1(ox)}" cy="${r1(oy)}" r="${r1(r * PLANE.u)}" fill="${blue.fill}" fill-opacity="0.35" stroke="${blue.stroke}" stroke-width="2.5"/>`);
      const P2 = sub(mul(O, 2), P); // opposite end of the diameter
      out.push(seg(P2, O, "#868e96", 'stroke-dasharray="6 5"'), seg(O, P, "#e8590c", "", 2.5));
      if (spec.lengths) {
        out.push(sideLabel(O, P, `r = ${lengthText(O, P).short}`, [ox, oy + 1], "#e8590c"));
        out.push(sideLabel(P2, O, `d = ${fmt(2 * r)}`, [ox, oy - 1], "#868e96"));
      }
      out.push(dotAt(O), dotAt(P, "#e8590c"), vertexNames([O, P], ["O", "P"]));
      break;
    }
    case "pythagoras": {
      const [C, A, B] = p;
      const [sqA, sqB, sqC] = pythagorasSquares(p);
      const sqs: [Pt[], string, string, string][] = [
        [sqA, "#ffd8a8", "#e8590c", "a²"],
        [sqB, "#b2f2bb", "#2f9e44", "b²"],
        [sqC, "#eebefa", "#9c36b5", "c²"],
      ];
      for (const [sq, fill, stroke, name] of sqs) {
        out.push(poly(sq, fill, stroke, 0.55));
        const area = dist(sq[0], sq[1]) ** 2;
        const [cx, cy] = centroidPx(sq);
        out.push(label(cx, cy - 9, name, { size: 15, color: stroke, bold: true, italic: true }), label(cx, cy + 10, fmt(area), { size: 16, color: stroke, bold: true }));
      }
      out.push(poly([C, A, B], "#ffffff", INK, 0.9), rightMark(C, A, B, INK));
      const centre = centroidPx([C, A, B]);
      if (spec.lengths) {
        out.push(sideLabel(C, B, `a = ${lengthText(C, B).short}`, centre, "#e8590c"));
        out.push(sideLabel(C, A, `b = ${lengthText(C, A).short}`, centre, "#2f9e44"));
        out.push(sideLabel(A, B, `c = ${lengthText(A, B).short}`, centre, "#9c36b5"));
      }
      [C, A, B].forEach((q) => out.push(dotAt(q)));
      break;
    }
  }
  return out.join("");
}

/** The plane (grid + shape) as SVG markup, without the formula lines — the dialog overlays handles on it. */
export function planeSvg(spec: GeometrySpec): string {
  const { w, h } = PLANE_PX;
  const out: string[] = [`<rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff"/>`];
  if (spec.grid) {
    const lines: string[] = [];
    for (let x = 0; x <= PLANE.w; x++) lines.push(`M${PLANE.pad + x * PLANE.u},${PLANE.pad}V${h - PLANE.pad}`);
    for (let y = 0; y <= PLANE.h; y++) lines.push(`M${PLANE.pad},${PLANE.pad + y * PLANE.u}H${w - PLANE.pad}`);
    out.push(`<path d="${lines.join("")}" stroke="#e9ecef" stroke-width="1"/>`);
  }
  out.push(`<g ${FONT}>${drawShape(spec)}</g>`);
  return out.join("");
}

export function renderGeometry(spec: GeometrySpec): RenderedSvg {
  const { w, h } = PLANE_PX;
  const m = measure(spec);
  const lines = [...(spec.caption ? [spec.caption] : []), ...(spec.area || spec.shape !== "triangle" ? m.lines : m.lines.slice(0, 2))];
  const LH = 26;
  const height = h + (lines.length ? lines.length * LH + 16 : 0);
  const text = lines
    .map((l, i) => `<text x="${PLANE.pad}" y="${h + 22 + i * LH}" font-size="${i === 0 && spec.caption ? 16 : 18}" font-weight="${i === 0 && spec.caption ? 600 : 700}" fill="${i === 0 && spec.caption ? "#1971c2" : INK}" ${FONT}>${l}</text>`)
    .join("");
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${height}" viewBox="0 0 ${w} ${height}"><rect width="${w}" height="${height}" fill="#ffffff"/>${planeSvg(spec)}${text}</svg>`,
    width: w,
    height,
  };
}

// ---------- Presets ----------

const base = { lengths: true, angles: true, area: true, grid: true, snap: true } as const;
export const GEO_PRESETS: { key: string; spec: GeometrySpec }[] = [
  { key: "tri345", spec: { type: "geometry", shape: "triangle", pts: [[2, 2], [6, 2], [2, 5]], ...base } },
  { key: "triIsosceles", spec: { type: "geometry", shape: "triangle", pts: [[3, 2], [11, 2], [7, 8]], ...base } },
  { key: "triObtuse", spec: { type: "geometry", shape: "triangle", pts: [[2, 2], [8, 2], [11, 6]], ...base } },
  { key: "square", spec: { type: "geometry", shape: "quad", pts: [[4, 2], [9, 2], [9, 7], [4, 7]], ...base } },
  { key: "rectangle", spec: { type: "geometry", shape: "quad", pts: [[3, 3], [11, 3], [11, 7], [3, 7]], ...base } },
  { key: "parallelogram", spec: { type: "geometry", shape: "quad", pts: [[2, 3], [9, 3], [12, 8], [5, 8]], ...base } },
  { key: "trapezium", spec: { type: "geometry", shape: "quad", pts: [[2, 3], [12, 3], [9, 8], [5, 8]], ...base } },
  { key: "rhombus", spec: { type: "geometry", shape: "quad", pts: [[8, 1], [11, 5], [8, 9], [5, 5]], ...base } },
  { key: "kite", spec: { type: "geometry", shape: "quad", pts: [[8, 1], [11, 6], [8, 8], [5, 6]], ...base } },
  { key: "circle", spec: { type: "geometry", shape: "circle", pts: [[8, 6], [11, 6]], ...base } },
  { key: "pyth345", spec: { type: "geometry", shape: "pythagoras", pts: [[4, 5], [7, 5], [4, 9]], ...base } },
  { key: "pyth23", spec: { type: "geometry", shape: "pythagoras", pts: [[5, 4], [8, 4], [5, 6]], ...base } },
];

export const DEFAULT_GEOMETRY: GeometrySpec = GEO_PRESETS[0].spec;
