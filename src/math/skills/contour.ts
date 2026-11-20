// Practice: Contour integrals. Easy integrates a polynomial between two points by its antiderivative (the ends
// swapped, or the power not divided, named); medium integrates c₁/(z − a) + c₂/(z − b) round a circle by Cauchy's
// theorem (the pole outside counted, or 2πi left off, named); hard uses Cauchy's integral formula for f(z)/(z − a)ⁿ⁺¹
// (no derivative taken, or n! left out, named).
import { cadd, cartesian, cmul, cx, cxTex, neg, zMinusTex } from "../complexPractice";
import { cderiv, cpoly, fact, piAnswer, twoPiI } from "../complexAnalysis";
import type { CxVal, Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const gauss = (r: Rng, m: number) => cx(r.int(-m, m), r.int(-m, m));
const sq = (z: CxVal) => cmul(z, z);
const sub = (a: CxVal, b: CxVal) => cx(a.re - b.re, a.im - b.im);
const scale = (k: number, z: CxVal) => cx(k * z.re, k * z.im);
const paren = (z: CxVal) => ((z.re && z.im) || z.re < 0 || (!z.re && z.im < 0) ? `(${cxTex(z)})` : cxTex(z));
/** z − a, or z when a = 0. */
const zm = (a: CxVal) => (a.re === 0 && a.im === 0 ? "z" : zMinusTex(a));

/** ∫ from a to b of cz + d (c even) or 3z²: F(b) − F(a), any path. */
function pathPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const a = gauss(r, 2);
    const b = gauss(r, 2);
    if (a.re === b.re && a.im === b.im) continue;
    const linear = r.next() < 0.6;
    const c = 2 * r.nz(-2, 2);
    const d = r.nz(-4, 4);
    const right = linear ? cadd(scale(c / 2, sub(sq(b), sq(a))), scale(d, sub(b, a))) : sub(cmul(sq(b), b), cmul(sq(a), a));
    const undivided = linear ? cadd(scale(c, sub(sq(b), sq(a))), scale(d, sub(b, a))) : scale(3, right);
    if (right.re === 0 && right.im === 0) continue;
    const f = linear ? `${c === 1 ? "" : c === -1 ? "-" : c}z ${d < 0 ? "-" : "+"} ${Math.abs(d)}` : "3z^{2}";
    const F = linear ? `${c / 2 === 1 ? "" : c / 2 === -1 ? "-" : c / 2}z^{2} ${d < 0 ? "-" : "+"} ${Math.abs(d) === 1 ? "" : Math.abs(d)}z` : "z^{3}";
    return {
      prompt: w.ca.prompt.path,
      q: `\\int_{${cxTex(a)}}^{${cxTex(b)}} \\left(${f}\\right) dz`,
      ...cartesian([right], [["contourEndsSwapped", [neg(right)]], ["contourNotDivided", [undivided]]]),
      steps: [
        `F(z) = ${F}, \\quad F'(z) = ${f}`,
        `F(${cxTex(b)}) - F(${cxTex(a)}) = ${cxTex(right)}`,
      ],
    };
  }
}

const inside = (z: CxVal, R: number) => z.re * z.re + z.im * z.im < R * R;

