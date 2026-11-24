// The number facts a learner should know without working them out, and how well this learner knows each: the sums
// and differences within 10 and 20, the bonds to 10, 20 and 100, the times tables to 12 and their divisions, and the
// squares to 15². A fact is its text ("6 × 7") and its answer, in signs only, so it reads the same in every language.
// The fact games (number rain first) draw their questions here and tell the book how each went: an answer wrong, right,
// or right and quick. A fact is fast once it has been right and quick three times in a row, which is what the games
// rehearse toward; a fact last answered wrong is weak, and a draw with the book in hand brings the weak ones up most
// often and the fast ones least. For a game that offers answers to choose from there are decoys, the wrong answers a
// learner is likeliest to give, and for the end of a round the marks: every fact of it, right or still to learn.
// All of it is plain arithmetic on plain data, so it is tested without a browser.

export const TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export type Table = (typeof TABLES)[number];
/** A set of facts of one kind: `times7` is the table of 7 both ways round, `div7` its divisions. */
export type FactFamily = "add10" | "sub10" | "bond10" | "add20" | "sub20" | "bond20" | "bond100" | "squares" | `times${Table}` | `div${Table}`;
export type Fact = { key: string; text: string; answer: number };

const fact = (text: string, answer: number): Fact => ({ key: text.replace(/\s/g, ""), text, answer });
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

/** Every fact of a family, in a fixed order. */
export function factsOf(family: FactFamily): Fact[] {
  switch (family) {
    // Sums to 10 at most, and what they undo.
    case "add10": return range(1, 9).flatMap((a) => range(1, 10 - a).map((b) => fact(`${a} + ${b}`, a + b)));
    case "sub10": return range(2, 10).flatMap((a) => range(1, a - 1).map((b) => fact(`${a} − ${b}`, a - b)));
    case "bond10": return range(1, 9).map((a) => fact(`${a} + □ = 10`, 10 - a));
    // Past ten: two one-digit numbers whose sum is over 10, and what they undo.
    case "add20": return range(2, 9).flatMap((a) => range(11 - a, 9).map((b) => fact(`${a} + ${b}`, a + b)));
    case "sub20": return range(11, 18).flatMap((a) => range(a - 9, 9).map((b) => fact(`${a} − ${b}`, a - b)));
    case "bond20": return range(1, 19).map((a) => fact(`${a} + □ = 20`, 20 - a));
    case "bond100": return range(1, 19).map((k) => fact(`${5 * k} + □ = 100`, 100 - 5 * k));
    case "squares": return range(2, 15).map((n) => fact(`${n}²`, n * n));
  }
  const t = Number(family.replace(/\D/g, ""));
  if (family.startsWith("times")) return range(2, 10).flatMap((k) => (k === t ? [fact(`${t} × ${k}`, t * k)] : [fact(`${t} × ${k}`, t * k), fact(`${k} × ${t}`, t * k)]));
  return range(2, 10).map((k) => fact(`${t * k} ÷ ${t}`, k));
}
/** The facts of several families, each once. */
export function poolOf(families: readonly FactFamily[]): Fact[] {
  const seen = new Set<string>();
  return families.flatMap(factsOf).filter((f) => !seen.has(f.key) && seen.add(f.key));
}

// ---------- the book: how well each fact is known ----------

/** How a fact has gone: times asked, right answers in a row, quick right answers in a row, and the usual time of a right one in ms. */
export type FactStat = { n: number; run: number; quick: number; ms: number };
export type FactBook = Record<string, FactStat>;
/** An answer is quick within three seconds, and a fact fast after three quick ones in a row. */
export const QUICK_MS = 3000;
export const QUICK_RUN = 3;
/** Never asked; last answered wrong; right, but not yet quick three times running; fast. */
export type FactState = "new" | "weak" | "known" | "fast";
export const stateOf = (s: FactStat | undefined): FactState => (!s?.n ? "new" : s.run === 0 ? "weak" : s.quick >= QUICK_RUN ? "fast" : "known");

/** The book after one more answer to a fact: wrong, or right in `ms`. */
export function learn(book: FactBook, key: string, ok: boolean, ms = 0): FactBook {
  const s = book[key] ?? { n: 0, run: 0, quick: 0, ms: 0 };
  if (!ok) return { ...book, [key]: { ...s, n: s.n + 1, run: 0, quick: 0 } };
  const time = Math.max(0, Math.round(ms));
  return { ...book, [key]: { n: s.n + 1, run: s.run + 1, quick: time <= QUICK_MS ? s.quick + 1 : 0, ms: s.ms ? Math.round(0.6 * s.ms + 0.4 * time) : time } };
}
/** How many of the facts are in each state. */
export function tally(pool: readonly Fact[], book: FactBook): Record<FactState, number> {
  const out: Record<FactState, number> = { new: 0, weak: 0, known: 0, fast: 0 };
  for (const f of pool) out[stateOf(book[f.key])]++;
  return out;
}

