// Practice: Rounding and estimation.
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

const gen: Gen = (r, L, w) => {
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
  if (L === 1) {
    if (r.next() < 0.5) {
      const k = r.pick([-1, -2, -3]);
      const m = noTie(1000, 99999, 0, k);
      return rounded(m, 0, k, fill(k === -1 ? w.prompts.roundTo10 : k === -2 ? w.prompts.roundTo100 : w.prompts.roundTo1000, { n: m }));
    }
    const k = r.pick([1, 2]);
    const m = noTie(1001, 99999, 3, k);
    return rounded(m, 3, k, fill(k === 1 ? w.prompts.roundDp1 : w.prompts.roundDp2, { n: fmtM(m, 3) }));
  }
  if (L === 2) {
    const kind = r.int(0, 3);
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
