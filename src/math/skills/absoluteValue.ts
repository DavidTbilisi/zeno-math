// Practice: Absolute value. Easy: |−7| and |p − q| worked out, and how far apart two numbers on a line are. Medium:
// |x − a| = b (two answers, b each side of a) and |x − a| < b as an inequality. Hard (new settings): the corner of
// y = m|x − h| + k, a piecewise function evaluated, and |x − h| written in pieces. The sign kept, the sizes subtracted
// across zero, one answer only, the centre read as +a, one side of the inequality only, the corner at −h, the wrong
// piece used and the pieces of |x − h| swapped are slips. #726 added, half the time at the hard level: a parking fee
// read off its step graph, a piecewise graph read at its joint, the equation of y = ±|x − h| + k picked from its graph,
// and a in y = a|x| from its graph. The jump read on the wrong step, the wrong piece used, the corner at −h, the two
// shifts swapped, the graph opening the wrong way and the stretch read upside down are slips.
import { absLineSvg, signed } from "../absValue";
import { C, fill } from "../chart";
import { compareSign } from "../live";
import { ineqPlain, ineqTex, num, signExercise } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { graphSvg, sgn } from "../readFunction";
import { pickPart } from "../tTails";
import { polyText } from "../whichTool";
import { mi, pickOf, word } from "../signedKit";

const absTex = (a: number) => (a === 0 ? "|x|" : a > 0 ? `|x - ${a}|` : `|x + ${-a}|`);
const absPlain = (a: number) => (a === 0 ? "|x|" : a > 0 ? `|x − ${a}|` : `|x + ${-a}|`);
const neg = (v: number) => (v < 0 ? `(${v})` : String(v));
const place = (body: string) => (x: number, y: number) => `<g transform="translate(${x} ${y})">${body}</g>`;