/** ∮ over |z| = R of p/(z − a) + q/(z − b): 2πi times the coefficients of the poles inside. */
function loopPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const R = r.int(1, 3);
    const a = gauss(r, 3);
    const b = gauss(r, 4);
    const [p, q] = [r.nz(-4, 4), r.nz(-4, 4)];
    const ia = inside(a, R);
    const ib = inside(b, R);
    const onCircle = (z: CxVal) => z.re * z.re + z.im * z.im === R * R;
    if (onCircle(a) || onCircle(b) || (a.re === b.re && a.im === b.im) || (!ia && !ib)) continue;
    const s = (ia ? p : 0) + (ib ? q : 0);
    if (s === 0) continue;
    const ans = twoPiI(cx(s));
    const both = twoPiI(cx(p + q)).v;
    const where = (z: CxVal, i: boolean) => `|${cxTex(z)}|${i ? " < " : " > "}${R}`;
    return {
      prompt: w.ca.prompt.loop.replace("{R}", String(R)),
      q: `\\oint_{|z| = ${R}} \\left(\\frac{${p}}{${zm(a)}} ${q < 0 ? "-" : "+"} \\frac{${Math.abs(q)}}{${zm(b)}}\\right) dz`,
      ...piAnswer(0, 2 * s, [["poleOutsideCounted", both], ["twoPiIMissing", cx(s)]]),
      steps: [
        `${where(a, ia)}, \\quad ${where(b, ib)}`,
        `\\oint \\frac{dz}{z - z_0} = 2\\pi i \\; (|z_0| < ${R}), \\quad 0 \\; (|z_0| > ${R})`,
        `2\\pi i \\cdot ${s < 0 ? `(${s})` : s} = ${ans.tex}`,
      ],
    };
  }
}

/** ∮ over |z| = R of f(z)/(z − a)ⁿ⁺¹ = 2πi f⁽ⁿ⁾(a)/n!, f a cubic or quadratic with whole coefficients, n = 1 or 2. */
function cauchyPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const R = r.int(2, 3);
    const a = gauss(r, 1);
    const n = r.int(1, 2);
    const cubic = n === 2 || r.next() < 0.5;
    const cs = cubic ? [cx(r.int(-3, 3)), cx(r.nz(-3, 3)), cx(r.int(-2, 2)), cx(1)] : [cx(r.int(-3, 3)), cx(r.nz(-3, 3)), cx(1)];
    let d = cs;
    for (let i = 0; i < n; i++) d = cderiv(d);
    const dn = cpoly(d, a);
    const wv = cx(dn.re / fact(n), dn.im / fact(n));
    if (wv.re === 0 && wv.im === 0) continue;
    const ans = twoPiI(wv);
    const fa = cpoly(cs, a);
    const fTex = cs
      .map((c, k) => [c.re, k] as const)
      .reverse()
      .filter(([c]) => c)
      .map(([c, k], i) => {
        const m = Math.abs(c) === 1 && k > 0 ? "" : String(Math.abs(c));
        const body = `${m}${k === 0 ? "" : k === 1 ? "z" : `z^{${k}}`}`;
        return i === 0 ? `${c < 0 ? "-" : ""}${body}` : ` ${c < 0 ? "-" : "+"} ${body}`;
      })
      .join("");
    const den = a.re === 0 && a.im === 0 ? "z" : `(${zm(a)})`;
    return {
      prompt: w.ca.prompt.loop.replace("{R}", String(R)),
      q: `\\oint_{|z| = ${R}} \\frac{${fTex}}{${den}^{${n + 1}}} \\, dz`,
      ...piAnswer(-2 * wv.im, 2 * wv.re, [
        ["cauchyDerivativeSkipped", twoPiI(fa).v],
        ...(n === 2 ? ([["cauchyFactorialForgotten", twoPiI(dn).v]] as ["cauchyFactorialForgotten", CxVal][]) : []),
      ]),
      steps: [
        `|${cxTex(a)}| < ${R}: \\quad \\oint \\frac{f(z)}{(z - a)^{n + 1}} dz = \\frac{2\\pi i}{n!} f^{(n)}(a), \\quad n = ${n}`,
        `f${n === 1 ? "'" : "''"}(${cxTex(a)}) = ${cxTex(dn)}`,
        `\\frac{2\\pi i}{${fact(n)}} \\cdot ${paren(dn)} = ${ans.tex}`,
      ],
    };
  }
}

const gen: Gen = (r, L, w) => (L === 1 ? pathPart(r, w) : L === 2 ? loopPart(r, w) : cauchyPart(r, w));

export default gen;
