// Practice: continuity and limits from graphs and tables (#666). Easy: a limit from a table, a one-sided limit of two
// pieces, and whether a limit exists. Medium: a hole, a jump, an asymptote or no break; the k that joins two pieces.
// Hard: whether the intermediate value theorem promises a root, a limit squeezed to 0, and, in a new setting, a car
// park's charge as the time comes down to a whole number of hours. f(a) taken for the limit, one side for both, the
// sides swapped, a zero denominator always called an asymptote, a jump called a hole, two pieces assumed to break,
// k not divided, the slopes matched instead of the values, and the theorem's conditions misread are slips.
import { fill } from "../chart";
import { HI, limitPic, LO, type LimitGraph } from "../limitGraph";
import { num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { sgn } from "../readFunction";
import { pickPart } from "../tTails";

const m = (v: number) => String(v).replace("-", "−");
const plus = (c: number, v = "") => (c === 0 ? "" : ` ${c < 0 ? "−" : "+"} ${Math.abs(c)}${v}`);
const r4 = (v: number) => Math.round(v * 10000) / 10000;

const numQ = (prompt: string, v: number, traps: (Trap | false)[], steps: string[]): Part => ({
  prompt, q: "", answer: { ...num(v), traps: traps.filter((t): t is Trap => !!t && t.a.k === "num" && Math.abs(t.a.v - v) > 1e-6) }, show: sgn(v), plain: String(v), format: "number", steps,
});
const slip = (id: Trap["id"], v: number, vars?: Record<string, string | number>): Trap => ({ id, a: num(v), vars });
const through = (x0: number, y0: number, s: number) => (x: number) => y0 + s * (x - x0);
const minusW = (a: number) => (a === 0 ? "x" : `x ${a > 0 ? "−" : "+"} ${Math.abs(a)}`);
const sup = { "-": "⁻", "+": "⁺", "": "" } as const;

/** Limits and continuity read from a drawn graph, and where common functions are continuous (#744), on half the seeds. */
function more(r: Rng, L: 1 | 2 | 3, w: PracticeWords): Part {
  const K = w.lgK;
  const withPic = (p: Part, g: LimitGraph): Part => ({ ...p, pic: limitPic(g) });
  const two = (lo: number, hi: number) => {
    const a = r.int(lo, hi);
    let b = r.int(lo, hi);
    while (b === a) b = r.int(lo, hi);
    return [a, b];
  };
  const slope = () => r.pick([-1, -0.5, 0.5, 1]);
  if (L === 1) {
    const t = r.pick(["hole", "side", "meaning"] as const);
    const a = r.int(-3, 3);
    if (t === "hole") {
      const [l, v] = two(-4, 4);
      const c = r.pick([-0.5, 0.5]);
      const f = r.next() < 0.5 ? through(a, l, slope()) : (x: number) => l + c * (x - a) ** 2;
      return withPic(numQ(fill(K.graphQ, { a: minus(a), s: "" }), l, [slip("limitAsValue", v, { v: minus(v), a: minus(a) })], [`x \\to ${a}: \\quad f(x) \\to ${l}`, `f(${a}) = ${v} \\ne ${l}`]),
        { pieces: [{ f, from: LO, to: HI }], open: [[a, l]], closed: [[a, v]] });
    }
    if (t === "side") {
      const [p, q] = two(-4, 4);
      const side = r.pick(["-", "+"] as const);
      const [v, o] = side === "-" ? [p, q] : [q, p];
      return withPic(numQ(fill(K.graphQ, { a: minus(a), s: sup[side] }), v, [slip("sidesSwapped", o, { a: minus(a) })], [`x \\to ${a}^{${side}}: \\quad f(x) \\to ${v}`]),
        { pieces: [{ f: through(a, p, slope()), from: LO, to: a }, { f: through(a, q, slope()), from: a, to: HI }], open: [[a, p]], closed: [[a, q]] });
    }
    const l = r.int(-5, 5);
    const vars = { a: minus(a), l: minus(l) };
    return pickPart(r, [fill(K.mNear, vars), fill(K.mValue, vars), fill(K.mDefined, vars)], 0, [{ id: "limitNeedsValue", at: 1, vars }, { id: "limitNeedsValue", at: 2, vars }], fill(K.meanQ, vars),
      [`x \\to ${a}, \\ x \\ne ${a}: \\quad f(x) \\to ${l}`]);
  }
  if (L === 2) {
    const t = r.pick(["point", "interval", "common"] as const);
    if (t === "point") {
      const a = r.int(-2, 2);
      const [l, q] = two(-3, 3);
      const kind = r.pick(["corner", "jump", "moved", "missing"] as const);
      const opts = [K.cYes, K.cNoLim, K.cNoMatch, K.cNoValue].map((o) => fill(o, { a: minus(a) }));
      const prompt = fill(K.pointQ, { a: minus(a) });
      const broke = [{ id: "breakMissed" as const, at: 0, vars: { a: minus(a) } }];
      if (kind === "corner") {
        const s = r.pick([-1, 1]);
        return withPic(pickPart(r, opts, 0, [{ id: "cornerAsBreak", at: 1, vars: { a: minus(a), v: minus(l) } }], prompt, [`\\lim_{x \\to ${a}} f(x) = ${l} = f(${a})`]),
          { pieces: [{ f: (x) => l + s * Math.abs(x - a), from: LO, to: HI }], closed: [[a, l]] });
      }
      if (kind === "jump")
        return withPic(pickPart(r, opts, 1, broke, prompt, [`x \\to ${a}^{-}: \\ ${l}, \\quad x \\to ${a}^{+}: \\ ${q}`]),
          { pieces: [{ f: through(a, l, slope()), from: LO, to: a }, { f: through(a, q, slope()), from: a, to: HI }], open: [[a, l]], closed: [[a, q]] });
      const f = through(a, l, slope());
      if (kind === "moved")
        return withPic(pickPart(r, opts, 2, broke, prompt, [`\\lim_{x \\to ${a}} f(x) = ${l} \\ne ${q} = f(${a})`]), { pieces: [{ f, from: LO, to: HI }], open: [[a, l]], closed: [[a, q]] });
      return withPic(pickPart(r, opts, 3, broke, prompt, [`\\lim_{x \\to ${a}} f(x) = ${l}, \\quad f(${a}) = \\,?`]), { pieces: [{ f, from: LO, to: HI }], open: [[a, l]] });
    }
    if (t === "interval") {
      const c = r.int(-2, 2);
      const [p, q] = two(-4, 4);
      const kind = r.pick(["inside", "outside", "endClosed", "endOpen"] as const);
      const k = r.int(2, 4);
      const [lo, hi] = kind === "inside" ? [c - r.int(1, 3), c + r.int(1, 3)] : kind === "outside" ? (r.next() < 0.5 ? [c + 1, c + k] : [c - k, c - 1]) : kind === "endClosed" ? [c - k, c] : [c, c + k];
      const right = kind === "inside" || kind === "endOpen" ? 1 : 0;
      const vars = { c: minus(c), v: minus(p), q: minus(q) };
      const id = ({ inside: "breakInsideMissed", outside: "breakOutsideCounted", endClosed: "endpointBreakCounted", endOpen: "endpointValueMissed" } as const)[kind];
      return withPic(pickPart(r, [K.iYes, K.iNo], right, [{ id, at: 1 - right, vars }], fill(K.intervalQ, { lo: minus(lo), hi: minus(hi) }),
        [`x = ${c}: \\quad f(${c}) = ${p}, \\quad x \\to ${c}^{+}: \\ f(x) \\to ${q}`]),
        { pieces: [{ f: through(c, p, slope()), from: LO, to: c }, { f: through(c, q, slope()), from: c, to: HI }], closed: [[c, p]], open: [[c, q]] });
    }
    const a = r.int(-3, 2);
    const b = a + r.int(2, 5);
    const root = r.next() < 0.5;
    const [A, B] = [minus(a), minus(b)];
    const opts = root ? [`x ≥ ${A}, x ≠ ${B}`, `x ≠ ${B}`, `x ≥ ${A}`, `x > ${A}, x ≠ ${B}`] : [`x ≥ ${A}, x ≠ ${B}`, `x ≠ ${B}`, `x > ${A}`, `x > ${A}, x ≠ ${B}`];
    const f = `${root ? "√" : "ln"}(${minusW(a)}) ÷ (${minusW(b)})`;
    return pickPart(r, opts, root ? 0 : 3, [{ id: "endpointWrong", at: root ? 3 : 0, vars: { a: A } }, { id: "domainMissed", at: 1, vars: { a: A } }, { id: "poleMissed", at: 2, vars: { b: B } }], fill(K.commonQ, { f }),
      [`${root ? `x - ${br(a)} \\ge 0` : `x - ${br(a)} > 0`}, \\quad x - ${br(b)} \\ne 0`]);
  }
  const t = r.pick(["vertical", "horizontal", "swing"] as const);
  if (t === "vertical") {
    const a = r.int(-2, 2);
    const [k, p] = [r.pick([1, 2, 3]) * r.pick([-1, 1]), r.pick([1, 2])];
    const side = r.pick(["-", "+", ""] as const);
    const sR = Math.sign(k);
    const sL = p === 2 ? sR : -sR;
    const at = (s: number) => (s > 0 ? 0 : 1);
    const one = side === "+" ? sR : sL;
    const [right, traps] = side
      ? [at(one), [{ id: "infiniteSignMissed" as const, at: at(-one), vars: { a: minus(a) } }]]
      : sL === sR
        ? [at(sR), [{ id: "infiniteCalledNoLimit" as const, at: 2, vars: { a: minus(a), v: sR > 0 ? "∞" : "−∞" } }]]
        : [2, [{ id: "oneSideTaken" as const, at: 0, vars: { o: "−∞" } }, { id: "oneSideTaken" as const, at: 1, vars: { o: "∞" } }]];
    const inf = (s: number) => (s > 0 ? "+\\infty" : "-\\infty");
    const f = (x: number) => k / (x - a) ** p;
    return withPic(pickPart(r, ["∞", "−∞", w.qct.noLimit], right, traps, fill(K.graphQ, { a: minus(a), s: sup[side] }), [`x \\to ${a}^{-}: \\ ${inf(sL)}, \\quad x \\to ${a}^{+}: \\ ${inf(sR)}`]),
      { pieces: [{ f, from: LO, to: a - 0.01 }, { f, from: a + 0.01, to: HI }], vert: [a] });
  }
  if (t === "horizontal") {
    const [up, down] = two(-4, 4);
    const bump = r.pick([-1.5, 1.5]);
    const f = (x: number) => (up + down) / 2 + ((up - down) / 2) * Math.tanh(x / 1.5) + bump * Math.exp(-((x - 1) ** 2) / 2);
    const plusSide = r.next() < 0.5;
    const [v, o] = plusSide ? [up, down] : [down, up];
    return withPic(numQ(fill(K.graphQ, { a: plusSide ? "∞" : "−∞", s: "" }), v, [slip("asymptoteSideSwapped", o, { o: minus(o) })], [`x \\to ${plusSide ? "" : "-"}\\infty: \\quad f(x) \\to ${v}`]),
      { pieces: [{ f, from: LO, to: HI }], horiz: [up, down] });
  }
  const sin = r.next() < 0.5;
  const v = sin ? 0 : 1;
  return pickPart(r, [String(v), w.qct.noLimit, String(1 - v)], 1, [{ id: "tableSamplesMisled", at: 0, vars: { v } }], fill(K.oscQ, { f: sin ? "sin(π ÷ x)" : "cos(2π ÷ x)", v }),
    sin ? [`x = \\tfrac{1}{n}: \\ \\sin \\tfrac{\\pi}{x} = 0, \\quad x = \\tfrac{2}{4n + 1}: \\ \\sin \\tfrac{\\pi}{x} = 1`] : [`x = \\tfrac{1}{n}: \\ \\cos \\tfrac{2\\pi}{x} = 1, \\quad x = \\tfrac{2}{2n + 1}: \\ \\cos \\tfrac{2\\pi}{x} = -1`]);
}
const br = (v: number) => (v < 0 ? `(${v})` : String(v));
const minus = (v: number) => String(v).replace("-", "−");

const gen: Gen = (r, L, w) => {
  if (r.int(0, 9) >= 5) return more(r, L, w);
  const W = w.qct;
  const numQ = (prompt: string, v: number, traps: (Trap | false)[], steps: string[]): Part => ({
    prompt, q: "", answer: { ...num(v), traps: traps.filter((t): t is Trap => !!t && t.a.k === "num" && Math.abs(t.a.v - v) > 1e-6) }, show: sgn(v), plain: String(v), format: "number", steps,
  });
  const slip = (id: Trap["id"], v: number, vars?: Record<string, string | number>): Trap => ({ id, a: num(v), vars });

  if (L === 1) {
    const t = r.pick(["table", "left", "exists"] as const);
    const a = r.int(-4, 5);
    if (t === "table") {
      // (x² − a²) ÷ (x − a) = x + a away from a, with f(a) set to something else.
      const v = 2 * a + r.pick([-3, -2, -1, 1, 2, 3]);
      const xs = [a - 0.1, a - 0.01, a + 0.01, a + 0.1].map(r4);
      const vars: Record<string, string | number> = { a: m(a), v: m(v) };
      xs.forEach((x, i) => Object.assign(vars, { [`x${i + 1}`]: m(x), [`y${i + 1}`]: m(r4(x + a)) }));
      return numQ(fill(W.tableQ, vars), 2 * a, [slip("limitAsValue", v, { v: m(v), a: m(a) })], [`f(x) \\to ${2 * a}\\ \\text{from both sides}`, `\\lim_{x \\to ${a}} f(x) = ${2 * a}`]);
    }
    if (t === "left") {
      const [p, q] = [r.int(-5, 5), r.int(-5, 8)];
      const [lv, rv] = [a + p, q - a];
      if (lv === rv) return numQ(fill(W.leftQ, { p: `x${plus(p)}`, q: `${m(q)} − x`, a: m(a) }), lv, [], [`x \\to ${a}^-:\\ ${a} ${p < 0 ? "-" : "+"} ${Math.abs(p)} = ${lv}`]);
      return numQ(fill(W.leftQ, { p: `x${plus(p)}`, q: `${m(q)} − x`, a: m(a) }), lv, [slip("sidesSwapped", rv, { a: m(a) })], [`x < ${a}:\\ f(x) = x ${p < 0 ? "-" : "+"} ${Math.abs(p)}`, `x \\to ${a}^-:\\ f \\to ${lv}`]);
    }
    const l = r.int(-5, 5);
    const same = r.next() < 0.5;
    const rr = same ? l : l + r.pick([-3, -2, -1, 1, 2, 3]);
    const v = same ? l + r.pick([-2, -1, 1, 2]) : rr;
    const prompt = fill(W.existsQ, { a: m(a), l: m(l), r: m(rr), v: m(v) });
    const opts = [fill(W.limitIs, { v: m(l) }), W.noLimit, fill(W.limitIs, { v: m(v) })];
    if (same) return pickPart(r, opts, 0, [{ id: "limitAsValue", at: 2, vars: { v: m(v), a: m(a) } }, { id: "valueBreaksLimit", at: 1, vars: { a: m(a), v: m(v), l: m(l) } }], prompt, [`${l} = ${l}`, `\\lim = ${l}`]);
    return pickPart(r, opts, 1, [{ id: "oneSideTaken", at: 0, vars: { o: m(rr) } }, { id: "oneSideTaken", at: 2, vars: { o: m(l) } }], prompt, [`${l} \\ne ${rr}`]);
  }

  if (L === 2) {
    const a = r.int(2, 4);
    if (r.next() < 0.5) {
      const kind = r.pick(["hole", "jump", "asymptote", "none"] as const);
      const opts = [W.hole, W.jump, W.asymptote, W.none];
      if (kind === "hole")
        return pickPart(r, opts, 0, [{ id: "denominatorZeroInfinite", at: 2, vars: { a } }], fill(W.kindQ, { f: `(x² − ${a * a}) ÷ (x − ${a})`, a }), [`\\frac{(x - ${a})(x + ${a})}{x - ${a}} = x + ${a},\\ x \\ne ${a}`]);
      if (kind === "jump") return pickPart(r, opts, 1, [{ id: "jumpCalledRemovable", at: 0, vars: { a } }], fill(W.kindQ, { f: `|x − ${a}| ÷ (x − ${a})`, a }), [`x < ${a}:\\ -1,\\ x > ${a}:\\ 1`]);
      if (kind === "asymptote") return pickPart(r, opts, 2, [], fill(W.kindQ, { f: `1 ÷ (x − ${a})²`, a }), [`x \\to ${a}:\\ f \\to \\infty`]);
      const q = r.int(-4, 4);
      const p = a * a + q - a;
      return pickPart(r, opts, 3, [{ id: "piecesAlwaysJump", at: 1, vars: { a, v: m(a * a + q) } }], fill(W.piecesQ, { p: `x${plus(p)}`, q: `x²${plus(q)}`, a }), [`${a} ${p < 0 ? "-" : "+"} ${Math.abs(p)} = ${a * a + q} = ${a}^2 ${q < 0 ? "-" : "+"} ${Math.abs(q)}`]);
    }
    const k = r.pick([-3, -2, -1, 1, 3, 4, 5, 6, 7].filter((v) => v !== 2 * a));
    const b = k * a - a * a;
    return numQ(fill(W.kQ, { q: `x²${plus(b)}`, a }), k, [slip("kNotDivided", a * a + b, { a, s: m(a * a + b) }), slip("slopesMatched", 2 * a, { a, s: m(a * a + b) })],
      [`${a}^2 ${b < 0 ? "-" : "+"} ${Math.abs(b)} = ${a}k`, `k = ${a * a + b} \\div ${a} = ${k}`]);
  }

  const t = r.pick(["ivt", "squeeze", "park"] as const);
  if (t === "ivt") {
    const a = r.int(-2, 2);
    const kind = r.pick(["wiggle", "same", "broken"] as const);
    const b = kind === "broken" ? a + 2 : a + r.int(2, 4);
    const opts = [W.yes, W.noBreak, fill(W.noSigns, { a: m(a), b: m(b) }), W.noRising];
    if (kind === "wiggle") {
      const [p, q] = r.next() < 0.5 ? [-r.int(1, 6), r.int(1, 6)] : [r.int(1, 6), -r.int(1, 6)];
      return pickPart(r, opts, 0, [{ id: "ivtNeedsMonotone", at: 3 }], fill(W.ivtQ, { a: m(a), b: m(b), p: m(p), q: m(q), extra: W.wiggles }), [`f(${a}) = ${p},\\ f(${b}) = ${q}`, `\\text{${W.signsDiffer}}`]);
    }
    if (kind === "same") {
      const sg = r.next() < 0.5 ? 1 : -1;
      const [p, q] = [sg * r.int(1, 6), sg * r.int(1, 6)];
      return pickPart(r, opts, 2, [{ id: "ivtSameSignRoot", at: 0 }], fill(W.ivtQ, { a: m(a), b: m(b), p: m(p), q: m(q), extra: "" }), [`f(${a}) = ${p},\\ f(${b}) = ${q}`]);
    }
    const c = r.int(1, 5);
    const mid = a + 1;
    return pickPart(r, opts, 1, [{ id: "ivtNoContinuity", at: 0, vars: { m: m(mid) } }], fill(W.brokenQ, { f: `${c} ÷ (x${plus(-mid)})`, a: m(a), b: m(b), p: m(-c), q: m(c) }), [`x = ${mid}:\\ \\text{${W.breaks}}`]);
  }
  if (t === "squeeze") {
    const n = r.pick(["", "²", "³"]);
    const fn = r.pick(["sin", "cos"]);
    return pickPart(r, ["0", fill(W.swings, { fn }), "1"], 0, [{ id: "swingNotSqueezed", at: 1, vars: { fn } }], fill(W.squeezeQ, { f: `x${n} · ${fn}(1 ÷ x)` }),
      [`-|x${n}| \\le x${n} ${fn}(1/x) \\le |x${n}|`, `\\pm|x${n}| \\to 0`]);
  }
  // A new setting: a charge per started hour is a step function; just above n hours, n + 1 hours have started.
  const [p, n] = [r.int(2, 6), r.int(1, 5)];
  return numQ(fill(W.parkQ, { p, n }), p * (n + 1), [slip("sidesSwapped", p * n, { a: n })], [`t \\to ${n}^+:\\ ${n + 1}\\ \\text{h}`, `${p} \\times ${n + 1} = ${p * (n + 1)}`]);
};

export default gen;