const gen: Gen = (r, L, w) => {
  const W = w.absv;
  if (L === 1) {
    const t = r.pick(["abs", "diff", "apart", "cmp", "story"] as const);
    if (t === "cmp" || t === "story") return absCompare(r, t, w);
    if (t === "abs") {
      const k = r.int(2, 9);
      const pic = absLineSvg(-10, 2, [{ v: -k, label: `−${k}` }, { v: 0, color: "#1e1e1e" }]);
      return {
        prompt: W.evaluate, q: `|-${k}|`, pic: { svg: place(pic.body), h: pic.h, w: pic.w },
        answer: { ...num(k), traps: [{ id: "absKeepsSign", a: num(-k), vars: { v: `−${k}`, d: k } }] },
        show: String(k), plain: String(k), format: "number",
        steps: [`\\text{${fill(W.fromZero, { v: `−${k}`, d: k })}}`, `|-${k}| = ${k}`],
      };
    }
    if (t === "diff") {
      const p = r.int(-5, 6);
      const q = p + r.int(2, 9);
      return {
        prompt: W.evaluate, q: `|${p} - ${neg(q)}|`,
        answer: { ...num(q - p), traps: [{ id: "absKeepsSign", a: num(p - q), vars: { v: signed(p - q), d: q - p } }] },
        show: String(q - p), plain: String(q - p), format: "number",
        steps: [`${p} - ${neg(q)} = ${p - q}`, `|${p - q}| = ${q - p}`],
      };
    }
    const p = -r.int(1, 8);
    const q = r.int(1, 8);
    const pic = absLineSvg(Math.min(-9, p - 1), Math.max(9, q + 1), [{ v: p, label: "P" }, { v: q, label: "Q" }]);
    const wrong = Math.abs(Math.abs(q) - Math.abs(p));
    const traps: Trap[] = wrong !== q - p ? [{ id: "distanceSubtracted", a: num(wrong), vars: { p: signed(p), q, a: -p, d: q - p } }] : [];
    return {
      prompt: W.apart, q: "", pic: { svg: place(pic.body), h: pic.h, w: pic.w },
      answer: { ...num(q - p), traps }, show: String(q - p), plain: String(q - p), format: "number",
      steps: [`|${q} - (${p})| = ${q} + ${-p} = ${q - p}`],
    };
  }

  if (L === 2) {
    let a: number;
    do a = r.int(-6, 6);
    while (a === 0);
    const b = r.int(1, 7);
    const [lo, hi] = [a - b, a + b];
    if (r.next() < 0.55) {
      const traps: Trap[] = [
        { id: "absOneRoot", a: { k: "set", vs: [hi], tol: 1e-9, listed: true }, vars: { a: signed(a), b, l: signed(lo), r: signed(hi) } },
        { id: "absCentreSign", a: { k: "set", vs: [-a - b, -a + b], tol: 1e-9, listed: true }, vars: { a: signed(a), na: signed(-a), e: absPlain(a) } },
      ];
      return {
        prompt: W.solveEq, q: `${absTex(a)} = ${b}`,
        answer: { k: "set", vs: [lo, hi], tol: 1e-9, listed: true, traps },
        show: `x = ${lo},\\; x = ${hi}`, plain: `${lo}; ${hi}`, format: "roots",
        steps: [`\\text{${fill(W.bothWays, { e: absPlain(a), a: signed(a), b })}}`, `x = ${a} - ${b} = ${lo} \\quad\\text{${W.or}}\\quad x = ${a} + ${b} = ${hi}`],
      };
    }
    const closed = r.next() < 0.4;
    const rel = closed ? "\\le" : "<";
    const L_ = { v: lo, closed };
    const H_ = { v: hi, closed };
    const traps: Trap[] = [
      { id: "absOneSided", a: { k: "ineq", lo: null, hi: H_ }, vars: { l: signed(lo), r: signed(hi), a: signed(a), b } },
      { id: "absCentreSign", a: { k: "ineq", lo: { v: -a - b, closed }, hi: { v: -a + b, closed } }, vars: { a: signed(a), na: signed(-a), e: absPlain(a) } },
    ];
    return {
      prompt: W.solveIneq, q: `${absTex(a)} ${rel} ${b}`,
      answer: { k: "ineq", lo: L_, hi: H_, traps }, show: ineqTex(L_, H_), plain: ineqPlain(L_, H_), format: "inequality",
      steps: [`\\text{${fill(W.within, { a: signed(a), b })}}`, `${a} - ${b} ${rel} x ${rel} ${a} + ${b}`, ineqTex(L_, H_)],
    };
  }

  if (r.int(0, 9) >= 5) return graphs(r, w);
  const t = r.pick(["corner", "piece", "split"] as const);
  if (t === "corner") {
    const m = r.pick([1, 2, 3, -1, -2, 0.5]);
    let h: number;
    do h = r.int(-6, 6);
    while (h === 0);
    const k = r.int(-5, 5);
    const mT = m === 1 ? "" : m === -1 ? "-" : m === 0.5 ? "\\tfrac{1}{2}" : String(m);
    const kT = k === 0 ? "" : k > 0 ? ` + ${k}` : ` - ${-k}`;
    return {
      prompt: W.corner, q: `y = ${mT}${absTex(h)}${kT}`,
      answer: { k: "tuple", vs: [h, k], tol: 1e-9, traps: [{ id: "vertexSignH", a: { k: "tuple", vs: [-h, k], tol: 1e-9 }, vars: { e: absPlain(h), h: signed(h), nh: signed(-h) } }] },
      show: `(${h}, \\; ${k})`, plain: `(${h}, ${k})`, format: "point",
      steps: [`\\text{${fill(W.cornerWhy, { e: absPlain(h), h: signed(h), k: signed(k) })}}`, `(${h}, \\; ${k})`],
    };
  }
  if (t === "split") {
    let h: number;
    do h = r.int(-5, 5);
    while (h === 0);
    const inside = h > 0 ? `x − ${h}` : `x + ${-h}`;
    const turned = h > 0 ? `${h} − x` : `−${-h} − x`;
    const first = r.next() < 0.5;
    const opts = (first ? [turned, inside] : [inside, turned]).map((s) => ({ text: s, plain: s, tex: s.replace(/−/g, "-") }));
    const [right, wrong] = first ? [0, 1] : [1, 0];
    return {
      prompt: fill(W.split, { e: absPlain(h), h: signed(h) }), q: "",
      answer: { k: "pick", options: opts, right, traps: [{ id: "absPieceSwapped", a: { k: "pick", options: opts, right: wrong }, vars: { e: absPlain(h), h: signed(h) } }] },
      show: opts[right].tex, plain: opts[right].plain, format: "pick",
      steps: [`\\text{${fill(W.splitWhy, { h: signed(h), e: absPlain(h) })}}`, `${absTex(h)} = ${opts[right].tex} \\quad (x < ${h})`],
    };
  }
  // A piecewise function, evaluated where one piece or the other holds, sometimes at the joint itself.
  const c = r.int(-2, 3);
  const [p, s] = [r.int(2, 4), r.int(-5, 5)];
  const f1 = (x: number) => x * x;
  const f2 = (x: number) => p * x + s;
  const x0 = r.pick([c, c - r.int(1, 3), c + r.int(1, 3)]);
  const v = x0 < c ? f1(x0) : f2(x0);
  const other = x0 < c ? f2(x0) : f1(x0);
  const sT = s === 0 ? "" : s > 0 ? ` + ${s}` : ` - ${-s}`;
  const traps: Trap[] = other !== v ? [{ id: "piecewiseWrongPiece", a: num(other), vars: { x: signed(x0), c: signed(c), side: x0 < c ? `x < ${signed(c)}` : `x ≥ ${signed(c)}` } }] : [];
  const part: Part = {
    prompt: fill(W.piecewise, { x: signed(x0) }), q: `f(x) = \\begin{cases} x^2 & x < ${c} \\\\ ${p}x${sT} & x \\ge ${c} \\end{cases}`,
    answer: { ...num(v), traps }, show: String(v), plain: String(v), format: "number",
    steps: [x0 < c ? `${x0} < ${c}:\\; f(${x0}) = (${x0})^2 = ${v}` : `${x0} \\ge ${c}:\\; f(${x0}) = ${p} \\cdot ${neg(x0)}${sT} = ${v}`],
  };
  return part;
};

