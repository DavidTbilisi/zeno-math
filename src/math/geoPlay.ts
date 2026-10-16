// Shapes on a dot grid, made by tapping dots: the tasks (a rectangle, a triangle or a shape on the grid lines with a
// given area, and perimeter), the shape written as text so a practice answer can be stored and marked again on the
// server ("poly:1,1;5,1;5,4;1,4"), the marking itself in whole numbers (twice the area, so half squares stay whole),
// and what the geoboard on the board adds: a ladder of puzzles with stars, and things worth noticing while playing.
// Kept apart from the practice generators so the board can load it without the maths typesetting.
import { polyArea2, type Pt } from "./geometry";
import { isOpen, readLadder, withFound as foundIn, withStars, type Ladder } from "./ladder";
import { rng } from "./random";

export type GeoPt = Pt;
/** What the shape must be. area2 is twice the area (a triangle of 7½ squares is 15); grid: every side on a grid line. */
export type ShapeGoal = { area2?: number; perim?: number; rect?: boolean; sides?: 3; grid?: boolean };
/** A task on a dot grid of cols × rows squares (dots 0…cols across, 0…rows down). */
export type GeoPlay = { cols: number; rows: number; goal: ShapeGoal };
/** A task with a shape that does it (the answer shown and the one the tests type) and the numbers its words need. */
export type ShapeTask = { level: 1 | 2 | 3; play: GeoPlay; sample: GeoPt[]; dims: number[] };

export const GEO_COLS = 10;
export const GEO_ROWS = 8;
export const MAX_CORNERS = 12;

/** Why a shape can't be marked yet (sent back without counting), or why it isn't the shape asked for. */
export type PolyProblem = "unreadable" | "few" | "tooMany" | "offGrid" | "repeat" | "flat" | "crossing" | "notGrid" | "notRect" | "notTriangle";
export const POLY_PROBLEMS: PolyProblem[] = ["unreadable", "few", "tooMany", "offGrid", "repeat", "flat", "crossing", "notGrid", "notRect", "notTriangle"];
export type PolyVerdict = { ok: true } | { ok: false; problem?: PolyProblem };

// ---------- tasks ----------

/**
 * The task of a level, drawn from `next` (the practice question's generator, or the ladder's seed):
 * 1, a rectangle with an area; 2, a triangle with an area (half squares come in); 3, a shape along the grid lines with
 * an area and a perimeter (the sample is an L, whose perimeter is the rectangle's around it).
 */
export function polyTask(level: 1 | 2 | 3, next: () => number): ShapeTask {
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const at = (pts: GeoPt[]) => pts.map(([x, y]): GeoPt => [x + 1, y + 1]);
  const grid = { cols: GEO_COLS, rows: GEO_ROWS };
  if (level === 1) {
    const [w, h] = [int(2, 6), int(2, 5)];
    return { level, play: { ...grid, goal: { area2: 2 * w * h, rect: true } }, sample: at([[0, 0], [w, 0], [w, h], [0, h]]), dims: [w, h] };
  }
  if (level === 2) {
    const [b, h] = [int(2, 8), int(2, 6)];
    const top = int(0, b);
    return { level, play: { ...grid, goal: { area2: b * h, sides: 3 } }, sample: at([[0, h], [b, h], [top, 0]]), dims: [b, h] };
  }
  const [w, h] = [int(3, 6), int(3, 5)];
  const [cw, ch] = [int(1, w - 2), int(1, h - 2)];
  return {
    level,
    play: { ...grid, goal: { area2: 2 * (w * h - cw * ch), perim: 2 * (w + h), grid: true } },
    sample: at([[0, 0], [w, 0], [w, h - ch], [w - cw, h - ch], [w - cw, h], [0, h]]),
    dims: [w, h, cw, ch],
  };
}

/** An area written for people: 7, 7½, ½. */
export const areaText = (area2: number) => (area2 % 2 ? `${area2 > 1 ? (area2 - 1) / 2 : ""}½` : String(area2 / 2));

/**
 * The shapes a known mistake makes, with the numbers its message names (none when the numbers don't allow one):
 * at level 1 a rectangle whose perimeter is the area asked for; at level 2 a triangle whose base × height is the
 * area asked for, forgetting that a triangle is half of its rectangle.
 */
