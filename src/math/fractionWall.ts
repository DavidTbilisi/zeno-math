// Make a whole: a bar with some fraction tiles already in it (½ and ⅓), and tiles of one family (halves, quarters and
// eighths; thirds, sixths and twelfths; …) to fill the gap to exactly the target — 1, or ¾, ⅚, 1½ at hard. Any fill
// that comes to exactly the gap is right; the fewest tiles that do it is the best. The practice question asks for the
// missing fraction itself (½ + ⅓ + ? = 1), with the bar drawn.
import { Frac } from "./fraction";
import { rng } from "./random";

export type WallLevel = 1 | 2 | 3;
/** Tiles are unit fractions, named by their bottoms: 3 is ⅓. */
export type WallTask = { level: WallLevel; target: Frac; fixed: number[]; sizes: number[]; gap: Frac; fewest: number[] };

const FAMILIES = [[2, 4, 8], [2, 3, 6, 12], [2, 5, 10], [3, 6, 12]];
const TARGETS_HARD: [number, number, number[]][] = [[3, 4, [2, 4, 8]], [2, 3, [3, 6, 12]], [5, 6, [2, 3, 6, 12]], [3, 2, [2, 4, 8]], [5, 4, [2, 4, 8]]];
export const sumOf = (tiles: number[]) => tiles.reduce((s, d) => s.add(new Frac(1, d)), Frac.ZERO);
export const lcm = (ds: number[]) => ds.reduce((l, d) => (l * d) / gcd(l, d), 1);
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/** The fewest tiles of these sizes that make exactly `gap` (largest first), or null when none can. */
export function fewestTiles(gap: Frac, sizes: number[]): number[] | null {
  const L = lcm([...sizes, gap.d]);
  const units = (gap.n * L) / gap.d;
  const best: (number[] | null)[] = [[]];
  for (let u = 1; u <= units; u++) {
    best[u] = null;
    for (const d of sizes) {
      const prev = best[u - L / d];
      if (u - L / d >= 0 && prev && (!best[u] || prev.length + 1 < best[u]!.length)) best[u] = [...prev, d];
    }
  }
  return best[units]?.sort((a, b) => a - b) ?? null;
}

export function wallTask(level: WallLevel, next: () => number): WallTask {
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const pick = <T>(a: readonly T[]) => a[int(0, a.length - 1)];
  for (;;) {
    let [target, sizes] = [Frac.ONE, level === 1 ? FAMILIES[0] : pick(FAMILIES.slice(1))];
    if (level === 3) {
      const [n, d, family] = pick(TARGETS_HARD);
      [target, sizes] = [new Frac(n, d), family];
    }
    const fixed = Array.from({ length: level === 1 ? int(1, 2) : level === 2 ? 2 : int(2, 3) }, () => pick(sizes)).sort((a, b) => a - b);
    const gap = target.sub(sumOf(fixed));
    // A gap the one tile already in it doesn't simply repeat, and not the whole bar.
    if (gap.isNeg() || gap.isZero() || (fixed.length === 1 && gap.n === 1 && gap.d === fixed[0])) continue;
    const fewest = fewestTiles(gap, sizes);
    if (fewest) return { level, target, fixed, sizes, gap, fewest };
  }
}

/** What a fill comes to against the gap: not yet, exactly, or over. */
export function fillState(t: Pick<WallTask, "gap">, placed: number[]): "short" | "exact" | "over" {
  const s = sumOf(placed).sub(t.gap);
  return s.isZero() ? "exact" : s.isNeg() ? "short" : "over";
}
/** Stars for a fill that comes to exactly the gap: three with the fewest tiles, else two. */
export const wallStars = (t: Pick<WallTask, "fewest">, placed: number[]) => (placed.length <= t.fewest.length ? 3 : 2);

/** The sum with tops and bottoms added (½ + ⅓ as 2/5): the gap that mistake gives, when it gives a different one. */
export function acrossGap(t: WallTask): { gap: Frac; across: Frac; big: number } | null {
  if (t.fixed.length !== 2) return null;
  const across = new Frac(2, t.fixed[0] + t.fixed[1]);
  const gap = t.target.sub(across);
  // Never the right gap: 1/a + 1/b is 2/(a + b) for no a and b.
  return gap.isNeg() || gap.isZero() ? null : { gap, across, big: Math.min(...t.fixed) };
}

// ---------- the board's game ----------

