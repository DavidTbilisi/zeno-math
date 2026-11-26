// Practice: Equation of a line. Every level keeps its older question half the time (y = mx + c through two points;
// perpendicular lines). #722 added the rest of the unit: easy, the equation read off a graph, intercepts from an
// equation, which point lies on a line, level and upright lines through two points, and the next point of a graph
// drawn from y = mx + c; medium, point-slope form, standard form both ways and any form made y = mx + c; hard, in a new
// setting, linear models in words: an equation written from a story, a value read on from a table of savings, a
// tank's line read where it meets the x-axis, and what the numbers of an expression stand for. The slope's sign from a
// graph, x and y swapped, the line's letter swapped, the number on its own got wrong, a sign lost in standard form,
// the rate and the start swapped, a model taken as proportional and the intercepts swapped are slips.
import { fill, r2 } from "../chart";
import { fromPoly, tex } from "../expr";
import type { Frac } from "../fraction";
import { fr, num, plainFrac, polyStr } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { graphSvg, tableSvg, type Pt } from "../readFunction";
import { pickPart } from "../tTails";

const gen: Gen = (r, L, w) => {
  if (r.int(0, 9) >= 5) return more(r, L, r.int(0, 9), w);
  const pt = (x: number, y: number) => `(${x}, ${y})`;
  if (L < 3) {
    const x1 = r.int(-5, 5);
    const y1 = r.int(-5, 5);
    let dx = r.int(1, 4);
    let dy = L === 1 ? r.nz(-4, 4) * dx : r.nz(-7, 7);
    if (L === 2 && dy % dx === 0) dx = dx === 1 ? 2 : dx + 1;
    if (L === 2 && dy % dx === 0) dy += 1;
    const [x2, y2] = [x1 + dx, y1 + dy];
    const m = fr(dy, dx);
    const c = fr(y1).sub(m.mul(fr(x1)));
    const e = fromPoly([c, m]);
    return {
      prompt: fill(w.prompts.line, { a: pt(x1, y1), b: pt(x2, y2) }),
      q: "",
      answer: { k: "expr", e, mode: "line" },
      show: `y = ${tex(e)}`,
      plain: `y = (${plainFrac(m)})x + (${plainFrac(c)})`,
      format: "line",
      solution: { kind: "coord", spec: { topic: "line", src: `${pt(x1, y1)}, ${pt(x2, y2)}` } },
    };
  }
  const m0 = fr(r.nz(-4, 4), r.pick([1, 1, 2, 3]));
  const c0 = r.int(-6, 6);
  const [px, py] = [r.int(-5, 5), r.int(-5, 5)];
  const m = fr(-1).div(m0);
  const c = fr(py).sub(m.mul(fr(px)));
  const given = fromPoly([fr(c0), m0]);
  const givenSrc = `y = ${m0.d === 1 ? polyStr([c0, m0.n]) : `${m0.n}/${m0.d}x ${c0 < 0 ? "-" : "+"} ${Math.abs(c0)}`}`;
  const e = fromPoly([c, m]);
  return {
    prompt: fill(w.prompts.perp, { p: pt(px, py) }),
    q: `y = ${tex(given)}`,
    answer: { k: "expr", e, mode: "line" },
    show: `y = ${tex(e)}`,
    plain: `y = (${plainFrac(m)})x + (${plainFrac(c)})`,
    format: "line",
    solution: { kind: "coord", spec: { topic: "perp", src: `${givenSrc}; P${pt(px, py)}` } },
  };
};

