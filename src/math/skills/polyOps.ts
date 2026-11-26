// Practice: Polynomials, adding and multiplying (#719). Easy: a negative number times a bracket, one bracket taken
// from another, like terms with negative coefficients (a pick), and two monomials multiplied. Medium: polynomials
// added and taken away, and a polynomial's degree and leading coefficient when it is written out of order. Hard: a
// monomial times a polynomial, and a rectangle's area from an area model. The bracket's second sign kept, a negative
// taken as a difference, the powers multiplied, only the first term taken away, the first term taken as the leading
// one, the powers not added and one part of the area left out are slips.
import { C, fill, FONT, r2 } from "../chart";
import { parseE } from "../expr";
import type { ExprOption } from "../exprMatch";
import { bracket, num, pmul, polyStr, T } from "../practiceKit";
import type { Gen, Part, Rng, Trap } from "../practiceTypes";

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
/** "6x^2 - 15" as read: "6x² − 15". */
const pretty = (s: string) => s.replace(/\^(\d+)/g, (_, d: string) => [...d].map((c) => SUP[Number(c)]).join("")).replace(/ - /g, " − ").replace(/^-/, "−");
/** Coefficients added term by term. */
const padd = (a: number[], b: number[]) => Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] ?? 0) + (b[i] ?? 0));
/** c x^k as coefficients. */
const mono = (c: number, k: number) => Array.from({ length: k + 1 }, (_, i) => (i === k ? c : 0));
const monoStr = (c: number, k: number) => polyStr(mono(c, k));

