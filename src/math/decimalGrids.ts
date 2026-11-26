// Pictures for decimals (#704): hundredths grids, a big square for each whole cut into 10 columns (tenths) of 10
// small squares (hundredths), shaded a column at a time. A second amount is drawn orange beside the first (added), or
// the last of the first crossed out (taken away). Nothing in the picture writes the answer.
import { r2 } from "./chart";
import type { Exercise } from "./practiceTypes";

const INK = "#1e1e1e";
const BLUE = "#a5d8ff";
const ORANGE = "#ffc078";

export type GridAmount = {
  /** Hundredths shaded blue, from the top of the first column down, a column at a time. */
  a: number;
  /** Hundredths shaded orange after them. */
  b?: number;
  /** The last this many of the blue crossed out. */
  out?: number;
};

/** Grids side by side, each one whole; cell 15 px. */
export function hundredthsGrids(grids: GridAmount[]): Exercise["pic"] {
  const [C, gap] = [15, 22];
  const S = 10 * C;
  const out: string[] = [];
  grids.forEach((g, k) => {
    const x0 = k * (S + gap);
    for (let i = 0; i < 100; i++) {
      const [col, row] = [Math.floor(i / 10), i % 10];
      const [x, y] = [x0 + col * C, row * C];
      const fill = i < g.a ? BLUE : i < g.a + (g.b ?? 0) ? ORANGE : "#ffffff";
      out.push(`<rect x="${r2(x)}" y="${r2(y)}" width="${C}" height="${C}" fill="${fill}" stroke="#868e96" stroke-width="0.6"/>`);
      if (g.out && i >= g.a - g.out && i < g.a) out.push(`<path d="M ${r2(x + 3)} ${r2(y + 3)} L ${r2(x + C - 3)} ${r2(y + C - 3)} M ${r2(x + C - 3)} ${r2(y + 3)} L ${r2(x + 3)} ${r2(y + C - 3)}" stroke="#e03131" stroke-width="1.6"/>`);
    }
    for (let c = 0; c <= 10; c++) out.push(`<line x1="${x0 + c * C}" y1="0" x2="${x0 + c * C}" y2="${S}" stroke="${INK}" stroke-width="${c % 10 === 0 ? 2 : 1.2}"/>`);
    out.push(`<line x1="${x0}" y1="0" x2="${x0 + S}" y2="0" stroke="${INK}" stroke-width="2"/><line x1="${x0}" y1="${S}" x2="${x0 + S}" y2="${S}" stroke="${INK}" stroke-width="2"/>`);
  });
  const w = grids.length * (S + gap) - gap;
  return { svg: (x: number, y: number) => `<g transform="translate(${r2(x + 1)} ${r2(y + 1)})">${out.join("")}</g>`, w: w + 2, h: S + 2 };
}
