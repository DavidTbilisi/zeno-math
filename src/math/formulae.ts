// Algebraic fractions and formulae (Think Mathematics workbook 2A ch. 6). Two skills:
// - algebraic fractions: simplify by factorising, where cancelling terms instead of factors is the slip (easy); add,
//   subtract, multiply and divide with linear bottoms, where adding the tops and the bottoms is the slip (medium); the
//   same with quadratic bottoms that have to be factorised first (hard);
// - formulae: substitute into a formula or make a letter the subject in one step (easy); in two steps, where undoing
//   them in the wrong order is the slip (medium); a squared or rooted subject, where the power is left on, or a
//   subject that appears twice and is taken out as a factor (hard).
// Answers are expressions, typed as plain text and checked by value; `ans` is one way to write each.

type Next = () => number;
const intOf = (next: Next) => (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
const pickOf = (next: Next) => <T>(xs: readonly T[]): T => xs[Math.floor(next() * xs.length)];
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

export type FormulaMistake = "cancelTerms" | "addTopsBottoms" | "subjectOrder" | "powerNotUndone";
/** A slip: the expression it gives, as typed, and what its hint fills in. */
export type ExprTrap = { id: FormulaMistake; e: string; vars: Record<string, string | number> };

export type FractionKind = "monomial" | "termsCancel" | "bracket" | "diffSquares" | "add" | "sub" | "numbers" | "times" | "divide" | "addQuad" | "subQuad" | "quadQuad" | "divideQuad";
export type FormulaKind = "substitute" | "subject";

export type FractionQuestion = {
  kind: FractionKind;
  /** The expression to simplify or combine, in TeX. */
  q: string;
  /** One way to type the answer (x is the only letter). */
  ans: string;
  show: string;
  traps: ExprTrap[];
  steps: string[];
};

export type FormulaQuestion = {
  kind: FormulaKind;
  /** The formula, in TeX. */
  q: string;
  /** The letter asked for, and the given values (substitute) as "u = 5, a = 3". */
  vars: { s: string; given: string };
  /** The letters of the formula: the answer may use all but the subject. */
  letters: string[];
  /** substitute: the number; subject: an expression in the other letters. */
  v?: number;
  ans: string;
  show: string;
  traps: ExprTrap[];
  steps: string[];
};

// ---------- writing polynomials in x ----------

/** " + 3", " − 3" or "" after a term; plain uses "-", TeX the same (TeX draws it as a minus). */
const plus = (b: number) => (b > 0 ? ` + ${b}` : b < 0 ? ` - ${-b}` : "");
/** c·x as a following term: " + 3x", " - x", "". */
const plusX = (c: number, x = "x") => (c === 0 ? "" : c === 1 ? ` + ${x}` : c === -1 ? ` - ${x}` : c > 0 ? ` + ${c}${x}` : ` - ${-c}${x}`);
/** c·x leading: "3x", "-x", "x". */
const leadX = (c: number, x = "x") => (c === 1 ? x : c === -1 ? `-${x}` : `${c}${x}`);
/** a x + b with a ≠ 0 leading. */
const lin = (a: number, b: number) => `${leadX(a)}${plus(b)}`;
/** x² + s x + t. */
const quad = (s: number, t: number) => `x^2${plusX(s)}${plus(t)}`;
/** A bracket (x + p) — no bracket when it stands alone in a fraction's top or bottom. */
const br = (s: string) => `(${s})`;
const frac = (n: string, d: string) => `\\frac{${n}}{${d}}`;
/** A whole number in front of a bracket: none when it is 1. */
const co = (n: number) => (n === 1 ? "" : String(n));
/** A whole number over a whole number, cut down: "3/4", "2" or "-1/2". */
const ratio = (n: number, d: number) => {
  const g = gcd(n, d) * Math.sign(d);
  return d / g === 1 ? String(n / g) : `${n / g}/${d / g}`;
};

// ---------- algebraic fractions ----------

export function fractionQuestion(next: Next, level: 1 | 2 | 3): FractionQuestion {
  const int = intOf(next);
  const pick = pickOf(next);
  const nz = (lo: number, hi: number) => {
    let v: number;
    do v = int(lo, hi);
    while (v === 0);
    return v;
  };
  const kind = pick<FractionKind>(level === 1 ? ["monomial", "termsCancel", "bracket", "diffSquares"] : level === 2 ? ["add", "sub", "numbers", "times", "divide"] : ["addQuad", "subQuad", "quadQuad", "divideQuad"]);

  if (kind === "monomial") {
    // a xᵐ / (b xⁿ): the common factor of the numbers and xⁿ cancel.
    let p: number, q: number;
    do [p, q] = [int(1, 7), int(2, 7)];
    while (gcd(p, q) !== 1);
    const g = int(2, 4);
    const m = int(2, 4);
    const n = int(1, m - 1);
    const k = m - n;
    const xk = k === 1 ? "x" : `x^${k}`;
    const top = `${p === 1 ? "" : p}${xk}`;
    const ans = `${top}/${q}`;
    const pow = (e: number) => (e === 1 ? "x" : `x^{${e}}`);
    return {
      kind, q: frac(`${g * p}${pow(m)}`, `${g * q}${pow(n)}`), ans, show: frac(top, String(q)), traps: [],
      steps: [`${frac(`${g * p}${pow(m)}`, `${g * q}${pow(n)}`)} = ${frac(`${g} \\times ${p} \\times ${pow(n)} \\times ${pow(k)}`, `${g} \\times ${q} \\times ${pow(n)}`)}`, `= ${frac(top, String(q))}`],
    };
  }
  if (kind === "termsCancel") {
    // (x² + a x)/(x² + b x) = x(x + a)/(x(x + b)): x is the common factor; the x² terms are not factors.
    let a: number, b: number;
    do [a, b] = [int(1, 9), int(1, 9)];
    while (a === b);
    const ans = `(x + ${a})/(x + ${b})`;
    return {
      kind, q: frac(quad(a, 0), quad(b, 0)), ans, show: frac(`x + ${a}`, `x + ${b}`),
      traps: [{ id: "cancelTerms", e: ratio(a, b), vars: { x: ratio(a, b), f: `x(x + ${a}) / (x(x + ${b}))`, v: ans } }],
      steps: [`${frac(quad(a, 0), quad(b, 0))} = ${frac(`x(x + ${a})`, `x(x + ${b})`)}`, `= ${frac(`x + ${a}`, `x + ${b}`)}`],
    };
  }
  if (kind === "bracket") {
    // k(x + a) / ((x + a)(x + b)) multiplied out: factorise both, cancel (x + a).
    const k = int(2, 6);
    let a: number, b: number;
    do [a, b] = [nz(-7, 7), nz(-7, 7)];
    while (a === b);
    const ans = `${k}/(${lin(1, b)})`;
    const top = lin(k, k * a);
    const bot = quad(a + b, a * b);
    return {
      kind, q: frac(top, bot), ans, show: frac(String(k), lin(1, b)), traps: [],
      steps: [`${frac(top, bot)} = ${frac(`${k}(${lin(1, a)})`, `(${lin(1, a)})(${lin(1, b)})`)}`, `= ${frac(String(k), lin(1, b))}`],
    };
  }
  if (kind === "diffSquares") {
    // (x² − a²)/(x² + (b − a)x − ab) = (x − a)(x + a)/((x − a)(x + b)).
    const a = int(1, 7);
    let b: number;
    do b = nz(-7, 7);
    while (b === a);
    const ans = `(${lin(1, a)})/(${lin(1, b)})`;
    const top = quad(0, -a * a);
    const bot = quad(b - a, -a * b);
    // Cancelling the x² terms leaves −a² over (b − a)x − ab.
    const wrongBot = lin(b - a, -a * b);
    const wrong = `${-a * a}/(${wrongBot})`;
    return {
      kind, q: frac(top, bot), ans, show: frac(lin(1, a), lin(1, b)),
      traps: [{ id: "cancelTerms", e: wrong, vars: { x: wrong, f: `(x - ${a})(x + ${a}) / ((${lin(1, -a)})(${lin(1, b)}))`, v: ans } }],
      steps: [`${frac(top, bot)} = ${frac(`(${lin(1, -a)})(${lin(1, a)})`, `(${lin(1, -a)})(${lin(1, b)})`)}`, `= ${frac(lin(1, a), lin(1, b))}`],
    };
  }
  if (kind === "add" || kind === "sub") {
    // a/(x + p) ± b/(x + q) over the common bottom (x + p)(x + q).
    const s = kind === "add" ? 1 : -1;
    let a: number, b: number, p: number, q: number;
    do [a, b, p, q] = [int(1, 6), int(1, 6), nz(-6, 6), nz(-6, 6)];
    while (p === q || (s < 0 && a === b));
    const [c1, c0] = [a + s * b, a * q + s * b * p];
    const top = lin(c1, c0);
    const bot = `(${lin(1, p)})(${lin(1, q)})`;
    const ans = `(${top})/(${bot})`;
    const op = s > 0 ? "+" : "-";
    // Adding (or subtracting) the tops and the bottoms.
    const wrong = s > 0 ? `${a + b}/(${lin(2, p + q)})` : ratio(a - b, p - q);
    return {
      kind, q: `${frac(String(a), lin(1, p))} ${op} ${frac(String(b), lin(1, q))}`, ans, show: frac(top, bot),
      traps: [{ id: "addTopsBottoms", e: wrong, vars: { x: wrong, v: ans } }],
      steps: [
        `= ${frac(`${co(a)}(${lin(1, q)}) ${op} ${co(b)}(${lin(1, p)})`, bot)}`,
        `= ${frac(`${lin(a, a * q)} ${op} ${br(lin(b, b * p))}`, bot)}`,
        `= ${frac(top, bot)}`,
      ],
    };
  }
  if (kind === "numbers") {
    // (x + p)/a + (x + q)/b over the lowest common multiple of a and b.
    let a: number, b: number, p: number, q: number;
    do [a, b, p, q] = [int(2, 6), int(2, 6), nz(-6, 6), nz(-6, 6)];
    while (a === b || p + q === 0);
    const l = (a * b) / gcd(a, b);
    const [u, v] = [l / a, l / b];
    let [c1, c0, d] = [u + v, u * p + v * q, l];
    const g = gcd(gcd(c1, c0), d);
    [c1, c0, d] = [c1 / g, c0 / g, d / g];
    const top = c0 === 0 ? leadX(c1) : lin(c1, c0);
    const ans = d === 1 ? top : c0 === 0 ? `${top}/${d}` : `(${top})/${d}`;
    const wrong = `(${lin(2, p + q)})/${a + b}`;
    return {
      kind, q: `${frac(lin(1, p), String(a))} + ${frac(lin(1, q), String(b))}`, ans, show: d === 1 ? top : frac(top, String(d)),
      traps: [{ id: "addTopsBottoms", e: wrong, vars: { x: wrong, v: ans } }],
      steps: [
        `= ${frac(`${u === 1 ? "" : u}(${lin(1, p)}) + ${v === 1 ? "" : v}(${lin(1, q)})`, String(l))}`,
        `= ${frac(lin(u + v, u * p + v * q), String(l))}`,
        ...(g > 1 ? [`= ${d === 1 ? top : frac(top, String(d))}`] : []),
      ],
    };
  }
  if (kind === "times") {
    // a x/(x + p) × (x² − p²)/(b x²) = a(x − p)/(b x).
    let a: number, b: number;
    do [a, b] = [int(1, 5), int(2, 6)];
    while (gcd(a, b) !== 1);
    const p = int(1, 7);
    const ans = `${a === 1 ? "" : a}(x - ${p})/(${b}x)`;
    const top = a === 1 ? `x - ${p}` : `${a}(x - ${p})`;
    return {
      kind, q: `${frac(leadX(a), `x + ${p}`)} \\times ${frac(quad(0, -p * p), `${b}x^2`)}`, ans, show: frac(top, `${b}x`), traps: [],
      steps: [
        `= ${frac(leadX(a), `x + ${p}`)} \\times ${frac(`(x - ${p})(x + ${p})`, `${b}x^2`)}`,
        `= ${frac(`${a === 1 ? "" : a}x(x - ${p})(x + ${p})`, `${b}x^2(x + ${p})`)}`,
        `= ${frac(top, `${b}x`)}`,
      ],
    };
  }
  if (kind === "divide") {
    // (x + p)/(a x) ÷ (x² + p x)/b = (x + p)/(a x) × b/(x(x + p)) = b/(a x²).
    let a: number, b: number;
    do [a, b] = [int(1, 5), int(2, 7)];
    while (gcd(a, b) !== 1);
    const p = nz(-7, 7);
    const ans = `${b}/(${a === 1 ? "" : a}x^2)`;
    return {
      kind, q: `${frac(lin(1, p), leadX(a))} \\div ${frac(quad(p, 0), String(b))}`, ans, show: frac(String(b), `${a === 1 ? "" : a}x^2`), traps: [],
      steps: [
        `= ${frac(lin(1, p), leadX(a))} \\times ${frac(String(b), `x(${lin(1, p)})`)}`,
        `= ${frac(String(b), `${a === 1 ? "" : a}x^2`)}`,
      ],
    };
  }
  if (kind === "addQuad") {
    // a/(x² − p²) + b/(x + p) = (a + b(x − p)) / ((x − p)(x + p)).
    const p = int(1, 6);
    let a: number, b: number;
    do [a, b] = [int(1, 9), int(1, 5)];
    while (a === 2 * b * p);
    const top = lin(b, a - b * p);
    const bot = `(x - ${p})(x + ${p})`;
    const ans = `(${top})/(${bot})`;
    const wrong = `${a + b}/(${quad(1, p - p * p)})`;
    return {
      kind, q: `${frac(String(a), quad(0, -p * p))} + ${frac(String(b), `x + ${p}`)}`, ans, show: frac(top, bot),
      traps: [{ id: "addTopsBottoms", e: wrong, vars: { x: wrong, v: ans } }],
      steps: [
        `= ${frac(String(a), bot)} + ${frac(String(b), `x + ${p}`)}`,
        `= ${frac(`${a} + ${co(b)}(x - ${p})`, bot)}`,
        `= ${frac(top, bot)}`,
      ],
    };
  }
  if (kind === "subQuad") {
    // a/((x + p)(x + q)) − b/(x + p) = (a − b(x + q)) / ((x + p)(x + q)).
    let a: number, b: number, p: number, q: number;
    do [a, b, p, q] = [int(1, 9), int(1, 4), nz(-5, 5), nz(-5, 5)];
    while (p === q || a === b * (q - p));
    const top = lin(-b, a - b * q);
    const bot = `(${lin(1, p)})(${lin(1, q)})`;
    const ans = `(${top})/(${bot})`;
    return {
      kind, q: `${frac(String(a), quad(p + q, p * q))} - ${frac(String(b), lin(1, p))}`, ans, show: frac(top, bot), traps: [],
      steps: [
        `= ${frac(String(a), bot)} - ${frac(String(b), lin(1, p))}`,
        `= ${frac(`${a} - ${co(b)}(${lin(1, q)})`, bot)}`,
        `= ${frac(top, bot)}`,
      ],
    };
  }
  if (kind === "quadQuad") {
    // (x + a)(x + b) / ((x + a)(x + c)) multiplied out.
    let a: number, b: number, c: number;
    do [a, b, c] = [nz(-6, 6), nz(-6, 6), nz(-6, 6)];
    while (b === c || a + c === 0 || a + b === 0);
    const top = quad(a + b, a * b);
    const bot = quad(a + c, a * c);
    const ans = `(${lin(1, b)})/(${lin(1, c)})`;
    // Cancelling the x² terms.
    const wrong = `(${lin(a + b, a * b)})/(${lin(a + c, a * c)})`;
    return {
      kind, q: frac(top, bot), ans, show: frac(lin(1, b), lin(1, c)),
      traps: [{ id: "cancelTerms", e: wrong, vars: { x: wrong, f: `(${lin(1, a)})(${lin(1, b)}) / ((${lin(1, a)})(${lin(1, c)}))`, v: ans } }],
      steps: [`${frac(top, bot)} = ${frac(`(${lin(1, a)})(${lin(1, b)})`, `(${lin(1, a)})(${lin(1, c)})`)}`, `= ${frac(lin(1, b), lin(1, c))}`],
    };
  }
  // divideQuad: (x² − p²)/(x² + q x) ÷ (x − p)/x = (x + p)/(x + q).
  const p = int(1, 6);
  let q: number;
  do q = nz(-6, 6);
  while (q === p);
  const ans = `(x + ${p})/(${lin(1, q)})`;
  return {
    kind, q: `${frac(quad(0, -p * p), quad(q, 0))} \\div ${frac(`x - ${p}`, "x")}`, ans, show: frac(`x + ${p}`, lin(1, q)), traps: [],
    steps: [
      `= ${frac(`(x - ${p})(x + ${p})`, `x(${lin(1, q)})`)} \\times ${frac("x", `x - ${p}`)}`,
      `= ${frac(`x + ${p}`, lin(1, q))}`,
    ],
  };
}

// ---------- formulae ----------

type Rearrange = {
  /** The formula, TeX. */
  f: string;
  s: string;
  letters: string[];
  /** The subject as typed, and in TeX; a trap's hint gets the subject s and this answer v filled in. */
  ans: string;
  show: string;
  steps: string[];
  trap?: ExprTrap;
};

/** One step: a product, a quotient or a sum to undo. */
const ONE_STEP: Rearrange[] = [
  { f: "A = lw", s: "w", letters: ["A", "l", "w"], ans: "A/l", show: frac("A", "l"), steps: ["A = lw", "\\text{÷ } l: \\quad w = \\frac{A}{l}"] },
  { f: "V = IR", s: "R", letters: ["V", "I", "R"], ans: "V/I", show: frac("V", "I"), steps: ["V = IR", "\\text{÷ } I: \\quad R = \\frac{V}{I}"] },
  { f: "C = 2\\pi r", s: "r", letters: ["C", "r"], ans: "C/(2pi)", show: frac("C", "2\\pi"), steps: ["C = 2\\pi r", "\\text{÷ } 2\\pi: \\quad r = \\frac{C}{2\\pi}"] },
  { f: "v = \\frac{d}{t}", s: "d", letters: ["v", "d", "t"], ans: "vt", show: "vt", steps: ["v = \\frac{d}{t}", "\\times t: \\quad d = vt"] },
  { f: "y = x + c", s: "c", letters: ["y", "x", "c"], ans: "y - x", show: "y - x", steps: ["y = x + c", "- x: \\quad c = y - x"] },
];

/** Two steps: the last operation done to the subject is undone first. */
const TWO_STEP: Rearrange[] = [
  {
    f: "v = u + at", s: "t", letters: ["v", "u", "a", "t"], ans: "(v - u)/a", show: frac("v - u", "a"),
    steps: ["v = u + at", "- u: \\quad v - u = at", "\\text{÷ } a: \\quad t = \\frac{v - u}{a}"],
    trap: { id: "subjectOrder", e: "v/a - u", vars: { x: "v/a - u" } },
  },
  {
    f: "y = mx + c", s: "x", letters: ["y", "m", "x", "c"], ans: "(y - c)/m", show: frac("y - c", "m"),
    steps: ["y = mx + c", "- c: \\quad y - c = mx", "\\text{÷ } m: \\quad x = \\frac{y - c}{m}"],
    trap: { id: "subjectOrder", e: "y/m - c", vars: { x: "y/m - c" } },
  },
  {
    f: "P = 2l + 2w", s: "l", letters: ["P", "l", "w"], ans: "(P - 2w)/2", show: frac("P - 2w", "2"),
    steps: ["P = 2l + 2w", "- 2w: \\quad P - 2w = 2l", "\\text{÷ } 2: \\quad l = \\frac{P - 2w}{2}"],
    trap: { id: "subjectOrder", e: "P/2 - 2w", vars: { x: "P/2 - 2w" } },
  },
  {
    f: "F = \\frac{9C}{5} + 32", s: "C", letters: ["F", "C"], ans: "5(F - 32)/9", show: frac("5(F - 32)", "9"),
    steps: ["F = \\frac{9C}{5} + 32", "- 32: \\quad F - 32 = \\frac{9C}{5}", "\\times \\frac{5}{9}: \\quad C = \\frac{5(F - 32)}{9}"],
    trap: { id: "subjectOrder", e: "5F/9 - 32", vars: { x: "5F/9 - 32" } },
  },
  {
    f: "s = \\frac{(u + v)t}{2}", s: "u", letters: ["s", "u", "v", "t"], ans: "2s/t - v", show: `${frac("2s", "t")} - v`,
    steps: ["s = \\frac{(u + v)t}{2}", "\\times 2: \\quad 2s = (u + v)t", "\\text{÷ } t: \\quad \\frac{2s}{t} = u + v", "- v: \\quad u = \\frac{2s}{t} - v"],
    trap: { id: "subjectOrder", e: "(2s - v)/t", vars: { x: "(2s - v)/t" } },
  },
  {
    f: "A = \\frac{1}{2}(a + b)h", s: "h", letters: ["A", "a", "b", "h"], ans: "2A/(a + b)", show: frac("2A", "a + b"),
    steps: ["A = \\frac{1}{2}(a + b)h", "\\times 2: \\quad 2A = (a + b)h", "\\text{÷ } (a + b): \\quad h = \\frac{2A}{a + b}"],
  },
];

/** A squared or rooted subject, or one that appears twice. */
const HARD: Rearrange[] = [
  {
    f: "K = \\frac{1}{2}mv^2", s: "v", letters: ["K", "m", "v"], ans: "sqrt(2K/m)", show: `\\sqrt{${frac("2K", "m")}}`,
    steps: ["K = \\frac{1}{2}mv^2", "\\times 2,\\ \\text{÷ } m: \\quad v^2 = \\frac{2K}{m}", "\\sqrt{\\ }: \\quad v = \\sqrt{\\frac{2K}{m}}"],
    trap: { id: "powerNotUndone", e: "2K/m", vars: { x: "2K/m" } },
  },
  {
    f: "A = \\pi r^2", s: "r", letters: ["A", "r"], ans: "sqrt(A/pi)", show: `\\sqrt{${frac("A", "\\pi")}}`,
    steps: ["A = \\pi r^2", "\\text{÷ } \\pi: \\quad r^2 = \\frac{A}{\\pi}", "\\sqrt{\\ }: \\quad r = \\sqrt{\\frac{A}{\\pi}}"],
    trap: { id: "powerNotUndone", e: "A/pi", vars: { x: "A/π" } },
  },
  {
    f: "V = \\pi r^2 h", s: "r", letters: ["V", "r", "h"], ans: "sqrt(V/(pi h))", show: `\\sqrt{${frac("V", "\\pi h")}}`,
    steps: ["V = \\pi r^2 h", "\\text{÷ } \\pi h: \\quad r^2 = \\frac{V}{\\pi h}", "\\sqrt{\\ }: \\quad r = \\sqrt{\\frac{V}{\\pi h}}"],
    trap: { id: "powerNotUndone", e: "V/(pi h)", vars: { x: "V/(πh)" } },
  },
  {
    f: "T = 2\\pi\\sqrt{\\frac{l}{g}}", s: "l", letters: ["T", "l", "g"], ans: "gT^2/(4pi^2)", show: frac("gT^2", "4\\pi^2"),
    steps: ["T = 2\\pi\\sqrt{\\frac{l}{g}}", "\\text{÷ } 2\\pi: \\quad \\frac{T}{2\\pi} = \\sqrt{\\frac{l}{g}}", "(\\ )^2: \\quad \\frac{T^2}{4\\pi^2} = \\frac{l}{g}", "\\times g: \\quad l = \\frac{gT^2}{4\\pi^2}"],
    trap: { id: "powerNotUndone", e: "gT/(2pi)", vars: { x: "gT/(2π)" } },
  },
  {
    f: "c = \\sqrt{a^2 + b^2}", s: "a", letters: ["c", "a", "b"], ans: "sqrt(c^2 - b^2)", show: "\\sqrt{c^2 - b^2}",
    steps: ["c = \\sqrt{a^2 + b^2}", "(\\ )^2: \\quad c^2 = a^2 + b^2", "- b^2: \\quad a^2 = c^2 - b^2", "\\sqrt{\\ }: \\quad a = \\sqrt{c^2 - b^2}"],
  },
  {
    f: "hx = kx + c", s: "x", letters: ["h", "k", "x", "c"], ans: "c/(h - k)", show: frac("c", "h - k"),
    steps: ["hx = kx + c", "- kx: \\quad hx - kx = c", "x(h - k) = c", "\\text{÷ } (h - k): \\quad x = \\frac{c}{h - k}"],
  },
  {
    f: "ax + b = cx + d", s: "x", letters: ["a", "b", "c", "d", "x"], ans: "(d - b)/(a - c)", show: frac("d - b", "a - c"),
    steps: ["ax + b = cx + d", "ax - cx = d - b", "x(a - c) = d - b", "x = \\frac{d - b}{a - c}"],
  },
];

/** Substitution: the formula, the letter found and the values given. */
function substitute(next: Next): FormulaQuestion {
  const int = intOf(next);
  const pick = pickOf(next);
  const kind = pick(["vuat", "trapezium", "suvat", "temperature"] as const);
  const given = (vs: [string, number][]) => vs.map(([k, v]) => `${k} = ${v}`).join(", ");
  if (kind === "vuat") {
    const [u, a, t] = [int(0, 20), int(2, 9), int(2, 12)];
    const v = u + a * t;
    return { kind: "substitute", q: "v = u + at", vars: { s: "v", given: given([["u", u], ["a", a], ["t", t]]) }, letters: [], v, ans: String(v), show: String(v), traps: [], steps: [`v = ${u} + ${a} \\times ${t}`, `= ${u} + ${a * t} = ${v}`] };
  }
  if (kind === "trapezium") {
    let a: number, b: number, h: number;
    do [a, b, h] = [int(2, 15), int(2, 15), int(2, 12)];
    while (((a + b) * h) % 2 !== 0);
    const v = ((a + b) * h) / 2;
    return { kind: "substitute", q: "A = \\frac{1}{2}(a + b)h", vars: { s: "A", given: given([["a", a], ["b", b], ["h", h]]) }, letters: [], v, ans: String(v), show: String(v), traps: [], steps: [`A = \\frac{1}{2}(${a} + ${b}) \\times ${h}`, `= \\frac{1}{2} \\times ${a + b} \\times ${h} = ${v}`] };
  }
  if (kind === "suvat") {
    const [u, a, t] = [int(0, 10), 2 * int(1, 5), int(1, 8)];
    const v = u * t + (a * t * t) / 2;
    return { kind: "substitute", q: "s = ut + \\frac{1}{2}at^2", vars: { s: "s", given: given([["u", u], ["a", a], ["t", t]]) }, letters: [], v, ans: String(v), show: String(v), traps: [], steps: [`s = ${u} \\times ${t} + \\frac{1}{2} \\times ${a} \\times ${t}^2`, `= ${u * t} + ${a / 2} \\times ${t * t} = ${v}`] };
  }
  const c = 5 * int(-4, 20);
  const v = (9 * c) / 5 + 32;
  return { kind: "substitute", q: "F = \\frac{9C}{5} + 32", vars: { s: "F", given: given([["C", c]]) }, letters: [], v, ans: String(v), show: String(v), traps: [], steps: [`F = \\frac{9 \\times ${c < 0 ? `(${c})` : c}}{5} + 32`, `= ${(9 * c) / 5} + 32 = ${v}`] };
}

export function formulaQuestion(next: Next, level: 1 | 2 | 3): FormulaQuestion {
  if (level === 1 && next() < 0.5) return substitute(next);
  const r = pickOf(next)(level === 1 ? ONE_STEP : level === 2 ? TWO_STEP : HARD);
  return { kind: "subject", q: r.f, vars: { s: r.s, given: "" }, letters: r.letters, ans: r.ans, show: `${r.s} = ${r.show}`, traps: r.trap ? [{ ...r.trap, vars: { ...r.trap.vars, s: r.s, v: r.ans } }] : [], steps: r.steps };
}