/** An expansion to type (q in TeX): equal and without brackets is right. Slips equal to the answer are dropped. */
function expandPart(q: string, cs: number[], slips: [Trap["id"], number[], Record<string, string | number>][], steps: string[], prompt?: string): Part {
  const out = polyStr(cs);
  const traps: Trap[] = slips.filter(([, t]) => polyStr(t) !== out).map(([id, t, v]) => ({ id, a: { k: "expr", e: parseE(polyStr(t)) }, vars: { x: pretty(polyStr(t)), v: pretty(out), ...v } }));
  return { prompt: prompt ?? "", q, answer: { k: "expr", e: parseE(out), mode: "expand", traps }, show: T(out), plain: out, format: "expr", steps };
}
function shuffled<T>(r: Rng, xs: T[]): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = r.int(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const gen: Gen = (r, L, w) => {
  const W = w.plyP;
  const kind = r.int(0, 9);
  const E = w.prompts.expand;
  if (L === 1 && kind <= 3) {
    // A negative times a bracket: both terms change sign.
    const [k, b, c] = [-r.int(2, 6), r.int(1, 5), r.nz(-9, 9)];
    const src = `${k}${bracket(b, c)}`;
    return expandPart(T(src), [k * c, k * b], [["negDistSign", [-k * c, k * b], { k, c: pretty(String(c)) }]], [`${k} \\times ${b}x + (${k}) \\times (${c}) = ${T(polyStr([k * c, k * b]))}`], E);
  }
  if (L === 1 && kind <= 5) {
    // Two brackets, the second taken away: −q times every term inside.
    const [p, a, b, q, c, d] = [r.int(2, 6), r.int(1, 5), r.nz(-9, 9), r.int(2, 6), r.int(1, 5), -r.int(1, 9)];
    const src = `${p}${bracket(a, b)} - ${q}${bracket(c, d)}`;
    const cs = [p * b - q * d, p * a - q * c];
    return expandPart(T(src), cs, [["negDistSign", [p * b + q * d, p * a - q * c], { k: -q, c: pretty(String(d)) }]],
      [`${T(polyStr([p * b, p * a]))} ${q * d < 0 ? "+" : "-"} ${T(polyStr([Math.abs(q * d), q * c]).replace(/^-/, ""))}`, `= ${T(polyStr(cs))}`], E);
  }
  if (L === 1 && kind <= 7) {
    // Like terms with negative coefficients, picked: −3x − 7x is −10x.
    const [a, c, b, d] = [-r.int(2, 9), -r.int(2, 9), r.int(1, 9), r.nz(-9, 9)];
    const e = pretty(`${polyStr([b, a])}${c < 0 ? " - " : " + "}${Math.abs(c)}x${d < 0 ? " - " : " + "}${Math.abs(d)}`);
    const right = polyStr([b + d, a + c]);
    const slip = polyStr([b + d, a - c]);
    const other = polyStr([b - d, a + c]);
    const texts = shuffled(r, [...new Set([right, slip, other, polyStr([b + d + a + c])])]);
    const options: ExprOption[] = texts.map((t) => ({ text: pretty(t), plain: t, tex: T(t) }));
    const at = (t: string) => texts.indexOf(t);
    return {
      prompt: W.collect, q: T(typed(e)),
      answer: { k: "pick", options, right: at(right), traps: slip === right ? [] : [{ id: "negLikeAsDiff", a: { k: "pick", options, right: at(slip) }, vars: { x: pretty(slip), v: pretty(right), a: pretty(`${a}x`), c: pretty(`${c}x`), s: pretty(`${a + c}x`) } }] },
      show: T(right), plain: right, format: "pick", steps: [`(${a} ${c < 0 ? "-" : "+"} ${Math.abs(c)})x + (${b} ${d < 0 ? "-" : "+"} ${Math.abs(d)}) = ${T(right)}`],
    };
  }
  if (L === 1) {
    // Two monomials: the numbers multiply, the powers of x add.
    const [a, b, m, n] = [r.int(2, 6) * r.sign(), r.int(2, 6) * r.sign(), r.int(2, 4), r.int(2, 5)];
    const q = `\\left(${T(monoStr(a, m))}\\right)\\left(${T(monoStr(b, n))}\\right)`;
    return expandPart(q, mono(a * b, m + n), m * n === m + n ? [] : [["exponentsMultiplied", mono(a * b, m * n), { m, n, s: m + n }]], [`${a} \\times ${b} = ${a * b}, \\; x^{${m}} \\times x^{${n}} = x^{${m + n}}`], E);
  }
  if (L === 2 && kind <= 5) {
    // Polynomials added or taken away: taking one away changes the sign of every term in it.
    const P = [r.nz(-9, 9), r.nz(-9, 9), r.int(1, 6)];
    const Q = [r.nz(-9, 9), r.nz(-9, 9), r.int(1, 6)];
    const minus = kind <= 3;
    const q = `\\left(${T(polyStr(P))}\\right) ${minus ? "-" : "+"} \\left(${T(polyStr(Q))}\\right)`;
    const cs = minus ? padd(P, Q.map((x) => -x)) : padd(P, Q);
    const slips: [Trap["id"], number[], Record<string, string | number>][] = minus ? [["subtractFirstOnly", [P[0] + Q[0], P[1] + Q[1], P[2] - Q[2]], {}]] : [];
    return expandPart(q, cs, slips, minus ? [`${T(polyStr(P))} + ${T(polyStr(Q.map((x) => -x)))}`.replace("+ -", "- "), `= ${T(polyStr(cs))}`] : [`= ${T(polyStr(cs))}`], E);
  }
  if (L === 3 && kind <= 5) {
    // A monomial times a polynomial: each term's power of x goes up by one.
    const a = r.int(2, 5) * r.sign();
    const P = [r.nz(-9, 9), r.nz(-9, 9), r.int(1, 5) * r.sign()];
    const q = `${T(monoStr(a, 1))}\\left(${T(polyStr(P))}\\right)`;
    const cs = pmul([0, a], P);
    const kept = P.reduce((acc, c, k) => padd(acc, mono(a * c, Math.max(1, k))), [0]);
    return expandPart(q, cs, [["powersNotAdded", kept, {}]], [`${T(monoStr(a, 1))} \\times ${T(polyStr(P))} = ${T(polyStr(cs))}`], E);
  }
  if (L === 3) {
    // An area model: the width times each part of the length.
    const [a, b, c] = [r.int(2, 5), r.int(1, 6), r.int(2, 9)];
    const cs = [0, a * c, a * b];
    const fig = areaPic(monoStr(a, 1), [monoStr(b, 1), String(c)]);
    return { ...expandPart("", cs, [["areaPartMissed", [c, 0, a * b], { a: `${a}x`, b: pretty(monoStr(b, 1)), c }]], [`${a}x \\times ${b === 1 ? "" : b}x + ${a}x \\times ${c} = ${T(polyStr(cs))}`], fill(W.area, { w: `${a}x`, p: pretty(monoStr(b, 1)), q: c })), pic: fig };
  }
  // A polynomial written out of order: its degree and leading coefficient are the highest power's.
  const deg = r.int(3, 5);
  const lead = r.nz(-7, 7);
  const lowK = r.int(0, deg - 1);
  const low = r.nz(-9, 9);
  const mid = r.int(1, deg - 1) === lowK ? (lowK + 1) % deg : r.int(0, deg - 1);
  const terms: [number, number][] = [[low, lowK], [lead, deg], ...(mid !== lowK ? [[r.nz(-9, 9), mid] as [number, number]] : [])];
  const e = pretty(terms.map(([c, k], i) => { const s = monoStr(c, k); return i === 0 ? s : s.startsWith("-") ? ` - ${s.slice(1)}` : ` + ${s}`; }).join(""));
  const askDeg = r.next() < 0.5;
  const [first, firstK] = terms[0];
  const v = askDeg ? deg : lead;
  const x = askDeg ? firstK : first;
  return {
    prompt: fill(askDeg ? W.degree : W.leading, { e }), q: "",
    answer: { ...num(v), traps: x === v ? [] : [{ id: "firstTermAsLeading", a: num(x), vars: { x, v, k: deg } }] },
    show: String(v), plain: String(v), format: "number", steps: [`${T(monoStr(lead, deg))}: \\text{degree } ${deg}, \\text{ coefficient } ${lead}`],
  };
};

/** Typed form of a read expression. */
const typed = (t: string) => t.replace(/−/g, "-").replace(/([x])([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_, v: string, p: string) => `${v}^${[...p].map((c) => SUP.indexOf(c)).join("")}`);

/** A rectangle w wide, its length split into parts, each part's width written above it. */
function areaPic(wd: string, parts: string[]): Part["pic"] {
  const [W, H, L] = [240, 110, 44];
  const share = [0.62, 0.38];
  let body = "";
  let x = L;
  parts.forEach((p, i) => {
    const pw = (W - L - 10) * share[i];
    body += `<rect x="${r2(x)}" y="30" width="${r2(pw)}" height="${H - 40}" fill="${i ? "#fff4e6" : "#e7f5ff"}" stroke="${C.ink}" stroke-width="1.5"/>`;
    body += `<text x="${r2(x + pw / 2)}" y="22" ${FONT} font-size="14" text-anchor="middle" fill="${C.ink}">${pretty(p)}</text>`;
    body += `<text x="${r2(x + pw / 2)}" y="${30 + (H - 40) / 2 + 5}" ${FONT} font-size="15" text-anchor="middle" fill="${C.grey}">?</text>`;
    x += pw;
  });
  body += `<text x="${L - 8}" y="${30 + (H - 40) / 2 + 5}" ${FONT} font-size="14" text-anchor="end" fill="${C.ink}">${pretty(wd)}</text>`;
  return { w: W, h: H, svg: (ox, oy) => `<g transform="translate(${r2(ox)} ${r2(oy)})">${body}</g>` };
}

export default gen;
