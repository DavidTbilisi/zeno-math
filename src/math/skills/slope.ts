// Practice: Gradient of a line.
// Practice: Gradient of a line. Every level keeps its grid question half the time. #722 added the rest: easy, the
// slope from a table, of a level or an upright line, and from two points; medium, the slope read from an equation in
// any form; hard, in a new setting, a story's rate as a slope (falling when the amount goes down) and what the slope
// and the y-intercept stand for. Along over up, one row's y over x, the flat and the upright line swapped, the number
// on its own taken for the slope, the number in front of x read before y stands alone, the sign of −a/b lost, a falling
// rate given as positive and the slope and intercept swapped are slips.
import { fill, r2 } from "../chart";
import type { Frac } from "../fraction";
import { signed } from "../plotPoint";
import { gradTex, gradText, runOverRise, slopeQuestion, slopeQuestionSvg, slopeSteps } from "../slope";
import { fr, num, plainFrac } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { tableSvg } from "../readFunction";
import { pickPart } from "../tTails";

const gen: Gen = (r, L, w) => {
  if (r.int(0, 9) >= 5) return more(r, L, r.int(0, 9), w);
  // The gradient of a line drawn through two points of a grid (src/math/slope.ts): up (or down) over along.
  const q = slopeQuestion(L, r.next);
  const [dx, dy] = [q.q[0] - q.p[0], q.q[1] - q.p[1]];
  const m = dy / dx;
  const pic = slopeQuestionSvg(q);
  const flip = runOverRise(q);
  return {
    prompt: w.prompts.slope,
    q: "",
    pic: { svg: (px: number, py: number) => `<g transform="translate(${r2(px)} ${r2(py)})">${pic.body}</g>`, h: pic.h, w: pic.w },
    answer: { ...num(m, 1e-9, { lowest: true }), traps: Math.abs(m) !== 1 ? [{ id: "runOverRise", a: num(flip), vars: { dx, dy: signed(dy), v: gradText(dy, dx), u: gradText(dx, dy) } }] : [] },
    show: `m = ${gradTex(dy, dx)}`,
    plain: gradText(dy, dx).replace("−", "-"),
    format: Number.isInteger(m) ? "number" : "fraction",
    solution: { kind: "slope", spec: { q, steps: slopeSteps(q) } },
  };
};