/** A number as read: a true minus, a fraction with a slash. */
const say = (v: Frac | number) => (typeof v === "number" ? String(v) : v.isInt() ? String(v.n) : `${v.n}/${v.d}`).replace(/^-/, "−");
const pt = (x: number, y: number) => `(${say(x)}, ${say(y)})`;
/** y = mx + c as read: "y = 2x − 3", "y = −x/2 + 1" written "y = −1/2x + 1". */
function lineSay(m: Frac, c: Frac): string {
  const mx = m.isZero() ? "" : m.isOne() ? "x" : m.n === -1 && m.d === 1 ? "−x" : `${say(m)}x`;
  if (!mx) return `y = ${say(c)}`;
  return c.isZero() ? `y = ${mx}` : `y = ${mx} ${c.isNeg() ? "−" : "+"} ${say(c.abs())}`;
}
const place = (body: string) => (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${body}</g>`;
const picOf = (p: { body: string; w: number; h: number }) => ({ svg: place(p.body), h: p.h, w: p.w });
/** The ends of y = mx + c inside the grid from −6 to 6. */
const lineEnds = (m: number, c: number): Pt[] => [-6, 6].map((x) => {
  const y = m * x + c;
  return (Math.abs(y) <= 6 ? [x, y] : [(Math.sign(y) * 6 - c) / m, Math.sign(y) * 6]) as Pt;
});

/** y = mx + c to type; slips (other lines) that differ from it are named. */
function linePart(prompt: string, q: string, m: Frac, c: Frac, slips: [Trap["id"], Frac, Frac, Record<string, string | number>][], steps: string[]): Part {
  const e = fromPoly([c, m]);
  const traps: Trap[] = slips.filter(([, sm, sc]) => !(sm.sub(m).isZero() && sc.sub(c).isZero()))
    .map(([id, sm, sc, vars]) => ({ id, a: { k: "expr", e: fromPoly([sc, sm]), mode: "line" }, vars: { x: lineSay(sm, sc), v: lineSay(m, c), ...vars } }));
  return { prompt, q, answer: { k: "expr", e, mode: "line", traps }, show: `y = ${tex(e)}`, plain: `y = (${plainFrac(m)})x + (${plainFrac(c)})`, format: "line", steps };
}

/** A number to type, with slips that differ from it. */
function numPart(prompt: string, v: number, slips: [Trap["id"], number, Record<string, string | number>][], steps: string[]): Part {
  const traps: Trap[] = slips.filter(([, s]) => Math.abs(s - v) > 1e-9).map(([id, s, vars]) => ({ id, a: num(s), vars: { x: say(s), v: say(v), ...vars } }));
  return { prompt, q: "", answer: { ...num(v), traps }, show: say(v).replace("−", "-"), plain: String(v), format: "number", steps };
}

function more(r: Rng, L: number, kind: number, w: PracticeWords): Part {
  const W = w.lneP;
  if (L === 1) {
    if (kind <= 1) {
      // The equation read off a graph: where it meets the y-axis, and how far up for each one along.
      const m = r.nz(-3, 3);
      const c = r.int(-4, 4);
      return { ...linePart(W.graphEq, "", fr(m), fr(c), [["slopeSignFromGraph", fr(-m), fr(c), { m: say(m) }]], [`c = ${c}`, `m = ${m}`, `y = ${tex(fromPoly([fr(c), fr(m)]))}`]), pic: picOf(graphSvg(lineEnds(m, c), { lo: -6, hi: 6 })) };
    }
    if (kind <= 3) {
      // An intercept of ax + by = c: x where y = 0, or y where x = 0.
      const [a, b] = [r.pick([1, 2, 3, 4, 5, 6]), r.pick([2, 3, 4, 5, -2, -3, -4])];
      const c = a * b * r.nz(-3, 3);
      const xAsked = r.next() < 0.5;
      const e = `${a === 1 ? "" : a}x ${b < 0 ? "−" : "+"} ${Math.abs(b)}y = ${say(c)}`;
      const [xi, yi] = [c / a, c / b];
      return numPart(fill(xAsked ? W.xInt : W.yInt, { e }), xAsked ? xi : yi, [["interceptsSwapped", xAsked ? yi : xi, {}]], [xAsked ? `y = 0: \\; ${a}x = ${c}, \\; x = ${xi}` : `x = 0: \\; ${b}y = ${c}, \\; y = ${yi}`]);
    }
    if (kind <= 5) {
      // Which point lies on y = mx + c; one of the others is a point of it with x and y swapped.
      for (;;) {
        const m = r.nz(-3, 3);
        const c = r.int(-5, 5);
        const x = r.nz(-4, 4);
        const y = m * x + c;
        if (y === x || Math.abs(y) > 12 || m * y + c === x) continue;
        const e = lineSay(fr(m), fr(c));
        const right = pt(x, y);
        const swapped = pt(y, x);
        const others = [pt(x, y + 1), pt(x + 1, y), pt(-x, y)].filter((p) => p !== right && p !== swapped);
        return pickPart(r, [right, swapped, ...others.slice(0, 2)], 0, [{ id: "pointCoordsSwapped", at: 1, vars: { x: swapped, v: right, w: `${m} × ${say(x)} ${c < 0 ? "−" : "+"} ${Math.abs(c)} = ${say(y)}` } }], fill(W.onLine, { e }), [`${m}(${x}) ${c < 0 ? "-" : "+"} ${Math.abs(c)} = ${y}`]);
      }
    }
    if (kind <= 7) {
      // A level or an upright line through two points that share a coordinate.
      const k = r.nz(-6, 6);
      let [p, q] = [r.nz(-6, 6), r.nz(-6, 6)];
      while (p === q || p === k || q === k) [p, q] = [r.nz(-6, 6), r.nz(-6, 6)];
      const upright = r.next() < 0.5;
      const [A, B] = upright ? [pt(k, p), pt(k, q)] : [pt(p, k), pt(q, k)];
      const right = `${upright ? "x" : "y"} = ${say(k)}`;
      const slip = `${upright ? "y" : "x"} = ${say(k)}`;
      return pickPart(r, [right, slip, `${upright ? "y" : "x"} = ${say(p)}`, `${upright ? "x" : "y"} = ${say(p)}`], 0,
        [{ id: "lineLetterSwapped", at: 1, vars: { c: upright ? "x" : "y", k: say(k), v: right } }], fill(W.through, { a: A, b: B }), [right]);
    }
    // The graph of y = mx + c drawn from (0, c): along d, up m·d.
    const d = r.pick([1, 2, 3]);
    const m = fr(r.nz(-3, 3), r.pick([1, d]));
    const c = r.int(-4, 4);
    const y = m.mul(fr(d)).add(fr(c));
    const flip = fr(c).sub(m.mul(fr(d)));
    const e = lineSay(m, fr(c));
    const right = pt(d, y.n);
    const slip = pt(d, flip.n);
    if (!y.isInt() || !flip.isInt() || right === slip) return more(r, L, kind, w);
    return pickPart(r, [right, slip, pt(-d, y.n), pt(d, c + d)].filter((p, i, xs) => xs.indexOf(p) === i), 0,
      [{ id: "slopeSignFromGraph", at: 1, vars: { x: slip, v: right, m: say(m) } }], fill(W.nextPt, { e, c: say(c) }), [`(${d}, ${c} ${m.isNeg() ? "-" : "+"} ${m.abs().mul(fr(d)).tex()}) = (${d}, ${y.n})`]);
  }
  if (L === 2) {
    if (kind <= 3) {
      // Point-slope: the point put in to find c.
      const m = fr(r.nz(-4, 4), r.pick([1, 1, 2]));
      const a = r.pick([-4, -2, 2, 4]);
      const b = r.int(-6, 6);
      const c = fr(b).sub(m.mul(fr(a)));
      const slip = fr(b).add(m.mul(fr(a)));
      return linePart(fill(W.pointSlope, { m: say(m), p: pt(a, b) }), "", m, c, [["pointSlopeSign", m, slip, { w: `${say(b)} = ${say(m)} × ${say(a)} + c, c = ${say(c)}` }]],
        [`${b} = ${m.tex()} \\times (${a}) + c`, `c = ${c.tex()}`]);
    }
    if (kind <= 5) {
      // y = (p/q)x + c into ax + by = k, whole numbers, a positive.
      const q = r.pick([2, 3, 4, 5]);
      let p = r.nz(-5, 5);
      if (p % q === 0) p += 1;
      const c = r.nz(-6, 6);
      // qy = px + qc  →  px − qy = −qc, made so a > 0.
      const sg = p < 0 ? -1 : 1;
      const [A, B, K] = [p * sg, -q * sg, -q * c * sg];
      const eq = (a: number, b: number, k: number) => `${a === 1 ? "" : a}x ${b < 0 ? "−" : "+"} ${Math.abs(b)}y = ${say(k)}`;
      const right = eq(A, B, K);
      const slip = eq(A, -B, K);
      return pickPart(r, [right, slip, eq(A, B, -K), eq(q, -Math.abs(p), K)].filter((x, i, xs) => xs.indexOf(x) === i), 0,
        [{ id: "standardFormSign", at: 1, vars: { x: slip, v: right, w: `${q}y = ${p}x ${q * c < 0 ? "−" : "+"} ${Math.abs(q * c)}` } }], fill(W.standard, { e: lineSay(fr(p, q), fr(c)) }), [`${q}y = ${p}x ${q * c < 0 ? "-" : "+"} ${Math.abs(q * c)}`, right.replace(/−/g, "-")]);
    }
    if (kind <= 7) {
      // The graph of ax + by = k drawn from where it meets the axes.
      const [a, b] = [r.pick([1, 2, 3, 4, 6]), r.pick([1, 2, 3, 4, 6])];
      if (a === b) return more(r, L, kind, w);
      const k = (a * b) * r.pick([1, 2, -1]);
      const [xi, yi] = [k / a, k / b];
      const e = `${a === 1 ? "" : a}x + ${b === 1 ? "" : b}y = ${say(k)}`;
      const right = `${pt(xi, 0)}, ${pt(0, yi)}`;
      const slip = `${pt(yi, 0)}, ${pt(0, xi)}`;
      return pickPart(r, [right, slip, `${pt(a, 0)}, ${pt(0, b)}`, `${pt(k, 0)}, ${pt(0, k)}`].filter((x, i, xs) => xs.indexOf(x) === i), 0,
        [{ id: "interceptsSwapped", at: 1 }], fill(W.stdGraph, { e }), [`y = 0: x = ${xi}`, `x = 0: y = ${yi}`]);
    }
    // Any form made y = mx + c: y − b = m(x − a).
    const m = r.nz(-4, 4);
    const a = r.nz(-5, 5);
    const b = r.nz(-6, 6);
    const c = b - m * a;
    const e = `y ${b < 0 ? "+" : "−"} ${Math.abs(b)} = ${m === 1 ? "" : m === -1 ? "−" : say(m)}(x ${a < 0 ? "+" : "−"} ${Math.abs(a)})`;
    return linePart(fill(W.anyForm, { e }), "", fr(m), fr(c), [["pointSlopeSign", fr(m), fr(-b - m * a), { w: `y = ${say(m)}x ${-m * a < 0 ? "−" : "+"} ${Math.abs(m * a)} ${b < 0 ? "−" : "+"} ${Math.abs(b)}` }]],
      [`y = ${m}x ${-m * a < 0 ? "-" : "+"} ${Math.abs(m * a)} ${b < 0 ? "-" : "+"} ${Math.abs(b)}`, `y = ${tex(fromPoly([fr(c), fr(m)]))}`]);
  }
  if (kind <= 3) {
    // A linear model written from a story: the charge for each unit times x, the fixed charge added.
    const plumber = r.next() < 0.5;
    const a = plumber ? r.pick([20, 25, 30, 35]) : r.pick([2, 3, 5, 8]);
    const b = plumber ? r.pick([40, 50, 60]) : r.pick([10, 12, 15, 20]);
    return linePart(fill(plumber ? W.plumber : W.phone, { a, b }), "", fr(a), fr(b), [["rateStartSwapped", fr(b), fr(a), { a, b, u: plumber ? W.hour : W.gb }]], [`y = ${a}x + ${b}`]);
  }
  if (kind <= 5) {
    // A table of savings read on: the same amount each week, from a start that is not 0.
    const a = r.pick([5, 10, 15, 20, 25]);
    const b = r.pick([20, 30, 40, 50, 60]);
    const ws = [1, 2, 3, 4];
    const n = r.int(8, 15);
    const v = b + a * n;
    const t = tableSvg(ws, ws.map((x) => b + a * x), [W.weeks, W.gel]);
    return { ...numPart(fill(W.tableAsk, { n }), v, [["proportionalAssumed", (b + a) * n, { b, w: `${b} + ${a} × ${n}` }]], [`${b} + ${a} \\times ${n} = ${v}`]), pic: picOf(t) };
  }
  if (kind <= 7) {
    // A draining tank on a graph: empty where the line meets the x-axis.
    const t0 = r.pick([4, 5, 6, 8, 10]);
    const c = r.pick([6, 8, 10].filter((k) => k !== t0));
    return { ...numPart(W.graphAsk, t0, [["interceptsSwapped", c, {}]], [`(${t0}, 0)`]), pic: picOf(graphSvg([[0, c], [t0, 0]], { lo: 0, hi: 10, ends: true })) };
  }
  // What the numbers of an expression stand for.
  const a = r.pick([1.5, 2, 2.5, 3]);
  const b = r.pick([4, 5, 6, 8]);
  const meanings = [W.grows, W.startTall, W.heightNow, W.weeksN];
  const coef = r.next() < 0.6;
  const right = coef ? 0 : 1;
  return pickPart(r, meanings, right, [{ id: "termsMeaningSwapped", at: 1 - right, vars: { u: "w", a, b, p: meanings[0], f: meanings[1] } }],
    fill(W.plant, { a, b, t: coef ? a : b }), [`\\text{${meanings[right]}}`]);
}

export default gen;
