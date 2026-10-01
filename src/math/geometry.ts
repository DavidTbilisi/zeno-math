// Plane geometry on a grid: triangles, quadrilaterals, circles, Pythagoras, angle facts and a protractor.
// Points live in grid units (y up); everything is measured from them and drawn to SVG.
import type { RenderedSvg } from "./latex";

export type Pt = [number, number];
export type GeoShape = "triangle" | "quad" | "circle" | "pythagoras" | "angles" | "protractor" | "symmetry";
export const GEO_SHAPES: GeoShape[] = ["triangle", "quad", "circle", "pythagoras", "angles", "protractor", "symmetry"];

/** Symmetry scenes: reflect a shape in a mirror line, find its lines of symmetry, or practise reflecting. */
export type SymMode = "reflect" | "lines" | "practice";

/** Angle-fact scenes: a straight line, around a point, vertically opposite, parallel lines + transversal. */
export type AngleMode = "line" | "point" | "vertical" | "parallel";

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
  mode?: AngleMode; // shape "angles"
  hide?: boolean; // shape "protractor": hide the reading so the student measures it
  sym?: SymMode; // shape "symmetry"; pts = [M, N (mirror), ...polygon] except "lines" = [...polygon]
  guess?: Pt[]; // "practice": where the student put each image point
  reveal?: boolean; // "practice": show the true image
  factNames?: [string, string, string]; // corresponding / alternate / co-interior, in the UI language
};

export function pointNames(spec: GeometrySpec): string[] {
  switch (spec.shape) {
    case "triangle": return ["A", "B", "C"];
    case "quad": return ["A", "B", "C", "D"];
    case "circle": return ["O", "P"];
    case "pythagoras": return ["C", "A", "B"];
    case "protractor": return ["O", "A", "B"];
    case "symmetry": {
      const letters = "ABCDEFGH".split("");
      return spec.sym === "lines" ? letters.slice(0, spec.pts.length) : ["M", "N", ...letters.slice(0, spec.pts.length - 2)];
    }
    case "angles":
      return { line: ["O", "L", "P"], point: ["O", "P", "Q", "R"], vertical: ["O", "P", "Q"], parallel: ["P", "Q"] }[spec.mode ?? "line"];
  }
}

/** Protractor arms have this length (grid units); the protractor itself is a bit smaller. */
export const ARM = 5;

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

/** Direction of v→p in degrees, 0..360, counter-clockwise from +x. */
const dirDeg = (v: Pt, p: Pt) => ((Math.atan2(p[1] - v[1], p[0] - v[0]) * 180) / Math.PI + 360) % 360;
const unit = (a: Pt): Pt => mul(a, 1 / (len(a) || 1));
const mirror = (o: Pt, p: Pt): Pt => sub(mul(o, 2), p); // point reflection of p through o

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
  | "square" | "rectangle" | "rhombus" | "parallelogram" | "trapezium" | "kite" | "quadrilateral" | "degenerate"
  | "straight" | "angleAcute" | "angleRight" | "angleObtuse" | "factLine" | "factPoint" | "factVertical" | "factParallel"
  | "factReflect";

export type Measured = { lines: string[]; classes: ClassKey[]; sym?: { lines: number; order: number } };

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
    case "angles": {
      const s = angleScene(spec);
      if (!s) return { lines: [], classes: ["degenerate"] };
      const fact: ClassKey = { line: "factLine", point: "factPoint", vertical: "factVertical", parallel: "factParallel" }[spec.mode ?? "line"] as ClassKey;
      return { lines: s.lines, classes: [fact] };
    }
    case "symmetry": {
      if (spec.sym === "lines") {
        const a = symmetryOf(p);
        return { lines: [], classes: [], sym: { lines: a.axes.length, order: a.order } };
      }
      const [M, N, ...poly] = p;
      if (dist(M, N) < 1e-9) return { lines: [], classes: ["degenerate"] };
      if (spec.sym === "practice") return { lines: [], classes: ["factReflect"] };
      const names = pointNames(spec).slice(2);
      const pairs = poly.map((q, i) => `${names[i]}(${fmt(q[0])}, ${fmt(q[1])}) → ${names[i]}′(${fmt(reflectPt(q, M, N)[0])}, ${fmt(reflectPt(q, M, N)[1])})`);
      const lines: string[] = [];
      for (let i = 0; i < pairs.length; i += 2) lines.push(pairs.slice(i, i + 2).join("     "));
      return { lines, classes: ["factReflect"] };
    }
    case "protractor": {
      const [O, A, B] = p;
      const theta = angleAt(A, O, B);
      const shown = Math.abs(theta - Math.round(theta)) < 1e-6 ? `${Math.round(theta)}°` : deg(theta);
      const kind: ClassKey = Math.abs(theta - 90) < 0.05 ? "angleRight" : Math.abs(theta - 180) < 0.05 ? "straight" : theta < 90 ? "angleAcute" : "angleObtuse";
      return { lines: [`∠AOB = ${spec.hide ? "?" : shown}`], classes: spec.hide ? [] : [kind] };
    }
  }
}

