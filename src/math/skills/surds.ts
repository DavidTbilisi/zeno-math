// Practice: Surds. #720 added, beside the older kinds: square roots of terms with letters (easy), a surd squared and
// rational exponents as roots (medium), and exponential equations solved by matching bases (hard). The power kept
// under the root, only the root squared, the root and the power swapped, the exponent's value taken for x and the
// numbers divided for the exponent are slips.
import { fill } from "../chart";
import { parseE, tex } from "../expr";
import type { ExprOption } from "../exprMatch";
import { fr, num, plainFrac, surdTex } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const sup = (k: number) => [...String(k)].map((c) => SUP[Number(c)]).join("");
function shuffled<T>(r: Rng, xs: T[]): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = r.int(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The kinds #720 added. */
function more(r: Rng, L: 1 | 2 | 3, kind: number, w: PracticeWords): Part {
  const W = w.srdP;
  if (L === 1) {
    // √(k²m x^2a y^(2b+1)) = k x^a y^b √(m y): the root halves each even power; the letters are positive.
    const [k, m, a] = [r.int(2, 6), r.pick([2, 3, 5, 6, 7]), r.int(1, 4)];
    const withY = r.next() < 0.5;
    const b = r.int(1, 2);
    const out = (p: number) => `${k}*x^${p}${withY ? `*y^${b}` : ""}*sqrt(${m}${withY ? "*y" : ""})`;
    const vars = ["x", "y"];
    const E = (t: string) => parseE(t, vars);
    const q = `\\sqrt{${k * k * m}x^{${2 * a}}${withY ? `y^{${2 * b + 1}}` : ""}}`;
    const readOut = (p: number) => `${k}x${p === 1 ? "" : sup(p)}${withY ? `y${b === 1 ? "" : sup(b)}` : ""}√${withY ? `(${m}y)` : m}`;
    return {
      prompt: W.simplifyRoot, q,
      answer: { k: "expr", e: E(out(a)), vars, traps: [{ id: "rootPowerKept", a: { k: "expr", e: E(out(2 * a)), vars }, vars: { x: readOut(2 * a), p: 2 * a, h: a, v: readOut(a) } }] },
      show: tex(E(out(a))), plain: out(a).replace(/\*/g, "").replace(/\^1(?!\d)/g, ""), format: "expr",
      steps: [`\\sqrt{${k * k}} = ${k}, \\quad \\sqrt{x^{${2 * a}}} = x^{${a}}${withY ? `, \\quad \\sqrt{y^{${2 * b + 1}}} = y^{${b}}\\sqrt{y}` : ""}`, `${q} = ${tex(E(out(a)))}`],
    };
  }
  if (L === 2 && kind <= 7) {
    // A surd squared: the number outside is squared too.
    const [a, b] = [r.int(2, 7), r.pick([2, 3, 5, 6, 7, 10])];
    return {
      prompt: w.prompts.evaluate, q: `\\left(${a}\\sqrt{${b}}\\right)^{2}`,
      answer: { ...num(a * a * b), traps: [{ id: "outsideNotSquared", a: num(a * b), vars: { x: a * b, a, b, s: a * a, v: a * a * b } }] },
      show: String(a * a * b), plain: String(a * a * b), format: "number", steps: [`${a}^{2} \\times \\left(\\sqrt{${b}}\\right)^{2} = ${a * a} \\times ${b} = ${a * a * b}`],
    };
  }
  if (L === 2) {
    // A rational exponent as a root: the bottom is the root, the top the power.
    const [m, n] = r.pick([[2, 3], [3, 2], [3, 4], [5, 2], [2, 5], [4, 3], [5, 3]] as const);
    const root = (i: number, p: number) => (i === 2 ? `\\sqrt{x^{${p}}}` : `\\sqrt[${i}]{x^{${p}}}`);
    const right = root(n, m);
    const flipped = root(m, n);
    const texts = shuffled(r, [right, flipped, `\\frac{x^{${m}}}{${n}}`, `x^{${m}} \\times x^{${n}}`]);
    const options: ExprOption[] = texts.map((t) => ({ text: t, plain: t, tex: t }));
    return {
      prompt: fill(W.sameAs, { e: `x^(${m}/${n})` }), q: `x^{\\frac{${m}}{${n}}}`,
      answer: { k: "pick", options, right: texts.indexOf(right), traps: [{ id: "fracExponentFlipped", a: { k: "pick", options, right: texts.indexOf(flipped) }, vars: { m, n } }] },
      show: right, plain: right, format: "pick", steps: [`x^{\\frac{${m}}{${n}}} = \\left(x^{${m}}\\right)^{\\frac{1}{${n}}} = ${right}`],
    };
  }
  if (kind <= 7) {
    // b^(x + c) = b^k: the exponents are equal, so x + c = k.
    const [bb, k] = r.pick([[2, 5], [2, 6], [3, 4], [3, 5], [5, 3], [2, 7], [10, 4], [4, 3]] as const);
    const c = r.nz(-3, 3);
    const v = k - c;
    const lhs = `${bb}^{x ${c < 0 ? "-" : "+"} ${Math.abs(c)}}`;
    return {
      prompt: W.solveExp, q: `${lhs} = ${bb ** k}`,
      answer: { ...num(v), traps: [{ id: "exponentNotSolved", a: num(k), vars: { x: k, n: bb ** k, b: bb, k, c: `x ${c < 0 ? "−" : "+"} ${Math.abs(c)}`, v } }] },
      show: `x = ${v}`, plain: String(v), format: "number", steps: [`${bb ** k} = ${bb}^{${k}}`, `x ${c < 0 ? "-" : "+"} ${Math.abs(c)} = ${k}`, `x = ${v}`],
    };
  }
  // a^x = b with a = p^s, b = p^t: write both as powers of p, then sx = t.
  const [p, s, t] = r.pick([[3, 2, 3], [2, 2, 3], [2, 3, 2], [2, 2, 5], [3, 2, 5], [5, 2, 3], [2, 3, 4], [2, 3, 5]] as const);
  const [a, b] = [p ** s, p ** t];
  const v = fr(t, s);
  const slip = b / a;
  return {
    prompt: W.solveExp, q: `${a}^{x} = ${b}`,
    answer: { ...num(v.toNumber(), 1e-9, { lowest: true }), traps: Number.isInteger(slip) && slip !== v.toNumber() ? [{ id: "basesDivided", a: num(slip), vars: { x: slip, a, b, p, s, t, v: plainFrac(v) } }] : [] },
    show: `x = ${v.tex()}`, plain: plainFrac(v), format: "fraction",
    steps: [`${a} = ${p}^{${s}}, \\quad ${b} = ${p}^{${t}}`, `${p}^{${s}x} = ${p}^{${t}} \\Rightarrow ${s}x = ${t}`, `x = ${v.tex()}`],
  };
}

const gen: Gen = (r, L, w) => {
  const extra = r.int(0, 9);
  if (extra >= 5) return more(r, L, extra, w);
  return old(r, L, w);
};

/** The kinds the skill had before #720. */
const old: Gen = (r, L, w) => {
  const M = [2, 3, 5, 6, 7, 10, 11];
  if (L === 1) {
    const [k, m] = [r.int(2, 6), r.pick(M)];
    const n = k * k * m;
    return { prompt: w.prompts.surds, q: `\\sqrt{${n}}`, answer: num(k * Math.sqrt(m), 1e-9, { surd: true }), show: `${k}\\sqrt{${m}}`, plain: `${k}sqrt(${m})`, format: "exact", solution: { kind: "powers", spec: { topic: "surds", src: `√${n}` } } };
  }
  if (L === 2) {
    const m = r.pick(M.slice(0, 4));
    let c: number[];
    do c = [r.int(1, 5), r.int(1, 5), r.int(1, 5)];
    while (c[0] + c[1] - c[2] === 0 || c[0] === c[1] || c[1] === c[2] || c[0] === c[2]);
    const k = c[0] + c[1] - c[2];
    const ns = c.map((x) => x * x * m);
    const src = `√${ns[0]} + √${ns[1]} - √${ns[2]}`;
    return { prompt: w.prompts.surds, q: `\\sqrt{${ns[0]}} + \\sqrt{${ns[1]}} - \\sqrt{${ns[2]}}`, answer: num(k * Math.sqrt(m), 1e-9, { surd: true }), show: surdTex(fr(0), fr(k), m), plain: `${k}sqrt(${m})`, format: "exact", solution: { kind: "powers", spec: { topic: "surds", src } } };
  }
  if (r.next() < 0.5) {
    const [a, b] = [r.int(1, 12), r.pick([2, 3, 5, 6, 7])];
    if (a % b === 0 && a / b === 1) return old(r, 3, w);
    const coef = fr(a, b);
    return { prompt: w.prompts.rationalise, q: `\\frac{${a}}{\\sqrt{${b}}}`, answer: num(a / Math.sqrt(b), 1e-9, { surd: true }), show: surdTex(fr(0), coef, b), plain: `(${a}/${b})sqrt(${b})`, format: "exact", solution: { kind: "powers", spec: { topic: "surds", src: `${a} / √${b}` } } };
  }
  const [a, b, c] = [r.int(1, 6), r.int(2, 5), r.pick([2, 3, 5, 7])];
  const den = b * b - c;
  const p = fr(a * b, den);
  const q = fr(a, den);
  return {
    prompt: w.prompts.rationalise,
    q: `\\frac{${a}}{${b} - \\sqrt{${c}}}`,
    answer: num(a / (b - Math.sqrt(c)), 1e-9, { surd: true }),
    show: surdTex(p, q, c),
    plain: `${plainFrac(p).replace(/^(.*)$/, "($1)")} + (${plainFrac(q)})sqrt(${c})`,
    format: "exact",
    solution: { kind: "powers", spec: { topic: "surds", src: `${a} / (${b} - √${c})` } },
  };
};

export default gen;
