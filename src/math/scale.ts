// Axis ticks. On its own so a chart can pick a step without loading mathjs along with plot.ts.

/** A round step (1, 2 or 5 × a power of ten) that divides `range` into about `target` parts. */
export function niceStep(range: number, target = 10): number {
  const raw = range / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  return (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
}
