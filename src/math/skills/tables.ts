// Practice: Times tables. The tables of 2, 3, 4, 5 and 10, then those of 6 to 9 and a missing factor, then 11 and 12
// and multiples of ten (40 × 60). A fact is worked as its array of dots.
// What multiplying means comes first: equal groups counted and written as a multiplication, an addition of equal
// numbers (the rows of an array) written as one, and jumps along a number line; then the properties: the factors
// swapped, a factor split (the distributive property, an array cut in two) and three factors grouped either way
// (16 × 5 = 8 × 10). Stories at each level: bags of apples; boxes of eggs, rows in a garden and boxes of pencils;
// then one thing so many times as big as another.
import { fill } from "../chart";
import { arrayPic, groupsPic, jumpsPic } from "../mulPics";
import { pickPart } from "../mulDivKit";
import { num } from "../practiceKit";
import type { Exercise, Gen, Trap } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const W = w.mulDiv;
  const array = (a: number, b: number) => ({ kind: "model" as const, spec: { type: "multiply", style: "array", a, b, step: 999 } });
  const model = (style: string, a: number, b: number) => ({ kind: "model" as const, spec: { type: "multiply", style, a, b, step: 999 } });
  /** a + b for a × b: named when it is not also the product (2 × 2). */
  const added = (a: number, b: number): Trap[] => (a + b !== a * b ? [{ id: "addedNotTimes", a: num(a + b), vars: { a, b, x: a + b, v: a * b } }] : []);
  /** a × b, either way round; the two added instead is the slip. */
  const fact = (x: number, y: number): ReturnType<Gen> => {
    const [a, b] = r.next() < 0.5 ? [x, y] : [y, x];
    const v = a * b;
    return { prompt: w.prompts.times, q: `${a} \\times ${b}`, answer: { ...num(v), traps: added(a, b) }, show: String(v), plain: String(v), format: "number", solution: array(a, b) };
  };
  /** a × □ = ab or □ × a = ab. */
  const missing = (a: number, b: number): ReturnType<Gen> => ({
    prompt: w.basics.missing, q: r.next() < 0.5 ? `${a} \\times \\square = ${a * b}` : `\\square \\times ${a} = ${a * b}`,
    answer: num(b), show: String(b), plain: String(b), format: "number", solution: array(a, b),
  });
  /** A typed number with its slips, a picture over the question and the worked lines or model. */
  const out = (prompt: string, q: string, v: number, traps: Trap[], more: { steps?: string[]; solution?: ReturnType<typeof array>; pic?: Exercise["pic"] }): ReturnType<Gen> => ({
    prompt, q, answer: { ...num(v), traps }, show: String(v), plain: String(v), format: "number", ...more,
  });
  /** The box holds a factor; the product put in it is the slip. `work` shows the two sides making the same number. */
  const product = (x: number, work: string, v: number): Trap => ({ id: "productInBox", a: num(x), vars: { x, work, v } });

  /** a groups of b dots: how many in all, or which multiplication the picture shows. */
  const groups = (a: number, b: number) =>
    r.next() < 0.5
      ? out(W.groupsTotal, "", a * b, added(a, b), { pic: groupsPic(a, b), solution: model("groups", a, b) })
      : pickPart(r, W.whichTimes, `${a} \\times ${b}`, a + b !== a * b ? [{ tex: `${a} + ${b}`, id: "addedNotTimes", vars: { a, b, x: a + b, v: a * b } }] : [], [`${a} \\times ${a}`], { pic: groupsPic(a, b), solution: model("groups", a, b) });
  /** b + b + … (a times) = □ × b, over an array of a rows of b: the number added, or the total, put in the box. */
  const repeated = (a: number, b: number) => {
    const sum = Array(a).fill(b).join(" + ");
    const traps: Trap[] = [];
    if (b !== a) traps.push({ id: "addendForCount", a: num(b), vars: { x: b, a, b } });
    traps.push(product(a * b, `${sum} = ${a} × ${b} = ${a * b}`, a));
    return out(w.basics.missing, `${sum} = \\square \\times ${b}`, a, traps, { pic: arrayPic(a, b), steps: [`${sum} = ${a * b}`, `${a} \\times ${b} = ${a * b}`] });
  };
  /** a jumps of b on a number line: which multiplication. Counting the marks (with 0) instead of the jumps is a slip. */
  const jumps = (a: number, b: number) =>
    pickPart(
      r, W.whichTimes, `${a} \\times ${b}`,
      [
        ...(a + b !== a * b ? [{ tex: `${a} + ${b}`, id: "addedNotTimes" as const, vars: { a, b, x: a + b, v: a * b } }] : []),
        { tex: `${a + 1} \\times ${b}`, id: "pointsForJumps" as const, vars: { n: a + 1, a, b } },
      ],
      [],
      { pic: jumpsPic(a, b), solution: model("numberline", a, b) },
    );

  if (L === 1) {
    const kind = r.int(0, 4);
    if (kind === 1) {
      const a = r.int(2, 5);
      return groups(a, r.pick([2, 3, 4, 5, 10].filter((b) => b !== a)));
    }
    if (kind === 2) return repeated(r.int(2, 5), r.pick([2, 3, 4, 5]));
    if (kind === 3) {
      const a = r.int(2, 5);
      return jumps(a, r.pick([2, 3, 4, 5].filter((b) => b !== a)));
    }
    if (kind === 4) {
      const [a, b] = [r.int(2, 9), r.pick([2, 3, 4, 5, 10])];
      return out(fill(W.bags, { a, b }), "", a * b, added(a, b), { solution: model("groups", a, b) });
    }
    return fact(r.pick([2, 3, 4, 5, 10]), r.int(2, 10));
  }
  if (L === 2) {
    const kind = r.int(0, 5);
    if (kind === 2) {
      // The factors swapped: a × b = b × □, or the other fact an array shows.
      const [a, b] = [r.int(3, 9), r.int(3, 9)];
      if (r.next() < 0.5 || a === b) return out(w.basics.missing, `${a} \\times ${b} = ${b} \\times \\square`, a, [product(a * b, `${a} × ${b} = ${b} × ${a} = ${a * b}`, a)], { solution: array(a, b) });
      return pickPart(r, fill(W.otherFact, { a, b }), `${b} \\times ${a}`, [{ tex: `${a} + ${b}`, id: "addedNotTimes", vars: { a, b, x: a + b, v: a * b } }], [`${b} \\times ${b}`], { pic: arrayPic(a, b), solution: array(a, b) });
    }
    if (kind === 3) {
      // A factor split, an array cut in two: a × b = a × c + a × □, or a × b = a × c + □.
      const [a, b] = [r.int(3, 9), r.int(6, 9)];
      const c = r.pick([2, 5].filter((c) => c < b));
      const d = b - c;
      const steps = [`${a} \\times ${b} = ${a} \\times ${c} + ${a} \\times ${d}`, `= ${a * c} + ${a * d} = ${a * b}`];
      if (r.next() < 0.5)
        return out(w.basics.missing, `${a} \\times ${b} = ${a} \\times ${c} + ${a} \\times \\square`, d, [{ id: "partProductInBox", a: num(a * d), vars: { x: a * d, a, b, c, v: d } }], { pic: arrayPic(a, b, c), steps });
      return out(w.basics.missing, `${a} \\times ${b} = ${a} \\times ${c} + \\square`, a * d, [{ id: "factorNotProduct", a: num(d), vars: { x: d, a, v: a * d } }], { pic: arrayPic(a, b, c), steps });
    }
    if (kind === 4) {
      if (r.next() < 0.5) {
        // Three factors grouped either way: (a × b) × c = a × (b × □).
        const [a, b, c] = [r.int(2, 5), r.int(2, 5), r.int(2, 5)];
        return out(w.basics.missing, `(${a} \\times ${b}) \\times ${c} = ${a} \\times (${b} \\times \\square)`, c, b * c !== c ? [product(b * c, `(${a} × ${b}) × ${c} = ${a} × (${b} × ${c}) = ${a * b * c}`, c)] : [], {
          steps: [`(${a} \\times ${b}) \\times ${c} = ${a * b} \\times ${c} = ${a * b * c}`, `${a} \\times (${b} \\times ${c}) = ${a} \\times ${b * c} = ${a * b * c}`],
        });
      }
      // 2k × 5 = k × 2 × 5 = k × 10: the 2 left out is the slip.
      const k = r.int(6, 19);
      const n = 2 * k;
      return out(w.basics.missing, `${n} \\times 5 = ${k} \\times 2 \\times 5 = ${k} \\times \\square`, 10, [{ id: "factorSplitDropped", a: num(5), vars: { x: 5, n, k, v: 10 } }], {
        steps: [`${n} = ${k} \\times 2`, `2 \\times 5 = 10`, `${n} \\times 5 = ${k} \\times 10 = ${k * 10}`],
      });
    }
    if (kind === 5) {
      const t = r.int(0, 2);
      if (t === 2) {
        // Multiplying by tens: a boxes of b0 pencils, a × b tens.
        const [a, q] = [r.int(3, 9), r.int(2, 9)];
        const v = a * q * 10;
        return out(fill(W.pencils, { a, b: q * 10 }), "", v, [{ id: "zerosMiscounted", a: num(v / 10), vars: { x: v / 10, p: `${a} × ${q} = ${a * q}`, f: 10, v } }], { steps: [`${a} \\times ${q * 10} = ${a} \\times ${q} \\times 10`, `= ${a * q} \\times 10 = ${v}`] });
      }
      const [a, b] = [r.int(3, 9), r.int(6, 9)];
      if (t === 1) return out(fill(W.garden, { a, b }), "", a * b, added(a, b), { pic: arrayPic(a, b), solution: array(a, b) });
      return out(fill(W.eggs, { a, b }), "", a * b, added(a, b), { solution: array(a, b) });
    }
    return kind === 0 ? fact(r.int(6, 9), r.int(3, 9)) : missing(r.int(3, 9), r.int(3, 9));
  }
  const kind = r.int(0, 3);
  if (kind === 0) return fact(r.pick([11, 12]), r.int(3, 12));
  if (kind === 1) return missing(r.int(6, 12), r.int(6, 12));
  if (kind === 3) {
    // So many times as big: one amount b times another. Adding the two is the slip.
    const [a, b] = [r.int(12, 45), r.int(3, 9)];
    return out(fill(W.timesAsTall, { a, b }), "", a * b, added(a, b), { steps: [`${a} \\times ${b} = ${a * b}`] });
  }
  // Multiples of ten: the fact, then every zero put back (40 × 60 = 24 × 100).
  const [p, q] = [r.int(2, 9), r.int(2, 9)];
  const [e, g] = [r.int(1, 2), r.int(0, 1)];
  const [a, b, f] = [p * 10 ** e, q * 10 ** g, 10 ** (e + g)];
  const v = a * b;
  return {
    prompt: w.prompts.times, q: `${a} \\times ${b}`,
    answer: { ...num(v), traps: [{ id: "zerosMiscounted", a: num(v / 10), vars: { x: v / 10, p: `${p} × ${q} = ${p * q}`, f, v } }] },
    show: String(v), plain: String(v), format: "number",
    steps: [`${a} \\times ${b} = ${p} \\times ${q} \\times ${f}`, `= ${p * q} \\times ${f} = ${v}`],
  };
};

export default gen;
