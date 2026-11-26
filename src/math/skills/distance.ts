// Practice: Distance and midpoint. #712 added: at the easy level, the point that divides a segment in a ratio; at the
// medium level, whether two lines are parallel, perpendicular or neither, from a graph or from their equations; at
// the hard level, a quadrilateral named from its corners, the line through a point parallel or perpendicular to
// another, a triangle's perimeter, and new settings: a garden bed's area and a field's fence. The ratio's parts not
// added, the ratio measured from the other end, the slope's sign turned but not inverted (or inverted but not turned),
// the first line's intercept kept, the right angles or the sides not checked, the grid steps counted for a sloping
// side and the triangle not halved are the slips.
import { fill, r2 } from "../chart";
import { sqrtSplit } from "../expr";
import { gridAt, gridDot, gridSide, gridSvg, polyOnGrid, ptText, type Grid, type Pt } from "../plotPoint";
import { dp, fr, num, plainFrac, surdTex } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { opt, pickOf, word, type Opt } from "../signedKit";

/** A slope p/q in lowest terms, q > 0. */
type Slope = [number, number];
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
const slope = (p: number, q: number): Slope => {
  const g = gcd(p, q) * Math.sign(q);
  return [p / g, q / g];
};
const sText = ([p, q]: Slope) => (q === 1 ? `${p}` : `${p}/${q}`).replace("-", "−");
const sTex = ([p, q]: Slope) => (q === 1 ? `${p}` : `${p < 0 ? "-" : ""}\\frac{${Math.abs(p)}}{${q}}`);
/** y = mx + c in TeX. */
const lineTex = (m: Slope, c: number) => {
  const [p, q] = m;
  const mx = q === 1 && Math.abs(p) === 1 ? (p < 0 ? "-x" : "x") : `${sTex(m)}x`;
  return `y = ${mx}${c === 0 ? "" : c > 0 ? ` + ${c}` : ` - ${-c}`}`;
};
const times = ([a, b]: Slope, [c, d]: Slope) => slope(a * c, b * d);
const pts = (ps: Pt[]) => ps.map((p, k) => "ABCD"[k] + ptText(p)).join(", ");

/** Two lines on a grid from −6 to 6, blue and orange, each through two marked points. */
function twoLines(lines: [Pt, Slope][]): Part["pic"] {
  const g: Grid = { lo: -6, hi: 6, cell: 22 };
  let body = gridSvg(g);
  lines.forEach(([[x0, y0], [p, q]], k) => {
    const color = k ? "#e8590c" : "#1971c2";
    // Where the line meets the edges of the grid.
    const ends: Pt[] = [];
    for (const x of [-6, 6]) {
      const y = y0 + ((x - x0) * p) / q;
      if (y >= -6 && y <= 6) ends.push([x, y]);
    }
    if (p) for (const y of [-6, 6]) {
      const x = x0 + ((y - y0) * q) / p;
      if (x > -6 && x < 6) ends.push([x, y]);
    }
    const [a, b] = [gridAt(g, ends[0]), gridAt(g, ends[1])];
    body += `<line x1="${r2(a[0])}" y1="${r2(a[1])}" x2="${r2(b[0])}" y2="${r2(b[1])}" stroke="${color}" stroke-width="3"/>`;
    body += gridDot(g, [x0, y0], color) + gridDot(g, [x0 + q, y0 + p], color);
  });
  const side = gridSide(g);
  return { svg: (px, py) => `<g transform="translate(${r2(px)} ${r2(py)})">${body}</g>`, w: side, h: side };
}
/** A point on the grid with the point a run q, a rise p away on it as well. */
const anchor = (r: Rng, [p, q]: Slope): Pt => [r.int(-5, 5 - q), r.int(Math.max(-5, -5 - p), Math.min(5, 5 - p))];
const SLOPES: Slope[] = [[1, 2], [2, 1], [1, 3], [3, 1], [2, 3], [3, 2]];

