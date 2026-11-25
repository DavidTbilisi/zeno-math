// Practice: continuity and limits from graphs and tables (#666). Easy: a limit from a table, a one-sided limit of two
// pieces, and whether a limit exists. Medium: a hole, a jump, an asymptote or no break; the k that joins two pieces.
// Hard: whether the intermediate value theorem promises a root, a limit squeezed to 0, and, in a new setting, a car
// park's charge as the time comes down to a whole number of hours. f(a) taken for the limit, one side for both, the
// sides swapped, a zero denominator always called an asymptote, a jump called a hole, two pieces assumed to break,
// k not divided, the slopes matched instead of the values, and the theorem's conditions misread are slips.
import { fill } from "../chart";
import { num } from "../practiceKit";
import type { Gen, Part, Trap } from "../practiceTypes";
import { sgn } from "../readFunction";
import { pickPart } from "../tTails";

const m = (v: number) => String(v).replace("-", "−");
const plus = (c: number, v = "") => (c === 0 ? "" : ` ${c < 0 ? "−" : "+"} ${Math.abs(c)}${v}`);
const r4 = (v: number) => Math.round(v * 10000) / 10000;

const gen: Gen = (r, L, w) => {
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
