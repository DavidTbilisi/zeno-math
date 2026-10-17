// Missing angles: a figure drawn to size with its angles marked, all but one given, and the one marked ? to find. Easy:
// angles on a straight line (180°) or in a right angle (90°); medium: angles around a point (360°) or in a triangle
// (180°); hard: the base angle of an isosceles triangle, or the last angle of a quadrilateral (360°). Because the
// figure is drawn to size, a wrong answer can be seen: the board's game draws the arm the answer would make. Using the
// wrong total (360° for a line, 180° for a whole turn) and not sharing what is left between an isosceles triangle's
// two base angles are the slips named.
import { arcPath, toward, withSteps } from "./angleGuess";
import { rng } from "./random";

export type HuntLevel = 1 | 2 | 3;
/**
 * A figure: arms from one point (on a straight line, in a right angle, around a point), the angles between them in
 * turn anticlockwise from the direction `turn`; or a polygon, its angles corner by corner (an isosceles triangle's apex
 * last). `ask` is the angle marked ?.
 */
export type HuntFig =
  | { kind: "line" | "right" | "point"; turn: number; parts: number[]; ask: number }
  | { kind: "triangle" | "iso" | "quad"; angles: number[]; ask: number; pts: [number, number][] };
export type HuntTask = { level: HuntLevel; fig: HuntFig; v: number };

/** What the angles of a figure add up to. */
export const totalOf = (kind: HuntFig["kind"]) => (kind === "right" ? 90 : kind === "point" || kind === "quad" ? 360 : 180);
export const anglesOf = (f: HuntFig) => ("parts" in f ? f.parts : f.angles);

/** Whole numbers from lo up that add up to total, n of them, from `int`. */
function split(total: number, n: number, lo: number, int: (a: number, b: number) => number): number[] {
  for (;;) {
    const cuts = Array.from({ length: n - 1 }, () => int(1, total - 1)).sort((a, b) => a - b);
    const parts = [...cuts, total].map((c, i) => c - (i ? cuts[i - 1] : 0));
    if (parts.every((p) => p >= lo)) return parts;
  }
}
/** A triangle's corners for its angles at the first two (the base along the bottom), in maths coordinates. */
function triangle(A: number, B: number): [number, number][] {
  const r = Math.PI / 180;
  const side = Math.sin(B * r) / Math.sin((180 - A - B) * r);
  return [[0, 0], [1, 0], [side * Math.cos(A * r), side * Math.sin(A * r)]];
}
/** A quadrilateral with these angles corner by corner, its first two sides drawn from `next`, or null. */
function quad(q: number[], next: () => number): [number, number][] | null {
  const r = Math.PI / 180;
  const dirs = [0, 180 - q[1]];
  dirs.push(dirs[1] + 180 - q[2], dirs[1] + 180 - q[2] + 180 - q[3]);
  const u = dirs.map((d) => [Math.cos(d * r), Math.sin(d * r)]);
  const [s0, s1] = [0.8 + 0.5 * next(), 0.8 + 0.5 * next()];
  // s2 u2 + s3 u3 = −(s0 u0 + s1 u1).
  const [bx, by] = [-(s0 * u[0][0] + s1 * u[1][0]), -(s0 * u[0][1] + s1 * u[1][1])];
  const det = u[2][0] * u[3][1] - u[3][0] * u[2][1];
  if (Math.abs(det) < 1e-9) return null;
  const s2 = (bx * u[3][1] - u[3][0] * by) / det;
  const s3 = (u[2][0] * by - bx * u[2][1]) / det;
  if (!(s2 > 0.55 && s3 > 0.55 && s2 < 1.8 && s3 < 1.8)) return null;
  const pts: [number, number][] = [[0, 0]];
  [s0, s1, s2].forEach((s, i) => pts.push([pts[i][0] + s * u[i][0], pts[i][1] + s * u[i][1]]));
  return pts;
}

export function huntTask(level: HuntLevel, next: () => number): HuntTask {
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const make = (fig: HuntFig): HuntTask => ({ level, fig, v: anglesOf(fig)[fig.ask] });
  if (level === 1) {
    if (next() < 0.6) {
      const parts = split(180, next() < 0.6 ? 2 : 3, 20, int);
      return make({ kind: "line", turn: 0, parts, ask: int(0, parts.length - 1) });
    }
    const parts = split(90, 2, 15, int);
    return make({ kind: "right", turn: 0, parts, ask: int(0, 1) });
  }
  if (level === 2) {
    if (next() < 0.5) {
      const parts = split(360, next() < 0.5 ? 3 : 4, 40, int);
      return make({ kind: "point", turn: 15 * int(0, 23), parts, ask: int(0, parts.length - 1) });
    }
    const angles = split(180, 3, 25, int);
    return make({ kind: "triangle", angles, ask: int(0, 2), pts: triangle(angles[0], angles[1]) });
  }
  if (next() < 0.5) {
    // The apex given, a base angle asked: (180 − apex) ÷ 2.
    const apex = 2 * int(10, 70);
    const b = (180 - apex) / 2;
    return make({ kind: "iso", angles: [b, b, apex], ask: int(0, 1), pts: triangle(b, b) });
  }
  for (;;) {
    const angles = split(360, 4, 60, int);
    if (angles.some((a) => a > 140)) continue;
    const pts = quad(angles, next);
    if (pts) return make({ kind: "quad", angles, ask: int(0, 3), pts });
  }
}

