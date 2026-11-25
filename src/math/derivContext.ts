// Derivatives in context (#667). The piece `foldBox` cuts an x × x square from each corner of a sheet and folds an
// open box: V(x) = x(L − 2x)(W − 2x). While V′(x) > 0 a bigger cut gives a bigger box; where V′ = 0 the box is largest.

/** The piece: which sheet, and the cut in quarters of a unit. */
export type LiveFoldBox = { which: number; q: number };
export const FOLDBOX_START: LiveFoldBox = { which: 0, q: 4 };
/** The sheets, length × width: the largest boxes come at x = 2 (128) and x = 3 (576). */
export const SHEETS = [[12, 12], [30, 14]] as const;
export const boxVolume = (L: number, W: number, x: number) => x * (L - 2 * x) * (W - 2 * x);
export const boxSlope = (L: number, W: number, x: number) => 12 * x * x - 4 * (L + W) * x + L * W;
