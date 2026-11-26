// Practice: Logarithms. Easy: log_b of a power; medium: of a reciprocal or a power of the base's power; hard: a sum
// or difference. #730 added, half the time: easy, an exponential equation written as a log and back; medium, the
// change of base rule picked and used; hard, in new settings, decibels and the Richter scale, and e^(kx) = v solved
// with ln. The base and the exponent swapped, the result swapped with the input, the rule upside down, log(x/b) for
// the rule, decibels without the 10, the magnitudes' difference times ten and v divided by k inside the log are slips.
import { fill } from "../chart";
import type { Frac } from "../fraction";
import { dp, fr, num, plainFrac } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { pickPart } from "../tTails";

const gen: Gen = (r, L, w) => {
  if (r.int(0, 9) >= 5) return more(r, L, w);
  const logTex = (b: number, x: string) => (b === 10 ? `\\log ${x}` : `\\log_{${b}} ${x}`);
  const logSrc = (b: number, x: string) => (b === 10 ? `log(${x})` : `log_${b}(${x})`);
  let src: string;
  let q: string;
  let v: Frac;
  if (L === 1) {
    const b = r.pick([2, 3, 5, 10]);
    const k = r.int(1, b === 2 ? 7 : b === 10 ? 5 : 4);
    src = logSrc(b, String(b ** k));
    q = logTex(b, String(b ** k));
    v = fr(k);
  } else if (L === 2) {
    if (r.next() < 0.5) {
      const b = r.pick([2, 3, 10]);
      const k = r.int(1, 4);
      src = logSrc(b, `1/${b ** k}`);
      q = logTex(b, `\\frac{1}{${b ** k}}`);
      v = fr(-k);
    } else {
      const b = r.pick([2, 3]);
      const [m, n] = r.pick([[2, 3], [2, 1], [2, 5], [3, 2], [3, 1], [2, 4]] as const);
      if (b ** n > 10000 || b ** m > 100) return gen(r, 1, w);
      src = logSrc(b ** m, String(b ** n));
      q = logTex(b ** m, String(b ** n));
      v = fr(n, m);
    }
  } else {
    const b = r.pick([2, 3, 5, 6, 10]);
    const k = r.int(1, b <= 3 ? 3 : 2);
    if (b === 6 || b === 10) {
      const t = b ** k;
      const parts = k === 1 ? (b === 6 ? [2, 3] : [2, 5]) : b === 6 ? [4, 9] : k === 2 ? [4, 25] : [8, 125];
      src = `${logSrc(b, String(parts[0]))} + ${logSrc(b, String(parts[1]))}`;
      q = `${logTex(b, String(parts[0]))} + ${logTex(b, String(parts[1]))}`;
      v = fr(Math.round(Math.log(t) / Math.log(b)));
    } else {
      const y = r.pick([2, 3, 5, 6, 7].filter((x) => x % b !== 0));
      src = `${logSrc(b, String(y * b ** k))} - ${logSrc(b, String(y))}`;
      q = `${logTex(b, String(y * b ** k))} - ${logTex(b, String(y))}`;
      v = fr(k);
    }
  }
  return { prompt: w.prompts.evaluate, q, answer: num(v.toNumber()), show: v.tex(), plain: plainFrac(v), format: "exact", solution: { kind: "powers", spec: { topic: "logs", src } } };
};

const sup = (k: number) => String(k).replace(/\d/g, (d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(d)]);
const sub = (k: number) => String(k).replace(/\d/g, (d) => "₀₁₂₃₄₅₆₇₈₉"[Number(d)]);
const lg = (b: number, x: number | string) => `log${sub(b)} ${x}`;

function numPart(prompt: string, q: string, v: number, tol: number, show: string, traps: Trap[], steps: string[]): Part {
  const kept = traps.filter((t) => t.a.k === "num" && Math.abs(t.a.v - v) > 25 * tol + 1e-9);
  return { prompt, q, answer: { ...num(v, tol), traps: kept }, show, plain: show, format: "number", steps };
}

