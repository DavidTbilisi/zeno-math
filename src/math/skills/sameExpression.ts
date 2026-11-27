// Practice: Equal expressions. #718 added writing, reading and evaluating expressions. Easy (P6): the coefficient or
// the constant term of an expression, the value of an + b for a number, an expression for "k less than n" and its
// kin, and a word problem's total. Medium: several letters, one of them negative, a squared letter, fractions in a
// product, which of n², n, 2n and 1 ÷ n is largest or smallest for n between 0 and 1/2, what the numbers in a taxi
// fare or a gym's price stand for, brackets put in from words, and a ticket's change. Hard: an expression factored by
// filling the brackets, like terms with fraction or decimal coefficients, and a thrown ball's height from a formula.
import { fill } from "../chart";
import { parseE } from "../expr";
import { exprQuestion, exprSteps, exprTex, type ExprOption } from "../exprMatch";
import type { Frac } from "../fraction";
import { fr, num, plainFrac, withIdeas } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";

const MINUS = "−";
const typed = (t: string) => t.replace(/−/g, "-").replace(/²/g, "^2").replace(/÷/g, "/").replace(/·/g, "*");
const texed = (t: string) => t.replace(/−/g, "-").replace(/²/g, "^2").replace(/÷/g, "\\div ").replace(/·/g, "\\cdot ");
const signed = (v: number) => (v < 0 ? `${MINUS}${-v}` : String(v));
/** A signed sum of terms as read, "5x + 3 − 2y": a coefficient of 1 is dropped, a zero term left out. */
function sum(terms: [number, string][]): string {
  let out = "";
  for (const [c, v] of terms) {
    if (c === 0) continue;
    const a = Math.abs(c);
    const body = v && a === 1 ? v : `${a}${v}`;
    out += out ? (c < 0 ? ` ${MINUS} ${body}` : ` + ${body}`) : c < 0 ? `${MINUS}${body}` : body;
  }
  return out || "0";
}
const option = (text: string): ExprOption => ({ text, plain: typed(text), tex: texed(text) });
/** An option in words, set as text rather than as maths. */
const wordOption = (text: string): ExprOption => ({ text, plain: text, tex: `\\text{${text}}` });
function shuffled<T>(r: Rng, xs: T[]): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = r.int(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** A number to type. */
function numPart(prompt: string, v: number, traps: Trap[], steps: string[]): Part {
  const keep = traps.filter((t, i) => t.a.k === "num" && Math.abs(t.a.v - v) > 1e-9 && !traps.slice(0, i).some((u) => u.a.k === "num" && t.a.k === "num" && Math.abs(u.a.v - t.a.v) < 1e-9));
  return { prompt, q: "", answer: { ...num(v), traps: keep }, show: String(v), plain: String(v), format: "number", steps };
}
/** A fraction to type, in its lowest terms. */
function fracPart(prompt: string, v: Frac, traps: Trap[], steps: string[]): Part {
  return { prompt, q: "", answer: { ...num(v.toNumber(), 1e-9), traps }, show: v.tex(), plain: plainFrac(v), format: "fraction", steps };
}
/** An expression in the letters `vars` to type: any equal form is right. */
function exprPart(prompt: string, right: string, vars: string[], traps: [Trap["id"], string, Record<string, string | number>][], steps: string[]): Part {
  const e = (t: string) => parseE(typed(t), vars);
  return {
    prompt, q: "",
    answer: { k: "expr", e: e(right), vars, traps: traps.map(([id, t, v]) => ({ id, a: { k: "expr", e: e(t), vars }, vars: { x: t, v: right, ...v } })) },
    show: texed(right), plain: typed(right), format: "expr", steps,
  };
}
/** One of a few options to pick; `slips` names the wrong ones that are a known slip. */
function pickPart(r: Rng, prompt: string, right: string, slips: [Trap["id"], string, Record<string, string | number>][], rest: string[], steps: string[], words = false): Part {
  const options = shuffled(r, [right, ...slips.map((s) => s[1]), ...rest]).map(words ? wordOption : option);
  const at = (t: string) => options.findIndex((o) => o.text === t);
  return {
    prompt, q: "",
    answer: { k: "pick", options, right: at(right), traps: slips.map(([id, t, v]) => ({ id, a: { k: "pick", options, right: at(t) }, vars: { x: t, v: right, ...v } })) },
    show: options[at(right)].tex, plain: options[at(right)].plain, format: "pick", steps,
  };
}

/** The kinds #718 added. */
function more(r: Rng, L: 1 | 2 | 3, kind: number, w: PracticeWords): Part {
  const W = w.sxpP;
  if (L === 1 && kind === 5) {
    // The coefficient of y, or the constant term: a term takes the sign in front of it.
    const [a, c, b] = [r.int(2, 9), r.int(2, 9), r.int(1, 12)];
    const constant = r.next() < 0.5;
    const neg = r.next() < 0.7 ? -1 : 1;
    const [cy, cb] = constant ? [c * r.sign(), b * neg] : [c * neg, b * r.sign()];
    const e = sum(r.next() < 0.5 ? [[a, "x"], [cy, "y"], [cb, ""]] : [[a, "x"], [cb, ""], [cy, "y"]]);
    const v = constant ? cb : cy;
    const prompt = constant ? fill(W.constant, { e }) : fill(W.coefficient, { e, l: "y" });
    return withIdeas(["termSigns"], numPart(prompt, v, v < 0 ? [{ id: "termSignLost", a: num(-v), vars: { x: -v, v: signed(v) } }] : [], [texed(e), constant ? `\\text{constant: } ${v}` : `${v}y`]));
  }
  if (L === 1 && kind === 6) {
    // an + b for a number n: 3n is 3 × n, not the digits 3 and n side by side.
    const [a, n, b] = [r.int(2, 9), r.int(2, 9), r.int(1, 20)];
    const minus = r.next() < 0.4 && a * n > b;
    const e = minus ? `${a}n ${MINUS} ${b}` : `${a}n + ${b}`;
    const v = minus ? a * n - b : a * n + b;
    const digits = Number(`${a}${n}`) + (minus ? -b : b);
    return withIdeas(["letterTimes"], numPart(fill(W.evalOne, { e, n }), v, [{ id: "letterAsDigit", a: num(digits), vars: { x: digits, a, n, v } }], [`${a} \\times ${n} ${minus ? "-" : "+"} ${b} = ${v}`]));
  }
  if (L === 1 && kind === 8) {
    // A story's total: only the boxes (or the pens) come a times; the loose ones are added once.
    const [a, b] = [r.int(2, 9), r.int(2, 15)];
    const pens = r.next() < 0.5;
    return withIdeas(["wordsToExpr"], exprPart(fill(pens ? W.wordPens : W.wordBoxes, { a, b }), `${a}n + ${b}`, ["n"], [["allMultiplied", `${a}(n + ${b})`, { a, b }]], [`${a} \\times n + ${b} = ${a}n + ${b}`]));
  }
  if (L === 1) {
    // Words to an expression in n.
    const k = r.int(2, 12);
    const how = r.pick(["more", "less", "from", "times", "over"] as const);
    const right = { more: `n + ${k}`, less: `n ${MINUS} ${k}`, from: `${k} ${MINUS} n`, times: `${k}n`, over: `n ÷ ${k}` }[how];
    const traps: [Trap["id"], string, Record<string, string | number>][] =
      how === "less" ? [["lessThanReversed", `${k} ${MINUS} n`, { k }]] : how === "from" ? [["lessThanReversed", `n ${MINUS} ${k}`, { k }]] : how === "over" ? [["quotientReversed", `${k} ÷ n`, { k }]] : [];
    return withIdeas(["wordsToExpr"], exprPart(fill(W.write, { p: fill(W[how], { k }) }), right, ["n"], traps, [texed(right)]));
  }
  if (L === 2 && kind === 5) {
    // Several letters, one of them negative: −q × b with b < 0 is added.
    const [p, q, a, b, c] = [r.int(2, 6), r.int(2, 6), r.int(1, 8), -r.int(1, 6), r.int(1, 9)];
    const v = p * a - q * b + c;
    const lost = p * a - q * -b + c;
    return withIdeas(["letterTimes", "signTimes"], numPart(fill(W.evalMulti, { e: `${p}a ${MINUS} ${q}b + c`, a, b: signed(b), c }), v,
      [{ id: "negSubSignLost", a: num(lost), vars: { x: lost, q, b: signed(b), m: q * -b, v } }],
      [`${p} \\times ${a} - ${q} \\times (${b}) + ${c}`, `= ${p * a} + ${-q * b} + ${c} = ${v}`]));
  }
  if (L === 2 && kind === 6) {
    // A squared letter: kx² squares x only.
    const [k, m, x] = [r.int(2, 5), r.int(1, 12) * r.sign(), r.int(2, 5) * r.sign()];
    const v = k * x * x + m;
    const both = (k * x) ** 2 + m;
    const e = `${k}x² ${m < 0 ? MINUS : "+"} ${Math.abs(m)}`;
    return withIdeas(["letterSquare"], numPart(fill(W.evalSquare, { e, x: signed(x) }), v, [{ id: "coefficientSquared", a: num(both), vars: { x: both, k, n: signed(x), v } }],
      [`${k} \\times (${x})^2 ${m < 0 ? "-" : "+"} ${Math.abs(m)} = ${k} \\times ${x * x} ${m < 0 ? "-" : "+"} ${Math.abs(m)} = ${v}`]));
  }
  if (L === 2 && kind === 7) {
    // Fractions: xy is x times y.
    const [x, y, z] = [fr(r.int(1, 5), r.int(2, 6)), fr(r.int(1, 7), r.int(2, 5)), fr(r.int(1, 3), r.int(2, 8))];
    const v = x.mul(y).sub(z);
    const slip = x.add(y).sub(z);
    return withIdeas(["letterTimes"], fracPart(fill(W.evalFrac, { x: plainFrac(x), y: plainFrac(y), z: plainFrac(z) }), v,
      v.sub(slip).isZero() ? [] : [{ id: "xyAsSum", a: num(slip.toNumber(), 1e-9), vars: { x: plainFrac(slip), v: plainFrac(v) } }],
      [`xy - z = ${x.tex()} \\times ${y.tex()} - ${z.tex()}`, `= ${x.mul(y).tex()} - ${z.tex()} = ${v.tex()}`]));
  }
  if (L === 2 && kind === 8 && r.next() < 0.5) {
    // Value sense: for n between 0 and 1/2, n² is the smallest and 1 ÷ n the largest.
    const large = r.next() < 0.5;
    const steps = ["n = 0.4: \\; n^2 = 0.16, \\; n = 0.4, \\; 2n = 0.8, \\; 1 \\div n = 2.5"];
    return withIdeas(["letterSquare"], large
      ? pickPart(r, W.largest, "1 ÷ n", [["squareBigger", "n²", {}]], ["n", "2n"], steps)
      : pickPart(r, W.smallest, "n²", [["squareBigger", "n", {}]], ["2n", "1 ÷ n"], steps));
  }
  if (L === 2 && kind === 8) {
    // What the numbers in a price stand for: the one beside the letter comes with each km or month.
    const gym = r.next() < 0.5;
    const [f, p] = gym ? [r.int(2, 9) * 10, r.int(15, 45)] : [r.int(2, 6), r.int(2, 4)];
    const rate = r.next() < 0.6;
    const say = gym ? { e: `${f} + ${p}m`, rate: W.perMonth, fixed: W.joining, total: W.gymTotal, count: W.months } : { e: `${f} + ${p}d`, rate: W.perKm, fixed: W.flagFall, total: W.taxiTotal, count: W.kms };
    const prompt = fill(gym ? W.gym : W.taxi, { e: say.e, n: rate ? p : f });
    const [right, wrong] = rate ? [say.rate, say.fixed] : [say.fixed, say.rate];
    return withIdeas(["wordsToExpr"], pickPart(r, prompt, right, [["rateForFixed", wrong, {}]], [say.total, say.count], [texed(say.e)], true));
  }
  if (L === 2 && r.next() < 0.6) {
    // Brackets from words: "k times the sum of n and m" keeps the sum together.
    const [k, m] = [r.int(2, 9), r.int(1, 12)];
    const how = r.pick(["timesSum", "sumTimes", "timesDiff", "sumOver"] as const);
    const right = { timesSum: `${k}(n + ${m})`, sumTimes: `${k}(n + ${m})`, timesDiff: `${k}(n ${MINUS} ${m})`, sumOver: `(n + ${m}) ÷ ${k}` }[how];
    const loose = { timesSum: `${k}n + ${m}`, sumTimes: `n + ${m * k}`, timesDiff: `${k}n ${MINUS} ${m}`, sumOver: `n + ${m} ÷ ${k}` }[how];
    return withIdeas(["wordsToExpr"], exprPart(fill(W.write, { p: fill(W[how], { k, m }) }), right, ["n"], [["bracketsLeftOut", loose, {}]], [texed(right)]));
  }
  if (L === 2) {
    // Change from a note: the note comes first, the tickets are taken from it.
    const [k, c] = [r.int(2, 6), r.pick([20, 50, 100])];
    return withIdeas(["wordsToExpr"], exprPart(fill(W.change, { k, c }), `${c} ${MINUS} ${k}t`, ["t"], [["lessThanReversed", `${k}t ${MINUS} ${c}`, { k }]], [`${c} - ${k}t`]));
  }
  if (L === 3 && kind <= 6) {
    // Factoring by filling the brackets: every term is divided by the factor outside.
    const g = r.int(2, 9);
    const b = r.next() < 0.3 ? 1 : r.int(2, 9);
    // a and b share no factor, so g (or gx) is the greatest common factor.
    const coprime = [1, 2, 3, 4, 5, 6, 7].filter((a) => [2, 3, 5, 7].every((p) => a % p || b % p));
    const a = r.pick(coprime);
    const letters = kind === 6;
    const [out, xa] = letters ? [`${g}x`, "y"] : [String(g), "x"];
    const whole = letters ? sum([[g * a, "xy"], [g * b, "x"]]) : sum([[g * a, "x"], [g * b, ""]]);
    const right = sum([[a, xa], [b, ""]]);
    const slip: [Trap["id"], string, Record<string, string | number>] = b === 1 ? ["factorLeftOne", sum([[a, xa]]), { g: out }] : ["factorNotDividedAll", sum([[a, xa], [g * b, ""]]), { g: out }];
    return withIdeas(["factorOut"], exprPart(fill(W.factor, { e: whole, g: out }), right, [xa], [slip], [`${texed(whole)} = ${out}(${texed(right)})`]));
  }
  if (L === 3 && kind <= 8) {
    // Like terms with fraction or decimal coefficients: n terms together, numbers together.
    if (r.next() < 0.5) {
      const [p, q] = [r.int(2, 9) / 10, r.int(5, 95) / 100];
      const [c, d] = [Math.round((r.int(1, 2) + r.pick([0.2, 0.4, 0.6, 0.8])) * 10) / 10, r.int(1, 4)];
      const e = `${p}n ${MINUS} ${c} + ${q}n + ${d}`;
      const cn = Math.round((p + q) * 100) / 100;
      const cc = Math.round((d - c) * 10) / 10;
      const right = sum([[cn, "n"], [cc, ""]]);
      const all = Math.round((p + q + d - c) * 100) / 100;
      return withIdeas(["likeTerms"], pickPart(r, fill(W.simplify, { e }), right, [["unlikeCombined", `${all}n`, {}]], [sum([[cn, "n"], [Math.round((-c - d) * 10) / 10, ""]])], [`(${p} + ${q})n + (${d} - ${c}) = ${texed(right)}`]));
    }
    const [a, b, c] = [fr(1, r.int(2, 4)), fr(r.int(1, 3), r.pick([4, 5])), fr(1, r.int(5, 8))];
    const cx = a.sub(c);
    const ft = (f: Frac) => (f.d === 1 ? String(f.n) : `${f.n}/${f.d}`);
    /** f times x, as "3x/4" (never "3/4x", which reads as 3 ÷ 4x). */
    const fx = (f: Frac) => (f.d === 1 ? sum([[f.n, "x"]]) : `${f.n === 1 ? "" : f.n}x/${f.d}`);
    const e = `${fx(a)} + ${ft(b)} ${MINUS} ${fx(c)}`;
    const right = `${fx(cx)} + ${ft(b)}`;
    return withIdeas(["likeTerms"], pickPart(r, fill(W.simplify, { e }), right, [["unlikeCombined", fx(a.add(b).sub(c)), {}]], [`${fx(a.add(c))} + ${ft(b)}`], [`(${a.tex()} - ${c.tex()})x + ${b.tex()} = ${cx.tex()}x + ${b.tex()}`]));
  }
  // A thrown ball's height, vt − 5t²: only t is squared.
  const v = r.pick([20, 25, 30, 35, 40]);
  const t = r.int(2, v / 5 - 1);
  const h = v * t - 5 * t * t;
  const both = v * t - (5 * t) ** 2;
  return withIdeas(["letterSquare"], numPart(fill(W.ball, { v, t }), h, [{ id: "coefficientSquared", a: num(both), vars: { x: both, k: 5, n: t, v: h } }], [`${v} \\times ${t} - 5 \\times ${t}^2 = ${v * t} - ${5 * t * t} = ${h}`]));
}

const gen: Gen = (r, L, w) => {
  const extra = r.int(0, 9);
  if (extra >= 5) return more(r, L, extra, w);
  // The one of four expressions equal to one given (src/math/exprMatch.ts); the wrong ones are slips that get named.
  const q = exprQuestion(L, r.next);
  const best = q.options[q.right];
  return withIdeas(L === 1 ? ["likeTerms"] : L === 2 ? ["distribute"] : q.given.text.startsWith("x ·") ? ["letterSquare"] : ["distribute", "letterSquare"], {
    prompt: fill(w.prompts.sameExpression, { e: q.given.text }),
    q: exprTex(q.given.text),
    answer: { k: "pick", options: q.options, right: q.right, traps: q.traps.map((x) => ({ id: x.id, a: { k: "pick", options: q.options, right: x.at }, vars: x.vars })) },
    show: `${exprTex(q.given.text)} = ${best.tex}`,
    plain: best.plain,
    format: "pick",
    steps: exprSteps(q),
  });
};

export default gen;
