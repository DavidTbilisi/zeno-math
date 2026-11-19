// Practice: Fractions.
import { fr, fracBars, fracTex, gcd, mixedTex, num, plainFrac } from "../practiceKit";
import type { Exercise, FractionForm, Gen, Level, PracticeWords, Rng, Trap } from "../practiceTypes";

/**
 * The share of fractions questions that ask for one idea of fractions alone, in place of an operation. An operation
 * needs seven to ten ideas at once, so a wrong answer could be any of them; these forms each test one step by itself
 * (src/model/conceptGraph.ts, test 1), so the ideas a student lacks can be told apart.
 */
const FRACTION_FORM_SHARE = 0.4;

const FRACTION_FORMS: readonly FractionForm[] = ["equivalent", "lowest", "lcd", "reciprocal", "toImproper", "toMixed"];

/** One idea of fractions alone: a missing top, lowest terms, the lowest common denominator, a reciprocal, or a conversion between mixed and improper. */
function fractionForm(r: Rng, L: Level, w: PracticeWords): Omit<Exercise, "skill" | "level" | "seed"> {
  const form = r.pick(FRACTION_FORMS);
  const maxD = L === 1 ? 6 : L === 2 ? 9 : 12;
  /** A fraction below 1 in lowest terms. */
  const proper = () => {
    let n: number, d: number;
    do {
      d = r.int(2, maxD);
      n = r.int(1, d - 1);
    } while (gcd(n, d) !== 1);
    return { n, d };
  };
  switch (form) {
    case "equivalent": {
      // 3/4 = ?/12: the top scaled as the bottom was. Adding the same number to both is the trap.
      const { n, d } = proper();
      const k = r.int(2, L === 1 ? 5 : 12);
      const traps: Trap[] = [{ id: "addedToBoth", a: num(n + k * d - d), vars: { n, d, k, kd: k * d } }];
      return { prompt: w.prompts.fracEquivalent, q: `${fracTex(n, d)} = \\frac{?}{${k * d}}`, answer: { ...num(n * k), traps }, show: String(n * k), plain: String(n * k), format: "number", solution: fracBars("equivalent", `${n}/${d}`, `${n * k}/${k * d}`, [{ n, d }, { n: n * k, d: k * d }]) };
    }
    case "lowest": {
      const { n, d } = proper();
      const k = r.int(2, L === 1 ? 4 : L === 2 ? 9 : 12);
      return { prompt: w.prompts.fracLowest, q: fracTex(n * k, d * k), answer: num(n / d, 1e-9, { lowest: true }), show: fracTex(n, d), plain: `${n}/${d}`, format: "fraction", solution: fracBars("lowest", `${n * k}/${d * k}`, null, [{ n: n * k, d: d * k }, { n, d }]) };
    }
    case "lcd": {
      const a = proper();
      let b = proper();
      while (b.d === a.d) b = proper();
      const lcd = (a.d / gcd(a.d, b.d)) * b.d;
      const rows = [a, b, { n: (a.n * lcd) / a.d, d: lcd }, { n: (b.n * lcd) / b.d, d: lcd }];
      return { prompt: w.prompts.fracLcd, q: `${fracTex(a.n, a.d)},\\ ${fracTex(b.n, b.d)}`, answer: num(lcd), show: String(lcd), plain: String(lcd), format: "number", solution: fracBars("lcd", `${a.n}/${a.d}`, `${b.n}/${b.d}`, rows) };
    }
    case "reciprocal": {
      // A fraction, at level 2 sometimes a whole number, at level 3 a mixed number.
      const p = proper();
      const whole = L === 3 ? r.int(1, 3) : 0;
      const asWhole = L === 2 && r.next() < 0.3;
      const [n, d] = asWhole ? [r.int(2, 9), 1] : [whole * p.d + p.n, p.d];
      const given = asWhole ? String(n) : whole ? mixedTex(whole, p.n, p.d) : fracTex(n, d);
      const text = asWhole ? String(n) : whole ? `${whole} ${p.n}/${p.d}` : `${n}/${d}`;
      return { prompt: w.prompts.fracReciprocal, q: given, answer: num(d / n, 1e-9, { lowest: true }), show: fr(d, n).tex(), plain: plainFrac(fr(d, n)), format: "fraction", solution: fracBars("reciprocal", text, null, [{ n, d }, { n: d, d: n }]) };
    }
    case "toImproper":
    case "toMixed": {
      const { n, d } = proper();
      const whole = r.int(1, L === 1 ? 2 : L === 2 ? 3 : 5);
      const top = whole * d + n;
      const bars = fracBars(form, form === "toImproper" ? `${whole} ${n}/${d}` : `${top}/${d}`, null, [{ n: top, d }]);
      if (form === "toImproper") {
        // Multiplying the whole by the top instead of the bottom is the trap (the same value when the whole is 1).
        const traps: Trap[] = whole > 1 ? [{ id: "wholeTimesTop", a: num((whole * n + d) / d), vars: { w: whole, n, d, wd: whole * d, top } }] : [];
        return { prompt: w.prompts.fracImproper, q: mixedTex(whole, n, d), answer: { ...num(top / d, 1e-9, { lowest: true, form: "improper" }), traps }, show: fracTex(top, d), plain: `${top}/${d}`, format: "fraction", solution: bars };
      }
      return { prompt: w.prompts.fracMixed, q: fracTex(top, d), answer: num(top / d, 1e-9, { lowest: true, form: "mixed" }), show: mixedTex(whole, n, d), plain: `${whole} ${n}/${d}`, format: "fraction", solution: bars };
    }
  }
}