/**
 * Absolute values compared (#706): |−7| and |5|, or −|−4| and −3 (the challenge); and which of two places or two
 * balances is farther from 0, a cave below sea level and a hill above it, a debt and savings.
 */
function absCompare(r: Rng, t: "cmp" | "story", w: PracticeWords): Part {
  const S = w.signed;
  if (t === "cmp") {
    const k = r.int(2, 12);
    let b: number;
    do b = r.int(1, 12);
    while (b === k);
    if (r.next() < 0.3) {
      // −|−k| against a negative number: the minus outside the bars stays.
      const c = -b;
      const [x, y, vx, vy] = r.next() < 0.5 ? [`-|-${k}|`, String(c), -k, c] : [String(c), `-|-${k}|`, c, -k];
      const sign = compareSign(vx, vy);
      return signExercise(w, x, y, sign, { steps: [`-|-${k}| = -${k}`, `${vx} ${sign} ${vy}`] });
    }
    const swap = r.next() < 0.5;
    const [x, y, vx, vy, sx, sy] = swap ? [`|${b}|`, `|-${k}|`, b, k, b, -k] : [`|-${k}|`, `|${b}|`, k, b, -k, b];
    const sign = compareSign(vx, vy);
    const naive = compareSign(sx, sy);
    return signExercise(w, x, y, sign, { steps: [`|-${k}| = ${k}, \\quad |${b}| = ${b}`, `${vx} ${sign} ${vy}`] }, naive !== sign ? [{ id: "absKeepsSign", a: { k: "sign", v: naive }, vars: { v: `−${k}`, d: k } }] : []);
  }
  // A place below and one above sea level, or a debt and savings: which is farther from 0?
  const money = r.next() < 0.5;
  const a = -r.int(money ? 5 : 20, money ? 90 : 400);
  let b: number;
  do b = r.int(money ? 5 : 20, money ? 90 : 400);
  while (Math.abs(b + a) < (money ? 3 : 15));
  const [A, B, same] = money ? [word(S.ana), word(S.gio), word(S.same)] : [word(S.cave), word(S.hill), word(S.same)];
  const prompt = fill(money ? S.owes : S.farther, { a: mi(a), b });
  const steps = [`|${a}| = ${-a}, \\quad |${b}| = ${b}`, `${Math.max(-a, b)} > ${Math.min(-a, b)}`];
  // The slip: the bigger number taken as farther, which is the one above 0.
  if (-a > b) return pickOf(r, prompt, A, [{ o: B, id: "absKeepsSign", vars: { v: mi(a), d: -a } }], [same], { steps });
  return pickOf(r, prompt, B, [], [A, same], { steps });
}