/** The kinds #712 added. */
function more(r: Rng, L: 1 | 2 | 3, kind: number, w: PracticeWords): Part {
  const A = w.coordP;
  if (L === 1) {
    // The point dividing AB in the ratio m : n.
    const [m, n] = r.pick([[1, 2], [2, 1], [1, 3], [3, 1], [2, 3], [3, 2], [1, 4], [3, 4]] as const);
    const t = m + n;
    let [i, j] = [r.int(-2, 2), r.int(-2, 2)];
    while (!i || !j) [i, j] = [r.int(-2, 2), r.int(-2, 2)];
    const P0: Pt = [r.int(-6, 6), r.int(-6, 6)];
    const B: Pt = [P0[0] + i * t, P0[1] + j * t];
    const at = (f: number): Pt => [P0[0] + f * i * t, P0[1] + f * j * t].map((v) => Math.round(v * 1000) / 1000) as Pt;
    const P = at(m / t);
    const traps: Trap[] = [{ id: "ratioPartsNotAdded", a: { k: "tuple", vs: at(m / n), tol: 1e-9 }, vars: { x: ptText(at(m / n)), m, n, t, f: `${m}/${t}`, v: ptText(P) } }];
    if (m !== n) traps.push({ id: "ratioFromOtherEnd", a: { k: "tuple", vs: at(n / t), tol: 1e-9 }, vars: { x: ptText(at(n / t)), m, n, f: `${m}/${t}`, v: ptText(P) } });
    return {
      prompt: fill(A.divide, { a: ptText(P0), b: ptText(B), m, n }),
      q: "",
      answer: { k: "tuple", vs: P, tol: 1e-9, traps },
      show: `(${P[0]}, \\; ${P[1]})`,
      plain: `(${P[0]}, ${P[1]})`,
      format: "point",
      steps: [`\\tfrac{${m}}{${m} + ${n}} = \\tfrac{${m}}{${t}}`, `x = ${P0[0]} + \\tfrac{${m}}{${t}} \\times (${i * t}) = ${P[0]}`, `y = ${P0[1]} + \\tfrac{${m}}{${t}} \\times (${j * t}) = ${P[1]}`],
    };
  }
  const names = { par: word(A.parallel), perp: word(A.perpendicular), neither: word(A.neither) };
  if (L === 2) {
    // Two lines: parallel, perpendicular, or neither with the slope's sign turned only, or the slope inverted only.
    const how = r.pick(["par", "perp", "neg", "inv"] as const);
    let [p, q] = r.pick(SLOPES);
    if (r.next() < 0.5) p = -p;
    const m1 = slope(p, q);
    const m2 = how === "par" ? m1 : how === "perp" ? slope(-q, p) : how === "neg" ? slope(-p, q) : slope(q, p);
    const right = how === "par" ? names.par : how === "perp" ? names.perp : names.neither;
    const prod = sText(times(m1, m2));
    const slips: { o: Opt; id: "negativeNotReciprocal" | "reciprocalNotNegative"; vars: Record<string, string | number> }[] =
      how === "neg" ? [{ o: names.perp, id: "negativeNotReciprocal", vars: { a: sText(m1), b: sText(m2), p: prod, v: A.neither } }] : how === "inv" ? [{ o: names.perp, id: "reciprocalNotNegative", vars: { a: sText(m1), b: sText(m2), p: prod, v: A.neither } }] : [];
    const others = [names.par, names.perp, names.neither].filter((o) => o !== right && !slips.some((x) => x.o === o));
    const steps = [`m_1 = ${sTex(m1)}, \\; m_2 = ${sTex(m2)}`, how === "par" ? `m_1 = m_2` : `m_1 \\times m_2 = ${sTex(times(m1, m2))}`];
    if (kind <= 7) {
      const a = anchor(r, m1);
      let b = anchor(r, m2);
      while (how === "par" && (b[1] - a[1]) * m1[1] === m1[0] * (b[0] - a[0])) b = anchor(r, m2);
      return pickOf(r, A.linesGraph, right, slips, others, { pic: twoLines([[a, m1], [b, m2]]), steps });
    }
    const [c1, c2] = [r.int(-6, 6), r.int(-6, 6)];
    return pickOf(r, A.linesEq, right, slips, others, { q: `${lineTex(m1, c1)}, \\qquad ${lineTex(m2, how === "par" && c2 === c1 ? c1 + 2 : c2)}`, steps });
  }
  if (kind === 5) {
    // A quadrilateral from its corners: square, rectangle, rhombus or parallelogram.
    const k = r.pick(["square", "rectangle", "rhombus", "parallelogram"] as const);
    const u: Pt = r.pick([[1, 2], [2, 1], [1, 3], [3, 1], [2, 3], [3, 2], [3, 4], [4, 3]] as Pt[]).map((v) => v * (r.next() < 0.5 ? 1 : -1)) as Pt;
    const len = u[0] ** 2 + u[1] ** 2;
    const dot = (a: Pt, b: Pt) => a[0] * b[0] + a[1] * b[1];
    let v: Pt;
    if (k === "square") v = [-u[1], u[0]];
    else if (k === "rectangle") v = [-2 * u[1], 2 * u[0]];
    else {
      const cand: Pt[] = [];
      for (let x = -6; x <= 6; x++) for (let y = -6; y <= 6; y++) {
        const ok = x !== 0 && y !== 0 && dot([x, y], u) !== 0 && x * u[1] !== y * u[0] && (k === "rhombus" ? x * x + y * y === len : x * x + y * y !== len);
        if (ok) cand.push([x, y]);
      }
      v = r.pick(cand);
    }
    const a0: Pt = [r.int(-3, 1), r.int(-3, 1)];
    const ps: Pt[] = [a0, [a0[0] + u[0], a0[1] + u[1]], [a0[0] + u[0] + v[0], a0[1] + u[1] + v[1]], [a0[0] + v[0], a0[1] + v[1]]];
    const [mu, mv] = [slope(u[1], u[0]), slope(v[1], v[0])];
    const prod = sText(times(mu, mv));
    const lv = v[0] ** 2 + v[1] ** 2;
    const m = `m(AB) × m(AD) = ${sText(mu)} × ${sText(mv)} = ${prod}`;
    const nm = (t: "square" | "rectangle" | "rhombus" | "parallelogram") => word(A[t]);
    const right = nm(k);
    const slips: { o: Opt; id: "rightAnglesNotChecked" | "sidesNotCompared" | "slantMissed"; vars: Record<string, string | number> }[] =
      k === "rhombus" ? [{ o: nm("square"), id: "rightAnglesNotChecked", vars: { e: `AB² = AD² = ${len}`, m, v: A.rhombus } }]
      : k === "rectangle" ? [{ o: nm("square"), id: "sidesNotCompared", vars: { e: `AB² = ${len}, AD² = ${lv}`, v: A.rectangle } }]
      : k === "parallelogram" ? [{ o: nm("rectangle"), id: "slantMissed", vars: { e: `${m} ≠ −1`, v: A.parallelogram } }]
      : [];
    const others = (["square", "rectangle", "rhombus", "parallelogram"] as const).map(nm).filter((o) => o.text !== right.text && !slips.some((x) => x.o.text === o.text));
    return pickOf(r, fill(A.classify, { p: pts(ps) }), right, slips, others, { steps: [`AB^2 = ${len}, \\; AD^2 = ${lv}`, `m_{AB} \\times m_{AD} = ${sTex(mu)} \\times ${sTex(mv)} = ${sTex(times(mu, mv))}`] });
  }
  if (kind === 6) {
    // The line through P parallel or perpendicular to y = mx + c.
    let [p, q] = r.pick(SLOPES);
    if (r.next() < 0.5) p = -p;
    const m = slope(p, q);
    const perp = r.next() < 0.6;
    const m2 = perp ? slope(-q, p) : m;
    const x0 = r.pick([-1, 1]) * Math.abs(p) * q;
    const y0 = r.int(-5, 5);
    const c = r.int(-6, 6);
    const cOf = ([a, b]: Slope) => y0 - (a * x0) / b;
    const c2 = cOf(m2);
    const right = opt(lineTex(m2, c2));
    const P = ptText([x0, y0]);
    const slips: { o: Opt; id: "interceptKept" | "negativeNotReciprocal" | "reciprocalNotNegative"; vars: Record<string, string | number> }[] = [];
    if (c !== c2) slips.push({ o: opt(lineTex(m2, c)), id: "interceptKept", vars: { p: P, e: `${y0} = ${sText(m2)} × (${x0}) + c, c = ${c2}`, v: right.text } });
    const others: Opt[] = [];
    if (perp) {
      const neg = slope(-p, q);
      const inv = slope(q, p);
      slips.push({ o: opt(lineTex(neg, cOf(neg))), id: "negativeNotReciprocal", vars: { a: sText(m), b: sText(neg), p: sText(times(m, neg)), v: right.text } });
      if (Math.abs(p) !== q) slips.push({ o: opt(lineTex(inv, cOf(inv))), id: "reciprocalNotNegative", vars: { a: sText(m), b: sText(inv), p: sText(times(m, inv)), v: right.text } });
    } else others.push(opt(lineTex(slope(-q, p), cOf(slope(-q, p)))));
    const taken = new Set([right, ...slips.map((x) => x.o), ...others].map((o) => o.text));
    for (let k = 2; slips.length + others.length < 3; k += 2) {
      const o = opt(lineTex(m2, c2 + k));
      if (!taken.has(o.text)) others.push(o), taken.add(o.text);
    }
    return pickOf(r, fill(perp ? A.throughPerp : A.throughPar, { p: P }), right, slips, others, { q: lineTex(m, c), steps: [`m = ${sTex(m2)}`, `${y0} = ${sTex(m2)} \\times (${x0}) + c`, `c = ${c2}`] });
  }
  // A triangle with a level base (perimeter, or a garden bed's area), or a field with a level side (its fence).
  const x1 = r.int(-6, -1);
  const y1 = r.int(-5, 0);
  const b = r.int(4, 8);
  const h = r.int(3, 6) * (kind === 8 ? r.sign() : 1);
  const d = (P: Pt, Q: Pt) => Math.hypot(P[0] - Q[0], P[1] - Q[1]);
  const steps = (P: Pt, Q: Pt) => Math.abs(P[0] - Q[0]) + Math.abs(P[1] - Q[1]);
  const sq = (P: Pt, Q: Pt) => (P[0] - Q[0]) ** 2 + (P[1] - Q[1]) ** 2;
  const dp2 = (prompt: string, v: number, traps: Trap[], st: string[], pic?: Part["pic"]): Part => ({ prompt, q: "", pic, answer: { ...num(v, 0.0051), traps }, show: dp(v, 2), plain: dp(v, 2), format: "dp2", steps: st });
  if (kind <= 8) {
    let cx = r.int(x1 - 1, x1 + b + 1);
    while (cx === x1 || cx === x1 + b) cx = r.int(x1 - 1, x1 + b + 1);
    const T: Pt[] = [[x1, y1], [x1 + b, y1], [cx, y1 + h]];
    if (kind === 8) {
      const v = (b * Math.abs(h)) / 2;
      return { prompt: fill(A.garden, { p: pts(T) }), q: "", answer: { ...num(v), traps: [{ id: "triangleNotHalved", a: num(b * Math.abs(h)), vars: { x: b * Math.abs(h), b, h: Math.abs(h), v } }] }, show: String(v), plain: String(v), format: "number", steps: [`AB = ${b}, \\; h = ${Math.abs(h)}`, `\\tfrac{1}{2} \\times ${b} \\times ${Math.abs(h)} = ${v}`] };
    }
    const v = b + d(T[1], T[2]) + d(T[2], T[0]);
    const grid = b + steps(T[1], T[2]) + steps(T[2], T[0]);
    return dp2(fill(A.triPer, { p: pts(T) }), v, [{ id: "gridStepsCounted", a: num(grid, 0.0051), vars: { x: grid, e: `${b} + √${sq(T[1], T[2])} + √${sq(T[2], T[0])}`, v: dp(v, 2) } }], [`AB = ${b}`, `BC = \\sqrt{${sq(T[1], T[2])}}, \\; CA = \\sqrt{${sq(T[2], T[0])}}`, `${b} + \\sqrt{${sq(T[1], T[2])}} + \\sqrt{${sq(T[2], T[0])}} \\approx ${dp(v, 2)}`], polyOnGrid(-7, 7, T, "ABC", 20));
  }
  const [s1, s2] = [r.int(1, 3), r.int(1, 3)];
  const Q: Pt[] = [[x1, y1], [x1 + b, y1], [x1 + b - s1, y1 + h], [x1 + s2, y1 + h]];
  const v = b + d(Q[1], Q[2]) + d(Q[2], Q[3]) + d(Q[3], Q[0]);
  const grid = b + steps(Q[1], Q[2]) + (b - s1 - s2) + steps(Q[3], Q[0]);
  return dp2(fill(A.fence, { p: pts(Q) }), v, [{ id: "gridStepsCounted", a: num(grid, 0.0051), vars: { x: grid, e: `${b} + √${sq(Q[1], Q[2])} + ${b - s1 - s2} + √${sq(Q[3], Q[0])}`, v: dp(v, 2) } }], [`AB = ${b}, \\; CD = ${b - s1 - s2}`, `BC = \\sqrt{${sq(Q[1], Q[2])}}, \\; DA = \\sqrt{${sq(Q[3], Q[0])}}`, `${b} + \\sqrt{${sq(Q[1], Q[2])}} + ${b - s1 - s2} + \\sqrt{${sq(Q[3], Q[0])}} \\approx ${dp(v, 2)}`]);
}

