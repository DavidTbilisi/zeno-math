// Practice: Multiplication. Two digits by one, then by two, then three digits by two, each worked on the area model.
// The distributive property splits a number into its places: 36 × 4 = 30 × 4 + □; the partial products of two
// two-digit numbers (23 × 47 = 800 + 140 + □ + 21) and of a three- or four-digit number by one digit; then stories
// with rows of seats and carriages. The partial products are asked on a drawn area model; a product is estimated by
// rounding each number to its first digit; the hardest level also picks the equation of a story in two steps and
// finds the smaller amount of a comparison (the tower is 4 times the tree). Multiplying the tens as ones, leaving a
// place's zeros off a partial product, multiplying only tens by tens and ones by ones, cutting the numbers down for an
// estimate, a zero too many or too few, and taking from each pack what is given away once are named.
import { fill } from "../chart";
import type { MistakeId } from "../mistakes";
import { pickPart } from "../mulDivKit";
import { areaPic } from "../mulPics";
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
  /**
   * The partial products of a × b, each place of a times each place of b, one of them missing: the sum, and the area
   * model with that cell asked. Its place's zeros dropped is the slip.
   */
  const partial = (a: number, b: number, miss: number) => {
    const [pa, pb] = [places(a), places(b)];
    const parts = pa.flatMap((x) => pb.map((y) => ({ p: x * y, work: `${x} × ${y}` })));
    const { p, work } = parts[miss];
    const x = Number(String(p).replace(/0+$/, ""));
    const shown = parts.map((t, i) => (i === miss ? "\\square" : String(t.p))).join(" + ");
    const cells = pa.map((_, i) => pb.map((_, j) => (i * pb.length + j === miss ? "?" : String(parts[i * pb.length + j].p))));
    return {
      ...out(w.basics.missing, `${a} \\times ${b} = ${shown}`, p, x !== p ? [{ id: "partZerosDropped", a: num(x), vars: { x, work, v: p } }] : [], { solution: area(a, b) }),
      pic: areaPic(pa.map(String), pb.map(String), cells),
    };
  };
  /**
   * The best estimate of a product, picked: each number rounded to its first digit. Cutting the numbers down instead
   * of rounding, and a zero too many or too few, are the slips.
   */
  const estimate = (a: number, b: number) => {
    const lead = (n: number) => {
      const e = 10 ** Math.floor(Math.log10(n));
      return [Math.round(n / e) * e, Math.floor(n / e) * e];
    };
    const [[ra, ta], [rb, tb]] = [lead(a), lead(b)];
    const v = ra * rb;
    const cut = ta * tb;
    const off = a >= 10 && b >= 10 ? v / 10 : v * 10;
    const slips: { tex: string; id: MistakeId; vars: Record<string, string | number> }[] = [];
    if (cut !== v) slips.push({ tex: String(cut), id: "estimateTruncated", vars: { work: `${ta} × ${tb}`, right: `${ra} × ${rb} = ${v}`, v } });
    if (off !== cut) slips.push({ tex: String(off), id: "estimateZerosOff", vars: { work: `${ra} × ${rb}`, v } });
    return pickPart(r, fill(w.mulDiv.bestEstimate, { q: `${a} × ${b}` }), String(v), slips, [], { solution: area(ra, rb) });
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
    const kind = r.int(0, 3);
    if (kind === 1) {
      // The four partial products of two two-digit numbers, one missing.
      const [a, b] = [r.int(1, 9) * 10 + r.int(1, 9), r.int(1, 9) * 10 + r.int(1, 9)];
      return partial(a, b, r.int(0, 2));
    }
    if (kind === 2) {
      // A three- or four-digit number by one digit, place by place. The ones never 0, so there are two places or more.
      const n0 = r.next() < 0.5 ? r.int(101, 999) : r.int(1001, 9999);
      const n = n0 % 10 ? n0 : n0 + r.int(1, 9);
      return partial(r.int(3, 9), n, r.int(0, places(n).length - 2));
    }
    if (kind === 3) {
      // One digit times two, three or four digits, or two digits by two: the first number rounds up, so cutting it
      // down is a different answer.
      const up = (digits: number) => {
        const e = 10 ** (digits - 1);
        return r.int(1, 8) * e + r.int(5, 9) * (e / 10) + r.int(0, e / 10 - 1);
      };
      return r.next() < 0.5 ? estimate(r.int(3, 9), up(r.int(2, 4))) : estimate(up(2), r.int(1, 9) * 10 + r.int(1, 4));
    }
    const [a, b] = [r.int(12, 99), r.int(12, 99)];
    return out(w.prompts.times, `${a} \\times ${b}`, a * b, cross(a, b), { solution: area(a, b) });
  }
  const W = w.mulDiv;
  const kind = r.int(0, 3);
  if (kind === 1) {
    // A story: rows of seats, or carriages of seats. Neither number ends in 0, so all four partial products are there.
    const [a, b] = [r.int(1, 3) * 10 + r.int(1, 9), r.int(1, 4) * 10 + r.int(1, 9)];
    return out(fill(r.next() < 0.5 ? W.cinema : W.train, { a, b }), "", a * b, cross(a, b), { solution: area(a, b) });
  }
  if (kind === 2) {
    // The equation of a story in two steps: packs bought, then some given away. Taking them from each pack is the slip.
    const [a, b] = [r.int(3, 9), r.int(6, 12)];
    const c = r.int(2, b - 1);
    const right = `${a} \\times ${b} - ${c} = \\square`;
    return pickPart(r, fill(W.packsLeft, { a, b, c }), right, [{ tex: `${a} \\times (${b} - ${c}) = \\square`, id: "takenFromEachGroup", vars: { c, right: `${a} × ${b} − ${c} = ${a * b - c}` } }], [`${a} + ${b} - ${c} = \\square`], { solution: area(a, b) });
  }
  if (kind === 3) {
    // A comparison with the smaller amount unknown: the tower is b times the tree, so the tree is the tower ÷ b, worked
  // as the product b × □ that makes it.
    const [b, k] = [r.int(3, 9), r.int(12, 45)];
    const a = b * k;
    return out(fill(W.treeFromTower, { a, b }), "", k, [
      { id: "multipliedForDivide", a: num(a * b), vars: { x: a * b, a, b, v: k } },
      { id: "takenNotShared", a: num(a - b), vars: { x: a - b, a, b, v: k } },
    ], { solution: area(b, k) });
  }
  const [a, b] = [r.int(101, 999), r.int(12, 99)];
  return out(w.prompts.times, `${a} \\times ${b}`, a * b, [], { solution: area(a, b) });
};

export default gen;
