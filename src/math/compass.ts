// Ruler-and-compass constructions. The only marks are circles (a centre and a point on the circle, as a compass that
// closes when lifted) and lines (through two points, as a straight edge without a scale); the only points are the
// given ones and where marks cross. `GIVEN` is what each task starts from, `goalMet` whether the marks have built
// what the task asks, and `whyTriangles` the congruent triangles (or equal radii) that show why it works. The piece
// `construct` is worked by hand; `constructSvg` draws a finished construction for the practice pictures.
import { C } from "./chart";

export type Pt = [number, number];
/** A circle through `p` about `c`, or a line through `a` and `b` (a ray from `a`, or the segment, when given so). */
export type Mark = { k: "c"; c: Pt; p: Pt } | { k: "l"; a: Pt; b: Pt; span?: "ray" | "seg" };
export type CTask = "bisect" | "angle" | "equi" | "perp" | "hexagon";
export const C_TASKS: readonly CTask[] = ["bisect", "angle", "equi", "perp", "hexagon"];
export type Tool = "compass" | "ruler";

/** The piece's drawing: the part of the picture marks are drawn in. */
export const AREA = { x0: 0, x1: 680, y0: 96, y1: 500 };
const rad = (d: number) => (d * Math.PI) / 180;
const at = (o: Pt, r: number, deg: number): Pt => [o[0] + r * Math.cos(rad(deg)), o[1] - r * Math.sin(rad(deg))];
export const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const near = (a: Pt, b: Pt, e = 0.5) => dist(a, b) < e;

const ANGLE_O: Pt = [190, 440];
const HEX_O: Pt = [340, 300];
const HEX_R = 150;
export const GIVEN: Record<CTask, { marks: Mark[]; pts: { p: Pt; name: string }[] }> = {
  bisect: { marks: [{ k: "l", a: [240, 320], b: [440, 320], span: "seg" }], pts: [{ p: [240, 320], name: "A" }, { p: [440, 320], name: "B" }] },
  angle: {
    marks: [{ k: "l", a: ANGLE_O, b: at(ANGLE_O, 260, 0), span: "ray" }, { k: "l", a: ANGLE_O, b: at(ANGLE_O, 170, 64), span: "ray" }],
    pts: [{ p: ANGLE_O, name: "O" }, { p: at(ANGLE_O, 260, 0), name: "P" }, { p: at(ANGLE_O, 170, 64), name: "Q" }],
  },
  equi: { marks: [{ k: "l", a: [250, 420], b: [430, 420], span: "seg" }], pts: [{ p: [250, 420], name: "A" }, { p: [430, 420], name: "B" }] },
  perp: { marks: [{ k: "l", a: [150, 420], b: [560, 420] }], pts: [{ p: [320, 230], name: "P" }, { p: [150, 420], name: "L" }] },
  hexagon: { marks: [{ k: "c", c: HEX_O, p: at(HEX_O, HEX_R, 0) }], pts: [{ p: HEX_O, name: "O" }, { p: at(HEX_O, HEX_R, 0), name: "A" }] },
};

const inArea = ([x, y]: Pt) => x >= AREA.x0 - 1e-9 && x <= AREA.x1 + 1e-9 && y >= AREA.y0 - 1e-9 && y <= AREA.y1 + 1e-9;
/** Where a point lies along a line mark, 0 at `a` and 1 at `b`; whether that is on the mark as drawn. */
const along = (m: Extract<Mark, { k: "l" }>, p: Pt) => {
  const d = [m.b[0] - m.a[0], m.b[1] - m.a[1]];
  return ((p[0] - m.a[0]) * d[0] + (p[1] - m.a[1]) * d[1]) / (d[0] * d[0] + d[1] * d[1]);
};
const onMark = (m: Mark, p: Pt) => m.k === "c" || (m.span === "ray" ? along(m, p) >= -1e-9 : m.span === "seg" ? along(m, p) >= -1e-9 && along(m, p) <= 1 + 1e-9 : true);

