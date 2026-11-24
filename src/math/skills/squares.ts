// Practice: Squares, cubes and roots. The squares to 10² and their roots (a square is drawn as its array), then to 20²
// and the first cubes, then cube roots, multiples of ten, tenths and fractions. Doubling for squaring, halving for a
// root and a tenth squared left in tenths are the slips.
import { fracTex, gcd, num, tidy } from "../practiceKit";
import type { Gen, Part, Trap } from "../practiceTypes";

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