const KEY = /^[0-9+−×÷²=□]{2,14}$/;
/** The book as it was kept in this browser: read as carefully as anything a user could have edited. */
export function readBook(json: string | null): FactBook {
  const out: FactBook = {};
  try {
    const p = JSON.parse(json ?? "null") as unknown;
    if (!p || typeof p !== "object" || Array.isArray(p)) return out;
    const count = (v: unknown, max: number) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.min(max, Math.floor(v)) : 0);
    for (const [key, v] of Object.entries(p).slice(0, 2000)) {
      if (!KEY.test(key) || !v || typeof v !== "object") continue;
      const s = v as Partial<FactStat>;
      const n = count(s.n, 1e6);
      if (!n) continue;
      const run = Math.min(n, count(s.run, 1e6));
      out[key] = { n, run, quick: Math.min(run, count(s.quick, 1e6)), ms: count(s.ms, 600_000) };
    }
  } catch {
    // not a book: an empty one
  }
  return out;
}

/** How much more often a fact in each state is drawn than a fast one. */
const WEIGHT: Record<FactState, number> = { weak: 4, new: 2, known: 2, fast: 1 };
/**
 * `count` facts from the pool, none twice while there are others left to draw. With a book the weak facts come up
 * most and the fast ones least; without one every fact is as likely as another.
 */
export function drawFacts(pool: readonly Fact[], count: number, next: () => number, book?: FactBook): Fact[] {
  const out: Fact[] = [];
  let left: Fact[] = [];
  while (out.length < count && pool.length) {
    if (!left.length) left = [...pool];
    const weights = left.map((f) => (book ? WEIGHT[stateOf(book[f.key])] : 1));
    let at = next() * weights.reduce((s, x) => s + x, 0);
    let i = 0;
    while (i < left.length - 1 && at >= weights[i]) at -= weights[i++];
    out.push(left[i]);
    left.splice(i, 1);
  }
  return out;
}

/**
 * `n` wrong answers to a fact, each different, none the answer: first the slips a learner makes (the next multiple
 * along either table for a product, one or two out for a quotient or a sum, ten out, the square next door), then
 * numbers close by until there are enough.
 */
export function decoys(fact: Fact, n: number, next: () => number): number[] {
  const [p, q = 0] = (fact.text.match(/\d+/g) ?? []).map(Number);
  const a = fact.answer;
  const near = fact.text.includes("×") ? [a + p, a - p, a + q, a - q]
    : fact.text.includes("²") ? [(p + 1) ** 2, (p - 1) ** 2, 2 * p, a + 10, a - 10]
    : fact.text.includes("÷") ? [a + 1, a - 1, a + 2, a - 2]
    : [a + 1, a - 1, a + 2, a - 2, a + 10, a - 10];
  for (let i = near.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [near[i], near[j]] = [near[j], near[i]];
  }
  const out: number[] = [];
  for (const x of [...near, a + 1, a - 1, a + 2, a + 3, a + 4, a + 5]) if (out.length < n && x > 0 && x !== a && !out.includes(x)) out.push(x);
  return out;
}

/** How a fact of a round came out: right at once (and quick or not), or missed, and then got right when it came back or not. */
export type FactMark = { text: string; answer: number; ok: boolean; quick: boolean; mended: boolean };
/** The marks after one more fact is settled: a fact's first time is its mark; one come back (`again`) and got right is mended. */
export function markFact(marks: FactMark[], e: { fact: Fact; ok: boolean; quick: boolean; again: boolean }): FactMark[] {
  if (e.again) return e.ok ? marks.map((m) => (m.text === e.fact.text && !m.ok ? { ...m, mended: true } : m)) : marks;
  return [...marks, { text: e.fact.text, answer: e.fact.answer, ok: e.ok, quick: e.ok && e.quick, mended: false }];
}
/** A fact with its answer in it: 6 × 7 = 42, and 7 + 3 = 10 for 7 + □ = 10. */
export const shown = (text: string, answer: number) => (text.includes("□") ? text.replace("□", String(answer)) : `${text} = ${answer}`);
