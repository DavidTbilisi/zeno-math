// Filling in message templates and formatting numbers for captions and messages. No imports: the dialogs' words and
// the student and teacher pages use these without pulling in MathJax or mathjs (chart.ts re-exports them).

/** "{name}" placeholders in a template filled in from `v`; a missing one becomes "". */
export const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));

/** Up to `digits` decimals, no trailing zeros; tiny numbers in scientific notation. */
export function nf(v: number, digits = 4): string {
  if (!Number.isFinite(v)) return Number.isNaN(v) ? "—" : v > 0 ? "∞" : "−∞";
  if (v !== 0 && Math.abs(v) < 10 ** -digits) return v.toExponential(1);
  if (Math.abs(v) >= 1e7) return v.toExponential(3);
  const s = String(Math.round(v * 10 ** digits) / 10 ** digits);
  return s === "-0" ? "0" : s;
}
