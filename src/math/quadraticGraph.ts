// Quadratic graphs (#658). y = (x − p)(x − q) crosses the x-axis at p and q, its axis of symmetry is halfway between,
// and it meets the y-axis at pq. Completing the square writes x² + bx + c as (x + b/2)² + c − (b/2)²: the square
// (x + b/2)² is never below 0, so the least value is c − (b/2)², at x = −b/2. The piece `completeSquare` makes it with
// tiles: the b strips go half along each side of the x² square, which leaves a corner of (b/2)² small squares missing.

/** The piece: which expression, how many strips are laid, and whether the corner is filled. */
export type LiveCompleteSquare = { which: number; laid: number; filled: boolean };
export const SQUARE_START: LiveCompleteSquare = { which: 0, laid: 0, filled: false };
/** x² + bx + c, b even so the halves are whole strips. */
export const SQUARE_EXPRS: readonly { b: number; c: number }[] = [{ b: 6, c: 5 }, { b: 4, c: 1 }, { b: 8, c: 20 }];
/** A tap on the next strip: laid along the right side, then the bottom, in turn. */
export const layStrip = (s: LiveCompleteSquare): LiveCompleteSquare => (s.laid < SQUARE_EXPRS[s.which].b ? { ...s, laid: s.laid + 1 } : s);
/** The corner can be filled once every strip is laid. */
export const fillCorner = (s: LiveCompleteSquare): LiveCompleteSquare => (s.laid === SQUARE_EXPRS[s.which].b ? { ...s, filled: true } : s);
/** h and k of (x + h)² + k. */
export const completed = (b: number, c: number) => ({ h: b / 2, k: c - (b / 2) ** 2 });

/** Points of y = f(x) from lo to hi in small steps, kept to the part inside ±lim (one piece for a parabola). */
export const curvePoints = (f: (x: number) => number, lo: number, hi: number, lim: number) =>
  Array.from({ length: Math.round((hi - lo) * 20) + 1 }, (_, i) => lo + i / 20)
    .map((x) => [x, f(x)] as const)
    .filter(([, y]) => Math.abs(y) <= lim);
