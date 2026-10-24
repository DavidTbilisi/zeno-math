// What the system design topics share: reading a choice or a list of names, and writing big numbers, sizes and rates
// the way back-of-the-envelope estimates are written (1.2 M, 3.4 GB, 99.95%).
import { fill } from "./core";

/** A choice typed as a word, matched without caring about case; the error names the choices. */
export function choice<T extends string>(s: string, options: readonly T[], bad: string): T {
  const t = s.trim().toLowerCase();
  const hit = options.find((o) => o.toLowerCase() === t);
  if (!hit) throw new Error(fill(bad, { s: s.trim() || "…", list: options.join(", ") }));
  return hit;
}

/** Names split by commas or spaces. */
export function names(s: string, empty: string, tooMany: string, max = 16): string[] {
  const out = s.split(/[,;\s]+/).filter(Boolean);
  if (!out.length) throw new Error(empty);
  if (out.length > max) throw new Error(fill(tooMany, { n: max }));
  return out;
}

/** A positive number (decimals allowed) from lo to hi. */
export function amount(s: string, lo: number, hi: number, bad: string): number {
  const v = Number(s.trim().replace(",", "."));
  if (!s.trim() || !Number.isFinite(v) || v < lo || v > hi) throw new Error(fill(bad, { s: s.trim() || "…", lo, hi }));
  return v;
}

const round = (x: number, d = 1) => {
  const r = Math.round(x * 10 ** d) / 10 ** d;
  return String(r);
};
/** 1 234 → "1.2 K", 5 600 000 → "5.6 M": three significant figures at most. */
export function human(n: number): string {
  const a = Math.abs(n);
  for (const [v, s] of [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]] as const) if (a >= v) return `${round(n / v, n / v >= 100 ? 0 : 1)} ${s}`;
  return round(n, a >= 10 ? 0 : 2);
}
/** Bytes in KB, MB, GB, TB, PB (powers of 1000, as estimates use). */
export function bytes(n: number): string {
  for (const [v, s] of [[1e15, "PB"], [1e12, "TB"], [1e9, "GB"], [1e6, "MB"], [1e3, "KB"]] as const) if (n >= v) return `${round(n / v, n / v >= 100 ? 0 : 1)} ${s}`;
  return `${Math.round(n)} B`;
}
export const pct = (x: number, d = 1) => `${round(x * 100, d)}%`;
export const DAY = 86_400;
