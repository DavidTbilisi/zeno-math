// Practice: Rounding and estimation. Whole numbers to tens, hundreds and thousands and decimals to places, with
// estimates made by rounding first and rounding in a story; then significant figures, standard form, products in
// standard form, a product estimated, standard form in a story and a number as one digit times a power of 10; then
// bounds. Cutting the digits off, rounding in stages, losing the zeros, working exactly instead of estimating, adding
// the powers when dividing and a power one out are the slips.
import { fill } from "../chart";
import type { MistakeId } from "../mistakes";
import type { RoundSolution } from "../roundPics";
import { fmtM, num, tidy } from "../practiceKit";
import type { Gen, Trap } from "../practiceTypes";

// A number is kept as a whole mantissa m and its decimal places p (m / 10^p), so rounding is exact.

/** m/10^p rounded to k decimal places (k < 0: to tens, hundreds…), halves up, as a mantissa at p places. */
const roundM = (m: number, p: number, k: number) => Math.round(m / 10 ** (p - k)) * 10 ** (p - k);

/** The same, digits just cut off. */
const cutM = (m: number, p: number, k: number) => Math.floor(m / 10 ** (p - k)) * 10 ** (p - k);

/** Rounded one place at a time from the last digit: the double-rounding mistake. */
function stagesM(m: number, p: number, k: number): number {
  let x = m;
  for (let j = p - 1; j >= k; j--) x = roundM(x, p, j);
  return x;
}

/** A number in standard form as it is printed in a sentence: 1.5 × 10⁸. */
const SUP: Record<string, string> = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
export const powerText = (e: number) => `10${String(e).split("").map((c) => SUP[c]).join("")}`;
const stdText = (m: number, e: number) => `${tidy(m)} × ${powerText(e)}`;
/** m × 10^e with 1 ≤ m < 10. */
function normal(m: number, e: number): [number, number] {
  let [x, k] = [m, e];
  while (x >= 10) [x, k] = [x / 10, k + 1];
  while (x < 1) [x, k] = [x * 10, k - 1];
  return [Number(x.toPrecision(10)), k];
}

