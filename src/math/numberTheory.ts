// Number theory practice (AoPS Introduction to Number Theory: ch. 5 divisor problems, ch. 8–9 bases and base
// arithmetic, ch. 10 units digits, ch. 11 repeating decimals, ch. 12–14 modular arithmetic and linear congruences).
// Two skills. `bases`: a base-b numeral in base 10 (easy), base 10 in base b (medium), adding, subtracting and
// multiplying in base b (hard). `modular`: how many divisors from the prime factorisation, and the units digit of a
// power (easy); a repeating decimal as a fraction, and the remainder of a product (medium); the remainder of a power,
// a x ≡ b (mod m), and two congruences at once (hard). The usual slips are the traps: place values started at b¹, the
// remainders read downwards, carrying at ten, the exponents multiplied without their +1, the cycle one step off, the
// repeating block put over 100 instead of 99, a remainder not reduced, and multiplying by a instead of its inverse.
import { baseWork, type BaseOp, type NtSpec } from "./numtheory";

type Next = () => number;
const intOf = (next: Next) => (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
const mod = (a: number, m: number) => ((a % m) + m) % m;

export type NumberTheoryMistake = "placeFromOne" | "remaindersDown" | "carryInTen" | "noPlusOne" | "cycleOffByOne" | "overPowerOfTen" | "notReduced" | "timesNotInverse";
export type Trap = { id: NumberTheoryMistake; v: number; vars: Record<string, string | number> };

/** The prompts, one per kind of question (the locale's `numberTheory` block). */
export type NumberTheoryWords = {
  toTen: string;
  fromTen: string;
  add: string;
  sub: string;
  mul: string;
  divisors: string;
  divisorsOf: string;
  unitsDigit: string;
  repeating: string;
  remainder: string;
  congruence: string;
};
export type NumberTheoryKind = keyof NumberTheoryWords;

export type NumberTheoryQuestion = {
  kind: NumberTheoryKind;
  vars: Record<string, string | number>;
  /** TeX under the prompt. */
  q: string;
  /** The answer's value; a base-b answer is its numeral read as digits (1011 for 1011₂), which is what is typed. */
  v: number;
  /** The answer in base `base` (shown with the base under it), on the questions answered in base b. */
  base?: number;
  /** A fraction n/d in lowest terms (a repeating decimal), else a whole number. */
  frac?: [number, number];
  traps: Trap[];
  /** The number theory tool's picture of the working, or the working as TeX lines. */
  spec?: NtSpec;
  steps?: string[];
};

const keep = (v: number, traps: Trap[]) => traps.filter((t) => Number.isFinite(t.v) && t.v >= 0 && t.v !== v);
const pow = (x: number, e: number) => (e === 1 ? `${x}` : `${x}^{${e}}`);
const fracTex = ([n, d]: [number, number]) => `\\frac{${n}}{${d}}`;
const lowest = (n: number, d: number): [number, number] => [n / gcd(n, d), d / gcd(n, d)];

// ---------- bases ----------

/** Level 1: a numeral in base b (3 to 9, or 2 with more digits) written in base 10. */
export function toTenQuestion(next: Next): NumberTheoryQuestion {
  const int = intOf(next);
  const b = int(2, 9);
  // Three or four digits (five to seven in base 2), the first not 0.
  const len = b === 2 ? int(5, 7) : b <= 4 ? int(3, 4) : 3;
  const ds = [int(1, b - 1), ...Array.from({ length: len - 1 }, () => int(0, b - 1))];
  const s = ds.join("");
  const v = parseInt(s, b);
  const terms = ds.map((d, i) => (i === len - 1 ? `${d}` : `${d} \\times ${pow(b, len - 1 - i)}`)).join(" + ");
  return {
    kind: "toTen",
    vars: { b },
    q: `${s}_{${b}}`,
    v,
    traps: keep(v, [{ id: "placeFromOne", v: v * b, vars: { x: v * b, b, v } }]),
    spec: { topic: "bases", n: s, from: String(b), to: "10" },
    steps: [`${s}_{${b}} = ${terms} = ${v}`],
  };
}

/** Level 2: a number from 20 to 500 written in base b (2 to 9): divide by b again and again, read the remainders up. */
export function fromTenQuestion(next: Next): NumberTheoryQuestion {
  const int = intOf(next);
  for (;;) {
    const b = int(2, 9);
    const n = b === 2 ? int(20, 120) : int(b * b + 1, Math.min(500, b ** 3 * 2));
    const s = n.toString(b);
    const back = [...s].reverse().join("");
    if (back === s) continue; // a palindrome reads the same either way: no slip to see
    const v = Number(s);
    return { kind: "fromTen", vars: { n, b }, q: `${n} = \\;?_{${b}}`, v, base: b, traps: keep(v, [{ id: "remaindersDown", v: Number(back), vars: { x: back, v: s } }]), spec: { topic: "bases", n: String(n), from: "10", to: String(b) } };
  }
}

/**
 * Level 3: a + b, a − b or a × b in base b (3 to 9), with at least one carry or borrow, answered in base b. Working
 * the columns as in base 10 (carrying at ten, borrowing ten, the base-10 tables) gives the numerals' base-10 result.
 */
export function baseOpQuestion(next: Next): NumberTheoryQuestion {
  const int = intOf(next);
  for (;;) {
    const op = (["add", "sub", "mul"] as const satisfies readonly BaseOp[])[int(0, 2)];
    const b = int(3, 9);
    const numeral = (len: number) => [int(1, b - 1), ...Array.from({ length: len - 1 }, () => int(op === "sub" ? 1 : 0, b - 1))].join("");
    let [x, y] = op === "mul" ? [numeral(int(2, 3)), numeral(1)] : [numeral(3), numeral(int(2, 3))];
    if (op === "mul" && y === "1") continue;
    if (op === "sub" && parseInt(x, b) < parseInt(y, b)) [x, y] = [y, x];
    if (x === y) continue;
    const work = baseWork(x, y, op, b);
    const v = Number(work.result);
    const ten = op === "add" ? Number(x) + Number(y) : op === "sub" ? Number(x) - Number(y) : Number(x) * Number(y);
    if (ten === v) continue; // no carry or borrow: base b works like base 10 here
    const sign = { add: "+", sub: "-", mul: "\\times" }[op];
    return {
      kind: op,
      vars: { b },
      q: `${x}_{${b}} ${sign} ${y}_{${b}}`,
      v,
      base: b,
      traps: keep(v, [{ id: "carryInTen", v: ten, vars: { x: ten, b, v: work.result } }]),
      spec: { topic: "baseOps", op, a: x, b: y, base: String(b) },
    };
  }
}

// ---------- divisors and units digits ----------

/** Level 1: how many divisors, from n or from its prime factorisation (the exponents each one more, multiplied). */
export function divisorQuestion(next: Next): NumberTheoryQuestion {
  const int = intOf(next);
  const given = next() < 0.5;
  for (;;) {
    const primes = given ? [2, 3, 5, 7, 11] : [2, 3, 5, 7];
    const k = int(2, 3);
    const ps = primes.slice().sort(() => next() - 0.5).slice(0, k).sort((p, q) => p - q);
    const es = ps.map(() => int(1, given ? 4 : 3));
    const n = ps.reduce((m, p, i) => m * p ** es[i], 1);
    if (given ? n > 100000 || n < 500 : n > 1000 || n < 24) continue;
    const v = es.reduce((m, e) => m * (e + 1), 1);
    const x = es.reduce((m, e) => m * e, 1);
    const factorTex = ps.map((p, i) => pow(p, es[i])).join(" \\cdot ");
    return {
      kind: given ? "divisorsOf" : "divisors",
      vars: { n },
      q: given ? `${n} = ${factorTex}` : "",
      v,
      traps: keep(v, [{ id: "noPlusOne", v: x, vars: { x, p: es.join(" × "), q: es.map((e) => `(${e} + 1)`).join(" × "), v } }]),
      spec: { topic: "factor", n: String(n) },
      steps: [`${n} = ${factorTex}`, `${es.map((e) => `(${e} + 1)`).join("")} = ${v}`],
    };
  }
}

/** The repeating powers of a modulo m, from a¹: the cycle of units digits (m = 10) or of remainders. */
export function cycleOf(a: number, m: number): number[] {
  const out: number[] = [];
  for (let v = mod(a, m); !out.includes(v); v = mod(v * a, m)) out.push(v);
  return out;
}

/** A power read off its cycle: the answer, and the trap one step along (the remainder of n taken as the place). */
function cycleQuestion(a: number, n: number, m: number) {
  const cyc = cycleOf(a, m);
  const c = cyc.length;
  const k = ((n - 1) % c) + 1;
  const v = cyc[k - 1];
  const vars = { x: cyc[n % c], cycle: cyc.join(", "), c, n, q: Math.floor((n - (n % c || c)) / c), r: n % c || c, k, v };
  const steps = [
    `${Array.from({ length: c }, (_, i) => `${a}^{${i + 1}}`).join(",\\ ")} \\;\\to\\; ${cyc.join(",\\ ")}`,
    `${n} = ${c} \\times ${vars.q} + ${vars.r}`,
    `${a}^{${n}} \\;\\to\\; ${a}^{${k}} \\;\\to\\; ${v}`,
  ];
  return { v, steps, trap: c > 1 ? { id: "cycleOffByOne" as const, v: cyc[n % c], vars } : null };
}

/** Level 1: the units digit of a large power, from the cycle of units digits. */
export function unitsDigitQuestion(next: Next): NumberTheoryQuestion {
  const int = intOf(next);
  const a = [2, 3, 7, 8][int(0, 3)] + 10 * int(0, 2);
  const n = int(21, 199);
  const { v, steps, trap } = cycleQuestion(a, n, 10);
  return { kind: "unitsDigit", vars: {}, q: `${a}^{${n}}`, v, traps: keep(v, trap ? [trap] : []), steps };
}

// ---------- repeating decimals and remainders ----------

/** Level 2: a repeating decimal as a fraction: 0.(d), 0.(ab), 0.(abc) over 9s, or 0.a(b) over 90. */
export function repeatingQuestion(next: Next): NumberTheoryQuestion {
  const int = intOf(next);
  for (;;) {
    const form = int(0, 3);
    if (form === 3) {
      // 0.a(b): ten times it repeats from the point.
      const [a, b] = [int(0, 9), int(1, 9)];
      if (a === b) continue;
      const top = 10 * a + b - a;
      const frac = lowest(top, 90);
      const trap = lowest(10 * a + b, 100);
      return {
        kind: "repeating",
        vars: {},
        q: `0.${a}\\overline{${b}}`,
        v: frac[0] / frac[1],
        frac,
        traps: keep(frac[0] / frac[1], [{ id: "overPowerOfTen", v: trap[0] / trap[1], vars: { x: `${trap[0]}/${trap[1]}`, nines: 90, tens: 100, v: `${frac[0]}/${frac[1]}` } }]),
        steps: [`x = 0.${a}\\overline{${b}}`, `100x = ${10 * a + b}.\\overline{${b}}`, `10x = ${a}.\\overline{${b}}`, `90x = ${10 * a + b} - ${a} = ${top}`, `x = \\frac{${top}}{90} = ${fracTex(frac)}`],
      };
    }
    // A block of k digits that is not itself a repeat (not 33 or 1212), and not all 9s.
    const k = form + 1;
    const block = int(1, 10 ** k - 2);
    const s = String(block).padStart(k, "0");
    if (k > 1 && new Set(s).size === 1) continue;
    const nines = 10 ** k - 1;
    const frac = lowest(block, nines);
    const trap = lowest(block, 10 ** k);
    return {
      kind: "repeating",
      vars: {},
      q: `0.\\overline{${s}}`,
      v: frac[0] / frac[1],
      frac,
      traps: keep(frac[0] / frac[1], [{ id: "overPowerOfTen", v: trap[0] / trap[1], vars: { x: `${trap[0]}/${trap[1]}`, nines, tens: 10 ** k, v: `${frac[0]}/${frac[1]}` } }]),
      steps: [`x = 0.\\overline{${s}}`, `${10 ** k}x = ${block}.\\overline{${s}}`, `${nines}x = ${block}`, `x = \\frac{${block}}{${nines}}${frac[1] === nines ? "" : ` = ${fracTex(frac)}`}`],
    };
  }
}

/** Level 2: the remainder of a × b + c (or a × b × c) on division by m: each number's remainder first. */
export function productRemainderQuestion(next: Next): NumberTheoryQuestion {
  const int = intOf(next);
  for (;;) {
    const m = [3, 4, 5, 6, 7, 8, 9, 11][int(0, 7)];
    const [a, b, c] = [int(100, 9999), int(100, 9999), int(10, 999)];
    const plus = next() < 0.6;
    const [ra, rb, rc] = [a % m, b % m, c % m];
    const raw = plus ? ra * rb + rc : ra * rb * rc;
    const v = raw % m;
    if (raw < m) continue; // nothing left to reduce: the slip can't show
    const join = plus ? `${a} \\times ${b} + ${c}` : `${a} \\times ${b} \\times ${c}`;
    return {
      kind: "remainder",
      vars: { m },
      q: join,
      v,
      traps: keep(v, [{ id: "notReduced", v: raw, vars: { x: raw, m, q: Math.floor(raw / m), v } }]),
      steps: [
        `${a} \\equiv ${ra},\\ ${b} \\equiv ${rb},\\ ${c} \\equiv ${rc} \\pmod{${m}}`,
        `${plus ? `${ra} \\times ${rb} + ${rc}` : `${ra} \\times ${rb} \\times ${rc}`} = ${raw} = ${m} \\times ${Math.floor(raw / m)} + ${v}`,
      ],
    };
  }
}

// ---------- congruences ----------

/** Level 3: the remainder of a power, a x ≡ b (mod p), or two congruences at once (the Chinese remainder theorem). */
export function congruenceQuestion(next: Next): NumberTheoryQuestion {
  const int = intOf(next);
  const kind = int(0, 2);
  if (kind === 0) {
    for (;;) {
      const m = [7, 9, 11, 13][int(0, 3)];
      const a = int(2, 3 * m);
      if (gcd(a, m) !== 1 || cycleOf(a, m).length < 3) continue;
      const n = int(30, 150);
      const { v, steps, trap } = cycleQuestion(a, n, m);
      return { kind: "remainder", vars: { m }, q: `${a}^{${n}}`, v, traps: keep(v, trap ? [trap] : []), steps };
    }
  }
  if (kind === 1) {
    for (;;) {
      const m = [7, 11, 13, 17][int(0, 3)];
      const [a, b] = [int(2, m - 1), int(1, m - 1)];
      const inv = cycleOf(a, m).at(-2) ?? 1; // a^(order − 1) = a⁻¹
      const x = mod(inv * b, m);
      const wrong = mod(a * b, m);
      if (x === b) continue; // a ≡ 1 would make it trivial
      return {
        kind: "congruence",
        vars: {},
        q: `${a}x \\equiv ${b} \\pmod{${m}}`,
        v: x,
        traps: keep(x, wrong ? [{ id: "timesNotInverse", v: wrong, vars: { x: wrong, a, m, i: inv, v: x } }] : []),
        spec: { topic: "crt", mode: "linear", a: String(a), b: String(b), m: String(m), system: "2 mod 3, 3 mod 5" },
        steps: [`${a} \\times ${inv} = ${a * inv} \\equiv 1 \\pmod{${m}}`, `x \\equiv ${inv} \\times ${b} = ${inv * b} \\equiv ${x} \\pmod{${m}}`],
      };
    }
  }
  for (;;) {
    const ms = [3, 4, 5, 7, 8, 9, 11];
    const [m1, m2] = [ms[int(0, 6)], ms[int(0, 6)]].sort((p, q) => p - q);
    if (m1 === m2 || gcd(m1, m2) !== 1 || m1 * m2 > 99) continue;
    const [r1, r2] = [int(0, m1 - 1), int(0, m2 - 1)];
    if (r1 === r2) continue; // r itself: no working needed
    let x = 1;
    while (x % m1 !== r1 || x % m2 !== r2) x++;
    const list = Array.from({ length: m1 }, (_, t) => r2 + m2 * t);
    return {
      kind: "congruence",
      vars: {},
      q: `x \\equiv ${r1} \\pmod{${m1}},\\quad x \\equiv ${r2} \\pmod{${m2}}`,
      v: x,
      traps: [],
      spec: { topic: "crt", mode: "system", a: "3", b: "2", m: "7", system: `${r1} mod ${m1}, ${r2} mod ${m2}` },
      steps: [`x = ${list.join(",\\ ")}, \\ldots`, `${x} = ${m1} \\times ${Math.floor(x / m1)} + ${r1}`],
    };
  }
}
