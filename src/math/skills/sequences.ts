// Practice: Sequences. Easy: a term of an arithmetic sequence; medium: from two terms, or a geometric term; hard: a
// quadratic rule. #729 added, half the time: easy, a recursive rule evaluated, an arithmetic sequence's explicit and
// recursive rules picked, and a recursive rule written out explicitly; medium, the same for geometric sequences and
// the next term after negatives and fractions; hard, in new settings, the seats in a theatre's row, a video's views,
// and the domain of a row count. A step too many, the start and the difference (or ratio) swapped, adding taken for
// multiplying, a geometric sequence read as arithmetic, the ratio's sign dropped, a domain of all numbers and a
// domain from 0 are slips.
import { fill } from "../chart";
import { parseE, tex } from "../expr";
import { num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { pickPart } from "../tTails";

const gen: Gen = (r, L, w) => {
  if (r.int(0, 9) >= 5) return more(r, L, w);
  const sol = (topic: string, src: string) => ({ kind: "sequences" as const, spec: { topic, src } });
  const list = (vs: number[]) => `${vs.join(", ")}, …`.replace(/-/g, "−");
  const listSrc = (vs: number[]) => `${vs.join(", ")}, …`;
  const done = (prompt: string, v: number, spec: { kind: "sequences"; spec: { topic: string; src: string } }) => ({
    prompt, q: "", answer: num(v), show: String(v), plain: String(v), format: "number" as const, solution: spec,
  });
  const sub = (n: number) => String(n).replace(/\d/g, (d) => "₀₁₂₃₄₅₆₇₈₉"[Number(d)]);
  if (L === 1 || (L === 2 && r.next() < 0.5)) {
    const [a, d] = [r.int(-10, 20), r.nz(-6, 9)];
    const terms = [0, 1, 2, 3].map((i) => a + i * d);
    const n = r.int(10, 40);
    if (L === 1) return done(fill(w.prompts.seqTerm, { n, list: list(terms) }), a + (n - 1) * d, sol("arith", `${listSrc(terms)}; u${n}`));
    let p = r.int(2, 8);
    let q = r.int(p + 2, 15);
    if (r.next() < 0.5) [p, q] = [q, p];
    const [x, y] = [a + (p - 1) * d, a + (q - 1) * d];
    const n2 = r.int(16, 30);
    return done(fill(w.prompts.seqTwo, { a: `u${sub(p)} = ${x}`.replace(/-/g, "−"), b: `u${sub(q)} = ${y}`.replace(/-/g, "−"), c: `u${sub(n2)}` }), a + (n2 - 1) * d, sol("arith", `u${p} = ${x}, u${q} = ${y}; u${n2}`));
  }
  if (L === 2) {
    const [a, ratio] = [r.nz(-4, 5), r.pick([2, 3, -2, -3] as const)];
    const terms = [0, 1, 2, 3].map((i) => a * ratio ** i);
    const n = r.int(6, 9);
    return done(fill(w.prompts.seqTerm, { n, list: list(terms) }), a * ratio ** (n - 1), sol("geom", `${listSrc(terms)}; u${n}`));
  }
  // A quadratic rule an² + bn + c.
  const [a, b, c] = [r.int(1, 3), r.int(-5, 5), r.int(-5, 6)];
  const u = (n: number) => a * n * n + b * n + c;
  const terms = [1, 2, 3, 4, 5].map(u);
  const n = r.int(10, 25);
  return done(fill(w.prompts.seqTerm, { n, list: list(terms) }), u(n), sol("pattern", `${terms.join(", ")}; u${n}`));
};

const m = (v: number) => String(v).replace("-", "−");
/** + d or − d. */
const pm = (d: number) => `${d < 0 ? "−" : "+"} ${Math.abs(d)}`;
const arithEx = (a: number, d: number, sh = 1) => `a(n) = ${m(a)} ${pm(d)}(n${sh ? " − 1" : ""})`;
const arithRec = (a: number, d: number) => `a(1) = ${m(a)}, a(n) = a(n − 1) ${pm(d)}`;
const geomEx = (a: number, q: string, sh = 1) => `a(n) = ${m(a)} · ${q}${sh ? "ⁿ⁻¹" : "ⁿ"}`;
const geomRec = (a: number, q: string) => `a(1) = ${m(a)}, a(n) = ${q} · a(n − 1)`;
const listOf = (vs: number[]) => `${vs.map(m).join(", ")}, …`;
const nz = (r: Rng, lo: number, hi: number) => {
  let v = 0;
  while (!v) v = r.int(lo, hi);
  return v;
};

function numPart(prompt: string, v: number, traps: Trap[], steps: string[]): Part {
  const kept = traps.filter((t, i) => t.a.k === "num" && t.a.v !== v && !traps.slice(0, i).some((u) => u.a.k === "num" && t.a.k === "num" && u.a.v === t.a.v));
  return { prompt, q: "", answer: { ...num(v), traps: kept }, show: m(v), plain: String(v), format: "number", steps };
}

/** A formula in n to type, with its slips. */
function nPart(prompt: string, right: string, slips: [Trap["id"], string, Record<string, string | number>][], steps: string[]): Part {
  const e = (t: string) => parseE(t, ["n"]);
  return {
    prompt, q: "", show: `a(n) = ${tex(e(right))}`, plain: right, format: "expr", steps,
    answer: { k: "expr", e: e(right), vars: ["n"], traps: slips.map(([id, t, v]) => ({ id, a: { k: "expr", e: e(t), vars: ["n"] }, vars: v })) },
  };
}

function more(r: Rng, L: number, w: PracticeWords): Part {
  const W = w.seqP;
  if (L === 1) {
    const [a, d] = [r.int(-5, 12), nz(r, -6, 7)];
    const terms = [0, 1, 2, 3].map((i) => a + i * d);
    const t = r.pick(["eval", "eval", "explicit", "recursive", "convert"] as const);
    if (t === "eval") {
      // a(1) = a, a(n) = a(n − 1) + d, or a(n) = 2a(n − 1) + c: k steps on from a(1).
      const k = r.int(3, 5);
      const dbl = r.next() < 0.35;
      const c = nz(r, -3, 3);
      const step = (v: number) => (dbl ? 2 * v + c : v + d);
      const vals = [a];
      for (let i = 1; i <= k; i++) vals.push(step(vals[i - 1]));
      const rule = dbl ? `a(1) = ${m(a)}, a(n) = 2a(n − 1) ${pm(c)}` : arithRec(a, d);
      return numPart(fill(W.evalQ, { rule, n: k }), vals[k - 1], [{ id: "recursiveStepCount", a: num(vals[k]), vars: { n: k, s: k - 1, v: m(vals[k - 1]) } }],
        vals.slice(0, k).map((v, i) => `a(${i + 1}) = ${v}`));
    }
    if (t === "convert") {
      // From the recursive rule to the explicit one, typed: a + d(n − 1).
      return nPart(fill(W.convertQ, { rule: arithRec(a, d) }), `${a} + ${d}*(n - 1)`, [["explicitStartOff", `${a} + ${d}*n`, { a: m(a), d: m(d), v: arithEx(a, d) }]],
        [`a(n) = ${a} ${d < 0 ? "-" : "+"} ${Math.abs(d)}(n - 1)`]);
    }
    const ok = a !== d && a !== 0;
    if (!ok) return more(r, L, w);
    if (t === "explicit") {
      const opts = [arithEx(a, d), arithEx(a, d, 0), arithEx(d, a), geomEx(a, String(d))];
      return pickPart(r, opts, 0, [
        { id: "explicitStartOff", at: 1, vars: { a: m(a), d: m(d), v: opts[0] } },
        { id: "startDiffSwapped", at: 2, vars: { a: m(a), d: m(d), v: opts[0] } },
      ], fill(W.explicitQ, { list: listOf(terms) }), [`a(1) = ${a}, \\quad d = ${d}`]);
    }
    const opts = [arithRec(a, d), arithRec(d, a), geomRec(a, String(d)), arithRec(a, -d)];
    return pickPart(r, opts, 0, [
      { id: "startDiffSwapped", at: 1, vars: { a: m(a), d: m(d), v: opts[0] } },
      { id: "addAsMultiply", at: 2, vars: { d: m(d), v: opts[0] } },
    ], fill(W.recursiveQ, { list: listOf(terms) }), [`a(1) = ${a}, \\quad d = ${d}`]);
  }
  if (L === 2) {
    const a = r.pick([1, 2, 3, 4, 5, -2, -3]);
    const q = r.pick([2, 3, -2, 4]);
    const terms = [0, 1, 2, 3].map((i) => a * q ** i);
    const qs = q < 0 ? `(${m(q)})` : String(q);
    const t = r.pick(["explicit", "recursive", "next", "next", "convert"] as const);
    if (t === "next") {
      // Negatives and fractions: the ratio ±1/2 or ±1/3, five whole terms.
      const den = r.pick([2, 3]);
      const sign = r.pick([1, -1]);
      const k = r.int(1, 3) * (sign < 0 && r.next() < 0.5 ? -1 : 1);
      const vs = [4, 3, 2, 1, 0].map((i) => k * den ** i * sign ** (4 - i));
      const shown = vs.slice(0, 4);
      const diff = shown[3] - shown[2];
      return numPart(fill(W.nextQ, { list: listOf(shown) }), vs[4], [
        ...(sign < 0 ? [{ id: "ratioSignDropped" as const, a: num(-vs[4]), vars: { r: `−1/${den}`, v: m(vs[4]) } }] : []),
        { id: "geomAsArith", a: num(shown[3] + diff), vars: { d: m(diff), r: `${sign < 0 ? "−" : ""}1/${den}`, v: m(vs[4]) } },
      ], [`r = \\frac{${shown[1]}}{${shown[0]}} = ${sign < 0 ? "-" : ""}\\frac{1}{${den}}`, `${shown[3]} \\times ${sign < 0 ? "(-" : ""}\\tfrac{1}{${den}}${sign < 0 ? ")" : ""} = ${vs[4]}`]);
    }
    if (t === "convert") {
      // A positive ratio only: the checker tries n between the whole numbers, where (−2)ⁿ has no value.
      if (q < 0) return more(r, L, w);
      return nPart(fill(W.convertQ, { rule: geomRec(a, qs) }), `${a}*(${q})^(n - 1)`, [["explicitStartOff", `${a}*(${q})^n`, { a: m(a), d: m(q), v: geomEx(a, qs) }]],
        [`a(n) = ${a} \\cdot ${q < 0 ? `(${q})` : q}^{n - 1}`]);
    }
    if (a === q || a === 1) return more(r, L, w);
    if (t === "explicit") {
      const opts = [geomEx(a, qs), geomEx(a, qs, 0), geomEx(q, a < 0 ? `(${m(a)})` : String(a)), arithEx(a, q)];
      return pickPart(r, opts, 0, [
        { id: "explicitStartOff", at: 1, vars: { a: m(a), d: m(q), v: opts[0] } },
        { id: "startRatioSwapped", at: 2, vars: { a: m(a), q: m(q), v: opts[0] } },
        { id: "geomAsArith", at: 3, vars: { d: m(terms[1] - terms[0]), r: m(q), v: opts[0] } },
      ], fill(W.explicitQ, { list: listOf(terms) }), [`a(1) = ${a}, \\quad r = ${q}`]);
    }
    const opts = [geomRec(a, qs), geomRec(q, a < 0 ? `(${m(a)})` : String(a)), arithRec(a, q), geomRec(a, qs).replace(/^a\(1\) = [^,]*/, `a(1) = ${m(a * q)}`)];
    return pickPart(r, opts, 0, [
      { id: "startRatioSwapped", at: 1, vars: { a: m(a), q: m(q), v: opts[0] } },
      { id: "geomAsArith", at: 2, vars: { d: m(terms[1] - terms[0]), r: m(q), v: opts[0] } },
    ], fill(W.recursiveQ, { list: listOf(terms) }), [`a(1) = ${a}, \\quad r = ${q}`]);
  }
  const t = r.pick(["seats", "views", "domain"] as const);
  if (t === "seats") {
    // A new setting: a theatre's rows, s seats in row 1 and d more in each row after.
    const [s, d, n] = [r.int(12, 24), r.int(2, 4), r.int(10, 25)];
    return numPart(fill(W.seatsQ, { s, d, n }), s + (n - 1) * d, [{ id: "explicitStartOff", a: num(s + n * d), vars: { a: s, d, v: `${s} + ${d} × ${n - 1} = ${s + (n - 1) * d}` } }],
      [`a(n) = ${s} + ${d}(n - 1)`, `a(${n}) = ${s} + ${d} \\times ${n - 1} = ${s + (n - 1) * d}`]);
  }
  if (t === "views") {
    const [v1, q, n] = [r.pick([10, 20, 30, 40, 50]), r.pick([2, 3]), r.int(4, 6)];
    const v = v1 * q ** (n - 1);
    return numPart(fill(W.viewsQ, { v: v1, q: q === 2 ? W.double : W.triple, n }), v, [
      { id: "explicitStartOff", a: num(v * q), vars: { a: v1, d: q, v: `${v1} · ${q}${"⁰¹²³⁴⁵⁶⁷⁸⁹"[n - 1]} = ${v}` } },
      { id: "geomAsArith", a: num(v1 + (n - 1) * (v1 * q - v1)), vars: { d: v1 * q - v1, r: q, v } },
    ], [`a(n) = ${v1} \\cdot ${q}^{n - 1}`, `a(${n}) = ${v}`]);
  }
  // The domain of a(n) for a theatre with R rows: the whole numbers 1 to R.
  const [s, d, R] = [r.int(12, 24), r.int(2, 4), r.int(12, 30)];
  const opts = [fill(W.wholeFromTo, { lo: 1, hi: R }), fill(W.allFromTo, { lo: 1, hi: R }), fill(W.wholeFromTo, { lo: 0, hi: R }), fill(W.wholeUp, { lo: 1 })];
  return pickPart(r, opts, 0, [
    { id: "termNumberNotWhole", at: 1, vars: { v: opts[0] } },
    { id: "domainStartsAtZero", at: 2, vars: { v: opts[0] } },
  ], fill(W.domainQ, { f: arithEx(s, d), R }), [`n = 1, 2, 3, \\ldots, ${R}`]);
}

export default gen;