export const WALL_LADDER: { level: WallLevel; seed: number }[] = [
  { level: 1, seed: 131 },
  { level: 1, seed: 132 },
  { level: 1, seed: 133 },
  { level: 2, seed: 141 },
  { level: 2, seed: 142 },
  { level: 2, seed: 143 },
  { level: 3, seed: 151 },
  { level: 3, seed: 152 },
  { level: 3, seed: 153 },
];
export type WallNotice = "oneTile" | "threeSizes" | "manySame" | "streak10";
export const WALL_NOTICES: WallNotice[] = ["oneTile", "threeSizes", "manySame", "streak10"];
/** What an exact fill shows: one tile that fits the gap, three sizes at once, six or more of one size, ten in a row. */
export function wallNotice(placed: number[], streak: number): WallNotice | null {
  if (streak === 10) return "streak10";
  if (placed.length === 1) return "oneTile";
  if (new Set(placed).size >= 3) return "threeSizes";
  if (placed.length >= 6 && new Set(placed).size === 1) return "manySame";
  return null;
}
export type LiveWall = {
  mode: "puzzle" | "endless";
  stage: number;
  level: WallLevel;
  seed: number;
  /** The tiles put in the gap, in order. */
  placed: number[];
  /** The best stars this puzzle has earned so far (a fill with more tiles, then the fewest). */
  best: number;
  streak: number;
  said: { kind: "notice"; key: WallNotice } | null;
};
export const wallNow = (d: Pick<LiveWall, "mode" | "stage" | "level" | "seed">): WallTask =>
  d.mode === "puzzle" ? wallTask(WALL_LADDER[d.stage].level, rng(WALL_LADDER[d.stage].seed)) : wallTask(d.level, rng(d.seed));

// ---------- pictures ----------

/** Each bottom's colour, as on a fraction wall. */
export const TILE_COLORS: Record<number, string> = { 1: "#ffc9c9", 2: "#ffd8a8", 3: "#ffec99", 4: "#d8f5a2", 5: "#b2f2bb", 6: "#96f2d7", 8: "#a5d8ff", 10: "#d0bfff", 12: "#eebefa" };
const LABEL = `font-family="Helvetica, Arial, 'Noto Sans Georgian', Sylfaen, sans-serif"`;
/** A fraction written top over bottom, centred on (x, y): an SVG string. */
export function fracSvg(n: number, d: number, x: number, y: number, size = 16, color = "#1e1e1e"): string {
  if (d === 1) return `<text x="${x}" y="${y + size * 0.35}" font-size="${size}" text-anchor="middle" fill="${color}" ${LABEL}>${n}</text>`;
  const w = Math.max(String(n).length, String(d).length) * size * 0.6 + 4;
  return (
    `<text x="${x}" y="${y - size * 0.15}" font-size="${size}" text-anchor="middle" fill="${color}" ${LABEL}>${n}</text>` +
    `<line x1="${x - w / 2}" y1="${y + size * 0.05}" x2="${x + w / 2}" y2="${y + size * 0.05}" stroke="${color}" stroke-width="1.5"/>` +
    `<text x="${x}" y="${y + size * 0.95}" font-size="${size}" text-anchor="middle" fill="${color}" ${LABEL}>${d}</text>`
  );
}
/** The bar: the tiles in it, then (for the question) the gap with a "?", or (for the solution) the tiles that fill it. */
export function wallSvg(t: WallTask, fill: number[] | null, width = 460): { body: string; w: number; h: number } {
  const unit = (width - 20) / Math.max(1, t.target.toNumber());
  const [y, h] = [10, 56];
  let x = 10;
  let body = "";
  const tile = (d: number, dashed = false) => {
    const w = unit / d;
    body +=
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${dashed ? "#ffffff" : TILE_COLORS[d] ?? "#e9ecef"}" stroke="${dashed ? "#2f9e44" : "#495057"}" stroke-width="${dashed ? 2.5 : 1.5}"/>` +
      (w >= 22 ? fracSvg(1, d, x + w / 2, y + h / 2, 15) : "");
    x += w;
  };
  t.fixed.forEach((d) => tile(d));
  if (fill) fill.forEach((d) => tile(d, true));
  else {
    const w = unit * t.gap.toNumber();
    body += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#f8f9fa" stroke="#868e96" stroke-width="1.5" stroke-dasharray="6 4"/><text x="${x + w / 2}" y="${y + h / 2 + 9}" font-size="26" font-weight="700" text-anchor="middle" fill="#868e96" ${LABEL}>?</text>`;
  }
  // The target's end, and where 1 is when the target is more.
  const end = 10 + unit * t.target.toNumber();
  body += `<line x1="${end}" y1="${y - 6}" x2="${end}" y2="${y + h + 6}" stroke="#1e1e1e" stroke-width="3"/>`;
  if (t.target.toNumber() > 1) body += `<line x1="${10 + unit}" y1="${y + h}" x2="${10 + unit}" y2="${y + h + 12}" stroke="#1e1e1e" stroke-width="2"/><text x="${10 + unit}" y="${y + h + 26}" font-size="13" text-anchor="middle" fill="#495057" ${LABEL}>1</text>`;
  return { body, w: width, h: y + h + (t.target.toNumber() > 1 ? 32 : 14) };
}

/** The worked solution: the gap filled with the fewest tiles, with the written steps beneath. */
export type WallSolution = { task: WallTask };
export function renderWall(spec: WallSolution, steps: { svg: string; width: number; height: number } | null) {
  const pic = wallSvg(spec.task, spec.task.fewest);
  const w = Math.max(pic.w, steps?.width ?? 0);
  const h = pic.h + (steps?.height ?? 0);
  const below = steps ? `<g transform="translate(0 ${pic.h})">${steps.svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")}</g>` : "";
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#ffffff"/><g transform="translate(${(w - pic.w) / 2} 0)">${pic.body}</g>${below}</svg>`,
    width: w,
    height: h,
  };
}