/** Grid positions for graphSvg's square grid from lo to hi. */
const grid = (lo: number, hi: number) => ({ X: (x: number) => 20 + (x - lo) * 22, Y: (y: number) => 20 + (hi - y) * 22 });
const dot = (g: ReturnType<typeof grid>, x: number, y: number, open: boolean) =>
  `<circle cx="${g.X(x)}" cy="${g.Y(y)}" r="5" fill="${open ? "#fff" : C.blue}" stroke="${C.blue}" stroke-width="2.5"/>`;
const seg = (g: ReturnType<typeof grid>, pts: [number, number][]) =>
  `<polyline points="${pts.map(([x, y]) => `${g.X(x)},${g.Y(y)}`).join(" ")}" fill="none" stroke="${C.blue}" stroke-width="2.5"/>`;
const picOf = (p: { body: string; w: number; h: number }) => ({ svg: place(p.body), w: p.w, h: p.h });
const m = (v: number) => String(v).replace("-", "−");

function graphs(r: Rng, w: PracticeWords): Part {
  const W = w.absP;
  const numQ = (prompt: string, v: number, traps: Trap[], steps: string[], pic: Part["pic"]): Part => ({
    prompt, q: "", pic, show: sgn(v), plain: String(v), format: "number", steps,
    answer: { ...num(v), traps: traps.filter((t, i) => t.a.k === "num" && t.a.v !== v && !traps.slice(0, i).some((u) => u.a.k === "num" && t.a.k === "num" && u.a.v === t.a.v)) },
  });
  const t = r.pick(["step", "piecewise", "equation", "stretch"] as const);
  if (t === "step") {
    // A new setting: parking at c GEL for each hour or part of one, for up to 6 hours: open dot on the left of each step.
    const c = r.pick([1, 2]);
    const base = graphSvg([[0, 0], [0, 0]], { lo: 0, hi: 12 });
    const g = grid(0, 12);
    const body = base.body.slice(0, base.body.lastIndexOf("<polyline")) + [1, 2, 3, 4, 5, 6].map((k) => seg(g, [[k - 1, c * k], [k, c * k]]) + dot(g, k - 1, c * k, true) + dot(g, k, c * k, false)).join("");
    const at = r.next() < 0.6;
    const k = r.int(1, 5);
    const tt = at ? k : k + 0.5;
    const v = c * Math.ceil(tt);
    const slip = at ? c * (k + 1) : c * k;
    return numQ(fill(W.parking, { c, t: m(tt) }), v, [{ id: "stepEndMisread", a: num(slip), vars: { t: m(tt), v } }], [`f(${tt}) = ${v}`], picOf({ ...base, body }));
  }
  if (t === "piecewise") {
    // Two lines meeting at x = c with a jump: open dot on the left piece, filled on the right.
    for (;;) {
      const c = r.int(-2, 2);
      const [m1, m2] = [r.pick([-1, 1, 2]), r.pick([-2, -1, 1])];
      const [y1, y2] = [r.int(-4, 4), r.int(-4, 4)];
      if (Math.abs(y1 - y2) < 2 || m1 === m2) continue;
      const f1 = (x: number) => y1 + m1 * (x - c);
      const f2 = (x: number) => y2 + m2 * (x - c);
      const x1 = Math.max(-6, c - (m1 > 0 ? (y1 + 6) / m1 : (6 - y1) / -m1));
      const x2 = Math.min(6, c + (m2 > 0 ? (6 - y2) / m2 : (y2 + 6) / -m2));
      const base = graphSvg([[c, y2], [c, y2]], { lo: -6, hi: 6 });
      const g = grid(-6, 6);
      const body = base.body.slice(0, base.body.lastIndexOf("<polyline")) + seg(g, [[x1, f1(x1)], [c, y1]]) + seg(g, [[c, y2], [x2, f2(x2)]]) + dot(g, c, y1, true) + dot(g, c, y2, false);
      return numQ(fill(W.pieceQ, { c: m(c) }), y2, [{ id: "piecewiseWrongPiece", a: num(y1), vars: { x: signed(c), c: signed(c), side: `x ≥ ${signed(c)}` } }], [`f(${c}) = ${y2}`], picOf({ ...base, body }));
    }
  }
  if (t === "equation") {
    // y = s|x − h| + k picked from its graph.
    const [h, k] = [r.int(-4, 4) || 2, r.int(-3, 3)];
    if (h === k) return graphs(r, w);
    const s = r.pick([1, -1]);
    const g = graphSvg([[-6, s * (h + 6) + k], [h, k], [6, s * (6 - h) + k]], { lo: -6, hi: 6 });
    const eq = (ss: number, hh: number, kk: number) => `y = ${ss < 0 ? "−" : ""}|${polyText(-hh, 1)}|${kk ? ` ${kk < 0 ? "−" : "+"} ${Math.abs(kk)}` : ""}`;
    const opts = [eq(s, h, k), eq(s, -h, k), eq(s, k, h), eq(-s, h, k)];
    return { ...pickPart(r, opts, 0, [
      { id: "vertexSignH", at: 1, vars: { e: `|${polyText(-h, 1)}|`, h: signed(h), nh: signed(-h) } },
      { id: "shiftAxesSwapped", at: 2, vars: { h: m(h), k: m(k), v: opts[0] } },
      { id: "absOpensWrongWay", at: 3, vars: { d: s > 0 ? W.up : W.down, v: opts[0] } },
    ], W.eqQ, [`\\text{${fill(W.cornerAt, { h: m(h), k: m(k) })}}`]), pic: picOf(clip(g)) };
  }
  // a in y = a|x| from its graph: one step right of the corner goes a up.
  const a = r.pick([2, 3, -2, -3, 0.5, -0.5]);
  const g = graphSvg([[-6, a * 6], [0, 0], [6, a * 6]], { lo: -6, hi: 6 });
  const inv = Math.sign(a) / Math.abs(a);
  return numQ(W.stretchQ, a, [
    { id: "absOpensWrongWay", a: num(-a), vars: { d: a > 0 ? W.up : W.down, v: m(a) } },
    { id: "absScaleInverted", a: num(inv), vars: { a: m(Math.abs(a)), d: a > 0 ? W.upWord : W.downWord, v: m(a) } },
  ], [`y(1) = ${a}`, `a = ${a}`], picOf(clip(g)));
}

/** A graph whose lines may run off the grid, clipped to it. */
function clip(g: { body: string; w: number; h: number }) {
  const id = `c${Math.round(g.w)}`;
  return { ...g, body: `<defs><clipPath id="${id}"><rect x="20" y="20" width="${g.w - 40}" height="${g.h - 40}"/></clipPath></defs>${g.body.replace(/<polyline/, `<polyline clip-path="url(#${id})"`)}` };
}

export default gen;
