// Practice: Definite integrals. Since #748 half the seeds read the integral another way: from the area under a
// drawn line, the value of a Σ sum and a net area from triangles (L1); from the integrals' algebraic properties,
// adjacent intervals and a function with a jump (L2); a Riemann sum written with Σ, and the integral a limit of sums
// is (L3).
import { antiderivative } from "../applied";
import { exact, F } from "../calculusTwo";
import { fill } from "../chart";
import { evalE, parseE } from "../expr";
import { limitPic } from "../limitGraph";
import { dp, exprPart, fr, num, numPart, polyStr, T } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";
import { pickPart } from "../tTails";

const sg = (v: number) => String(v).replace("-", "−");
const plusT = (c: number, v = "") => (c === 0 ? "" : ` ${c < 0 ? "-" : "+"} ${Math.abs(c)}${v}`);

/** The integral read from pictures, properties and sums (#748). */
function more(r: Rng, L: 1 | 2 | 3, w: PracticeWords): Part {
  const K = w.diK;
  const kind = r.int(0, 2);
  if (L === 1 && kind === 0) {
    // The area under a straight line: a trapezoid.
    const a = r.int(0, 1);
    const b = a + r.int(2, 4);
    const m = r.pick([1, -1]);
    const c = m > 0 ? r.int(1, 6 - b) : r.int(b + 1, 6 + a);
    const [fa, fb] = [m * a + c, m * b + c];
    const vars = { fa, fb, w: b - a };
    return {
      prompt: fill(K.areaQ, { a, b }), q: `\\int_{${a}}^{${b}} f(x)\\,dx`,
      ...exact(F((fa + fb) * (b - a), 2), [["trapezoidOneHeight", fa * (b - a), vars], ["trapezoidOneHeight", fb * (b - a), vars]]),
      steps: [`f(${a}) = ${fa}, \\quad f(${b}) = ${fb}`, `\\frac{${fa} + ${fb}}{2} \\cdot ${b - a} = ${F((fa + fb) * (b - a), 2).tex()}`],
      pic: limitPic({ pieces: [{ f: (x: number) => m * x + c, from: -6, to: 6 }], closed: [[a, fa], [b, fb]], label: "f" }),
    };
  }
  if (L === 1 && kind === 1) {
    // Σ from 1 to n of (p i + q).
    const [n, p, q] = [r.int(4, 10), r.int(1, 5), r.int(-3, 5)];
    const v = (p * n * (n + 1)) / 2 + q * n;
    return {
      prompt: K.sigmaQ, q: `\\sum_{i=1}^{${n}} (${p === 1 ? "" : p}i${plusT(q)})`,
      ...exact(F(v), [["sigmaLastTermOnly", p * n + q], ["sigmaFromZero", v + q, { q: sg(q) }], ["sigmaConstantOnce", (p * n * (n + 1)) / 2 + q, { q: sg(q), n }]]),
      steps: [`${p === 1 ? "" : `${p} \\cdot `}(1 + 2 + \\dots + ${n}) = ${p === 1 ? "" : `${p} \\cdot `}\\frac{${n} \\cdot ${n + 1}}{2} = ${(p * n * (n + 1)) / 2}`, ...(q ? [`${n} \\cdot ${q < 0 ? `(${q})` : q} = ${n * q}`] : []), `= ${v}`],
    };
  }
  if (L === 1) {
    // A net area from the triangles above and below the axis: f(x) = s(x − c) on [0, c + d].
    const c = r.int(1, 3);
    const d = r.int(1, 6 - c);
    const s0 = r.pick([1, -1]);
    const net = F(s0 * (d * d - c * c), 2);
    return {
      prompt: fill(K.netQ, { b: c + d }), q: `\\int_{0}^{${c + d}} f(x)\\,dx`,
      ...exact(net, [["areaBelowAdded", F(c * c + d * d, 2)]]),
      steps: [`\\text{${s0 > 0 ? "−" : "+"}} \\tfrac{1}{2} \\cdot ${c} \\cdot ${c} = ${F(-s0 * c * c, 2).tex()}`, `\\text{${s0 > 0 ? "+" : "−"}} \\tfrac{1}{2} \\cdot ${d} \\cdot ${d} = ${F(s0 * d * d, 2).tex()}`, `= ${net.tex()}`],
      pic: limitPic({ pieces: [{ f: (x: number) => s0 * (x - c), from: -6, to: 6 }], closed: [[0, -s0 * c], [c, 0], [c + d, s0 * d]], label: "f" }),
    };
  }
  if (L === 2 && kind === 0) {
    // The integral's algebraic properties.
    const a = r.int(-2, 2);
    const b = a + r.int(2, 5);
    const [P, Q] = [r.nz(-9, 9), r.nz(-9, 9)];
    if (r.next() < 0.5) {
      const [k, m] = [r.int(2, 5), r.nz(-3, 3)];
      const g = m === 1 ? "+ g(x)" : m === -1 ? "- g(x)" : `${m < 0 ? "-" : "+"} ${Math.abs(m)}g(x)`;
      return {
        prompt: fill(K.propsQ, { a: sg(a), b: sg(b), P: sg(P), Q: sg(Q) }), q: `\\int_{${a}}^{${b}} \\left(${k}f(x) ${g}\\right)dx`,
        ...exact(F(k * P + m * Q), [["coefficientsDropped", P + Q, { k, m: sg(m) }]]),
        steps: [`${k}\\int f\\,dx ${m < 0 ? "-" : "+"} ${Math.abs(m) === 1 ? "" : Math.abs(m)}\\int g\\,dx`, `= ${k} \\cdot ${P < 0 ? `(${P})` : P} ${m < 0 ? "-" : "+"} ${Math.abs(m) === 1 ? "" : `${Math.abs(m)} \\cdot `}${Q < 0 ? `(${Q})` : Q} = ${k * P + m * Q}`],
      };
    }
    const k = r.int(2, 5);
    return {
      prompt: fill(K.propsRevQ, { a: sg(a), b: sg(b), P: sg(P) }), q: `\\int_{${b}}^{${a}} ${k}f(x)\\,dx`,
      ...exact(F(-k * P), [["reversedLimitsSign", k * P]]),
      steps: [`\\int_{${b}}^{${a}} = -\\int_{${a}}^{${b}}`, `-${k} \\cdot ${P < 0 ? `(${P})` : P} = ${-k * P}`],
    };
  }
  if (L === 2 && kind === 1) {
    // Adjacent intervals: ∫ from a to c minus ∫ from a to b.
    const a = r.int(-2, 1);
    const b = a + r.int(1, 3);
    const c = b + r.int(1, 3);
    const P = r.nz(-9, 12);
    let Q = r.nz(-9, 12);
    while (Q === P) Q = r.nz(-9, 12);
    const v = P - Q;
    return {
      prompt: fill(K.adjQ, { a: sg(a), b: sg(b), c: sg(c), P: sg(P), Q: sg(Q) }), q: `\\int_{${b}}^{${c}} f(x)\\,dx`,
      ...exact(F(v), [["adjacentAdded", P + Q], ["adjacentOrderSwapped", Q - P]]),
      steps: [`\\int_{${a}}^{${c}} = \\int_{${a}}^{${b}} + \\int_{${b}}^{${c}}`, `${P} = ${Q} + \\int_{${b}}^{${c}} f\\,dx`, `\\int_{${b}}^{${c}} f\\,dx = ${P} - ${Q < 0 ? `(${Q})` : Q} = ${v}`],
    };
  }
  if (L === 2) {
    // A function with a jump: c before k, m x from k on.
    const k = r.int(1, 3);
    const n = k + r.int(1, 3);
    const m = r.int(1, 3);
    let c = r.int(1, 6);
    while (c === m * k) c = r.int(1, 6);
    const v = F(2 * c * k + m * (n * n - k * k), 2);
    return {
      prompt: fill(K.pieceQ, { k, n }), q: `f(x) = \\begin{cases} ${c} & x < ${k} \\\\ ${m === 1 ? "" : m}x & x \\ge ${k} \\end{cases}`,
      ...exact(v, [["onePieceThroughout", F(m * n * n, 2), { k }], ["onePieceThroughout", c * n, { k }]]),
      steps: [`\\int_{0}^{${k}} ${c}\\,dx = ${c * k}`, `\\int_{${k}}^{${n}} ${m === 1 ? "" : m}x\\,dx = ${F(m * (n * n - k * k), 2).tex()}`, `${c * k} + ${F(m * (n * n - k * k), 2).tex()} = ${v.tex()}`],
    };
  }
  // A Riemann sum in Σ, or the integral a limit of sums is.
  const a = r.int(1, 3);
  const wd = r.int(1, 4);
  const fn = r.pick(["sq", "cube", "root"] as const);
  const fx = (s: string) => (fn === "sq" ? `(${s})²` : fn === "cube" ? `(${s})³` : `√(${s})`);
  const fTex = { sq: "x^{2}", cube: "x^{3}", root: "\\sqrt{x}" }[fn];
  const fText = { sq: "x²", cube: "x³", root: "√x" }[fn];
  const step = (k: number) => (k === 1 ? "i/n" : `${k}i/n`);
  const inner = `${a} + ${step(wd)}`;
  const dx = `${wd}/n`;
  if (kind < 2) {
    const opts = [`Σ ${fx(inner)} · ${dx}`, `Σ ${fx(inner)}`, `Σ ${fx(step(wd))} · ${dx}`, ...(wd > 1 ? [`Σ ${fx(`${a} + i/n`)} · ${dx}`] : [])];
    return { ...pickPart(r, opts, 0, [{ id: "riemannWidthLeftOut", at: 1 }, { id: "riemannStartLeftOut", at: 2, vars: { a } }, ...(wd > 1 ? [{ id: "riemannStepNotScaled" as const, at: 3, vars: { w: wd } }] : [])],
      K.riemannQ, [`\\Delta x = \\frac{${a + wd} - ${a}}{n} = \\frac{${wd}}{n}`, `x_i = ${a} + \\frac{${wd === 1 ? "" : wd}i}{n}`, `\\sum_{i=1}^{n} f(x_i)\\,\\Delta x`]), q: `\\int_{${a}}^{${a + wd}} ${fTex}\\,dx` };
  }
  const integral = (lo: number, hi: number) => `∫ ${lo} → ${hi} ${fText} dx`;
  const opts = [integral(a, a + wd), integral(0, wd), integral(a, wd), integral(0, a + wd)].filter((o, i, all) => all.indexOf(o) === i);
  const at = (o: string) => opts.indexOf(o);
  const inTex = `${a} + \\frac{${wd === 1 ? "" : wd}i}{n}`;
  const fIn = fn === "sq" ? `\\left(${inTex}\\right)^{2}` : fn === "cube" ? `\\left(${inTex}\\right)^{3}` : `\\sqrt{${inTex}}`;
  return { ...pickPart(r, opts, 0, [{ id: "riemannStartLeftOut", at: at(integral(0, wd)), vars: { a } }, ...(at(integral(a, wd)) > 0 ? [{ id: "riemannEndAsWidth" as const, at: at(integral(a, wd)), vars: { a, b: a + wd } }] : [])],
    K.limitQ, [`\\Delta x = \\frac{${wd}}{n}: \\quad b - a = ${wd}`, `x_i = ${a} + i\\,\\Delta x: \\quad a = ${a}, \\ b = ${a + wd}`]), q: `\\lim_{n \\to \\infty} \\sum_{i=1}^{n} ${fIn} \\cdot \\frac{${wd}}{n}` };
}