const gen: Gen = (r, L, w) => {
  const E = w.estimate;
  /** The picture (digits and a zoom on the number line, bounds as a band, the point hopping), the working beneath. */
  const pic = (spec: RoundSolution, steps: string[]) => ({ kind: "round" as const, spec: { ...spec, steps } });
  /** Rounding m/10^p to k places, with the traps the numbers allow; placeLost when the zeros hold places. */
  const rounded = (m: number, p: number, k: number, prompt: string, sf?: number) => {
    const want = roundM(m, p, k);
    const traps: Trap[] = [];
    const add = (id: MistakeId, x: number) => {
      if (Math.abs(x - want / 10 ** p) > 1e-9 && !traps.some((t) => t.a.k === "num" && Math.abs(t.a.v - x) < 1e-9)) traps.push({ id, a: num(x) });
    };
    add("truncated", cutM(m, p, k) / 10 ** p);
    add("doubleRound", stagesM(m, p, k) / 10 ** p);
    if (k < 0) add("placeLost", want / 10 ** (p - k));
    const shown = fmtM(want, p, k);
    return { prompt, q: "", answer: { ...num(want / 10 ** p), traps }, show: shown, plain: shown, format: "number" as const, solution: pic({ pic: "round", m, p, k, ...(sf ? { sf } : {}) }, [`${fmtM(m, p)} \\approx ${shown}`]) };
  };
  /** A mantissa whose dropped digits aren't exactly a half (where people disagree on which way to go). */
  const noTie = (lo: number, hi: number, p: number, k: number) => {
    for (;;) {
      const m = r.int(lo, hi);
      if (m % 10 ** (p - k) !== 10 ** (p - k) / 2 && m % 10) return m;
    }
  };
  /** The rounding of one whole number: to the nearest ten, hundred or thousand. */
  const R = (n: number, k: number) => roundM(n, 0, k);
  const nearest = (k: number) => (k === -1 ? E.nearest.ten : k === -2 ? E.nearest.hundred : E.nearest.thousand);
  /**
   * An estimate: each number rounded first, then added or taken. The exact answer, and the numbers cut instead of
   * rounded, are the slips.
   */
  const estimated = (ns: number[], signs: ("+" | "-")[], k: number, prompt: string, q: string) => {
    const at = (f: (n: number) => number) => ns.reduce((acc, n, i) => (i === 0 ? f(n) : signs[i - 1] === "+" ? acc + f(n) : acc - f(n)), 0);
    const v = at((n) => R(n, k));
    const exact = at((n) => n);
    const cut = at((n) => cutM(n, 0, k));
    const work = ns.map((n, i) => `${i ? ` ${signs[i - 1] === "+" ? "+" : "−"} ` : ""}${R(n, k)}`).join("");
    const traps: Trap[] = [];
    if (exact !== v) traps.push({ id: "exactNotEstimate", a: num(exact), vars: { x: exact, work, v } });
    if (cut !== v && cut !== exact) traps.push({ id: "truncated", a: num(cut) });
    return {
      prompt, q, answer: { ...num(v), traps }, show: String(v), plain: String(v), format: "number" as const,
      solution: pic({ pic: "estimateSum", ns, signs, k }, [`${ns.map((n, i) => `${i ? ` ${signs[i - 1]} ` : ""}${n}`).join("")} \\approx ${work.replace(/−/g, "-")} = ${v}`]),
    };
  };
  if (L === 1) {
    const kind = r.int(0, 3);
    if (kind === 0) {
      const k = r.pick([-1, -2, -3]);
      // Three digits too, when rounding to the nearest ten or hundred.
      const m = noTie(k === -3 ? 1000 : 100, 99999, 0, k);
      return rounded(m, 0, k, fill(k === -1 ? w.prompts.roundTo10 : k === -2 ? w.prompts.roundTo100 : w.prompts.roundTo1000, { n: m }));
    }
    if (kind === 1) {
      const k = r.pick([1, 2]);
      const m = noTie(1001, 99999, 3, k);
      return rounded(m, 3, k, fill(k === 1 ? w.prompts.roundDp1 : w.prompts.roundDp2, { n: fmtM(m, 3) }));
    }
    if (kind === 2) {
      const k = r.pick([-1, -2, -3]);
      const [lo, hi] = k === -1 ? [21, 499] : k === -2 ? [210, 4999] : [2100, 49999];
      const a = noTie(lo * 2, hi * 2, 0, k);
      const b = noTie(lo, hi, 0, k);
      const sign = r.next() < 0.5 ? "+" : "-";
      return estimated([a, b], [sign], k, fill(E.sum, { p: nearest(k) }), `${a} ${sign} ${b}`);
    }
    if (r.next() < 0.5) {
      const k = r.pick([-2, -3]);
      const m = noTie(k === -2 ? 1000 : 10000, 99999, 0, k);
      return rounded(m, 0, k, fill(E.stadium, { n: m, p: nearest(k) }));
    }
    // A two-step story: two numbers bought, one given away, each rounded to the nearest hundred first.
    const [a, b] = [noTie(210, 990, 0, -2), noTie(210, 990, 0, -2)];
    const c = noTie(110, Math.min(a, b), 0, -2);
    return estimated([a, b, c], ["+", "-"], -2, fill(E.school, { a, b, c, p: nearest(-2) }), "");
  }
  if (L === 2) {
    const kind = r.int(0, 5);
    if (kind === 4) {
      if (r.next() < 0.5) {
        // Time = distance ÷ speed: the mantissas divide to a short decimal, the powers are taken.
        const [q, b] = [r.pick([1.2, 1.5, 2, 2.5, 3, 4]), r.pick([2, 3, 4])];
        const a = Number((q * b).toPrecision(10));
        const [m, n] = [r.int(7, 12), r.int(3, 5)];
        const [vm, ve] = normal(a / b, m - n);
        const v = Number((vm * 10 ** ve).toPrecision(12));
        const [xm, xe] = normal(a / b, m + n);
        const [ma, ea] = normal(a, m);
        return {
          prompt: fill(E.probe, { d: stdText(ma, ea), s: stdText(b, n) }),
          q: "",
          answer: { ...num(v), std: true, traps: [{ id: "powersAddedForDivide", a: { ...num(Number((xm * 10 ** xe).toPrecision(12))), std: true }, vars: { x: stdText(xm, xe), pm: powerText(ea), pn: powerText(n), pd: powerText(ea - n), v: stdText(vm, ve) } }] },
          show: `${tidy(vm)} \\times 10^{${ve}}`,
          plain: `${tidy(vm)}*10^${ve}`,
          format: "standard" as const,
          solution: pic({ pic: "stdMul", div: true, a: tidy(ma), m1: ea, b: String(b), m2: n, prod: tidy(ma / b), mant: tidy(vm), e: ve }, [`\\dfrac{${tidy(ma)} \\times 10^{${ea}}}{${b} \\times 10^{${n}}} = ${tidy(vm)} \\times 10^{${ve}}`]),
        };
      }
      // Mass = mass of one × how many: a product of a small and a large number.
      const [g, k, b, n] = [r.int(11, 95) / 10, r.int(3, 6), r.int(2, 9), r.int(4, 8)];
      const [vm, ve] = normal(g * b, n - k);
      const v = Number((vm * 10 ** ve).toPrecision(12));
      return {
        prompt: fill(E.grains, { g: stdText(g, -k), n: stdText(b, n) }),
        q: "",
        answer: { ...num(v), std: true },
        show: `${tidy(vm)} \\times 10^{${ve}}`,
        plain: `${tidy(vm)}*10^${ve}`,
        format: "standard" as const,
        solution: pic({ pic: "stdMul", a: tidy(g), m1: -k, b: String(b), m2: n, prod: tidy(Number((g * b).toPrecision(10))), mant: tidy(vm), e: ve }, [`(${tidy(g)} \\times 10^{-${k}}) \\times (${b} \\times 10^{${n}}) = ${tidy(vm)} \\times 10^{${ve}}`]),
      };
    }
    if (kind === 5) {
      // One digit times a power of 10: 0.00000731 ≈ 7 × 10⁻⁶. Counting the zeros, or all the digits, puts the power one out.
      let d = r.int(11, 94) / 10;
      if (Math.round(d) === d) d += 0.1;
      const e = r.next() < 0.5 ? -r.int(3, 7) : r.int(4, 8);
      const text = e > 0 ? String(Math.round(d * 100) * 10 ** (e - 2)) : (d / 10 ** -e).toFixed(1 - e);
      const one = Math.round(d);
      const v = one * 10 ** e;
      // The number as a mantissa at p places, rounded at its first digit's place: the round picture at 1 s.f.
      const [m, p] = e > 0 ? [Math.round(d * 100) * 10 ** (e - 2), 0] : [Math.round(d * 10), 1 - e];
      return {
        prompt: fill(E.single, { n: text }),
        q: "",
        answer: { ...num(Number(v.toPrecision(12))), std: true, traps: [{ id: "powerOneOut", a: { ...num(Number((one * 10 ** (e + 1)).toPrecision(12))), std: true }, vars: { x: stdText(one, e + 1), n: text, d: one, p: powerText(e), k: Math.abs(e) } }] },
        show: `${one} \\times 10^{${e}}`,
        plain: `${one}*10^${e}`,
        format: "standard" as const,
        solution: pic({ pic: "round", m, p, k: -e, sf: 1 }, [`${text} \\approx ${one} \\times 10^{${e}}`]),
      };
    }
    if (kind === 0) {
      const s = r.int(1, 3);
      const prompt = (n: string) => (s === 1 ? fill(w.prompts.roundSf1, { n }) : fill(w.prompts.roundSf, { n, s }));
      if (r.next() < 0.5) {
        const digits = r.int(4, 6);
        const m = noTie(10 ** (digits - 1) + 1, 10 ** digits - 1, 0, s - digits);
        return rounded(m, 0, s - digits, prompt(String(m)), s);
      }
      // 0.0xxxx: the first significant figure is in the second decimal place.
      const m = noTie(1001, 9999, 5, 1 + s);
      return rounded(m, 5, 1 + s, prompt(fmtM(m, 5)), s);
    }
    if (kind === 1) {
      const mant = r.int(101, 999);
      const e = r.next() < 0.5 ? r.int(4, 8) : -r.int(2, 6);
      const n = (mant / 100) * 10 ** e;
      const text = e > 0 ? String(mant * 10 ** (e - 2)) : (mant / 100 / 10 ** -e).toFixed(2 - e);
      const m = tidy(mant / 100);
      return {
        prompt: fill(w.prompts.stdForm, { n: text }),
        q: "",
        answer: { ...num(n), std: true },
        show: `${m} \\times 10^{${e}}`,
        plain: `${m}*10^${e}`,
        format: "standard",
        solution: pic({ pic: "std", text, e }, [`${text} = ${m} \\times 10^{${e}}`]),
      };
    }
    if (kind === 2) {
      const [A, B, m1, m2] = [r.int(11, 99), r.int(11, 99), r.int(-6, 9), r.int(-6, 9)];
      let mant = (A * B) / 100;
      let e = m1 + m2;
      if (mant >= 10) [mant, e] = [mant / 10, e + 1];
      const m = tidy(mant);
      return {
        prompt: w.prompts.stdMul,
        q: `(${tidy(A / 10)} \\times 10^{${m1}}) \\times (${tidy(B / 10)} \\times 10^{${m2}})`,
        answer: { ...num(Number(m) * 10 ** e), std: true },
        show: `${m} \\times 10^{${e}}`,
        plain: `${m}*10^${e}`,
        format: "standard",
        solution: pic({ pic: "stdMul", a: tidy(A / 10), m1, b: tidy(B / 10), m2, prod: tidy((A * B) / 100), mant: m, e }, [
          `${tidy(A / 10)} \\times ${tidy(B / 10)} = ${tidy((A * B) / 100)}`,
          `10^{${m1}} \\times 10^{${m2}} = 10^{${m1 + m2}}`,
          `= ${m} \\times 10^{${e}}`,
        ]),
      };
    }
    // Estimating: each number to 1 significant figure, then multiply.
    const [x, y] = [r.int(110, 989) / 100, r.int(110, 989) * 10 ** r.int(-1, 1)];
    const sf1 = (v: number) => {
      const e = Math.floor(Math.log10(v));
      return [Math.round(v / 10 ** e) * 10 ** e, Math.floor(v / 10 ** e) * 10 ** e];
    };
    const [[x1, xc], [y1, yc]] = [sf1(x), sf1(y)];
    const v = Number((x1 * y1).toPrecision(12));
    const traps: Trap[] = [];
    const cut = Number((xc * yc).toPrecision(12));
    if (cut !== v) traps.push({ id: "truncated", a: num(cut) });
    return {
      prompt: w.prompts.estimate,
      q: `${tidy(x)} \\times ${tidy(y)}`,
      answer: { ...num(v), traps },
      show: tidy(v),
      plain: tidy(v),
      format: "number",
      solution: pic({ pic: "estimate", x, y, x1, y1 }, [`${tidy(x)} \\times ${tidy(y)} \\approx ${tidy(x1)} \\times ${tidy(y1)} = ${tidy(v)}`]),
    };
  }
  if (r.next() < 0.7) {
    const prec = r.pick(["whole", "dp1", "ten"] as const);
    const unit = prec === "whole" ? 1 : prec === "dp1" ? 0.1 : 10;
    const x = prec === "whole" ? r.int(3, 200) : prec === "dp1" ? r.int(11, 999) / 10 : 10 * r.int(2, 60);
    const low = r.next() < 0.5;
    const v = Number((x + (low ? -unit / 2 : unit / 2)).toFixed(2));
    const p = prec === "whole" ? w.prompts.precWhole : prec === "dp1" ? w.prompts.precDp1 : w.prompts.precTen;
    const far = Number((x + (low ? -unit : unit)).toFixed(2));
    return {
      prompt: fill(low ? w.prompts.boundLow : w.prompts.boundHigh, { x: tidy(x), p }),
      q: "",
      answer: { ...num(v), traps: [{ id: "fullUnit", a: num(far), vars: { p } }] },
      show: tidy(v),
      plain: tidy(v),
      format: "number",
      solution: pic({ pic: "bound", x, unit, low }, [`${tidy(x)} ${low ? "-" : "+"} \\frac{${tidy(unit)}}{2} = ${tidy(v)}`]),
    };
  }
  const [n, x] = [r.int(3, 12), r.int(5, 40)];
  const v = n * (x + 0.5);
  return {
    prompt: fill(w.prompts.boundTotal, { n, x }),
    q: "",
    answer: { ...num(v), traps: [{ id: "fullUnit", a: num(n * (x + 1)), vars: { p: w.prompts.precWhole } }] },
    show: tidy(v),
    plain: tidy(v),
    format: "number",
    solution: pic({ pic: "boundTotal", n, x }, [`${x} + 0.5 = ${x + 0.5}`, `${n} \\times ${x + 0.5} = ${tidy(v)}`]),
  };
};

export default gen;
