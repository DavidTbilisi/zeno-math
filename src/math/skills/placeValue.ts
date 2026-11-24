// Practice: Place value. What a digit is worth, a number put together from its parts (600 + 8) and a number as so
// many tens: in three-digit numbers, then four and five digits with × and ÷ by 10, 100 and 1000, then six digits and
// decimals. A digit given for its value and a zero place left out are the slips.
import { fill } from "../chart";
import { num, tidy } from "../practiceKit";
import type { Gen, Part, Rng, Trap } from "../practiceTypes";

/** n different digits, none of them 0. */
export function differentDigits(r: Rng, n: number): number[] {
  const ds: number[] = [];
  while (ds.length < n) {
    const d = r.int(1, 9);
    if (!ds.includes(d)) ds.push(d);
  }
  return ds;
}
/** A whole number in threes, as it is printed: 248 915 (a thin gap that doesn't break). */
export const spaced = (n: number) => String(n).replace(/\B(?=(\d{3})+$)/g, "\u202f");
const RED = "#e03131";

const gen: Gen = (r, L, w) => {
  const out = (prompt: string, q: string, v: number, steps: string[], traps: Trap[] = []): ReturnType<Gen> => ({
    prompt, q, answer: { ...num(v), traps }, show: tidy(v), plain: tidy(v), format: "number", steps,
  });
  /**
   * The value of one digit of a number: `ds` its digits, `at` the one asked for, `point` how many of them are after
   * the decimal point. The working writes the number as its parts, the asked one in red.
   */
  const digitValue = (ds: number[], at: number, point = 0): Part => {
    const place = (i: number) => (ds[i] * 10 ** (ds.length - 1 - i)) / 10 ** point;
    const whole = ds.slice(0, ds.length - point).join("");
    const n = point ? `${whole}.${ds.slice(-point).join("")}` : spaced(Number(whole));
    const v = Number(tidy(place(at)));
    const parts = ds.map((_, i) => (i === at ? `\\color{${RED}}{${tidy(place(i))}}` : tidy(place(i))));
    const traps: Trap[] = ds[at] !== v ? [{ id: "digitNotValue", a: num(ds[at]), vars: { x: ds[at], n, v: tidy(v) } }] : [];
    return out(fill(w.basics.digitValue, { d: ds[at], n }), "", v, [`${n.replace(/\u202f/g, "\\,")} = ${parts.join(" + ")}`], traps);
  };
  /**
   * A number put together from its parts, some places empty: `ds` its digits (0 for an empty place), `point` how many
   * are after the point. With an empty place between two parts, the digits set side by side is the slip.
   */
  const together = (ds: number[], point = 0): Part => {
    const f = 10 ** point;
    const parts = ds.map((d, i) => (d * 10 ** (ds.length - 1 - i)) / f).filter((x) => x > 0);
    const v = Number(tidy(parts.reduce((s, x) => s + x, 0)));
    const kept = ds.filter((d) => d > 0);
    // The digits with no zero between them, the point where it was: 600 + 8 → 68, 3 + 0.07 → 3.7.
    const wholeDigits = ds.slice(0, ds.length - point).filter((d) => d > 0).length;
    const slip = Number(kept.slice(0, wholeDigits).join("") + (point ? `.${kept.slice(wholeDigits).join("")}` : ""));
    const traps: Trap[] = slip !== v ? [{ id: "zeroPlaceSkipped", a: num(slip), vars: { x: tidy(slip), v: tidy(v) } }] : [];
    const q = parts.map(tidy).join(" + ");
    return out(w.prompts.times, q, v, [`${q} = ${tidy(v)}`], traps);
  };
  /** n = □ × f: how many tens, hundreds or thousands a number is. */
  const groups = (k: number, f: number) => out(w.basics.missing, `${k * f} = \\square \\times ${f}`, k, [`${k} \\times ${f} = ${k * f}`]);
  const kind = r.int(0, 2);
  if (L === 1) {
    if (kind === 0) return digitValue(differentDigits(r, 3), r.int(0, 2));
    if (kind === 1) {
      const ds = differentDigits(r, 3);
      if (r.next() < 0.5) ds[1] = 0;
      return together(ds);
    }
    return groups(r.int(12, 99), 10);
  }
  if (L === 2) {
    const len = r.int(4, 5);
    if (kind === 0) return digitValue(differentDigits(r, len), r.int(0, len - 2));
    if (kind === 1) {
      const ds = differentDigits(r, len);
      ds[r.int(1, len - 2)] = 0;
      if (r.next() < 0.5) ds[r.int(1, len - 2)] = 0;
      return together(ds);
    }
    const [m, f] = [r.int(12, 999), r.pick([10, 100, 1000])];
    const way = r.int(0, 2);
    if (way === 0) return out(w.prompts.times, `${m} \\times ${f}`, m * f, [`${m} \\times ${f} = ${m * f}`]);
    if (way === 1) return out(w.prompts.times, `${m * f} \\div ${f}`, m, [`${m * f} \\div ${f} = ${m}`]);
    return groups(m, f);
  }
  if (kind === 0) return digitValue(differentDigits(r, 6), r.int(0, 3));
  if (kind === 1) {
    // A decimal: one or two digits before the point, two or three after it, and a digit after the point asked for.
    const [before, after] = [r.int(1, 2), r.int(2, 3)];
    return digitValue(differentDigits(r, before + after), before + r.int(0, after - 1), after);
  }
  const ds = differentDigits(r, 4);
  if (r.next() < 0.5) ds[0] = 0;
  if (r.next() < 0.6) ds[2] = 0;
  return together(ds, 2);
};

export default gen;