/** Where two marks cross. */
export function meet(m: Mark, n: Mark): Pt[] {
  let out: Pt[] = [];
  if (m.k === "l" && n.k === "l") {
    const [d, e] = [[m.b[0] - m.a[0], m.b[1] - m.a[1]], [n.b[0] - n.a[0], n.b[1] - n.a[1]]];
    const den = d[0] * e[1] - d[1] * e[0];
    if (Math.abs(den) > 1e-9) {
      const t = ((n.a[0] - m.a[0]) * e[1] - (n.a[1] - m.a[1]) * e[0]) / den;
      out = [[m.a[0] + t * d[0], m.a[1] + t * d[1]]];
    }
  } else if (m.k === "c" && n.k === "c") {
    const [r1, r2, d] = [dist(m.c, m.p), dist(n.c, n.p), dist(m.c, n.c)];
    if (d > 1e-9 && d <= r1 + r2 + 1e-9 && d >= Math.abs(r1 - r2) - 1e-9) {
      const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
      const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
      const u = [(n.c[0] - m.c[0]) / d, (n.c[1] - m.c[1]) / d];
      const mid: Pt = [m.c[0] + a * u[0], m.c[1] + a * u[1]];
      out = h < 1e-9 ? [mid] : [[mid[0] - h * u[1], mid[1] + h * u[0]], [mid[0] + h * u[1], mid[1] - h * u[0]]];
    }
  } else {
    const [l, c] = (m.k === "l" ? [m, n] : [n, m]) as [Extract<Mark, { k: "l" }>, Extract<Mark, { k: "c" }>];
    const d = [l.b[0] - l.a[0], l.b[1] - l.a[1]];
    const f = [l.a[0] - c.c[0], l.a[1] - c.c[1]];
    const r = dist(c.c, c.p);
    const [A, B, Cc] = [d[0] * d[0] + d[1] * d[1], 2 * (f[0] * d[0] + f[1] * d[1]), f[0] * f[0] + f[1] * f[1] - r * r];
    const disc = B * B - 4 * A * Cc;
    if (disc >= -1e-6) {
      const s = Math.sqrt(Math.max(0, disc));
      out = [(-B - s) / (2 * A), (-B + s) / (2 * A)].map((t) => [l.a[0] + t * d[0], l.a[1] + t * d[1]] as Pt);
      if (s < 1e-9) out = out.slice(0, 1);
    }
  }
  return out.filter((p) => onMark(m, p) && onMark(n, p));
}

/** Every point there is to put the compass or the straight edge on: the given ones and where any two marks cross. */
export function pointsOf(task: CTask, marks: readonly Mark[]): Pt[] {
  const all = [...GIVEN[task].marks, ...marks];
  const out: Pt[] = GIVEN[task].pts.map((q) => q.p);
  for (let i = 0; i < all.length; i++)
    for (let j = i + 1; j < all.length; j++)
      for (const p of meet(all[i], all[j])) if (inArea(p) && !out.some((q) => near(p, q))) out.push(p);
  return out;
}

/** A line mark lying along the line through `p` at `deg` (measured as on paper: anticlockwise, y up). */
const lies = (m: Mark, p: Pt, deg: number) => {
  if (m.k !== "l") return false;
  const u = [Math.cos(rad(deg)), -Math.sin(rad(deg))];
  const v = [m.b[0] - m.a[0], m.b[1] - m.a[1]];
  const cross = (a: number[], b: number[]) => a[0] * b[1] - a[1] * b[0];
  return Math.abs(cross(u, v)) / Math.hypot(v[0], v[1]) < 2e-3 && Math.abs(cross(u, [m.a[0] - p[0], m.a[1] - p[1]])) < 0.5;
};
const through = (m: Mark, p: Pt, q: Pt) => m.k === "l" && lies(m, p, (Math.atan2(-(q[1] - p[1]), q[0] - p[0]) * 180) / Math.PI);

/** The equilateral triangle's top corner, the hexagon's corners. */
export const APEX: Pt = [340, 420 - 90 * Math.sqrt(3)];
export const HEX: Pt[] = Array.from({ length: 6 }, (_, k) => at(HEX_O, HEX_R, 60 * k));

/** Whether the marks have built what the task asks. */
export function goalMet(task: CTask, marks: readonly Mark[]): boolean {
  const g = GIVEN[task].pts.map((q) => q.p);
  if (task === "bisect") return marks.some((m) => lies(m, [340, 320], 90));
  if (task === "angle") return marks.some((m) => lies(m, ANGLE_O, 32));
  if (task === "perp") return marks.some((m) => lies(m, g[0], 90));
  if (task === "equi") return marks.some((m) => through(m, g[0], APEX)) && marks.some((m) => through(m, g[1], APEX));
  const pts = pointsOf(task, marks);
  return HEX.every((v) => pts.some((p) => near(p, v)));
}

