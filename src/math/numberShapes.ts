// Number patterns as dots: square, triangle, rectangle and cube numbers drawn as the shapes they are named after,
// primes as the rectangles their dots will (or won't) make, and Fibonacci numbers as squares that tile a spiral.
// "Why?" colours the part that explains the rule: the odd (or even) L-shapes that add up to a square (or rectangle),
// the second triangle that makes a rectangle, the layers of a cube, the tries that leave dots over, the spiral.
// Everything here is in grid units; src/live/NumberShapes.tsx scales it to the piece.

export type ShapeKind = "square" | "triangle" | "oblong" | "cube" | "prime" | "fibonacci";
export const SHAPE_KINDS: ShapeKind[] = ["square", "triangle", "oblong", "cube", "prime", "fibonacci"];

/** For primes n is the number itself; for the others it is the place in the sequence (figure n). */
export type LiveNumberShapes = { kind: ShapeKind; n: number; why: boolean };
export const SHAPES_START: LiveNumberShapes = { kind: "square", n: 4, why: false };

export const N_RANGE: Record<ShapeKind, [number, number]> = {
  square: [1, 10], triangle: [1, 12], oblong: [1, 9], cube: [1, 5], prime: [2, 40], fibonacci: [1, 9],
};
/** Where n starts when the pattern is picked. */
export const N_START: Record<ShapeKind, number> = { square: 4, triangle: 4, oblong: 4, cube: 3, prime: 12, fibonacci: 6 };

export const clampN = (kind: ShapeKind, n: number) => Math.min(N_RANGE[kind][1], Math.max(N_RANGE[kind][0], Math.round(n)));

export function fib(n: number): number {
  let [a, b] = [1, 1];
  for (let i = 2; i < n; i++) [a, b] = [b, a + b];
  return n <= 2 ? 1 : b;
}

export const isPrime = (n: number) => {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
};

/** The pattern's nth number (for primes, n itself). */
export function term(kind: ShapeKind, n: number): number {
  switch (kind) {
    case "square": return n * n;
    case "triangle": return (n * (n + 1)) / 2;
    case "oblong": return n * (n + 1);
    case "cube": return n ** 3;
    case "prime": return n;
    case "fibonacci": return fib(n);
  }
}

/** The numbers in the row under the picture, each with the n that picks it. For primes, twelve numbers around n. */
export function row(kind: ShapeKind, n: number): { n: number; v: number }[] {
  const [lo, hi] = N_RANGE[kind];
  if (kind !== "prime") return Array.from({ length: hi - lo + 1 }, (_, i) => ({ n: lo + i, v: term(kind, lo + i) }));
  const from = Math.min(Math.max(lo, n - 5), hi - 11);
  return Array.from({ length: 12 }, (_, i) => ({ n: from + i, v: from + i }));
}

/** A dot at column x, row y; `band` is the part "Why?" colours it as. */
export type Dot = { x: number; y: number; band: number };
export type DotPicture = { cols: number; rows: number; dots: Dot[] };

/**
 * Squares: n rows of n, the kth L-shape (2k + 1 dots) its own band. Rectangles: n rows of n + 1, the kth L-shape
 * holding 2k + 2. Triangles: rows of 1, 2, … n; with `why`, the turned copy (band 1) beside it fills n rows of n + 1.
 * Cubes: n layers of n × n side by side, one gap apart, a band each.
 */
export function dotPicture(kind: Exclude<ShapeKind, "prime" | "fibonacci">, n: number, why: boolean): DotPicture {
  const dots: Dot[] = [];
  if (kind === "square" || kind === "oblong") {
    const w = kind === "square" ? n : n + 1;
    for (let y = 0; y < n; y++) for (let x = 0; x < w; x++) dots.push({ x, y, band: kind === "square" ? Math.max(x, y) : Math.max(x - 1, y) });
    return { cols: w, rows: n, dots };
  }
  if (kind === "triangle") {
    for (let y = 0; y < n; y++) {
      for (let x = 0; x <= y; x++) dots.push({ x, y, band: 0 });
      if (why) for (let x = y + 1; x <= n; x++) dots.push({ x, y, band: 1 });
    }
    return { cols: why ? n + 1 : n, rows: n, dots };
  }
  for (let l = 0; l < n; l++) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) dots.push({ x: l * (n + 1) + x, y, band: l });
  return { cols: n * (n + 1) - 1, rows: n, dots };
}

