// Practice: Multiplication. Two digits by one, then by two, then three digits by two, each worked on the area model.
// The distributive property splits a number into its places: 36 × 4 = 30 × 4 + □; the partial products of two
// two-digit numbers (23 × 47 = 800 + 140 + □ + 21) and of a three- or four-digit number by one digit; then stories
// with rows of seats and carriages. Multiplying the tens as ones, leaving a place's zeros off a partial product and
// multiplying only tens by tens and ones by ones are named.
import { fill } from "../chart";
import { num } from "../practiceKit";
import type { Gen, Trap } from "../practiceTypes";

/** n's places from the largest, zeros left out: 2357 → [2000, 300, 50, 7]. */
const places = (n: number) =>
  String(n)
    .split("")
    .map((d, i, ds) => Number(d) * 10 ** (ds.length - 1 - i))
    .filter((p) => p > 0);

const gen: Gen = (r, L, w) => {
  const area = (a: number, b: number) => ({ kind: "model" as const, spec: { type: "multiply", style: "area", a, b, step: 999 } });
  const out = (prompt: string, q: string, v: number, traps: Trap[], more: { steps?: string[]; solution?: ReturnType<typeof area> }): ReturnType<Gen> => ({
    prompt, q, answer: { ...num(v), traps }, show: String(v), plain: String(v), format: "number", ...more,
  });
  /** a × b (two digits each, or more): only tens by tens and ones by ones is the slip. */
  const cross = (a: number, b: number): Trap[] => {
    const [ta, oa, tb, ob] = [a - (a % 10), a % 10, b - (b % 10), b % 10];
    const x = ta * tb + oa * ob;
    return x !== a * b && oa && ob ? [{ id: "crossProductsMissed", a: num(x), vars: { x, work: `${ta * tb} + ${ta * ob} + ${oa * tb} + ${oa * ob}`, v: a * b } }] : [];
  };
  /** A partial product of a × b left out of a sum of them, drawn on the area model: its place's zeros dropped is the slip. */
  const partial = (a: number, b: number, parts: { p: number; work: string }[], miss: number) => {
    const q = `${a} \\times ${b}`;
    const { p, work } = parts[miss];
    const x = Number(String(p).replace(/0+$/, ""));
    const shown = parts.map((t, i) => (i === miss ? "\\square" : String(t.p))).join(" + ");
    return out(w.basics.missing, `${q} = ${shown}`, p, x !== p ? [{ id: "partZerosDropped", a: num(x), vars: { x, work, v: p } }] : [], { solution: area(a, b) });
  };

  if (L === 1) {
    const [a, b] = [r.int(12, 99), r.int(3, 9)];
    const [t, o] = [a - (a % 10), a % 10];
    if (r.next() < 0.4 && o) {
      // The distributive property: a × b = t × b + □.
      return out(w.basics.missing, `${a} \\times ${b} = ${t} \\times ${b} + \\square`, o * b, o * b !== o ? [{ id: "factorNotProduct", a: num(o), vars: { x: o, a: b, v: o * b } }] : [], {
        solution: area(a, b),
      });
    }
    // The tens multiplied as ones (3 × 4 + 6 × 4 for 36 × 4) is the slip.
    const x = (t / 10) * b + o * b;
    return out(w.prompts.times, `${a} \\times ${b}`, a * b, x !== a * b ? [{ id: "tensAsOnes", a: num(x), vars: { x, t, b, tb: t * b, o, ob: o * b, v: a * b } }] : [], { solution: area(a, b) });
  }
  if (L === 2) {
    const kind = r.int(0, 2);
    if (kind === 1) {
      // The four partial products of two two-digit numbers, one missing.
      const [a, b] = [r.int(1, 9) * 10 + r.int(1, 9), r.int(1, 9) * 10 + r.int(1, 9)];
      const [ta, oa, tb, ob] = [a - (a % 10), a % 10, b - (b % 10), b % 10];
      const parts = [
        { p: ta * tb, work: `${ta} × ${tb}` },
        { p: ta * ob, work: `${ta} × ${ob}` },
        { p: oa * tb, work: `${oa} × ${tb}` },
        { p: oa * ob, work: `${oa} × ${ob}` },
      ];
      return partial(a, b, parts, r.int(0, 2));
    }
    if (kind === 2) {
      // A three- or four-digit number by one digit, place by place.
      // The ones never 0, so there are at least two places to add.
      const n0 = r.next() < 0.5 ? r.int(101, 999) : r.int(1001, 9999);
      const n = n0 % 10 ? n0 : n0 + r.int(1, 9);
      const b = r.int(3, 9);
      const parts = places(n).map((p) => ({ p: b * p, work: `${b} × ${p}` }));
      return partial(b, n, parts, r.int(0, parts.length - 2));
    }
    const [a, b] = [r.int(12, 99), r.int(12, 99)];
    return out(w.prompts.times, `${a} \\times ${b}`, a * b, cross(a, b), { solution: area(a, b) });
  }
  if (r.next() < 0.3) {
    // A story: rows of seats, or carriages of seats.
    // Neither number ends in 0, so all four partial products are there.
    const [a, b] = [r.int(1, 3) * 10 + r.int(1, 9), r.int(1, 4) * 10 + r.int(1, 9)];
    return out(fill(r.next() < 0.5 ? w.mulDiv.cinema : w.mulDiv.train, { a, b }), "", a * b, cross(a, b), { solution: area(a, b) });
  }
  const [a, b] = [r.int(101, 999), r.int(12, 99)];
  return out(w.prompts.times, `${a} \\times ${b}`, a * b, [], { solution: area(a, b) });
};

export default gen;
