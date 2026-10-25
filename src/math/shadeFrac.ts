// Shade the fraction: a shape cut into equal pieces — a bar, a grid, a circle, or a set of counters — and a fraction
// of it to shade. Easy: as many pieces as the bottom (¾ of 4); medium: two to four times as many (¾ of 12, so 9);
// hard: the same with counters too, up to 30 pieces (⅔ of 18). Any pieces will do, as long as there are the right
// number. The answer is the pieces shaded ("shade:0,1,5"), so the server can mark it again. Shading the top number of
// pieces (3 for ¾ of 12) is the slip named.
import { rng } from "./random";
import type { EndlessGame, TryGame } from "./ladder";

export type ShadeLevel = 1 | 2 | 3;
export type ShapeKind = "bar" | "grid" | "circle" | "set";
/** A shape cut into `pieces` (rows × cols for a grid or a set) and the fraction n/d of it to shade: `count` pieces. */
export type ShadePlay = { shape: ShapeKind; pieces: number; rows: number; cols: number };
export type ShadeTask = { level: ShadeLevel; n: number; d: number; play: ShadePlay; count: number };

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
/** Rows × cols for `p` pieces, as near square as goes (wider than tall). */
function grid(p: number): [number, number] {
  let r = Math.floor(Math.sqrt(p));
  while (p % r) r--;
  return [r, p / r];
}

export function shadeTask(level: ShadeLevel, next: () => number): ShadeTask {
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  for (;;) {
    const d = int(2, level === 1 ? 8 : 6);
    const n = int(1, d - 1);
    if (gcd(n, d) !== 1) continue;
    const m = level === 1 ? 1 : int(2, level === 2 ? 4 : 5);
    const pieces = d * m;
    if (pieces > (level === 3 ? 30 : 24)) continue;
    const kinds: ShapeKind[] = level === 1 ? ["bar", "circle"] : level === 2 ? ["bar", "grid", "circle"] : ["grid", "circle", "set", "set"];
    const shape = kinds[int(0, kinds.length - 1)];
    // A bar longer than twelve pieces gets too thin: a grid instead.
    const kind: ShapeKind = shape === "bar" && pieces > 12 ? "grid" : shape;
    const [rows, cols] = kind === "bar" || kind === "circle" ? [1, pieces] : grid(pieces);
    return { level, n, d, play: { shape: kind, pieces, rows, cols }, count: n * m };
  }
}

// ---------- the shading as text ----------

export const encodeShade = (shaded: number[]) => `shade:${[...new Set(shaded)].sort((a, b) => a - b).join(",")}`;
/** The pieces shaded ("shade:0,1,5"; "shade:" for none), or null when unreadable. */
export function decodeShade(src: string): number[] | null {
  const body = src.trim().replace(/^shade\s*:/i, "").trim();
  if (!body) return [];
  const parts = body.split(/[,;\s]+/);
  if (parts.length > 64 || parts.some((p) => !/^\d{1,3}$/.test(p))) return null;
  return parts.map(Number);
}
export type ShadeVerdict = { ok: true } | { ok: false; problem: "unreadable" | "none" | "outside" | "twice" } | { ok: false; shaded: number };
/** The shading against the number of pieces asked for. */
export function judgeShade(play: Pick<ShadePlay, "pieces">, count: number, src: string): ShadeVerdict {
  const s = decodeShade(src);
  if (!s) return { ok: false, problem: "unreadable" };
  if (!s.length) return { ok: false, problem: "none" };
  if (s.some((i) => i >= play.pieces)) return { ok: false, problem: "outside" };
  if (new Set(s).size !== s.length) return { ok: false, problem: "twice" };
  return s.length === count ? { ok: true } : { ok: false, shaded: s.length };
}

// ---------- pieces as shapes ----------

/** A piece to draw: a rectangle, a circle sector (as a path), or a counter. */
export type PieceShape = { kind: "rect"; x: number; y: number; w: number; h: number } | { kind: "path"; d: string } | { kind: "dot"; cx: number; cy: number; r: number };
/** The pieces of the shape, laid out in a box of about `size` across. */
export function piecesOf(p: ShadePlay, size = 300): PieceShape[] {
  if (p.shape === "circle") {
    const [c, R] = [size / 2, size / 2 - 4];
    const at = (k: number) => {
      const a = ((360 * k) / p.pieces - 90) * (Math.PI / 180);
      return `${(c + R * Math.cos(a)).toFixed(2)},${(c + R * Math.sin(a)).toFixed(2)}`;
    };
    return Array.from({ length: p.pieces }, (_, k) => ({ kind: "path", d: p.pieces === 1 ? "" : `M${c},${c} L${at(k)} A${R},${R} 0 0 1 ${at(k + 1)} Z` }));
  }
  if (p.shape === "bar") {
    const w = size / p.pieces;
    return Array.from({ length: p.pieces }, (_, k) => ({ kind: "rect", x: k * w, y: 0, w, h: Math.min(70, size / 3) }));
  }
  const cell = Math.min(size / p.cols, 260 / p.rows);
  return Array.from({ length: p.pieces }, (_, k) => {
    const [r, c] = [Math.floor(k / p.cols), k % p.cols];
    return p.shape === "set"
      ? { kind: "dot", cx: c * cell + cell / 2, cy: r * cell + cell / 2, r: cell * 0.36 }
      : { kind: "rect", x: c * cell, y: r * cell, w: cell, h: cell };
  });
}
/** The box the pieces take up. */
export function shapeBox(p: ShadePlay, size = 300): { w: number; h: number } {
  if (p.shape === "circle") return { w: size, h: size };
  if (p.shape === "bar") return { w: size, h: Math.min(70, size / 3) };
  const cell = Math.min(size / p.cols, 260 / p.rows);
  return { w: cell * p.cols, h: cell * p.rows };
}