/** The triangles that show why it works, once it is built: two congruent ones, or (for the hexagon) six equilateral. */
export function whyTriangles(task: CTask, marks: readonly Mark[]): Pt[][] {
  const g = GIVEN[task].pts.map((q) => q.p);
  const pts = pointsOf(task, marks);
  const line = (p: Pt, deg: number) => marks.find((m) => lies(m, p, deg)) as Extract<Mark, { k: "l" }> | undefined;
  if (task === "bisect") {
    const l = line([340, 320], 90);
    if (!l) return [];
    const [a, b] = [l.a, l.b];
    return [[g[0], a, b], [g[1], a, b]];
  }
  if (task === "angle") {
    const l = line(ANGLE_O, 32);
    if (!l) return [];
    const x = near(l.a, ANGLE_O) ? l.b : l.a;
    const [r1, r2] = [GIVEN.angle.marks[0], GIVEN.angle.marks[1]] as Extract<Mark, { k: "l" }>[];
    for (const p of pts.filter((q) => !near(q, ANGLE_O) && Math.abs(offLine(r1, q)) < 0.5))
      for (const q of pts.filter((s) => !near(s, ANGLE_O) && Math.abs(offLine(r2, s)) < 0.5))
        if (Math.abs(dist(ANGLE_O, p) - dist(ANGLE_O, q)) < 0.5 && Math.abs(dist(p, x) - dist(q, x)) < 0.5) return [[ANGLE_O, p, x], [ANGLE_O, q, x]];
    return [];
  }
  if (task === "perp") {
    const l = line(g[0], 90);
    if (!l) return [];
    const z = near(l.a, g[0]) ? l.b : l.a;
    const base = GIVEN.perp.marks[0] as Extract<Mark, { k: "l" }>;
    const on = pts.filter((q) => Math.abs(offLine(base, q)) < 0.5);
    for (const x of on)
      for (const y of on)
        if (x[0] < y[0] && Math.abs(dist(g[0], x) - dist(g[0], y)) < 0.5) return [[g[0], x, z], [g[0], y, z]];
    return [];
  }
  if (task === "equi") return [[g[0], g[1], APEX]];
  return HEX.map((v, k) => [HEX_O, v, HEX[(k + 1) % 6]]);
}
/** How far a point is from a line mark's line, in pixels. */
function offLine(m: Extract<Mark, { k: "l" }>, p: Pt) {
  const v = [m.b[0] - m.a[0], m.b[1] - m.a[1]];
  return ((p[0] - m.a[0]) * v[1] - (p[1] - m.a[1]) * v[0]) / Math.hypot(v[0], v[1]);
}

export type LiveConstruct = { task: CTask; tool: Tool; marks: Mark[]; done: CTask[] };
export const CONSTRUCT_START: LiveConstruct = { task: "bisect", tool: "compass", marks: [], done: [] };

/** A line mark drawn across the whole drawing (or as its ray or segment). */
export function lineEnds(m: Extract<Mark, { k: "l" }>): [Pt, Pt] {
  if (m.span === "seg") return [m.a, m.b];
  const d = [m.b[0] - m.a[0], m.b[1] - m.a[1]];
  const L = 2000 / Math.hypot(d[0], d[1]);
  const far: Pt = [m.a[0] + L * d[0], m.a[1] + L * d[1]];
  return [m.span === "ray" ? m.a : [m.a[0] - L * d[0], m.a[1] - L * d[1]], far];
}

// ---------- the practice pictures ----------