/** The angles given, those other than the one asked. */
export const givenOf = (f: HuntFig) => anglesOf(f).filter((_, i) => i !== f.ask);
/** The total a slip uses instead: 360° for a line or a triangle, 180° for a right angle or a whole turn. */
const wrongTotal = (kind: HuntFig["kind"]) => (kind === "line" || kind === "triangle" ? 360 : kind === "right" || kind === "point" || kind === "quad" ? 180 : null);
/** The answers a slip gives, with the numbers its message names. */
export function huntTraps(t: HuntTask): { id: "wrongTotal" | "notHalved"; v: number; vars: Record<string, number> }[] {
  const f = t.fig;
  if (f.kind === "iso") return [{ id: "notHalved", v: 180 - f.angles[2], vars: { a: f.angles[2], s: 180 - f.angles[2], v: t.v } }];
  const u = wrongTotal(f.kind)!;
  const k = givenOf(f).reduce((s, a) => s + a, 0);
  return u - k > 0 ? [{ id: "wrongTotal", v: u - k, vars: { t: totalOf(f.kind), u, k, v: t.v } }] : [];
}
/** The working: the total, less the angles given (shared out for an isosceles triangle's base). */
export function huntSteps(t: HuntTask): string[] {
  const f = t.fig;
  const d = (x: number) => `${x}^\\circ`;
  if (f.kind === "iso") return [`${d(180)} - ${d(f.angles[2])} = ${d(180 - f.angles[2])}`, `${d(180 - f.angles[2])} \\div 2 = ${d(t.v)}`];
  return [`${d(totalOf(f.kind))} - ${givenOf(f).map(d).join(" - ")} = ${d(t.v)}`];
}

// ---------- pictures ----------

const f1 = (x: number) => Math.round(x * 10) / 10;
const ASK = "#e8590c";
export const HUNT_W = 420;
export const HUNT_H = 320;
const text = (x: number, y: number, s: string, color: string, size = 19) =>
  `<text x="${f1(x)}" y="${f1(y + size / 3)}" font-size="${size}" font-weight="700" text-anchor="middle" fill="${color}">${s}</text>`;
/**
 * The figure as an SVG body of HUNT_W × HUNT_H, the angle asked marked ? (or `answer` once answered); `ghost` adds,
 * for arms from a point, the arm that many degrees would make, dashed.
 */
