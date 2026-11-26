// Practice: Trig identities. #716 added the identities used one at a time. Easy: cos θ from sin θ (or the other way)
// in a given quadrant, a reciprocal ratio (csc, sec, cot) from another ratio, and sin or cos of θ reflected or turned
// (180° − θ, 180° + θ, −θ, 90° − θ). Medium: sin and cos of A + B and A − B from two ratios. Hard, in new settings: the
// peak of two waves added, and the tangent of a ski run's two slopes together. The sign of the quadrant lost, 1 − sin θ
// for cos θ, the reciprocal of the wrong ratio, the sign of a reflection lost, sin and cos mixed, the sum taken inside,
// the sign of the second term swapped, the peaks added and 1 + tan A tan B below are slips.
import { fill } from "../chart";
import { sqrtSplit } from "../expr";
import type { Frac } from "../fraction";
import { fr, num, plainFrac, surdTex } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";

const TRIPLE = [[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [8, 15, 17], [15, 8, 17], [7, 24, 25], [24, 7, 25]] as const;
const fracPart = (prompt: string, v: Frac, traps: { id: Trap["id"]; v: Frac; vars?: Record<string, string | number> }[], steps: string[]): Part => {
  const kept = traps.filter((t, i) => Math.abs(t.v.toNumber() - v.toNumber()) > 1e-9 && !traps.slice(0, i).some((u) => Math.abs(u.v.toNumber() - t.v.toNumber()) < 1e-9));
  return {
    prompt, q: "", answer: { ...num(v.toNumber(), 1e-9), traps: kept.map((t) => ({ id: t.id, a: num(t.v.toNumber(), 1e-9), vars: { x: plainFrac(t.v).replace("-", "−"), v: plainFrac(v).replace("-", "−"), ...t.vars } })) },
    show: v.tex(), plain: plainFrac(v), format: v.d === 1 ? "number" : "fraction", steps,
  };
};

/** The kinds #716 added. */
function more(r: Rng, L: 1 | 2 | 3, kind: number, w: PracticeWords): Part {
  const W = w.trgP;
  if (L === 1 && kind <= 6) {
    // The Pythagorean identity with the quadrant's signs: II sin +, cos −; III both −; IV sin −, cos +.
    const [a, b, h] = r.pick(TRIPLE);
    const q = r.pick([2, 3, 4]);
    const [ss, cs] = q === 2 ? [1, -1] : q === 3 ? [-1, -1] : [-1, 1];
    const fromSin = r.next() < 0.5;
    const [gf, af] = fromSin ? ["sin", "cos"] : ["cos", "sin"];
    const given = fromSin ? fr(ss * a, h) : fr(cs * b, h);
    const v = fromSin ? fr(cs * b, h) : fr(ss * a, h);
    return fracPart(fill(W.quadrant, { f: gf, r: plainFrac(given).replace("-", "−"), q: ["", "I", "II", "III", "IV"][q], g: af }), v,
      [{ id: "quadrantSignLost", v: fr(-v.n, v.d), vars: { q: ["", "I", "II", "III", "IV"][q], g: af } }, { id: "identityNotSquared", v: fr(Math.sign(v.n) * (h - (fromSin ? a : b)), h), vars: { f: gf, g: af } }],
      [`\\${af}^2\\theta = 1 - \\left(${given.tex()}\\right)^2 = ${fr(v.n * v.n, h * h).tex()}`, `\\${af}\\theta = ${v.tex()}`]);
  }
  if (L === 1 && kind === 7) {
    // A reciprocal ratio: csc = 1/sin, sec = 1/cos, cot = 1/tan, read off the triangle.
    const [a, b, h] = r.pick(TRIPLE);
    const ratio = { sin: fr(a, h), cos: fr(b, h), tan: fr(a, b) };
    const recip = { csc: "sin", sec: "cos", cot: "tan" } as const;
    const ask = r.pick(["csc", "sec", "cot"] as const);
    const given = r.pick((["sin", "cos", "tan"] as const).filter((f) => f !== recip[ask]));
    const base = ratio[recip[ask]];
    const v = fr(base.d, base.n);
    const wrong = fr(ratio[given].d, ratio[given].n);
    return fracPart(fill(W.reciprocal, { f: given, r: plainFrac(ratio[given]), g: ask }), v, [{ id: "reciprocalMixed", v: wrong, vars: { g: ask, f: recip[ask] } }],
      [`\\${given}\\theta = ${ratio[given].tex()} \\Rightarrow \\${recip[ask]}\\theta = ${base.tex()}`, `\\${ask}\\theta = \\frac{1}{\\${recip[ask]}\\theta} = ${v.tex()}`]);
  }
  if (L === 1) {
    // Reflections and turns of θ on the unit circle.
    const [a, b, h] = r.pick(TRIPLE);
    const form = r.pick([["sin", "180° − θ", 1, "sin"], ["cos", "180° − θ", -1, "cos"], ["sin", "180° + θ", -1, "sin"], ["cos", "180° + θ", -1, "cos"], ["sin", "−θ", -1, "sin"], ["cos", "−θ", 1, "cos"], ["sin", "90° − θ", 1, "cos"], ["cos", "90° − θ", 1, "sin"]] as const);
    const [f, arg, sign, of] = form;
    const val = { sin: fr(a, h), cos: fr(b, h) };
    const v = fr(sign * val[of].n, val[of].d);
    const traps: { id: Trap["id"]; v: Frac; vars?: Record<string, string | number> }[] = [{ id: "reflectionSignLost", v: fr(-v.n, v.d), vars: { f, a: arg } }];
    const other = of === "sin" ? "cos" : "sin";
    traps.push({ id: "cofunctionMixed", v: fr(sign * val[other].n, val[other].d), vars: { f, a: arg, g: of } });
    return fracPart(fill(W.reflect, { s: plainFrac(val.sin), c: plainFrac(val.cos), f, a: arg }), v, traps,
      [`\\${f}(${arg.replace("−", "-").replace("°", "^\\circ").replace("θ", "\\theta ")}) = ${sign < 0 ? "-" : ""}\\${of}\\theta = ${v.tex()}`]);
  }
  if (L === 2) {
    // sin(A ± B) = sin A cos B ± cos A sin B; cos(A ± B) = cos A cos B ∓ sin A sin B.
    let [p, q] = [r.pick(TRIPLE), r.pick(TRIPLE)];
    while (p[2] === q[2]) q = r.pick(TRIPLE);
    const [sA, cA, sB, cB] = [fr(p[0], p[2]), fr(p[1], p[2]), fr(q[0], q[2]), fr(q[1], q[2])];
    const f = r.pick(["sin", "cos"] as const);
    const plus = r.next() < 0.5;
    const mul = (x: Frac, y: Frac) => fr(x.n * y.n, x.d * y.d);
    const add = (x: Frac, y: Frac, sg: number) => fr(x.n * y.d + sg * y.n * x.d, x.d * y.d);
    const sg = plus ? 1 : -1;
    const v = f === "sin" ? add(mul(sA, cB), mul(cA, sB), sg) : add(mul(cA, cB), mul(sA, sB), -sg);
    const swapped = f === "sin" ? add(mul(sA, cB), mul(cA, sB), -sg) : add(mul(cA, cB), mul(sA, sB), sg);
    const inside = f === "sin" ? add(sA, sB, sg) : add(cA, cB, sg);
    const op = plus ? "+" : "−";
    const rule = f === "sin" ? `\\sin A\\cos B ${plus ? "+" : "-"} \\cos A\\sin B` : `\\cos A\\cos B ${plus ? "-" : "+"} \\sin A\\sin B`;
    const given = r.next() < 0.5 ? { a: `sin A = ${plainFrac(sA)}`, b: `cos B = ${plainFrac(cB)}` } : { a: `cos A = ${plainFrac(cA)}`, b: `sin B = ${plainFrac(sB)}` };
    return fracPart(fill(W.addition, { a: given.a, b: given.b, f, op }), v, [{ id: "additionDistributed", v: inside, vars: { f, op } }, { id: "additionSignSwapped", v: swapped, vars: { f, op } }],
      [`\\sin A = ${sA.tex()},\\; \\cos A = ${cA.tex()},\\; \\sin B = ${sB.tex()},\\; \\cos B = ${cB.tex()}`, `\\${f}(A ${plus ? "+" : "-"} B) = ${rule} = ${v.tex()}`]);
  }
  if (kind <= 7) {
    // A new setting: two waves a sin t and b cos t add to one wave of peak √(a² + b²).
    const [a, b, h] = r.pick(TRIPLE);
    const m = r.pick([1, 2, 3]);
    return fracPart(fill(W.waves, { a: a * m, b: b * m }), fr(h * m), [{ id: "peaksAdded", v: fr((a + b) * m), vars: { a: a * m, b: b * m } }],
      [`R = \\sqrt{${a * m}^2 + ${b * m}^2} = ${h * m}`]);
  }
  // A new setting: a ski run's two slopes, tan(A + B) = (tan A + tan B) ÷ (1 − tan A tan B).
  const [p, q] = r.pick([[2, 3], [3, 7], [2, 5], [3, 4], [4, 5], [2, 7], [5, 8]] as const);
  const [tA, tB] = [fr(1, p), fr(1, q)];
  const top = fr(p + q, p * q);
  const v = fr(p + q, p * q - 1);
  return fracPart(fill(W.ski, { a: `1/${p}`, b: `1/${q}` }), v, [{ id: "tanAddDenomPlus", v: fr(p + q, p * q + 1) }, { id: "additionDistributed", v: top, vars: { f: "tan", op: "+" } }],
    [`\\tan(A + B) = \\frac{${tA.tex()} + ${tB.tex()}}{1 - ${tA.tex()} \\times ${tB.tex()}} = \\frac{${top.tex()}}{${fr(p * q - 1, p * q).tex()}} = ${v.tex()}`]);
}

const gen: Gen = (r, L, w) => {
  const extra = r.int(0, 9);
  if (extra >= 5) return more(r, L, extra, w);
  return old(r, L, w);
};

/** The kinds the skill had before #716. */
const old: Gen = (r, L, w) => {
  const sol = (topic: string, src: string) => ({ kind: "identities" as const, spec: { topic, src } });
  if (L === 1) {
    // sin, cos, tan of 15°, 75°, 105°, 165°: from the compound angle formulas.
    const f = r.pick(["sin", "cos", "tan"] as const);
    const deg = r.pick([15, 75, 105, 165]);
    const t = (deg * Math.PI) / 180;
    const v = f === "sin" ? Math.sin(t) : f === "cos" ? Math.cos(t) : Math.tan(t);
    const [s6, s2, s3] = [Math.sqrt(6), Math.sqrt(2), Math.sqrt(3)];
    const forms: [number, string, string, string, string][] = [
      [(s6 + s2) / 4, "\\frac{\\sqrt{6} + \\sqrt{2}}{4}", "(sqrt(6) + sqrt(2))/4", "-\\frac{\\sqrt{6} + \\sqrt{2}}{4}", "-(sqrt(6) + sqrt(2))/4"],
      [(s6 - s2) / 4, "\\frac{\\sqrt{6} - \\sqrt{2}}{4}", "(sqrt(6) - sqrt(2))/4", "\\frac{\\sqrt{2} - \\sqrt{6}}{4}", "(sqrt(2) - sqrt(6))/4"],
      [2 + s3, "2 + \\sqrt{3}", "2 + sqrt(3)", "-2 - \\sqrt{3}", "-2 - sqrt(3)"],
      [2 - s3, "2 - \\sqrt{3}", "2 - sqrt(3)", "\\sqrt{3} - 2", "sqrt(3) - 2"],
    ];
    const m = forms.find((x) => Math.abs(Math.abs(v) - x[0]) < 1e-9)!;
    const [show, plain] = v > 0 ? [m[1], m[2]] : [m[3], m[4]];
    return { prompt: w.prompts.trigexact, q: `\\${f} ${deg}^\\circ`, answer: num(v), show, plain, format: "exact", solution: sol("compound", `${f} ${deg}°`) };
  }
  if (L === 2) {
    // A Pythagorean triple gives sin A, cos A and tan A; the double angle formulas give the rest.
    let [a, b, h] = r.pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29]] as const) as unknown as [number, number, number];
    if (r.next() < 0.5) [a, b] = [b, a];
    const f = r.pick(["sin", "cos", "tan"] as const);
    const g = r.pick(["sin", "cos", "tan"] as const);
    const given = f === "sin" ? fr(a, h) : f === "cos" ? fr(b, h) : fr(a, b);
    const v = g === "sin" ? fr(2 * a * b, h * h) : g === "cos" ? fr(b * b - a * a, h * h) : fr(2 * a * b, b * b - a * a);
    return {
      prompt: fill(w.prompts.idDouble, { f, v: plainFrac(given) }),
      q: `\\${g} 2A`,
      answer: num(v.toNumber(), 1e-9, { lowest: true }),
      show: v.tex(),
      plain: plainFrac(v),
      format: "fraction",
      solution: sol("compound", `${f} A = ${plainFrac(given)}, A acute; ${g} 2A`),
    };
  }
  // The greatest value of a sin x + b cos x is R = √(a² + b²).
  const [a, b] = [r.nz(-6, 6), r.nz(-6, 6)];
  const { out, s } = sqrtSplit(fr(a * a + b * b));
  const R = Math.sqrt(a * a + b * b);
  const src = `${a} sin x ${b < 0 ? "-" : "+"} ${Math.abs(b)} cos x`;
  return {
    prompt: w.prompts.idMax,
    q: `${a === 1 ? "" : a === -1 ? "-" : a}\\sin x ${b < 0 ? "-" : "+"} ${Math.abs(b) === 1 ? "" : Math.abs(b)}\\cos x`,
    answer: num(R, 1e-9, { surd: true }),
    show: s === 1 ? String(out.n) : surdTex(fr(0), out, s),
    plain: s === 1 ? String(out.n) : `${out.n === 1 ? "" : out.n}sqrt(${s})`,
    format: "exact",
    solution: sol("rform", src),
  };
};

export default gen;