export type Shown = "bisect" | "angle" | "perp" | "equi" | "hexagon";
const f1 = (v: number) => Math.round(v * 10) / 10;
/** A short arc of the circle about `c` of radius `r`, around the point at `deg`. */
const arcAt = (c: Pt, r: number, deg: number, spread = 16) => {
  const [p, q] = [at(c, r, deg - spread), at(c, r, deg + spread)];
  return `<path d="M${f1(p[0])} ${f1(p[1])} A${f1(r)} ${f1(r)} 0 0 0 ${f1(q[0])} ${f1(q[1])}" fill="none" stroke="${C.orange}" stroke-width="1.8"/>`;
};
const degOf = (c: Pt, p: Pt) => (Math.atan2(-(p[1] - c[1]), p[0] - c[0]) * 180) / Math.PI;
const seg = (a: Pt, b: Pt, color: string = C.ink, w = 2.2, dash = "") => `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="${color}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
const dot = (p: Pt, name = "", dx = 8, dy = -8, color: string = C.ink) =>
  `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="3.5" fill="${color}"/>` + (name ? `<text x="${f1(p[0] + dx)}" y="${f1(p[1] + dy)}" font-size="15" font-weight="700" font-family="Helvetica, Arial, sans-serif" fill="${color}" text-anchor="middle">${name}</text>` : "");

/**
 * A finished construction as drawn on paper: the given points and lines in ink, the compass arcs in orange and the
 * line it built in blue. `labels` names the points (empty to leave them unnamed); `turn` turns the whole picture.
 */
export function constructSvg(kind: Shown, turn = 0, labels = true): { body: string; w: number; h: number } {
  const W = 320, H = 260;
  const o: Pt = [W / 2, H / 2];
  const T = (p: Pt): Pt => {
    const [x, y] = [p[0] - o[0], p[1] - o[1]];
    const [c, s] = [Math.cos(rad(turn)), Math.sin(rad(turn))];
    return [o[0] + x * c + y * s, o[1] - x * s + y * c];
  };
  const out: string[] = [];
  const arc = (c: Pt, p: Pt, spread?: number) => {
    const [cc, pp] = [T(c), T(p)];
    out.push(arcAt(cc, dist(cc, pp), degOf(cc, pp), spread));
  };
  const L = (a: Pt, b: Pt, color?: string, w?: number, dash?: string) => out.push(seg(T(a), T(b), color, w, dash));
  const n = (s: string) => (labels ? s : "");
  if (kind === "bisect") {
    const [A, B]: Pt[] = [[90, 150], [230, 150]];
    const r = 100;
    const h = Math.sqrt(r * r - 70 * 70);
    const [P, Q]: Pt[] = [[160, 150 - h], [160, 150 + h]];
    L(A, B);
    for (const c of [A, B]) for (const p of [P, Q]) arc(c, p);
    L([160, 150 - h - 30], [160, 150 + h + 30], C.blue, 2);
    out.push(dot(T(A), n("A"), -10, -6), dot(T(B), n("B"), 10, -6), dot(T([160, 150]), n("M"), 12, 16));
  } else if (kind === "angle") {
    const O: Pt = [60, 200];
    const [P, Q] = [at(O, 110, 0), at(O, 110, 70)];
    L(O, at(O, 240, 0));
    L(O, at(O, 200, 70));
    arc(O, P, 10);
    arc(O, Q, 10);
    const X: Pt = [P[0] + Q[0] - O[0], P[1] + Q[1] - O[1]];
    arc(P, X, 10);
    arc(Q, X, 10);
    L(O, at(O, 250, 35), C.blue, 2);
    out.push(dot(T(O), n("O"), -10, 10), dot(T(P), "", 0, 0), dot(T(Q), "", 0, 0));
  } else if (kind === "perp") {
    const P: Pt = [160, 60];
    const [X, Y]: Pt[] = [[90, 170], [230, 170]];
    L([20, 170], [300, 170]);
    arc(P, X, 12);
    arc(P, Y, 12);
    // The last two arcs, of one opening (90) from X and Y, cross below the line.
    const Z: Pt = [160, 170 + Math.sqrt(90 * 90 - 70 * 70)];
    arc(X, Z, 8);
    arc(Y, Z, 8);
    L([160, 30], [160, Math.min(250, Z[1] + 10)], C.blue, 2);
    out.push(dot(T(P), n("P"), 12, -4), dot(T(X)), dot(T(Y)));
  } else if (kind === "equi") {
    const [A, B]: Pt[] = [[90, 200], [230, 200]];
    const Cp: Pt = [160, 200 - 70 * Math.sqrt(3)];
    L(A, B);
    arc(A, Cp, 14);
    arc(B, Cp, 14);
    L(A, Cp, C.blue, 2);
    L(B, Cp, C.blue, 2);
    out.push(dot(T(A), n("A"), -10, 8), dot(T(B), n("B"), 10, 8), dot(T(Cp), n("C"), 0, -12));
  } else {
    const O: Pt = [160, 130];
    const r = 100;
    const [cc] = [T(O)];
    out.push(`<circle cx="${f1(cc[0])}" cy="${f1(cc[1])}" r="${r}" fill="none" stroke="${C.ink}" stroke-width="2"/>`);
    const V = Array.from({ length: 6 }, (_, k) => at(O, r, 60 * k));
    for (let k = 0; k < 6; k++) {
      arc(V[k], V[(k + 1) % 6], 9);
      L(V[k], V[(k + 1) % 6], C.blue, 2);
    }
    out.push(dot(T(O), n("O"), 0, 18), ...V.map((v) => dot(T(v))));
  }
  return { body: out.join(""), w: W, h: H };
}