const gen: Gen = (r, L, w) => {
  if (r.int(0, 9) >= 5) return more(r, L, w);
  let src: string;
  let a: string;
  let b: string;
  let v: number;
  let show: string;
  if (L === 1) {
    const cs = [r.int(0, 6), r.int(0, 6), r.int(1, 4)];
    const [lo, hi] = [r.int(0, 2), r.int(3, 4)];
    src = polyStr(cs);
    [a, b] = [String(lo), String(hi)];
    const I = cs.reduce((acc, c, k) => acc.add(fr(c * (hi ** (k + 1) - lo ** (k + 1)), k + 1)), fr(0));
    v = I.toNumber();
    show = I.tex();
  } else if (L === 2) {
    const pick = r.int(0, 2);
    if (pick === 0) {
      const k = r.int(2, 5);
      [src, a, b] = [`1/x^2`, "1", String(k)];
      const I = fr(k - 1, k);
      [v, show] = [I.toNumber(), I.tex()];
    } else if (pick === 1) {
      const k = r.pick([4, 9, 16]);
      [src, a, b] = [`sqrt(x)`, "0", String(k)];
      const I = fr(2 * Math.sqrt(k) ** 3, 3);
      [v, show] = [I.toNumber(), I.tex()];
    } else {
      const [p, q] = [r.int(1, 3), r.int(4, 6)];
      const c = r.int(1, 6);
      src = `x^3 + ${c}`;
      [a, b] = [String(p), String(q)];
      const I = fr(q ** 4 - p ** 4, 4).add(fr(c * (q - p)));
      [v, show] = [I.toNumber(), I.tex()];
    }
  } else {
    const pick = r.int(0, 3);
    const k = r.int(2, 4);
    if (pick === 0) [src, a, b, v, show] = [`e^x`, "0", String(k), Math.exp(k) - 1, `e^{${k}} - 1`];
    else if (pick === 1) [src, a, b, v, show] = [`1/x`, "1", String(k), Math.log(k), `\\ln ${k}`];
    else if (pick === 2) [src, a, b, v, show] = [`sin x`, "0", "pi", 2, "2"];
    else [src, a, b, v, show] = [`cos x`, "0", "pi/2", 1, "1"];
  }
  const lim = (s: string) => (s === "pi" ? "\\pi" : s === "pi/2" ? "\\frac{\\pi}{2}" : s);
  // F(x), then F at each limit: their difference is the question.
  const Fe = antiderivative(parseE(src))!;
  const at = (s: string) => evalE(Fe, evalE(parseE(s), NaN));
  const worked = [
    exprPart(w.prompts.stepInt, `F(x) = \\int ${T(src)} \\, dx`, Fe),
    numPart(w.prompts.stepWork, `F\\left(${lim(b)}\\right)`, at(b)),
    numPart(w.prompts.stepWork, `F\\left(${lim(a)}\\right)`, at(a)),
  ];
  return {
    prompt: w.prompts.definite,
    q: `\\int_{${lim(a)}}^{${lim(b)}} ${T(src)} \\, dx`,
    answer: num(v, 0.0006),
    show: Number.isInteger(v) || /frac|^\d+$/.test(show) ? show : `${show} \\approx ${dp(v, 3)}`,
    plain: dp(v, 6),
    format: "dp3",
    solution: { kind: "applied", spec: { topic: "area", f: src, g: "", a, b, c: "", opt: "" } },
    worked,
  };
};

export default gen;