/** A number as read: a true minus, a fraction with a slash. */
const say = (v: Frac) => (v.isInt() ? String(v.n) : `${v.n}/${v.d}`).replace(/^-/, "−");
const place = (body: string) => (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${body}</g>`;

/** A slope to type, in lowest terms; slips that differ from it are named. */
function slopePart(prompt: string, v: Frac, slips: [Trap["id"], Frac, Record<string, string | number>][], steps: string[]): Part {
  const traps: Trap[] = slips.filter(([, s]) => !s.sub(v).isZero()).map(([id, s, vars]) => ({ id, a: num(s.toNumber(), 1e-9), vars: { x: say(s), v: say(v), ...vars } }));
  return { prompt, q: "", answer: { ...num(v.toNumber(), 1e-9, { lowest: true }), traps }, show: `m = ${v.tex()}`, plain: plainFrac(v), format: v.isInt() ? "number" : "fraction", steps };
}

function more(r: Rng, L: number, kind: number, w: PracticeWords): Part {
  const W = w.slpP;
  if (L === 1) {
    if (kind <= 4) {
      // The slope from a table: the change in y over the change in x, with x going up in twos or threes.
      const step = r.pick([1, 2, 3]);
      const m = fr(r.nz(-6, 6), r.pick([1, step]));
      const x0 = r.int(1, 4);
      const c = r.int(-5, 8);
      const xs = [0, 1, 2, 3].map((i) => x0 + i * step);
      const ys = xs.map((x) => m.mul(fr(x)).add(fr(c)));
      if (ys.some((y) => !y.isInt())) return more(r, L, kind, w);
      const one = ys[3].div(fr(xs[3]));
      const dy = ys[1].sub(ys[0]);
      const t = tableSvg(xs, ys.map((y) => y.n));
      return { ...slopePart(W.table, m, [["slopeFromOneRow", one, { w: `${say(dy)} ÷ ${step}` }]], [`m = \\frac{${dy.n}}{${step}} = ${m.tex()}`]), pic: { svg: place(t.body), h: t.h, w: t.w } };
    }
    if (kind <= 7) {
      // A level line y = k or an upright one x = k.
      const k = r.pick([-6, -5, -4, -3, -2, 2, 3, 4, 5, 6]);
      const flat = r.next() < 0.5;
      const e = `${flat ? "y" : "x"} = ${String(k).replace("-", "−")}`;
      const options = ["0", String(k).replace("-", "−"), W.undefined, "1"];
      return pickPart(r, options, flat ? 0 : 2, [{ id: "flatSteepSwapped", at: flat ? 2 : 0, vars: { v: flat ? "0" : W.undefined } }], fill(W.ofLine, { e }), [flat ? `\\text{${W.flatStep}}` : `\\text{${W.uprightStep}}`]);
    }
    // Two points, no grid: up over along.
    const [x1, y1] = [r.int(-6, 6), r.int(-6, 6)];
    let dx = r.nz(-5, 5);
    const dy = r.nz(-8, 8);
    if (Math.abs(dx) === Math.abs(dy)) dx += dx > 0 ? 1 : -1;
    const [x2, y2] = [x1 + dx, y1 + dy];
    const m = fr(dy, dx);
    const pt = (x: number, y: number) => `(${x}, ${y})`.replace(/-/g, "−");
    return slopePart(fill(W.points, { a: pt(x1, y1), b: pt(x2, y2) }), m, [["runOverRise", fr(dx, dy), { dx, dy: signed(dy), v: gradText(dy, dx), u: gradText(dx, dy) }]], [`m = \\frac{${y2} - (${y1})}{${x2} - (${x1})} = ${m.tex()}`]);
  }
  if (L === 2) {
    const a = r.nz(-6, 6);
    const b = r.nz(-9, 9);
    if (kind <= 3) {
      // y = mx + c, the slope possibly a fraction, the number on its own possibly first.
      const m = fr(a, r.pick([1, 1, 2, 3, 4]));
      const mt = m.isInt() ? `${m.n === 1 ? "" : m.n === -1 ? "−" : say(m)}x` : `${say(m)}x`;
      const e = r.next() < 0.6 ? `y = ${mt} ${b < 0 ? "−" : "+"} ${Math.abs(b)}` : `y = ${b} ${m.isNeg() ? "−" : "+"} ${mt.replace("−", "")}`.replace(/^y = -/, "y = −");
      return slopePart(fill(W.ofLine, { e }), m, [["interceptForSlope", fr(b), {}]], [`m = ${m.tex()}`]);
    }
    if (kind <= 6) {
      // ky = ax + b: y alone first.
      const k = r.pick([2, 3, 4, 5]);
      const m = fr(a, k);
      const e = `${k}y = ${a === 1 ? "" : a === -1 ? "−" : String(a).replace("-", "−")}x ${b < 0 ? "−" : "+"} ${Math.abs(b)}`;
      return slopePart(fill(W.ofLine, { e }), m, [["slopeBeforeDividing", fr(a), { k, w: `y = ${say(m)}x ${b < 0 ? "−" : "+"} ${say(fr(Math.abs(b), k))}` }]], [`y = ${m.tex()}x ${b < 0 ? "-" : "+"} ${fr(Math.abs(b), k).tex()}`, `m = ${m.tex()}`]);
    }
    // ax + by = c: the slope is −a/b.
    const p = r.int(1, 7);
    let q = r.nz(-7, 7);
    if (q === p || q === -p) q = q > 0 ? q + 1 : q - 1;
    const m = fr(-p, q);
    const e = `${p === 1 ? "" : p}x ${q < 0 ? "−" : "+"} ${Math.abs(q) === 1 ? "" : Math.abs(q)}y = ${String(b).replace("-", "−")}`;
    return slopePart(fill(W.ofLine, { e }), m, [["standardSlopeSign", fr(p, q), { w: `y = ${say(m)}x ${b * Math.sign(q) < 0 ? "−" : "+"} ${say(fr(Math.abs(b), Math.abs(q)))}` }]],
      [`${q}y = ${-p}x ${b < 0 ? "-" : "+"} ${Math.abs(b)}`.replace("+ -", "- "), `m = ${m.tex()}`]);
  }
  if (kind <= 5) {
    // A story's rate as a slope: a falling amount has a negative slope.
    const tank = r.next() < 0.6;
    const a = tank ? r.pick([40, 60, 80, 120, 200]) : r.pick([0, 20, 50, 100]);
    const b = tank ? r.pick([2, 4, 5, 2.5, 1.5]) : r.pick([5, 10, 15, 20, 25]);
    const v = tank ? -b : b;
    const traps: Trap[] = tank ? [{ id: "slopeSignInContext", a: num(b), vars: { x: String(b), v: `−${b}` } }] : [];
    return { prompt: fill(tank ? W.tank : W.savings, { a, b }), q: "", answer: { ...num(v), traps }, show: `m = ${v}`, plain: String(v), format: "number", steps: [`m = ${tank ? `-${b}` : b}`] };
  }
  // What the slope or the y-intercept stands for in a story.
  const taxi = r.next() < 0.5;
  const a = taxi ? r.pick([2, 3, 4]) : r.pick([1, 2, 3]);
  const b = taxi ? r.pick([4, 5, 6, 8]) : r.pick([15, 20, 24, 30]);
  const slopeAsked = r.next() < 0.5;
  const meanings = taxi ? [W.taxiRate, W.taxiStart, W.taxiTotal, W.taxiKm] : [W.candleRate, W.candleStart, W.candleEnd, W.candleNow];
  const right = slopeAsked ? 0 : 1;
  return pickPart(r, meanings, right, [{ id: "graphFeatureSwapped", at: 1 - right, vars: { p: meanings[0], f: meanings[1] } }],
    `${fill(taxi ? W.taxiSay : W.candleSay, { a, b })} ${fill(taxi ? W.taxiAsk : W.candleAsk, { f: slopeAsked ? W.fSlope : W.fInt })}`, [`\\text{${meanings[right]}}`]);
}

export default gen;