export function polyTraps(t: ShapeTask): { id: "areaPerimeter" | "triangleHalf"; goal: ShapeGoal; sample: GeoPt[]; vars: Record<string, string> }[] {
  const { cols, rows, goal } = t.play;
  const area2 = goal.area2!;
  if (t.level === 1 && area2 % 4 === 0) {
    const n = area2 / 2;
    for (let a = 1; a <= rows; a++) {
      const b = n / 2 - a;
      if (b >= 1 && b <= cols && a * b !== n) return [{ id: "areaPerimeter", goal: { perim: n, rect: true }, sample: [[0, 0], [b, 0], [b, a], [0, a]], vars: { n: String(n) } }];
    }
  }
  if (t.level === 2 && area2 % 2 === 0) {
    const n = area2 / 2;
    for (let b = 1; b <= cols; b++)
      if (n % b === 0 && n / b <= rows) return [{ id: "triangleHalf", goal: { area2: n, sides: 3 }, sample: [[0, n / b], [b, n / b], [0, 0]], vars: { n: String(n), d: String(2 * n) } }];
  }
  return [];
}

// ---------- the shape as text ----------

export const encodePoly = (pts: GeoPt[]) => `poly:${pts.map(([x, y]) => `${x},${y}`).join(";")}`;

/** The corners typed or stored ("poly:1,1;5,1;5,4", spaces allowed, "poly:" optional), or null when unreadable. */
export function decodePoly(src: string): GeoPt[] | null {
  const body = src.trim().replace(/^poly\s*:/i, "").trim();
  if (!body) return [];
  const parts = body.split(";");
  if (parts.length > 64) return null;
  const pts: GeoPt[] = [];
  for (const p of parts) {
    const m = p.trim().match(/^\(?\s*(-?\d{1,3})\s*,\s*(-?\d{1,3})\s*\)?$/);
    if (!m) return null;
    pts.push([Number(m[1]), Number(m[2])]);
  }
  return pts;
}

// ---------- measuring ----------

const sub = (a: GeoPt, b: GeoPt): GeoPt => [a[0] - b[0], a[1] - b[1]];
const cross = (a: GeoPt, b: GeoPt) => a[0] * b[1] - a[1] * b[0];
const dot = (a: GeoPt, b: GeoPt) => a[0] * b[0] + a[1] * b[1];
const turn = (a: GeoPt, b: GeoPt, c: GeoPt) => Math.sign(cross(sub(b, a), sub(c, a)));
const same = (a: GeoPt, b: GeoPt) => a[0] === b[0] && a[1] === b[1];
const between = (a: GeoPt, b: GeoPt, p: GeoPt) =>
  Math.min(a[0], b[0]) <= p[0] && p[0] <= Math.max(a[0], b[0]) && Math.min(a[1], b[1]) <= p[1] && p[1] <= Math.max(a[1], b[1]);

/** Whether two sides meet anywhere, ends included. */
function touch(p1: GeoPt, p2: GeoPt, q1: GeoPt, q2: GeoPt): boolean {
  const [d1, d2, d3, d4] = [turn(q1, q2, p1), turn(q1, q2, p2), turn(p1, p2, q1), turn(p1, p2, q2)];
  if (d1 * d2 < 0 && d3 * d4 < 0) return true;
  return (d1 === 0 && between(q1, q2, p1)) || (d2 === 0 && between(q1, q2, p2)) || (d3 === 0 && between(p1, p2, q1)) || (d4 === 0 && between(p1, p2, q2));
}

/** Why the corners don't make a shape (null: they do): too few or many, off the grid, a corner twice, flat, or sides that cross. */
export function shapeProblem(pts: GeoPt[], cols: number, rows: number): PolyProblem | null {
  const n = pts.length;
  if (n < 3) return "few";
  if (n > MAX_CORNERS) return "tooMany";
  if (pts.some(([x, y]) => x < 0 || y < 0 || x > cols || y > rows)) return "offGrid";
  if (pts.some((p, i) => pts.some((q, j) => j > i && same(p, q)))) return "repeat";
  if (pts.every((p) => turn(pts[0], pts[1], p) === 0)) return "flat";
  for (let i = 0; i < n; i++) {
    const [a, b, c] = [pts[i], pts[(i + 1) % n], pts[(i + 2) % n]];
    // Two sides in a row that go back along each other.
    if (turn(a, b, c) === 0 && dot(sub(a, b), sub(c, b)) > 0) return "crossing";
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (touch(a, b, pts[j], pts[(j + 1) % n])) return "crossing";
    }
  }
  return null;
}

/** The corners that turn: a dot in the middle of a straight side isn't a corner. */
export const corners = (pts: GeoPt[]) => pts.filter((v, i) => turn(pts[(i + pts.length - 1) % pts.length], v, pts[(i + 1) % pts.length]) !== 0);