// ---------- Angle facts ----------

type Sector = { from: Pt; to: Pt; value: number; name: string; color: string };
type Scene = { vertex: Pt; sectors: Sector[] }[];

const ORANGE = "#e8590c", BLUE = "#1971c2", GREEN = "#2f9e44", PURPLE = "#9c36b5";

/** The arcs to draw and the fact lines, for an angle-facts spec (null if degenerate). */
function angleScene(spec: GeometrySpec): { scene: Scene; lines: string[] } | null {
  const p = spec.pts;
  const zero = (a: Pt, b: Pt) => dist(a, b) < 1e-9;
  switch (spec.mode ?? "line") {
    case "line": {
      const [O, L, P] = p;
      if (zero(O, L) || zero(O, P)) return null;
      const L2 = mirror(O, L);
      const a = angleAt(L, O, P), b = angleAt(P, O, L2);
      return {
        scene: [{ vertex: O, sectors: [{ from: L, to: P, value: a, name: "a", color: ORANGE }, { from: P, to: L2, value: b, name: "b", color: BLUE }] }],
        lines: [`a + b = ${deg(a)} + ${deg(b)} = 180°`],
      };
    }
    case "point": {
      const [O, ...rays] = p;
      if (rays.some((r) => zero(O, r))) return null;
      const sorted = [...rays].sort((u, v) => dirDeg(O, u) - dirDeg(O, v));
      const names = ["a", "b", "c"], colors = [ORANGE, BLUE, GREEN];
      const sectors = sorted.map((r, i) => {
        const next = sorted[(i + 1) % sorted.length];
        const value = (dirDeg(O, next) - dirDeg(O, r) + 360) % 360;
        return { from: r, to: next, value, name: names[i], color: colors[i] };
      });
      return {
        scene: [{ vertex: O, sectors }],
        lines: [`a + b + c = ${sectors.map((x) => deg(x.value)).join(" + ")} = 360°`],
      };
    }
    case "vertical": {
      const [O, P, Q] = p;
      if (zero(O, P) || zero(O, Q)) return null;
      const P2 = mirror(O, P), Q2 = mirror(O, Q);
      const a = angleAt(P, O, Q), b = 180 - a;
      if (a < 1e-6 || b < 1e-6) return null; // the lines coincide
      return {
        scene: [{
          vertex: O,
          sectors: [
            { from: P, to: Q, value: a, name: "a", color: ORANGE },
            { from: Q, to: P2, value: b, name: "b", color: BLUE },
            { from: P2, to: Q2, value: a, name: "c", color: ORANGE },
            { from: Q2, to: P, value: b, name: "d", color: BLUE },
          ],
        }],
        lines: [`a = c = ${deg(a)},   b = d = ${deg(b)}`, `a + b = ${deg(a)} + ${deg(b)} = 180°`],
      };
    }
    case "parallel": {
      const [P, Q] = p;
      if (Math.abs(P[1] - Q[1]) < 1e-9) return null;
      const [U, D] = P[1] > Q[1] ? [P, Q] : [Q, P]; // upper and lower crossing points
      const up = unit(sub(U, D));
      const phi = angleAt([1, 0], [0, 0], up); // angle between the parallels and the transversal
      // Four angles at each crossing, numbered 1–4 at the upper line and 5–8 at the lower one.
      const at = (X: Pt, first: number): { vertex: Pt; sectors: Sector[] } => {
        const E = add(X, [1, 0]), W = add(X, [-1, 0]), Up = add(X, up), Dn = sub(X, up);
        return {
          vertex: X,
          sectors: [
            { from: Up, to: W, value: 180 - phi, name: String(first), color: ORANGE },
            { from: E, to: Up, value: phi, name: String(first + 1), color: BLUE },
            { from: W, to: Dn, value: phi, name: String(first + 2), color: BLUE },
            { from: Dn, to: E, value: 180 - phi, name: String(first + 3), color: ORANGE },
          ],
        };
      };
      const [corr, alt, coint] = spec.factNames ?? ["Corresponding", "Alternate", "Co-interior"];
      return {
        scene: [at(U, 1), at(D, 5)],
        lines: [
          `∠2 = ∠3 = ∠6 = ∠7 = ${deg(phi)},   ∠1 = ∠4 = ∠5 = ∠8 = ${deg(180 - phi)}`,
          `${corr}: ∠2 = ∠6 = ${deg(phi)}`,
          `${alt}: ∠3 = ∠6 = ${deg(phi)}`,
          `${coint}: ∠4 + ∠6 = ${deg(180 - phi)} + ${deg(phi)} = 180°`,
        ],
      };
    }
  }
}