function more(r: Rng, L: number, w: PracticeWords): Part {
  const W = w.logM;
  if (L === 1) {
    // bᵏ = v and log_b v = k say the same thing.
    const [b, k] = r.pick([[2, 5], [3, 4], [2, 6], [5, 3], [3, 5], [2, 7], [4, 3], [10, 3]] as const);
    const v = b ** k;
    if (r.next() < 0.5) {
      const opts = [`${lg(b, v)} = ${k}`, `${lg(k, v)} = ${b}`, `${lg(b, k)} = ${v}`, `${lg(v, b)} = ${k}`];
      return pickPart(r, opts, 0, [
        { id: "logFormSwapped", at: 1, vars: { b, k, v: opts[0] } },
        { id: "logResultSwapped", at: 2, vars: { b, x: v, v: opts[0] } },
      ], fill(W.toLogQ, { e: `${b}${sup(k)} = ${v}` }), [`${b}^{${k}} = ${v} \\iff \\log_{${b}} ${v} = ${k}`]);
    }
    const opts = [`${b}${sup(k)} = ${v}`, `${k}${sup(b)} = ${v}`, `${b}${sup(v)} = ${k}`, `${v}${sup(k)} = ${b}`];
    return pickPart(r, opts, 0, [
      { id: "logFormSwapped", at: 1, vars: { b, k, v: opts[0] } },
      { id: "logResultSwapped", at: 2, vars: { b, x: v, v: opts[0] } },
    ], fill(W.fromLogQ, { e: `${lg(b, v)} = ${k}` }), [`\\log_{${b}} ${v} = ${k} \\iff ${b}^{${k}} = ${v}`]);
  }
  if (L === 2) {
    const b = r.pick([3, 5, 6, 7]);
    const x = r.pick([10, 12, 20, 30, 50].filter((x) => x !== b));
    if (r.next() < 0.5) {
      const opts = [`log ${x} / log ${b}`, `log ${b} / log ${x}`, `log(${x} / ${b})`, `log ${x} / ${b}`];
      return pickPart(r, opts, 0, [
        { id: "changeBaseFlipped", at: 1, vars: { b, x } },
        { id: "changeBaseAsQuotient", at: 2, vars: { b, x } },
      ], fill(W.ruleQ, { e: lg(b, x) }), [`\\log_{${b}} ${x} = \\frac{\\log ${x}}{\\log ${b}}`]);
    }
    const v = Number(dp(Math.log(x) / Math.log(b), 2));
    return numPart(W.useQ, `\\log_{${b}} ${x}`, v, 0.0051, dp(v, 2), [
      { id: "changeBaseFlipped", a: num(Number(dp(Math.log(b) / Math.log(x), 2)), 0.0051), vars: { b, x } },
      { id: "changeBaseAsQuotient", a: num(Number(dp(Math.log10(x / b), 2)), 0.0051), vars: { b, x } },
    ], [`\\frac{\\log ${x}}{\\log ${b}} = ${dp(v, 2)}`]);
  }
  const t = r.pick(["decibel", "richter", "ln"] as const);
  if (t === "decibel") {
    const m = r.int(2, 6);
    const k = 10 ** m;
    return numPart(fill(W.decibelQ, { k: String(k).replace(/\B(?=(\d{3})+$)/g, " ") }), "", 10 * m, 1e-9, String(10 * m), [{ id: "decibelTenDropped", a: num(m), vars: { m, v: 10 * m } }],
      [`10 \\log ${k} = 10 \\times ${m} = ${10 * m}`]);
  }
  if (t === "richter") {
    const d = r.int(2, 3);
    const M2 = r.pick([4, 5, 6]);
    const v = 10 ** d;
    return numPart(fill(W.richterQ, { a: M2 + d, b: M2 }), "", v, 1e-9, String(v), [{ id: "magnitudeDiffAsTimes", a: num(10 * d), vars: { d, v } }],
      [`10^{${M2 + d} - ${M2}} = 10^{${d}} = ${v}`]);
  }
  const [k, m] = [r.pick([2, 3, 4]), r.pick([5, 8, 20, 50])];
  const val = Number(dp(Math.log(m) / k, 2));
  return numPart(W.solveQ, `e^{${k}x} = ${m}`, val, 0.0051, dp(val, 2), [{ id: "exponentDividedFirst", a: num(Number(dp(Math.log(m / k), 2)), 0.0051), vars: { k, m, v: dp(val, 2) } }],
    [`${k}x = \\ln ${m}`, `x = \\frac{\\ln ${m}}{${k}} = ${dp(val, 2)}`]);
}

export default gen;
