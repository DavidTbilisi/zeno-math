// The front page's "It says what went wrong" question (components/Landing.tsx): a sum of two fractions, judged as the
// practice judges it (the addAcross trap of skills/fractions.ts), but in a few lines of its own, so the page published
// on its own doesn't carry the whole checker. tests/about.test.ts holds the two to the same verdicts.
export type Frac = { n: number; d: number };

/** The sums on show, in turn: unlike bottoms, so adding across is tempting. */
export const DEMO_SUMS: readonly (readonly [Frac, Frac])[] = [
  [{ n: 1, d: 2 }, { n: 1, d: 3 }],
  [{ n: 1, d: 4 }, { n: 1, d: 2 }],
  [{ n: 2, d: 3 }, { n: 1, d: 6 }],
  [{ n: 1, d: 3 }, { n: 1, d: 5 }],
  [{ n: 3, d: 4 }, { n: 1, d: 8 }],
];

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
const lowest = ({ n, d }: Frac): Frac => ({ n: n / gcd(n, d), d: d / gcd(n, d) });
const same = (x: Frac, y: Frac) => x.n * y.d === y.n * x.d;
export const plain = (f: Frac) => (f.d === 1 ? String(f.n) : `${f.n}/${f.d}`);

/** "5/6", " 5 / 6 " or a whole number; null for anything else. */
export function readFrac(src: string): Frac | null {
  const m = /^\s*(\d{1,3})\s*(?:\/\s*(\d{1,3}))?\s*$/.exec(src);
  if (!m) return null;
  const d = m[2] === undefined ? 1 : Number(m[2]);
  return d === 0 ? null : { n: Number(m[1]), d };
}

/** Tops added and bottoms added, as written (not reduced): what the student who adds across types. */
export const across = (a: Frac, b: Frac): Frac => ({ n: a.n + b.n, d: a.d + b.d });

export type DemoVerdict =
  | { kind: "unread" }
  | { kind: "right"; sum: string }
  /** r: the answer typed; big: the larger of the two fractions, which a sum can't be below. */
  | { kind: "across"; r: string; big: string }
  /** steps: the sum worked over the lowest common bottom. */
  | { kind: "wrong"; steps: string };

export function judge(a: Frac, b: Frac, input: string): DemoVerdict {
  const typed = readFrac(input);
  if (!typed) return { kind: "unread" };
  const L = (a.d * b.d) / gcd(a.d, b.d);
  const top = (a.n * L) / a.d + (b.n * L) / b.d;
  const sum = lowest({ n: top, d: L });
  if (same(typed, sum)) return { kind: "right", sum: plain(sum) };
  if (same(typed, across(a, b))) return { kind: "across", r: plain(typed), big: plain(a.n * b.d > b.n * a.d ? a : b) };
  const over = `${(a.n * L) / a.d}/${L} + ${(b.n * L) / b.d}/${L} = ${top}/${L}`;
  return { kind: "wrong", steps: sum.d === L ? over : `${over} = ${plain(sum)}` };
}