/** One way of putting n dots in `rows` equal rows: `cols` in each, and `left` dots over when it doesn't fit. */
export type Arrangement = { rows: number; cols: number; left: number };

/**
 * The rectangles n dots make, rows ≤ columns (the others are these turned): 1 × n always, and one more for each
 * divisor up to √n. With `why`, the numbers of rows that leave dots over too, so a prime's tries can be seen failing.
 */
export function arrangements(n: number, why: boolean): Arrangement[] {
  const out: Arrangement[] = [];
  for (let r = 1; r * r <= n; r++) {
    const left = n % r;
    if (left === 0 || why) out.push({ rows: r, cols: Math.floor(n / r), left });
  }
  return out;
}

export const divisorsOf = (n: number) => Array.from({ length: n }, (_, i) => i + 1).filter((d) => n % d === 0);

/** A Fibonacci square: its corner and side, and the quarter circle of the spiral in it. */
export type FibTile = { x: number; y: number; s: number; arc: { from: [number, number]; to: [number, number]; sweep: 0 | 1 } };

/**
 * Squares of sides F1 … Fn, each laid against the rectangle of the ones before: below, right, above, left, and round
 * again (y grows downwards). The spiral's arc in each square is centred on the corner the turn goes round, and runs
 * between the two corners next to it, so each arc starts where the last one ended.
 */
export function fibTiles(n: number): { tiles: FibTile[]; box: [number, number, number, number] } {
  const tiles: FibTile[] = [];
  let [x0, y0, x1, y1] = [0, 0, 0, 0];
  for (let k = 1; k <= n; k++) {
    const s = fib(k);
    const dir = (k - 1) % 4; // 0 down, 1 right, 2 up, 3 left
    let x: number, y: number;
    if (k === 1) [x, y] = [0, 0];
    else if (dir === 0) [x, y] = [x0, y1];
    else if (dir === 1) [x, y] = [x1, y0];
    else if (dir === 2) [x, y] = [x0, y0 - s];
    else [x, y] = [x0 - s, y0];
    const centre: [number, number] = [[x + s, y], [x, y], [x, y + s], [x + s, y + s]][dir] as [number, number];
    const [cx, cy] = centre;
    // The two corners next to the centre: across from it on the same row, and in the same column.
    const a: [number, number] = [cx === x ? x + s : x, cy];
    const b: [number, number] = [cx, cy === y ? y + s : y];
    // Outwards along the spiral: the previous arc's end first.
    const [from, to] = dir === 0 || dir === 2 ? [a, b] : [b, a];
    const cross = (from[0] - cx) * (to[1] - cy) - (from[1] - cy) * (to[0] - cx);
    tiles.push({ x, y, s, arc: { from, to, sweep: cross > 0 ? 1 : 0 } });
    [x0, y0, x1, y1] = k === 1 ? [0, 0, 1, 1] : [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x + s), Math.max(y1, y + s)];
  }
  return { tiles, box: [x0, y0, x1, y1] };
}

/** "1 + 3 + 5 + 7", or "1 + 3 + … + 19" when there are more than six terms. */
export function sumText(parts: number[]): string {
  const shown = parts.length > 6 ? [parts[0], parts[1], "…", parts[parts.length - 1]] : parts;
  return shown.join(" + ");
}

/** The parts "Why?" adds up: odd numbers for squares, even for rectangles, 1 … n for triangles, layers for cubes. */
export function whyParts(kind: ShapeKind, n: number): number[] {
  const ks = Array.from({ length: n }, (_, k) => k);
  if (kind === "square") return ks.map((k) => 2 * k + 1);
  if (kind === "oblong") return ks.map((k) => 2 * k + 2);
  if (kind === "triangle") return ks.map((k) => k + 1);
  if (kind === "cube") return ks.map(() => n * n);
  return [];
}