const sides = (pts: GeoPt[]) => pts.map((p, i) => sub(pts[(i + 1) % pts.length], p));
export const onGridLines = (pts: GeoPt[]) => sides(pts).every(([dx, dy]) => dx === 0 || dy === 0);
const isRect = (c: GeoPt[]) => c.length === 4 && c.every((v, i) => dot(sub(c[(i + 3) % 4], v), sub(c[(i + 1) % 4], v)) === 0);

/** What a shape measures: twice its area, its perimeter (exact along the grid lines, else null) and roughly, and its kind. */
export type Measure = { area2: number; perim: number | null; around: number; corners: number; rect: boolean; square: boolean; tilted: boolean };
export function measurePoly(pts: GeoPt[]): Measure {
  const c = corners(pts);
  const s = sides(c);
  const rect = isRect(c);
  const square = rect && dot(s[0], s[0]) === dot(s[1], s[1]);
  return {
    area2: Math.abs(polyArea2(pts)),
    perim: onGridLines(pts) ? s.reduce((t, [dx, dy]) => t + Math.abs(dx) + Math.abs(dy), 0) : null,
    around: s.reduce((t, [dx, dy]) => t + Math.hypot(dx, dy), 0),
    corners: c.length,
    rect,
    square,
    tilted: square && !onGridLines(c),
  };
}

// ---------- marking ----------

/** The typed or stored shape against the task: whole numbers only, so the browser and the server always agree. */
export function judgePoly(play: GeoPlay, src: string): PolyVerdict {
  const pts = decodePoly(src);
  if (!pts) return { ok: false, problem: "unreadable" };
  const problem = shapeProblem(pts, play.cols, play.rows);
  if (problem) return { ok: false, problem };
  const { goal } = play;
  const m = measurePoly(pts);
  if (goal.grid && m.perim === null) return { ok: false, problem: "notGrid" };
  if ((goal.area2 !== undefined && m.area2 !== goal.area2) || (goal.perim !== undefined && m.perim !== goal.perim)) return { ok: false };
  if (goal.rect && !m.rect) return { ok: false, problem: "notRect" };
  if (goal.sides === 3 && m.corners !== 3) return { ok: false, problem: "notTriangle" };
  return { ok: true };
}

// ---------- making a shape by tapping ----------

/** The dot nearest a point, kept on the grid. */
export const snapPt = ([x, y]: [number, number], cols: number, rows: number): GeoPt => [
  Math.max(0, Math.min(cols, Math.round(x))),
  Math.max(0, Math.min(rows, Math.round(y))),
];
/** A tap on a dot: a new corner at the end, or the corner that was there taken off. */
export function tapDot(pts: GeoPt[], p: GeoPt): GeoPt[] {
  const i = pts.findIndex((q) => same(q, p));
  if (i >= 0) return pts.filter((_, j) => j !== i);
  return pts.length >= MAX_CORNERS ? pts : [...pts, p];
}
/** A corner dragged to another dot; onto another corner, nothing moves. */
export const moveCorner = (pts: GeoPt[], i: number, p: GeoPt): GeoPt[] =>
  pts.some((q, j) => j !== i && same(q, p)) ? pts : pts.map((q, j) => (j === i ? p : q));

// ---------- the ladder of puzzles, stars and things noticed ----------

/** The geoboard's puzzles: three of each level, each the practice question of that level and seed. */
export const GEO_LADDER: { level: 1 | 2 | 3; seed: number }[] = [
  { level: 1, seed: 2 },
  { level: 1, seed: 5 },
  { level: 1, seed: 9 },
  { level: 2, seed: 3 },
  { level: 2, seed: 8 },
  { level: 2, seed: 12 },
  { level: 3, seed: 4 },
  { level: 3, seed: 7 },
  { level: 3, seed: 15 },
];

/** The task of a puzzle on the ladder: the same as the practice question of its level and seed. */
export const ladderTask = (stage: number): ShapeTask => polyTask(GEO_LADDER[stage].level, rng(GEO_LADDER[stage].seed));

/** What the geoboard last said: a puzzle done (with its stars), a miss, a shape that can't be marked, or something noticed. */
export type GeoSaid = { kind: "right"; stars: number } | { kind: "wrong" } | { kind: "problem"; problem: PolyProblem } | { kind: "notice"; key: NoticeKey };
/**
 * The geoboard on the board: free play or the ladder's puzzle `stage`, the corners made, the misses and peeks so far,
 * and in free play the last whole shape made (cleared or not), to notice what the next one shares with it.
 */
export type LiveGeoboard = {
  mode: "free" | "puzzle";
  stage: number;
  pts: GeoPt[];
  misses: number;
  peeked: boolean;
  area: boolean;
  perim: boolean;
  said: GeoSaid | null;
  last?: Pick<Measure, "area2" | "perim"> | null;
};