const gen: Gen = (r, L, w) => {
  const extra = r.int(0, 9);
  if (extra >= 5) return more(r, L, extra, w);
  return old(r, L, w);
};

/** The kinds the skill had before #712: the midpoint, a whole distance, a distance in surds. */
const old: Gen = (r, L, w) => {
  const [x1, y1] = [r.int(-6, 6), r.int(-6, 6)];
  let dx: number, dy: number;
  if (L === 2) {
    const [a, b] = r.pick([[3, 4], [5, 12], [6, 8], [8, 15], [4, 3], [12, 5], [8, 6]] as const);
    [dx, dy] = [a * r.sign(), b * r.sign()];
  } else {
    do [dx, dy] = [r.int(-7, 7), r.int(-7, 7)];
    while (!dx || !dy || (L === 3 && Number.isInteger(Math.hypot(dx, dy))));
  }
  const [x2, y2] = [x1 + dx, y1 + dy];
  const A = `A(${x1}, ${y1})`;
  const B = `B(${x2}, ${y2})`;
  const solution = { kind: "coord" as const, spec: { topic: "points", src: `${A}, ${B}` } };
  if (L === 1) {
    const mx = fr(x1 + x2, 2);
    const my = fr(y1 + y2, 2);
    return { prompt: fill(w.prompts.midpoint, { a: A, b: B }), q: "", answer: { k: "tuple", vs: [mx.toNumber(), my.toNumber()], tol: 1e-9 }, show: `\\left(${mx.tex()}, \\; ${my.tex()}\\right)`, plain: `(${plainFrac(mx)}; ${plainFrac(my)})`, format: "point", solution };
  }
  const d2 = dx * dx + dy * dy;
  const { out, s } = sqrtSplit(fr(d2));
  const v = Math.sqrt(d2);
  return {
    prompt: fill(w.prompts.distance, { a: A, b: B }),
    q: "",
    answer: num(v, L === 2 ? 1e-9 : 0.0051, { surd: true }),
    show: s === 1 ? String(out.n) : `${surdTex(fr(0), out, s)} \\approx ${dp(v, 2)}`,
    plain: s === 1 ? String(out.n) : `${out.n === 1 ? "" : out.n}sqrt(${s})`,
    format: L === 2 ? "number" : "exact",
    solution,
  };
};

export default gen;
