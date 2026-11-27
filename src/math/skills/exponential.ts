// Practice: exponential growth and decay (#657). Easy: the growth factor from a table, linear or exponential, and the
// value after n steps. Medium: b of a·bˣ from two points, a population or a value after years at r % up or down, and
// what is left after some half-lives. Hard: the time to reach a value, by logs; the monthly rate that matches a yearly
// one; and, in a new setting, money growing continuously, with e. The difference taken for the factor, linear and
// exponential swapped, the factor times the steps, the ratio not rooted, simple growth for compound, decay taken as
// growth, the hours used as half-lives, the half-lives divided, the yearly rate divided by 12 and yearly compounding
// for continuous are slips.
// #730 added, four times in ten, models read and written: easy, the start and the yearly rate read from a·bᵗ;
// medium, the time to halve from (1/2)^(t/h), the yearly factor of a·b^(kt), the decay function written, and when
// exponential growth first passes linear; hard, an exponential equation solved with ln, log or log₂. The factor taken
// for the start, the factor as the rate, the time scale inverted, k ignored, the log taken before dividing and the
// power divided out are slips.
import { fill } from "../chart";
import { dp, num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { sgn, tableSvg } from "../readFunction";
import { pickPart } from "../tTails";

const place = (body: string) => (x: number, y: number) => `<g transform="translate(${x} ${y})">${body}</g>`;
const picOf = (p: { body: string; w: number; h: number }) => ({ svg: place(p.body), h: p.h, w: p.w });
/** A slip is offered only when it lies clear of the answer's close window. */
const far = (v: number, s: number, tol: number) => Number.isFinite(s) && Math.abs(s - v) > 25 * tol + 1e-9;

const gen: Gen = (r, L, w) => {
  if (r.int(0, 9) >= 6) return more(r, L, w);
  const W = w.exg;
  const numQ = (prompt: string, v: number, tol: number, show: string, traps: Trap[], steps: string[], pic?: Part["pic"]): Part => ({
    prompt, q: "", ...(pic ? { pic } : {}), answer: { ...num(v, tol), traps: traps.filter((t) => t.a.k === "num" && far(v, t.a.v, tol)) }, show, plain: show, format: "number", steps,
  });
  const slip = (id: Trap["id"], v: number, tol: number, vars?: Record<string, string | number>): Trap => ({ id, a: num(v, tol), vars });

  if (L === 1) {
    const t = r.pick(["factor", "kind", "after"] as const);
    if (t === "factor") {
      const a = r.pick([2, 3, 4, 5, 8]);
      const b = r.pick([2, 3, 1.5, 0.5]);
      const xs = [0, 1, 2, 3];
      const ys = xs.map((x) => a * b ** x);
      if (ys.some((y) => !Number.isInteger(y * 10))) return gen(r, L, w);
      return numQ(W.factorQ, b, 1e-9, sgn(b), [slip("factorAsDifference", ys[1] - ys[0], 1e-9, { a: sgn(ys[1]), b: sgn(ys[0]), f: sgn(b) })],
        [`\\frac{${sgn(ys[1])}}{${sgn(ys[0])}} = \\frac{${sgn(ys[2])}}{${sgn(ys[1])}} = ${sgn(b)}`], picOf(tableSvg(xs, ys)));
    }
    if (t === "kind") {
      const exp = r.next() < 0.5;
      const xs = [0, 1, 2, 3, 4];
      const a = r.int(2, 6);
      const d = r.pick([3, 5, 7]);
      const ys = xs.map((x) => (exp ? a * 2 ** x : a + d * x));
      return { ...pickPart(r, [W.linear, W.exponential], exp ? 1 : 0, [{ id: "growthKindSwapped", at: exp ? 0 : 1 }], W.kindQ, [`\\text{${exp ? W.sameRatio : W.sameDiff}}`]), pic: picOf(tableSvg(xs, ys)) };
    }
    const [setting, b] = r.pick([[W.bacteria, 2], [W.rumour, 3]] as const);
    const a = r.pick([5, 10, 20, 50]);
    const n = r.int(3, 6);
    const v = a * b ** n;
    return numQ(fill(setting, { a, n }), v, 1e-9, String(v), [slip("factorTimesSteps", a * b * n, 1e-9, { a, b, n })], [`${a} \\times ${b}^{${n}} = ${v}`]);
  }

  if (L === 2) {
    const t = r.pick(["points", "years", "half"] as const);
    if (t === "points") {
      const b = r.pick([2, 3, 4, 5]);
      const a = r.int(1, 5);
      const [x1, x2] = r.pick([[1, 3], [0, 2], [2, 4]] as const);
      const [y1, y2] = [a * b ** x1, a * b ** x2];
      return numQ(fill(W.pointsQ, { p: `(${x1}, ${y1})`, q: `(${x2}, ${y2})` }), b, 1e-9, String(b), [slip("ratioNotRooted", y2 / y1, 1e-9, { r: y2 / y1, b })],
        [`b^{${x2 - x1}} = \\frac{${y2}}{${y1}} = ${y2 / y1}`, `b = \\sqrt{${y2 / y1}} = ${b}`]);
    }
    if (t === "years") {
      const up = r.next() < 0.5;
      const p = up ? r.pick([2, 3, 4, 5]) : r.pick([10, 15, 20, 25]);
      const n = r.int(3, 8);
      const P = up ? r.pick([12000, 20000, 25000, 40000]) : r.pick([8000, 12000, 15000, 20000]);
      const f = up ? 1 + p / 100 : 1 - p / 100;
      const v = Math.round(P * f ** n);
      const traps = [slip("simpleNotCompound", Math.round(P * (1 + (up ? 1 : -1) * (p / 100) * n)), 0.51, { p, n })];
      if (!up) traps.push(slip("decayAsGrowth", Math.round(P * (1 + p / 100) ** n), 0.51, { p, f: dp(f, 2) }));
      return numQ(fill(up ? W.townQ : W.carQ, { P, p, n }), v, 0.51, String(v), traps, [`${P} \\times ${dp(f, 2)}^{${n}} = ${v}`]);
    }
    const h = r.pick([2, 3, 4, 5, 6]);
    const k = r.int(2, 4);
    const m = r.pick([40, 80, 160, 200]);
    const v = m / 2 ** k;
    // Hours used as half-lives give a tiny number, offered only while it is one someone might write.
    const hours = m * 0.5 ** (h * k);
    return numQ(fill(W.halfQ, { m, h, t: h * k }), v, 1e-9, sgn(v), [
      ...(hours >= 0.1 ? [slip("halfLifeHours", hours, 0.005, { k, t: h * k, h })] : []),
      slip("halvesDivided", m / k, 0.005, { m, k }),
    ], [`${h * k} \\div ${h} = ${k}`, `${m} \\times \\left(\\tfrac12\\right)^{${k}} = ${sgn(v)}`]);
  }

  const t = r.pick(["logs", "monthly", "continuous"] as const);
  if (t === "logs") {
    for (;;) {
      const P = r.pick([200, 500, 1000, 2000]);
      const p = r.pick([3, 4, 5, 6, 8]);
      const k = r.pick([1.5, 2, 2.5, 3]);
      const T = P * k;
      const v = Math.log(k) / Math.log(1 + p / 100);
      const simple = (k - 1) / (p / 100);
      if (!far(v, simple, 0.0051)) continue;
      return numQ(fill(W.logsQ, { P, p, T }), Number(dp(v, 2)), 0.0051, dp(v, 2), [slip("simpleNotCompound", simple, 0.0051, { p, n: dp(simple, 2) })],
        [`${dp(1 + p / 100, 2)}^t = \\frac{${T}}{${P}} = ${k}`, `t = \\frac{\\ln ${k}}{\\ln ${dp(1 + p / 100, 2)}} = ${dp(v, 2)}`]);
    }
  }
  if (t === "monthly") {
    const y = r.pick([24, 30, 36, 42, 50, 60]);
    const v = ((1 + y / 100) ** (1 / 12) - 1) * 100;
    return numQ(fill(W.monthlyQ, { y }), Number(dp(v, 2)), 0.0051, dp(v, 2), [slip("monthlyByDivide", y / 12, 0.0051, { y, m: dp(y / 12, 2) })],
      [`(1 + m)^{12} = ${dp(1 + y / 100, 2)}`, `m = ${dp(1 + y / 100, 2)}^{1/12} - 1 = ${dp(v / 100, 4)}`]);
  }
  // A new setting: continuous growth of money, with e.
  const P = r.pick([500, 1000, 2000, 5000]);
  const p = r.pick([3, 4, 5, 6, 8]);
  const n = r.int(5, 15);
  const v = Number(dp(P * Math.exp((p / 100) * n), 2));
  return numQ(fill(W.contQ, { P, p, n }), v, 0.0051, dp(v, 2), [slip("yearlyForContinuous", Number(dp(P * (1 + p / 100) ** n, 2)), 0.0051, { p })],
    [`${P}\\,e^{${p / 100} \\times ${n}} = ${dp(v, 2)}`]);
};

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const sup = (k: number) => String(k).replace(/\d/g, (d) => SUP[Number(d)]);

function numPart(prompt: string, q: string, v: number, tol: number, show: string, traps: Trap[], steps: string[]): Part {
  return { prompt, q, answer: { ...num(v, tol), traps: traps.filter((t) => t.a.k === "num" && far(v, t.a.v, tol)) }, show, plain: show, format: "number", steps };
}

function more(r: Rng, L: number, w: PracticeWords): Part {
  const W = w.exgM;
  const slip = (id: Trap["id"], v: number, tol: number, vars?: Record<string, string | number>): Trap => ({ id, a: num(v, tol), vars });
  if (L === 1) {
    // The start and the yearly rate, read from a town's P(t) = a · bᵗ or a car's V(t) = a · bᵗ.
    const up = r.next() < 0.5;
    const p = up ? r.pick([2, 3, 4, 5, 6]) : r.pick([10, 12, 15, 20, 25]);
    const a = up ? r.pick([2400, 3000, 5000, 8000, 12000]) : r.pick([9000, 15000, 18000, 24000]);
    const b = Number(dp(up ? 1 + p / 100 : 1 - p / 100, 2));
    const f = `${up ? "P" : "V"}(t) = ${a} · ${b}ᵗ`;
    if (r.next() < 0.5)
      return numPart(fill(up ? W.townStartQ : W.carStartQ, { f }), "", a, 1e-9, String(a), [slip("factorForStart", b, 1e-9, { a, b })], [`${up ? "P" : "V"}(0) = ${a} \\cdot ${b}^{0} = ${a}`]);
    return numPart(fill(up ? W.townRateQ : W.carRateQ, { f }), "", p, 1e-9, String(p), [slip("factorAsPercent", Number(dp(100 * b, 2)), 1e-9, { b, p, f: dp(100 * b, 2) })],
      [`${b} = 1 ${up ? "+" : "-"} ${dp(p / 100, 2)}`, `${p}\\,\\%`]);
  }
  if (L === 2) {
    const t = r.pick(["halve", "power", "write", "versus"] as const);
    if (t === "halve") {
      const [a, h] = [r.pick([200, 400, 500, 800]), r.pick([3, 4, 5, 6, 8])];
      return numPart(fill(W.halveQ, { f: `M(t) = ${a} · (1/2)^(t/${h})` }), "", h, 1e-9, String(h), [slip("timeScaleInverted", Number(dp(1 / h, 2)), 0.005, { h })],
        [`t = ${h}: \\; ${a} \\cdot \\left(\\tfrac12\\right)^{1} = ${a / 2}`]);
    }
    if (t === "power") {
      const [a, b, k] = [r.pick([50, 100, 200]), r.pick([2, 3]), r.pick([2, 3, 4])];
      const v = b ** k;
      return numPart(fill(W.powerQ, { f: `P(t) = ${a} · ${b}${sup(k)}ᵗ` }), "", v, 1e-9, String(v), [slip("exponentScaleIgnored", b, 1e-9, { b, k, v })],
        [`${b}^{${k}t} = \\left(${b}^{${k}}\\right)^{t} = ${v}^{t}`]);
    }
    if (t === "write") {
      const [P, p] = [r.pick([12000, 18000, 20000, 25000]), r.pick([10, 12, 15, 20])];
      const f = dp(1 - p / 100, 2);
      const opts = [`V(t) = ${P} · ${f}ᵗ`, `V(t) = ${P} · ${dp(1 + p / 100, 2)}ᵗ`, `V(t) = ${P} · ${dp(p / 100, 2)}ᵗ`, `V(t) = ${P} − ${p}t`];
      return pickPart(r, opts, 0, [{ id: "decayAsGrowth", at: 1, vars: { p, f } }], fill(W.writeQ, { P, p }), [`1 - ${dp(p / 100, 2)} = ${f}`]);
    }
    // When exponential growth first passes linear growth from the same start.
    for (;;) {
      const [P, D, p] = [r.pick([1000, 2000, 5000]), r.pick([10, 15, 20]), r.pick([5, 8, 10])];
      const d = (P * D) / 100;
      let n = 1;
      while (P * (1 + p / 100) ** n <= P + d * n) n++;
      if (n > 30) continue;
      return numPart(fill(W.versusQ, { P, d, p }), "", n, 1e-9, String(n), [],
        [`${n - 1}: \\; ${dp(P * (1 + p / 100) ** (n - 1), 0)} \\le ${P + d * (n - 1)}`, `${n}: \\; ${dp(P * (1 + p / 100) ** n, 0)} > ${P + d * n}`]);
    }
  }
  // Solved with logs: c·eˣ = d by ln, or bˣ = d by log.
  if (r.next() < 0.5) {
    const [c, m] = [r.pick([2, 3, 4, 5]), r.pick([6, 7, 9, 12, 15])];
    const d = c * m;
    const v = Number(dp(Math.log(m), 2));
    return numPart(W.solveQ, `${c}e^{x} = ${d}`, v, 0.0051, dp(v, 2), [slip("logBeforeDivide", Number(dp(Math.log(d) / c, 2)), 0.0051, { c, d, v: dp(v, 2) })],
      [`e^{x} = \\frac{${d}}{${c}} = ${m}`, `x = \\ln ${m} = ${dp(v, 2)}`]);
  }
  const b = r.pick([2, 10, 5]);
  const d = r.pick(b === 2 ? [20, 40, 50, 100] : b === 10 ? [37, 250, 600, 4000] : [40, 80, 300]);
  const v = Number(dp(Math.log(d) / Math.log(b), 2));
  return numPart(W.solveQ, `${b}^{x} = ${d}`, v, 0.0051, dp(v, 2), [slip("exponentAsDivide", d / b, 0.0051, { b, d, v: dp(v, 2) })],
    [b === 10 ? `x = \\log ${d} = ${dp(v, 2)}` : `x = \\log_{${b}} ${d} = \\frac{\\log ${d}}{\\log ${b}} = ${dp(v, 2)}`]);
}

export default gen;