/** Where the infinite line through p and q enters and leaves the plane. */
function lineAcrossPlane(p: Pt, q: Pt): [Pt, Pt] {
  const d = sub(q, p);
  const ts: number[] = [];
  const box = [0, PLANE.w, 0, PLANE.h];
  if (Math.abs(d[0]) > 1e-12) ts.push((box[0] - p[0]) / d[0], (box[1] - p[0]) / d[0]);
  if (Math.abs(d[1]) > 1e-12) ts.push((box[2] - p[1]) / d[1], (box[3] - p[1]) / d[1]);
  const inside = ts
    .map((t) => add(p, mul(d, t)))
    .filter(([x, y]) => x >= -1e-6 && x <= PLANE.w + 1e-6 && y >= -1e-6 && y <= PLANE.h + 1e-6);
  inside.sort((a, b) => dot(sub(a, p), d) - dot(sub(b, p), d));
  return [inside[0] ?? p, inside[inside.length - 1] ?? q];
}

// ---------- Symmetry ----------

/** Reflection of q in the line through m and n. */
export function reflectPt(q: Pt, m: Pt, n: Pt): Pt {
  const { foot } = footOnLine(q, m, n);
  return sub(mul(foot, 2), q);
}

const centreOf = (pts: Pt[]): Pt => mul(pts.reduce((a, q) => add(a, q), [0, 0] as Pt), 1 / pts.length);

const rotate = (q: Pt, c: Pt, deg: number): Pt => {
  const r = (deg * Math.PI) / 180;
  const d = sub(q, c);
  return add(c, [d[0] * Math.cos(r) - d[1] * Math.sin(r), d[0] * Math.sin(r) + d[1] * Math.cos(r)]);
};

/** Does the point set `img` equal `pts` (as a set)? */
const sameSet = (img: Pt[], pts: Pt[]) => img.every((q) => pts.some((r) => dist(q, r) < 1e-6));

/**
 * Lines of symmetry and order of rotational symmetry of a polygon. Every mirror line of a polygon
 * passes through its centre and through a vertex or an edge midpoint, so those are the only candidates.
 */
export function symmetryOf(pts: Pt[]): { centre: Pt; axes: Pt[]; order: number } {
  const n = pts.length;
  const centre = centreOf(pts);
  if (n < 3 || Math.abs(polyArea2(pts)) < 1e-9) return { centre, axes: [], order: 1 };
  const candidates = [...pts, ...pts.map((q, i) => mul(add(q, pts[(i + 1) % n]), 0.5))]
    .map((q) => sub(q, centre))
    .filter((d) => len(d) > 1e-9);
  const axes: Pt[] = [];
  for (const d of candidates) {
    const other = add(centre, d);
    if (!sameSet(pts.map((q) => reflectPt(q, centre, other)), pts)) continue;
    // Same line as one already found? (directions equal up to sign)
    if (axes.some((a) => Math.abs(cross(unit(a), unit(d))) < 1e-9)) continue;
    axes.push(d);
  }
  let order = 1;
  for (let k = n; k >= 2; k--) {
    if (sameSet(pts.map((q) => rotate(q, centre, 360 / k)), pts)) {
      order = k;
      break;
    }
  }
  return { centre, axes, order };
}

