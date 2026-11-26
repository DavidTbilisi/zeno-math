// Practice: Squares, cubes and roots. The squares to 10² and their roots (a square is drawn as its array), then to 20²
// and the first cubes, then cube roots, multiples of ten, tenths and fractions. Doubling for squaring, halving for a
// root and a tenth squared left in tenths are the slips.
import { fracTex, gcd, num, tidy } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";

/** The kinds #720 added at the hard level. */
function more(r: Rng, kind: number, w: PracticeWords): Part {
  const W = w.sqrP;
  if (kind <= 6) {
    // x² = k: two square roots, the positive and the negative; k a whole square, a decimal or a fraction.
    const form = r.int(0, 2);
    const [n, d] = form === 0 ? [r.int(2, 15), 1] : form === 1 ? [r.int(2, 9), 10] : r.pick([[2, 3], [3, 4], [2, 5], [4, 5], [5, 6], [3, 7], [5, 9]] as const);
    const v = n / d;
    const k = form === 0 ? String(n * n) : form === 1 ? tidy(v * v) : `\\frac{${n * n}}{${d * d}}`;
    const shown = form === 2 ? fracTex(n, d) : tidy(v);
    return {
      prompt: W.solveSquare, q: `x^2 = ${k}`,
      answer: { k: "set", vs: [-v, v], tol: 1e-9, listed: true, traps: [{ id: "rootOnlyPositive", a: { k: "set", vs: [v], tol: 1e-9, listed: true }, vars: { v: form === 2 ? `${n}/${d}` : tidy(v), k: form === 2 ? `${n * n}/${d * d}` : k } }] },
      show: `x = -${shown},\\; x = ${shown}`, plain: form === 2 ? `-${n}/${d}; ${n}/${d}` : `-${tidy(v)}; ${tidy(v)}`, format: "roots",
      steps: [`x = \\pm\\sqrt{${k}} = \\pm ${shown}`],
    };
  }
  if (kind <= 8) {
    // x³ = k: one cube root, with the sign of k.
    const n = r.int(2, 6) * r.pick([1, 1, -1]);
    const k = n ** 3;
    const traps: Trap[] = k % 3 === 0 && k / 3 !== n ? [{ id: "cubeRootAsThird", a: num(k / 3), vars: { x: k / 3, k, v: n } }] : [];
    return { prompt: W.solveCube, q: `x^3 = ${k}`, answer: { ...num(n), traps }, show: `x = ${n}`, plain: String(n), format: "number", steps: [`${n} \\times ${n} \\times ${n} = ${k}`, `x = \\sqrt[3]{${k}} = ${n}`] };
  }
  // The root of a decimal: the root has half as many decimal places.
  const n = r.int(2, 9);
  const [d, v] = [tidy((n * n) / 100), n / 10];
  return {
    prompt: w.prompts.times, q: `\\sqrt{${d}}`, answer: { ...num(v), traps: [{ id: "rootDecimalPlaces", a: num(n / 100), vars: { x: tidy(n / 100), d, v: tidy(v) } }] },
    show: tidy(v), plain: tidy(v), format: "number", steps: [`${tidy(v)} \\times ${tidy(v)} = ${d}`, `\\sqrt{${d}} = ${tidy(v)}`],
  };
}