/** Three stars first time without a peek at the numbers; a miss or two, or a peek, cost one each, down to one. */
export const starsFor = (misses: number, peeked: boolean) => Math.max(1, (misses === 0 ? 3 : misses <= 2 ? 2 : 1) - (peeked ? 1 : 0));

export type GeoProgress = Ladder<NoticeKey>;
export const readProgress = (json: string | null): GeoProgress => readLadder(json, GEO_LADDER.length, NOTICES);
export const withFound = (p: GeoProgress, k: NoticeKey) => foundIn(p, k, NOTICES);
export { isOpen, withStars };

/** Things worth noticing in free play, each said once a shape shows it. */
export type NoticeKey = "square" | "tiltedSquare" | "sameArea" | "samePerim";
export const NOTICES: NoticeKey[] = ["square", "tiltedSquare", "sameArea", "samePerim"];
/** What the new shape shows next to the one before it: a tilted square first, then a square, same area or same perimeter. */
export function notice(before: Pick<Measure, "area2" | "perim"> | null | undefined, now: Measure): NoticeKey | null {
  if (now.tilted) return "tiltedSquare";
  if (now.square) return "square";
  if (!before || before.perim === null || now.perim === null) return null;
  if (before.area2 === now.area2 && before.perim !== now.perim) return "sameArea";
  if (before.perim === now.perim && before.area2 !== now.area2) return "samePerim";
  return null;
}

// ---------- pictures ----------

/** The sides along the grid lines, to label with their lengths: the middle of each, which way is outside, and its length. */
export function gridSides(pts: GeoPt[]): { at: [number, number]; out: [number, number]; len: number }[] {
  const c = corners(pts);
  // Going round clockwise on the screen (y down), outside is to the left of each side.
  const orient = Math.sign(polyArea2(c)) || 1;
  return sides(c).flatMap(([dx, dy], i) =>
    dx !== 0 && dy !== 0 ? [] : [{ at: [c[i][0] + dx / 2, c[i][1] + dy / 2] as [number, number], out: [Math.sign(dy) * orient, -Math.sign(dx) * orient] as [number, number], len: Math.abs(dx + dy) }],
  );
}

const CELL = 26;
const PAD = 14;
const BLUE = "#1971c2";
const LABEL = `font-family="Helvetica, Arial, 'Noto Sans Georgian', Sylfaen, sans-serif"`;

/** The dot grid with a shape on it and the length of each side along the grid lines: a body to place, and its size. */
export function geoGridSvg(play: GeoPlay, pts: GeoPt[] = [], cell = CELL): { body: string; w: number; h: number } {
  const X = (x: number) => PAD + x * cell;
  const dots: string[] = [];
  for (let y = 0; y <= play.rows; y++) for (let x = 0; x <= play.cols; x++) dots.push(`<circle cx="${X(x)}" cy="${X(y)}" r="2.2" fill="#adb5bd"/>`);
  let shape = "";
  if (pts.length >= 3) {
    const labels = gridSides(pts).map(
      ({ at: [x, y], out: [ox, oy], len }) => `<text x="${X(x) + 12 * ox}" y="${X(y) + 12 * oy + 4}" font-size="13" text-anchor="middle" fill="${BLUE}" ${LABEL}>${len}</text>`,
    );
    shape =
      `<polygon points="${pts.map(([x, y]) => `${X(x)},${X(y)}`).join(" ")}" fill="${BLUE}" fill-opacity="0.18" stroke="${BLUE}" stroke-width="2.5" stroke-linejoin="round"/>` +
      pts.map(([x, y]) => `<circle cx="${X(x)}" cy="${X(y)}" r="4" fill="${BLUE}"/>`).join("") +
      labels.join("");
  }
  return { body: dots.join("") + shape, w: 2 * PAD + play.cols * cell, h: 2 * PAD + play.rows * cell };
}

/** The worked solution: the shape that does it on the grid, with the written steps beneath. */
export type ShapeSolution = { play: GeoPlay; pts: GeoPt[] };
export function renderShape(spec: ShapeSolution, steps: { svg: string; width: number; height: number } | null) {
  const pic = geoGridSvg(spec.play, spec.pts);
  const w = Math.max(pic.w, steps?.width ?? 0);
  const h = pic.h + (steps?.height ?? 0);
  const below = steps ? `<g transform="translate(0 ${pic.h})">${steps.svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")}</g>` : "";
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#ffffff"/><g transform="translate(${(w - pic.w) / 2} 0)">${pic.body}</g>${below}</svg>`,
    width: w,
    height: h,
  };
}
