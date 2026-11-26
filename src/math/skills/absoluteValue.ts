// Practice: Absolute value. Easy: |−7| and |p − q| worked out, and how far apart two numbers on a line are. Medium:
// |x − a| = b (two answers, b each side of a) and |x − a| < b as an inequality. Hard (new settings): the corner of
// y = m|x − h| + k, a piecewise function evaluated, and |x − h| written in pieces. The sign kept, the sizes subtracted
// across zero, one answer only, the centre read as +a, one side of the inequality only, the corner at −h, the wrong
// piece used and the pieces of |x − h| swapped are slips.
import { absLineSvg, signed } from "../absValue";
import { fill } from "../chart";
import { compareSign } from "../live";
import { ineqPlain, ineqTex, num, signExercise } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
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

export default gen;