const gen: Gen = (r, L, w) => {
  const out = (q: string, v: number, more: Pick<Part, "steps" | "solution"> & { traps?: Trap[] }): ReturnType<Gen> => ({
    prompt: w.prompts.times, q, answer: { ...num(v), traps: more.traps ?? [] }, show: tidy(v), plain: tidy(v), format: "number",
    ...(more.solution ? { solution: more.solution } : { steps: more.steps }),
  });
  /** n² (k = 2) or n³: n times k is the slip. */
  const power = (n: number, k: 2 | 3) => {
    const v = n ** k;
    const e = Array.from({ length: k }, () => n).join(" × ");
    const traps: Trap[] = n * k !== v ? [{ id: "timesNotPower", a: num(n * k), vars: { x: n * k, n, k, e, v } }] : [];
    if (k === 2) return out(`${n}^2`, v, { traps, solution: { kind: "model", spec: { type: "multiply", style: n <= 12 ? "array" : "area", a: n, b: n, step: 999 } } });
    return out(`${n}^3`, v, { traps, steps: [`${n}^3 = ${n} \\times ${n} \\times ${n} = ${n * n} \\times ${n} = ${v}`] });
  };
  /** √(n²): half of the number is the slip. */
  const root = (n: number) => {
    const s = n * n;
    const traps: Trap[] = s % 2 === 0 && s / 2 !== n ? [{ id: "halvedNotRoot", a: num(s / 2), vars: { x: s / 2, n: s, v: n } }] : [];
    return out(`\\sqrt{${s}}`, n, { traps, steps: [`${n} \\times ${n} = ${s}`, `\\sqrt{${s}} = ${n}`] });
  };
  if (L === 1) return r.next() < 0.6 ? power(r.int(2, 10), 2) : root(r.int(2, 10));
  if (L === 2) {
    const kind = r.int(0, 2);
    return kind === 0 ? power(r.int(11, 20), 2) : kind === 1 ? root(r.int(11, 20)) : power(r.pick([2, 3, 4, 5, 10]), 3);
  }
  // #720: equations x² = k and x³ = k, and roots of decimals and fractions, for 5 to 9 of a draw.
  const extra = r.int(0, 9);
  if (extra >= 5) return more(r, extra, w);
  const kind = r.int(0, 3);
  if (kind === 0) {
    const n = r.int(2, 10);
    return out(`\\sqrt[3]{${n ** 3}}`, n, { steps: [`${n} \\times ${n} \\times ${n} = ${n ** 3}`, `\\sqrt[3]{${n ** 3}} = ${n}`] });
  }
  if (kind === 1) {
    // A multiple of ten: 30² = 9 × 100, √1600 = 4 × 10.
    const n = r.int(2, 12);
    if (r.next() < 0.5) return out(`${10 * n}^2`, 100 * n * n, { steps: [`${10 * n}^2 = ${n}^2 \\times 10^2 = ${n * n} \\times 100 = ${100 * n * n}`] });
    return out(`\\sqrt{${100 * n * n}}`, 10 * n, { steps: [`\\sqrt{${100 * n * n}} = \\sqrt{${n * n}} \\times \\sqrt{100} = ${n} \\times 10 = ${10 * n}`] });
  }
  if (kind === 2) {
    // Tenths squared are hundredths: 0.3² = 0.09, not 0.9.
    const n = r.int(1, 9);
    const [d, v] = [`0.${n}`, (n * n) / 100];
    return out(`${d}^2`, v, {
      traps: [{ id: "decimalPlacesKept", a: num((n * n) / 10), vars: { x: tidy((n * n) / 10), d, m: n * n, v: tidy(v) } }],
      steps: [`${d}^2 = ${fracTex(n, 10)} \\times ${fracTex(n, 10)} = ${fracTex(n * n, 100)} = ${tidy(v)}`],
    });
  }
  // A fraction: the top and the bottom each squared, or each rooted.
  const b = r.int(3, 9);
  let a = r.int(1, b - 1);
  while (gcd(a, b) !== 1) a = r.int(1, b - 1);
  const frac = (n: number, d: number, q: string, steps: string[]): ReturnType<Gen> => ({
    prompt: w.prompts.fractions, q, answer: num(n / d, 1e-9, { lowest: true }), show: fracTex(n, d), plain: `${n}/${d}`, format: "fraction", steps,
  });
  if (r.next() < 0.5) return frac(a * a, b * b, `\\left(${fracTex(a, b)}\\right)^2`, [`\\left(${fracTex(a, b)}\\right)^2 = \\frac{${a} \\times ${a}}{${b} \\times ${b}} = ${fracTex(a * a, b * b)}`]);
  return frac(a, b, `\\sqrt{${fracTex(a * a, b * b)}}`, [`\\sqrt{${fracTex(a * a, b * b)}} = \\frac{\\sqrt{${a * a}}}{\\sqrt{${b * b}}} = ${fracTex(a, b)}`]);
};

export default gen;
