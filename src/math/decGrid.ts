// A hundredths grid worked by hand (#704): a big square for each whole, cut into 10 columns of 10 small squares. The
// pupil shades small squares to make the amount asked, and the amount shaded so far is written under the grids as a
// decimal, so what a small square and a column are worth is found by trying: 3 squares give 0.03, not 0.3. Only once
// an amount is made is its rule said (a small square is a hundredth; a column, ten of them, is a tenth; a grid is a
// whole); the rules found so far stay listed. After the ladder the grids are free to shade.
// src/live/DecGrid.tsx draws it; everything here is plain data.

export type LiveDecGrid = {
  /** The shaded small squares: square i (0–99, down the first column, then the next) of grid k is 100k + i. */
  shaded: number[];
  /** The rung of the ladder being worked (LADDER.length once it is all done: free shading). */
  step: number;
};

export type DecRule = "hundredth" | "tenth" | "both" | "whole";
/** The amounts asked, in hundredths, and the rule each one makes the pupil find. */
export const LADDER: { n: number; rule?: DecRule }[] = [
  { n: 7, rule: "hundredth" },
  { n: 13 },
  { n: 30, rule: "tenth" },
  { n: 60 },
  { n: 47, rule: "both" },
  { n: 85 },
  { n: 120, rule: "whole" },
  { n: 106 },
];
export const GRIDS = 2;
export const CELLS = 100 * GRIDS;
export const DEC_GRID_START: LiveDecGrid = { shaded: [], step: 0 };

/** n hundredths as a decimal: 7 → "0.07", 30 → "0.3", 120 → "1.2", 100 → "1". */
export function decimalOf(n: number): string {
  const [w, f] = [Math.floor(n / 100), n % 100];
  if (!f) return String(w);
  return `${w}.${String(f).padStart(2, "0").replace(/0$/, "")}`;
}
/** n hundredths with both places written: 30 → "0.30". */
export const twoPlaces = (n: number) => `${Math.floor(n / 100)}.${String(n % 100).padStart(2, "0")}`;

const clean = (cells: number[]) => [...new Set(cells.filter((i) => Number.isInteger(i) && i >= 0 && i < CELLS))].sort((a, b) => a - b);

/** The given squares set to shaded (`on`) or not. */
export function paint(shaded: number[], cells: number[], on: boolean): number[] {
  const set = new Set(shaded);
  for (const i of cells) (on ? set.add(i) : set.delete(i));
  return clean([...set]);
}

/** One more square, the first empty one; or one fewer, the last shaded one. A whole column at a time with `col`. */
export function nudge(shaded: number[], up: boolean, col = false): number[] {
  let out = clean(shaded);
  for (let k = 0; k < (col ? 10 : 1); k++) {
    if (up) {
      const free = Array.from({ length: CELLS }, (_, i) => i).find((i) => !out.includes(i));
      if (free === undefined) break;
      out = clean([...out, free]);
    } else out = out.slice(0, -1);
  }
  return out;
}

/** The amount asked now, in hundredths, or null once the ladder is done. */
export const asked = (s: LiveDecGrid) => LADDER[s.step]?.n ?? null;
/** The amount asked is made. */
export const made = (s: LiveDecGrid) => asked(s) !== null && s.shaded.length === asked(s);
/** How many grids are drawn: the second once an amount past one is asked, or shaded, or the ladder is done. */
export const gridsShown = (s: LiveDecGrid) => (s.step >= LADDER.findIndex((r) => r.n > 100) || s.shaded.some((i) => i >= 100) ? 2 : 1);

/** The rules found: those of the rungs passed, and this rung's once its amount is made. */
export function rulesFound(s: LiveDecGrid): { rule: DecRule; n: number }[] {
  return LADDER.flatMap((r, i) => (r.rule && (i < s.step || (i === s.step && made(s))) ? [{ rule: r.rule, n: r.n }] : []));
}

/** The next rung, the grids cleared. */
export const next = (s: LiveDecGrid): LiveDecGrid => ({ shaded: [], step: Math.min(LADDER.length, s.step + 1) });

/** n hundredths as wholes (full grids), tenths (full columns) and hundredths (loose squares): what a rule reads off. */
export function parts(n: number) {
  return { wholes: Math.floor(n / 100), tenths: Math.floor((n % 100) / 10), hundredths: n % 10 };
}