const gen: Gen = (r, L, w) => {
  const op = L === 1 ? r.pick(["+", "-"] as const) : r.pick(["+", "-", "×", "÷"] as const);
  const part = () => {
    const d = r.int(2, L === 1 ? 9 : 12);
    const n = r.int(1, d - 1);
    const whole = L === 3 ? r.int(1, 3) : 0;
    return { whole, n, d, f: fr(whole * d + n, d) };
  };
  let a = part();
  let b = part();
  if (L === 1 && r.next() < 0.5) {
    // Same or doubled denominator.
    const d = a.d * r.pick([1, 2]);
    const n = r.int(1, d - 1);
    b = { whole: 0, n, d, f: fr(n, d) };
  }
  if (op === "-" && a.f.toNumber() < b.f.toNumber()) [a, b] = [b, a];
  const res = op === "+" ? a.f.add(b.f) : op === "-" ? a.f.sub(b.f) : op === "×" ? a.f.mul(b.f) : a.f.div(b.f);
  const traps: Trap[] = [];
  if (op === "+" && !a.whole && !b.whole) {
    // Tops added and bottoms added: always between the two, so smaller than the larger one.
    const big = a.f.toNumber() > b.f.toNumber() ? a : b;
    traps.push({ id: "addAcross", a: num(fr(a.n + b.n, a.d + b.d).toNumber()), vars: { r: `${a.n + b.n}/${a.d + b.d}`, big: `${big.n}/${big.d}` } });
  }
  if (op === "÷" && !b.f.div(a.f).sub(res).isZero()) traps.push({ id: "flipFirst", a: num(b.f.div(a.f).toNumber()) });
  const ftex = (p: typeof a) => `${p.whole ? p.whole : ""}\\frac{${p.n}}{${p.d}}`;
  const ftxt = (p: typeof a) => (p.whole ? `${p.whole} ${p.n}/${p.d}` : `${p.n}/${p.d}`);
  const opTex = { "+": "+", "-": "-", "×": "\\times", "÷": "\\div" }[op];
  const whole = Math.trunc(res.n / res.d);
  const show = res.d === 1 || Math.abs(whole) === 0 ? res.tex() : `${res.tex()} = ${whole}\\frac{${Math.abs(res.n) % res.d}}{${res.d}}`;
  const operation = {
    prompt: w.prompts.fractions,
    q: `${ftex(a)} ${opTex} ${ftex(b)}`,
    answer: { ...num(res.toNumber(), 1e-9, { lowest: true }), traps },
    show,
    plain: plainFrac(res),
    format: "fraction" as const,
    solution: { kind: "model" as const, spec: { type: "fracop", op, a: ftxt(a), b: ftxt(b), step: 99 } },
  };
  // Drawn after the operation, so a seed that keeps its operation keeps the same question as before the forms came.
  return r.next() < FRACTION_FORM_SHARE ? fractionForm(r, L, w) : operation;
};

export default gen;