export const SHADE = "#4dabf7";
/** The shape with the pieces in `shaded` coloured in: an SVG body and its size. */
export function shadeSvg(p: ShadePlay, shaded: number[], size = 300): { body: string; w: number; h: number } {
  const on = new Set(shaded);
  const body = piecesOf(p, size)
    .map((s, k) => {
      const fill = on.has(k) ? SHADE : "#ffffff";
      if (s.kind === "rect") return `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="${fill}" stroke="#1e1e1e" stroke-width="2"/>`;
      if (s.kind === "dot") return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" fill="${fill}" stroke="#1e1e1e" stroke-width="2"/>`;
      return `<path d="${s.d}" fill="${fill}" stroke="#1e1e1e" stroke-width="2"/>`;
    })
    .join("");
  return { body, ...shapeBox(p, size) };
}
export type ShadeSolution = { play: ShadePlay; count: number };
export function renderShade(spec: ShadeSolution, steps: { svg: string; width: number; height: number } | null) {
  const pic = shadeSvg(spec.play, Array.from({ length: spec.count }, (_, k) => k), 260);
  const [pw, ph] = [pic.w + 20, pic.h + 20];
  const w = Math.max(pw, steps?.width ?? 0);
  const h = ph + (steps?.height ?? 0);
  const below = steps ? `<g transform="translate(0 ${ph})">${steps.svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")}</g>` : "";
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#ffffff"/><g transform="translate(${(w - pic.w) / 2} 10)">${pic.body}</g>${below}</svg>`,
    width: w,
    height: h,
  };
}

// ---------- the board's game ----------

export const SHADE_LADDER: { level: ShadeLevel; seed: number }[] = [
  { level: 1, seed: 221 },
  { level: 1, seed: 222 },
  { level: 1, seed: 223 },
  { level: 2, seed: 231 },
  { level: 2, seed: 232 },
  { level: 2, seed: 233 },
  { level: 3, seed: 241 },
  { level: 3, seed: 242 },
  { level: 3, seed: 243 },
];
/** Stars: right first time three, after one miss two, else one. */
export const shadeStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);
/** Whether the pieces shaded are all side by side (in a row, or round the circle) — or scattered. */
export function scattered(p: ShadePlay, shaded: number[]): boolean {
  const s = [...shaded].sort((a, b) => a - b);
  if (s.length < 2) return false;
  if (p.shape === "bar" || p.shape === "circle") {
    const gaps = s.filter((k, i) => i > 0 && k - s[i - 1] > 1).length + (p.shape === "circle" && s[0] + p.pieces - s.at(-1)! > 1 ? 1 : 0);
    return gaps > (p.shape === "circle" ? 1 : 0);
  }
  // A grid or a set: scattered when some shaded piece has no shaded neighbour beside, above or below it.
  const on = new Set(s);
  return s.some((k) => ![k - 1, k + 1, k - p.cols, k + p.cols].some((j) => on.has(j) && (Math.abs(j - k) !== 1 || Math.floor(j / p.cols) === Math.floor(k / p.cols))));
}
export type ShadeNotice = "scattered" | "manyPieces" | "ofASet" | "streak10";
export const SHADE_NOTICES: ShadeNotice[] = ["scattered", "manyPieces", "ofASet", "streak10"];
/** What a right shading shows: pieces not side by side, twenty or more pieces, a fraction of a set, ten in a row. */
export function shadeNotice(t: ShadeTask, shaded: number[], streak: number): ShadeNotice | null {
  if (streak === 10) return "streak10";
  if (scattered(t.play, shaded)) return "scattered";
  if (t.play.shape === "set") return "ofASet";
  if (t.play.pieces >= 20) return "manyPieces";
  return null;
}
export type LiveShade = EndlessGame<ShadeNotice, ShadeLevel, { kind: "wrong"; shaded: number }> &
  TryGame & {
    shaded: number[];
  };
export const shadeNow = (d: Pick<LiveShade, "mode" | "stage" | "level" | "seed">): ShadeTask =>
  d.mode === "puzzle" ? shadeTask(SHADE_LADDER[d.stage].level, rng(SHADE_LADDER[d.stage].seed)) : shadeTask(d.level, rng(d.seed));