export function huntSvg(f: HuntFig, o: { answer?: number; ghost?: number } = {}): { body: string; w: number; h: number } {
  const label = (i: number, v: number) => (i === f.ask ? (o.answer === undefined ? "?" : `${o.answer}°`) : `${v}°`);
  const color = (i: number) => (i === f.ask ? ASK : "#1e1e1e");
  let body = "";
  if ("parts" in f) {
    const R = 130;
    const [cx, cy] = f.kind === "point" ? [HUNT_W / 2, HUNT_H / 2] : f.kind === "line" ? [HUNT_W / 2, HUNT_H - 70] : [HUNT_W / 2 - 90, HUNT_H - 50];
    const arm = (deg: number, extra = "") => {
      const [x, y] = toward(cx, cy, R, deg);
      return `<line x1="${cx}" y1="${cy}" x2="${f1(x)}" y2="${f1(y)}" stroke="#1e1e1e" stroke-width="3" stroke-linecap="round"${extra}/>`;
    };
    let at = f.turn;
    f.parts.forEach((p, i) => {
      const r = 30 + (i % 2) * 10;
      body += `<path d="${arcPath(cx, cy, r, at, p)}" fill="none" stroke="${color(i)}" stroke-width="2.5"/>`;
      const [x, y] = toward(cx, cy, p < 30 ? 92 : 66, at + p / 2);
      body += text(x, y, label(i, p), color(i));
      if (i === f.ask && o.ghost !== undefined) {
        const [gx, gy] = toward(cx, cy, R, at + o.ghost);
        body += `<line x1="${cx}" y1="${cy}" x2="${f1(gx)}" y2="${f1(gy)}" stroke="${ASK}" stroke-width="3" stroke-dasharray="8 6"/>`;
        const [tx, ty] = toward(cx, cy, R + 18, at + o.ghost);
        body += text(tx, ty, `${o.ghost}°`, ASK, 16);
      }
      at += p;
    });
    // The arms: every boundary (a whole turn's first one once), and for a line its other end.
    const ends = f.parts.map((_, i) => f.turn + f.parts.slice(0, i).reduce((s, p) => s + p, 0));
    if (f.kind !== "point") ends.push(f.turn + totalOf(f.kind));
    body += ends.map((e) => arm(e)).join("");
    if (f.kind === "right") {
      const [ax, ay] = toward(cx, cy, 14, f.turn);
      const [bx, by] = toward(cx, cy, 14, f.turn + 90);
      body += `<path d="M${f1(ax)},${f1(ay)} L${f1(ax + bx - cx)},${f1(ay + by - cy)} L${f1(bx)},${f1(by)}" fill="none" stroke="#1e1e1e" stroke-width="1.5"/>`;
    }
    body += `<circle cx="${cx}" cy="${cy}" r="4" fill="#1e1e1e"/>`;
    return { body, w: HUNT_W, h: HUNT_H };
  }
  // A polygon: fitted to the box, maths y upwards.
  const xs = f.pts.map((p) => p[0]);
  const ys = f.pts.map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const s = Math.min((HUNT_W - 80) / (maxX - minX), (HUNT_H - 70) / (maxY - minY));
  const P = f.pts.map(([x, y]): [number, number] => [(HUNT_W - s * (maxX - minX)) / 2 + s * (x - minX), HUNT_H - (HUNT_H - s * (maxY - minY)) / 2 - s * (y - minY)]);
  body += `<path d="M${P.map(([x, y]) => `${f1(x)},${f1(y)}`).join(" L")} Z" fill="#e7f5ff" stroke="#1e1e1e" stroke-width="3" stroke-linejoin="round"/>`;
  const n = P.length;
  P.forEach(([x, y], i) => {
    const dir = (q: [number, number]) => (Math.atan2(-(q[1] - y), q[0] - x) * 180) / Math.PI;
    const a = dir(P[(i + 1) % n]);
    const b = dir(P[(i + n - 1) % n]);
    const v = f.angles[i];
    // The arc from one side to the other through the inside: whichever way round spans the angle.
    const start = Math.abs((((b - a) % 360) + 360) % 360 - v) < 1 ? a : b;
    body += `<path d="${arcPath(x, y, 24, start, v)}" fill="none" stroke="${color(i)}" stroke-width="2.5"/>`;
    const [lx, ly] = toward(x, y, v < 50 ? 62 : 48, start + v / 2);
    body += text(lx, ly, label(i, v), color(i), 17);
  });
  if (f.kind === "iso") {
    // The two equal sides, ticked.
    for (const k of [0, 1]) {
      const [mx, my] = [(P[k][0] + P[2][0]) / 2, (P[k][1] + P[2][1]) / 2];
      const [dx, dy] = [P[2][0] - P[k][0], P[2][1] - P[k][1]];
      const len = Math.hypot(dx, dy);
      const [nx, ny] = [(-dy / len) * 8, (dx / len) * 8];
      body += `<line x1="${f1(mx - nx)}" y1="${f1(my - ny)}" x2="${f1(mx + nx)}" y2="${f1(my + ny)}" stroke="#1e1e1e" stroke-width="2.5"/>`;
    }
  }
  return { body, w: HUNT_W, h: HUNT_H };
}

// ---------- the board's game ----------

export const HUNT_LADDER: { level: HuntLevel; seed: number }[] = [
  { level: 1, seed: 802 },
  { level: 1, seed: 801 },
  { level: 1, seed: 800 },
  { level: 2, seed: 814 },
  { level: 2, seed: 810 },
  { level: 2, seed: 811 },
  { level: 3, seed: 821 },
  { level: 3, seed: 820 },
  { level: 3, seed: 826 },
];
/** Stars: right first time three, after one miss two, else one. */
export const huntStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);
export type HuntNotice = "wholeTurn" | "tiny" | "isosceles" | "streak10";
export const HUNT_NOTICES: HuntNotice[] = ["wholeTurn", "tiny", "isosceles", "streak10"];
/** What an angle found shows: a whole turn's last angle, one under 30°, an isosceles base angle, each first time; ten in a row. */
export function huntNotice(t: HuntTask, misses: number, streak: number): HuntNotice | null {
  if (streak === 10) return "streak10";
  if (misses > 0) return null;
  if (t.fig.kind === "iso") return "isosceles";
  if (t.fig.kind === "point") return "wholeTurn";
  if (t.v < 30) return "tiny";
  return null;
}
export type LiveAngleHunt = {
  mode: "puzzle" | "endless";
  stage: number;
  level: HuntLevel;
  seed: number;
  typed: string;
  misses: number;
  done: boolean;
  streak: number;
  said: { kind: "notice"; key: HuntNotice } | { kind: "wrong"; v: number } | null;
};
export const huntNow = (d: Pick<LiveAngleHunt, "mode" | "stage" | "level" | "seed">): HuntTask =>
  d.mode === "puzzle" ? huntTask(HUNT_LADDER[d.stage].level, rng(HUNT_LADDER[d.stage].seed)) : huntTask(d.level, rng(d.seed));

/** The worked solution: the figure with the angle filled in, and the working beneath. */
export type HuntSolution = { task: HuntTask };
export function renderHunt(spec: HuntSolution, steps: { svg: string; width: number; height: number } | null) {
  return withSteps(huntSvg(spec.task.fig, { answer: spec.task.v }), steps);
}