// ---------- Drawing ----------

const INK = "#1e1e1e";
const FONT = `font-family="Segoe UI, Helvetica, Arial, 'Noto Sans Georgian', Sylfaen, sans-serif"`;
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

/** Angle arc (or right-angle square) at v, on the interior side, with its value (or `o.text`). */
function angleMark(prev: Pt, v: Pt, next: Pt, interior: number, color = "#e8590c", o: { text?: string; r?: number; labelR?: number } = {}) {
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
  const lr = o.labelR ?? 36;
  const txt = label(vx + Math.cos(mid) * lr, vy + Math.sin(mid) * lr, o.text ?? `${Math.round(interior * 10) / 10}°`, { size: o.text ? 13 : 12, color, bold: !!o.text });
  if (Math.abs(interior - 90) < 0.05) {
    const s = 12;
    const u = [Math.cos(a1), Math.sin(a1)], w = [Math.cos(a1 + delta), Math.sin(a1 + delta)];
    return `<path d="M${r1(vx + u[0] * s)},${r1(vy + u[1] * s)} L${r1(vx + (u[0] + w[0]) * s)},${r1(vy + (u[1] + w[1]) * s)} L${r1(vx + w[0] * s)},${r1(vy + w[1] * s)}" fill="none" stroke="${color}" stroke-width="1.8"/>` + txt;
  }
  const R = o.r ?? 20;
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

/** Names for angle-fact points, kept clear of the arcs at the vertex. */
function angleNames(spec: GeometrySpec, names: string[]) {
  const p = spec.pts;
  if (spec.mode === "parallel") {
    // Crossing points: name sits on the parallel line, to the left, beyond the arcs.
    return p.map((q, i) => { const [x, y] = toPx(q); return label(x - 56, y - 12, names[i], { size: 16, bold: true, italic: true }); }).join("");
  }
  const [O, ...rays] = p;
  const [ox, oy] = toPx(O);
  // Vertex: opposite the average ray direction (or down-left if the rays balance out).
  let dx = 0, dy = 0;
  for (const r of rays) { const [rx, ry] = toPx(r); const l = Math.hypot(rx - ox, ry - oy) || 1; dx += (rx - ox) / l; dy += (ry - oy) / l; }
  const l = Math.hypot(dx, dy);
  const [ux, uy] = l > 0.3 ? [-dx / l, -dy / l] : [-0.7, 0.7];
  const out = [label(ox + ux * 20, oy + uy * 20, names[0], { size: 16, bold: true, italic: true })];
  // Ray ends: just beyond the point, along the ray.
  rays.forEach((r, i) => { const [rx, ry] = toPx(r); const L2 = Math.hypot(rx - ox, ry - oy) || 1; out.push(label(rx + ((rx - ox) / L2) * 16, ry + ((ry - oy) / L2) * 16, names[i + 1], { size: 16, bold: true, italic: true })); });
  return out.join("");
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
export function fitsPlane(spec: GeometrySpec): boolean {
  const { shape, pts } = spec;
  // The protractor needs room for a full half-disc on either side of O.
  const all =
    shape === "pythagoras" ? pythagorasSquares(pts).flat()
    : shape === "protractor" ? [...pts, add(pts[0], [ARM, ARM]), sub(pts[0], [ARM, ARM])]
    : shape === "symmetry" && spec.sym !== "lines" ? [...pts, ...pts.slice(2).map((q) => reflectPt(q, pts[0], pts[1])), ...(spec.guess ?? [])]
    : pts;
  return all.every(([x, y]) => x >= -1e-9 && y >= -1e-9 && x <= PLANE.w + 1e-9 && y <= PLANE.h + 1e-9);
}

function drawShape(spec: GeometrySpec): string {
  const p = spec.pts;
  const out: string[] = [];
  const blue = { fill: "#a5d8ff", stroke: "#1971c2" };
  switch (spec.shape) {
    case "triangle":
    case "quad": {
      const names = pointNames(spec);
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
    case "angles": {
      const mode = spec.mode ?? "line";
      const names = pointNames(spec);
      // Lines: extended across the plane (rays for "around a point").
      if (mode === "line") out.push(seg(...lineAcrossPlane(p[0], p[1]), INK, "", 2.5), seg(p[0], p[2], INK, "", 2.5));
      if (mode === "point") p.slice(1).forEach((r) => out.push(seg(p[0], r, INK, "", 2.5)));
      if (mode === "vertical") out.push(seg(...lineAcrossPlane(p[0], p[1]), INK, "", 2.5), seg(...lineAcrossPlane(p[0], p[2]), INK, "", 2.5));
      if (mode === "parallel") {
        const [P, Q] = p;
        for (const X of [P, Q]) {
          out.push(seg([0, X[1]], [PLANE.w, X[1]], INK, "", 2.5));
          // Parallel marks (">") near the right end of each line.
          const [cx, cy] = toPx([PLANE.w - 1.2, X[1]]);
          out.push(`<path d="M${r1(cx - 5)},${r1(cy - 6)} L${r1(cx + 3)},${r1(cy)} L${r1(cx - 5)},${r1(cy + 6)}" fill="none" stroke="${INK}" stroke-width="2"/>`);
        }
        out.push(seg(...lineAcrossPlane(P, Q), PURPLE, "", 2.5));
      }
      const s = angleScene(spec);
      if (s) {
        const big = mode === "parallel" ? { r: 22, labelR: 38 } : { r: 30, labelR: 62 };
        for (const { vertex, sectors } of s.scene)
          for (const x of sectors)
            out.push(angleMark(x.from, vertex, x.to, x.value, x.color, { ...big, text: mode === "parallel" ? x.name : `${x.name} = ${deg(x.value)}` }));
      }
      p.forEach((q) => out.push(dotAt(q)));
      out.push(angleNames(spec, names));
      break;
    }
    case "symmetry": {
      const names = pointNames(spec);
      const primeLabel = (q: Pt, name: string, away: Pt, color: string) => {
        const [x, y] = toPx(q);
        const [ax, ay] = toPx(away);
        const l = Math.hypot(x - ax, y - ay) || 1;
        return label(x + ((x - ax) / l) * 16, y + ((y - ay) / l) * 16, name, { size: 15, bold: true, italic: true, color });
      };
      if (spec.sym === "lines") {
        const { centre, axes, order } = symmetryOf(p);
        for (const d of axes) out.push(seg(...lineAcrossPlane(centre, add(centre, d)), ORANGE, 'stroke-dasharray="10 6"', 2.5));
        out.push(poly(p, blue.fill, blue.stroke, 0.45));
        if (order > 1) {
          const [cx, cy] = toPx(centre);
          out.push(`<circle cx="${r1(cx)}" cy="${r1(cy)}" r="6" fill="${PURPLE}" stroke="#ffffff" stroke-width="2"/>`);
        }
        p.forEach((q) => out.push(dotAt(q)));
        out.push(p.map((q, i) => primeLabel(q, names[i], centreOf(p), INK)).join(""));
        break;
      }
      const [M, N, ...shape] = p;
      const mirror = lineAcrossPlane(M, N);
      const images = shape.map((q) => reflectPt(q, M, N));
      const showImage = spec.sym === "reflect" || spec.reveal;
      // Mirror line.
      out.push(seg(...mirror, PURPLE, 'stroke-dasharray="12 6"', 3));
      if (showImage) {
        // Connectors: each point and its image are equally far from the mirror, at right angles to it.
        shape.forEach((q, i) => {
          const im = images[i];
          if (dist(q, im) < 1e-9) return;
          const { foot } = footOnLine(q, M, N);
          out.push(seg(q, im, "#adb5bd", 'stroke-dasharray="4 4"', 1.5));
          out.push(rightMark(foot, q, add(foot, sub(N, M)), "#adb5bd"));
          // Equal-length ticks on both halves.
          for (const half of [q, im]) {
            const mid = mul(add(half, foot), 0.5);
            const [mx, my] = toPx(mid);
            const dir = unit(sub(im, q));
            const nrm: Pt = [-dir[1], dir[0]];
            out.push(`<line x1="${r1(mx - nrm[0] * 5)}" y1="${r1(my + nrm[1] * 5)}" x2="${r1(mx + nrm[0] * 5)}" y2="${r1(my - nrm[1] * 5)}" stroke="#868e96" stroke-width="1.5"/>`);
          }
        });
        out.push(poly(images, "#ffd8a8", ORANGE, 0.55));
      }
      out.push(poly(shape, blue.fill, blue.stroke, 0.55));
      shape.forEach((q) => out.push(dotAt(q)));
      out.push(shape.map((q, i) => primeLabel(q, names[i + 2], centreOf(shape), INK)).join(""));
      if (showImage) {
        images.forEach((q) => out.push(dotAt(q, ORANGE)));
        out.push(images.map((q, i) => primeLabel(q, `${names[i + 2]}′`, centreOf(images), ORANGE)).join(""));
      }
      if (spec.sym === "practice" && spec.guess) {
        // The student's image points.
        spec.guess.forEach((g, i) => {
          const [gx, gy] = toPx(g);
          out.push(`<circle cx="${r1(gx)}" cy="${r1(gy)}" r="6" fill="#ffffff" stroke="${ORANGE}" stroke-width="2.5"/>`);
          // With the answer shown, a correct guess sits on its image, which is already labelled.
          if (!(showImage && images[i] && dist(g, images[i]) < 0.05))
            out.push(label(gx + 14, gy - 14, `${names[i + 2]}′`, { size: 15, bold: true, italic: true, color: ORANGE }));
        });
        if (spec.guess.length > 2) out.push(`<polygon points="${spec.guess.map((q) => toPx(q).map(r1).join(",")).join(" ")}" fill="none" stroke="${ORANGE}" stroke-width="1.5" stroke-dasharray="5 4"/>`);
      }
      out.push(dotAt(M, PURPLE), dotAt(N, PURPLE));
      break;
    }
    case "protractor": {
      const [O, A, B] = p;
      const [ox, oy] = toPx(O);
      const RP = (ARM - 0.6) * PLANE.u; // protractor radius in px
      const beta = dirDeg(O, A); // the protractor's 0° line lies along OA
      const side = cross(sub(A, O), sub(B, O)) < 0 ? -1 : 1; // which half the protractor covers
      const at = (d: number, r: number): [number, number] => {
        const rad = (d * Math.PI) / 180;
        return [ox + Math.cos(rad) * r, oy - Math.sin(rad) * r];
      };
      const P0 = at(beta, RP), P90 = at(beta + 90 * side, RP), P180 = at(beta + 180 * side, RP);
      const sweep = side > 0 ? 0 : 1; // counter-clockwise in math = sweep 0 in SVG (y down)
      out.push(
        `<path d="M${r1(P0[0])},${r1(P0[1])} A${r1(RP)},${r1(RP)} 0 0 ${sweep} ${r1(P90[0])},${r1(P90[1])} A${r1(RP)},${r1(RP)} 0 0 ${sweep} ${r1(P180[0])},${r1(P180[1])} Z" fill="#fff3bf" fill-opacity="0.8" stroke="#f08c00" stroke-width="1.5"/>`,
      );
      const inner = RP * 0.32;
      const I0 = at(beta, inner), I90 = at(beta + 90 * side, inner), I180 = at(beta + 180 * side, inner);
      out.push(`<path d="M${r1(I0[0])},${r1(I0[1])} A${r1(inner)},${r1(inner)} 0 0 ${sweep} ${r1(I90[0])},${r1(I90[1])} A${r1(inner)},${r1(inner)} 0 0 ${sweep} ${r1(I180[0])},${r1(I180[1])}" fill="none" stroke="#f08c00" stroke-width="1"/>`);
      // Ticks every degree; two number scales like a real protractor (outer from OA, inner from the other side).
      const ticks: string[] = [];
      for (let k = 0; k <= 180; k++) {
        const d = beta + side * k;
        const l = k % 10 === 0 ? 16 : k % 5 === 0 ? 10 : 5;
        const [x1, y1] = at(d, RP);
        const [x2, y2] = at(d, RP - l);
        ticks.push(`M${r1(x1)},${r1(y1)}L${r1(x2)},${r1(y2)}`);
        if (k % 10 === 0) {
          const [tx, ty] = at(d, RP - 26);
          const [ix, iy] = at(d, RP - 41);
          out.push(`<text x="${r1(tx)}" y="${r1(ty)}" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="600" fill="#5c3d00">${k}</text>`);
          out.push(`<text x="${r1(ix)}" y="${r1(iy)}" text-anchor="middle" dominant-baseline="central" font-size="8.5" fill="#a07a2c">${180 - k}</text>`);
        }
      }
      out.push(`<path d="${ticks.join("")}" stroke="#5c3d00" stroke-width="0.9"/>`);
      out.push(`<circle cx="${r1(ox)}" cy="${r1(oy)}" r="5" fill="none" stroke="#f08c00" stroke-width="1.5"/>`);
      // The two arms; OB's crossing on the scale is where you read the angle.
      out.push(seg(O, A, BLUE, "", 3), seg(O, B, ORANGE, "", 3));
      const theta = angleAt(A, O, B);
      if (Number.isFinite(theta)) {
        const [hx, hy] = at(beta + side * theta, RP);
        out.push(`<circle cx="${r1(hx)}" cy="${r1(hy)}" r="6" fill="none" stroke="${ORANGE}" stroke-width="2.5"/>`);
        out.push(angleMark(A, O, B, theta, ORANGE, { r: 22, labelR: 40, text: spec.hide ? "?" : undefined }));
      }
      p.forEach((q) => out.push(dotAt(q)));
      out.push(vertexNames(p, pointNames(spec)));
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

/** The end of a protractor arm from O at the given direction (degrees). */
export function armAt(O: Pt, d: number): Pt {
  const rad = (d * Math.PI) / 180;
  return [Math.round((O[0] + ARM * Math.cos(rad)) * 1e4) / 1e4, Math.round((O[1] + ARM * Math.sin(rad)) * 1e4) / 1e4];
}

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
  { key: "anglesLine", spec: { type: "geometry", shape: "angles", mode: "line", pts: [[8, 4], [12, 4], [10, 9]], ...base } },
  { key: "anglesPoint", spec: { type: "geometry", shape: "angles", mode: "point", pts: [[8, 6], [13, 7], [5, 10], [6, 2]], ...base } },
  { key: "anglesVertical", spec: { type: "geometry", shape: "angles", mode: "vertical", pts: [[8, 6], [12, 8], [11, 2]], ...base } },
  { key: "anglesParallel", spec: { type: "geometry", shape: "angles", mode: "parallel", pts: [[7, 9], [10, 3]], ...base } },
  { key: "protractorAcute", spec: { type: "geometry", shape: "protractor", pts: [[8, 5.5], armAt([8, 5.5], 0), armAt([8, 5.5], 57)], ...base } },
  { key: "symReflectV", spec: { type: "geometry", shape: "symmetry", sym: "reflect", pts: [[8, 1], [8, 11], [3, 2], [3, 9], [6, 8], [3, 6]], ...base } },
  { key: "symReflectH", spec: { type: "geometry", shape: "symmetry", sym: "reflect", pts: [[1, 6], [15, 6], [4, 7], [9, 8], [6, 11]], ...base } },
  { key: "symReflectD", spec: { type: "geometry", shape: "symmetry", sym: "reflect", pts: [[1, 1], [11, 11], [2, 5], [3, 9], [5, 7]], ...base } },
  { key: "symRect", spec: { type: "geometry", shape: "symmetry", sym: "lines", pts: [[3, 3], [13, 3], [13, 9], [3, 9]], ...base } },
  { key: "symSquare", spec: { type: "geometry", shape: "symmetry", sym: "lines", pts: [[5, 2], [11, 2], [11, 8], [5, 8]], ...base } },
  { key: "symIsosceles", spec: { type: "geometry", shape: "symmetry", sym: "lines", pts: [[4, 2], [12, 2], [8, 10]], ...base } },
  { key: "symKite", spec: { type: "geometry", shape: "symmetry", sym: "lines", pts: [[8, 1], [11, 6], [8, 9], [5, 6]], ...base } },
  { key: "symParallelogram", spec: { type: "geometry", shape: "symmetry", sym: "lines", pts: [[2, 3], [10, 3], [13, 8], [5, 8]], ...base } },
  { key: "symPractice", spec: { type: "geometry", shape: "symmetry", sym: "practice", pts: [[8, 1], [8, 11], [3, 3], [6, 4], [4, 8]], guess: [[8, 3], [8, 4], [8, 8]], ...base } },
  { key: "protractorObtuse", spec: { type: "geometry", shape: "protractor", pts: [[8, 5.5], armAt([8, 5.5], 20), armAt([8, 5.5], 145)], ...base } },
];

export const DEFAULT_GEOMETRY: GeometrySpec = GEO_PRESETS[0].spec;
