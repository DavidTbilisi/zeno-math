// Practice: scatter plots and lines of fit (#652). Easy: the direction of an association, and the point that does not
// follow the pattern. Medium: a prediction from the line of fit, and what its slope and its intercept mean. Hard: a
// residual, which of two lines fits better by the squared residuals, and, in a new setting, whether a strong
// association shows a cause. The direction read backwards, the far point taken for the odd one, the intercept left
// out, the slope and the intercept swapped or the slope read upside down, the residual's sign, the fit judged by one
// point, and cause read from association are slips.
import { fill } from "../chart";
import { num } from "../practiceKit";
import type { Gen, Part, Trap } from "../practiceTypes";
import { lineText, scatterSvg, short, sse, type Line, type Pt } from "../scatterFit";

const place = (body: string) => (x: number, y: number) => `<g transform="translate(${x} ${y})">${body}</g>`;
const picOf = (p: { body: string; w: number; h: number }) => ({ svg: place(p.body), h: p.h, w: p.w });
const LETTERS = ["A", "B", "C", "D"];

const gen: Gen = (r, L, w) => {
  const W = w.scat;
  const pick = (options: string[], right: number, traps: { id: Trap["id"]; at: number; vars?: Record<string, string | number> }[], prompt: string, steps: string[], pic?: Part["pic"]): Part => {
    const opts = options.map((t) => ({ text: t, plain: t, tex: `\\text{${t}}` }));
    return {
      prompt, q: "", ...(pic ? { pic } : {}),
      answer: { k: "pick", options: opts, right, traps: traps.filter((t) => t.at !== right).map((t) => ({ id: t.id, a: { k: "pick", options: opts, right: t.at }, vars: t.vars })) },
      show: opts[right].tex, plain: options[right], format: "pick", steps,
    };
  };
  /** Marks for hours of revision: a line of fit y = mx + c, whole marks, and points scattered about it. */
  const marksLine = (): Line => {
    for (;;) {
      const m = r.pick([2, 2.5, 3, 4, 5]);
      const c = r.pick([10, 15, 20, 25, 30, 35, 40]);
      if (m * 10 + c <= 95) return { m, c };
    }
  };
  const around = (l: Line, spread: number): Pt[] =>
    [1, 2, 3, 4, 5, 6, 7, 8, 9].map((x) => [x, Math.max(2, Math.min(98, Math.round(l.m * x + l.c + (r.next() * 2 - 1) * spread)))] as Pt);
  const marksPic = (pts: Pt[], lines: { l: Line; name?: string }[] = [], names?: (string | null)[]) =>
    picOf(scatterSvg(pts, { xMax: 10, yMax: 100, xStep: 2, yStep: 20, xLabel: W.hours, yLabel: W.mark, lines, names }));

  if (L === 1) {
    if (r.next() < 0.55) {
      const kind = r.pick(["pos", "neg", "none"] as const);
      const pts: Pt[] = kind === "none"
        ? [1, 2, 3, 4, 5, 6, 7, 8, 9].map((x) => [x, r.int(10, 90)] as Pt)
        : around(kind === "pos" ? { m: r.pick([6, 7, 8]), c: r.int(5, 15) } : { m: -r.pick([6, 7, 8]), c: r.int(85, 95) }, 8);
      // A cloud with no pattern: no clear slope either way.
      if (kind === "none") {
        const s = pts.reduce((a, p) => a + (p[0] - 5) * (p[1] - 50), 0);
        if (Math.abs(s) > 300) return gen(r, L, w);
      }
      const right = { pos: 0, neg: 1, none: 2 }[kind];
      return pick([W.positive, W.negative, W.none], right, kind === "none" ? [] : [{ id: "directionReversed", at: 1 - right, vars: { d: kind === "pos" ? W.climb : W.fall } }],
        W.direction, [`\\text{${kind === "pos" ? W.climbs : kind === "neg" ? W.falls : W.noPattern}}`],
        picOf(scatterSvg(pts, { xMax: 10, yMax: 100, xStep: 2, yStep: 20 })));
    }
    // Eight points on a trend, one moved far off it; four are named, among them the farthest along, which fits.
    const l = marksLine();
    const pts = around(l, 4);
    const odd = r.int(2, 6);
    const off = pts[odd][1] > 50 ? -r.int(35, 45) : r.int(35, 45);
    pts[odd] = [pts[odd][0], pts[odd][1] + off];
    const far = 8;
    const others = [0, 1, 3, 4, 5, 6, 7].filter((i) => i !== odd);
    const named = [odd, far, ...[r.pick(others), r.pick(others)]].filter((v, i, a) => a.indexOf(v) === i);
    while (named.length < 4) named.push(others.find((i) => !named.includes(i))!);
    const order = [...named].sort(() => r.next() - 0.5);
    const names = pts.map((_, i) => (order.includes(i) ? LETTERS[order.indexOf(i)] : null));
    return pick(LETTERS, order.indexOf(odd), [{ id: "outlierExtreme", at: order.indexOf(far), vars: { p: LETTERS[order.indexOf(far)] } }],
      W.outlier, [`\\text{${fill(W.offTrend, { p: LETTERS[order.indexOf(odd)] })}}`], marksPic(pts, [], names));
  }

  if (L === 2) {
    const l = marksLine();
    const pic = marksPic(around(l, 6), [{ l }]);
    const eq = lineText(l);
    const t = r.pick(["predict", "slope", "intercept"] as const);
    if (t === "predict") {
      const x = r.pick([3, 4, 5, 6, 7, 8]);
      const v = l.m * x + l.c;
      return {
        prompt: fill(W.predict, { eq, x }), q: "", pic,
        answer: { ...num(v), traps: [{ id: "predictNoIntercept", a: num(l.m * x), vars: { m: short(l.m), x, mx: short(l.m * x), c: l.c, v: short(v) } }] },
        show: short(v), plain: short(v), format: "number",
        steps: [`y = ${short(l.m)} \\times ${x} + ${l.c} = ${short(v)}`],
      };
    }
    const options = [fill(W.slopeMeans, { m: short(l.m) }), fill(W.interceptMeans, { c: l.c }), fill(W.slopeBackwards, { m: short(l.m) })];
    const vars = { m: short(l.m), c: l.c };
    if (t === "slope")
      return pick(options, 0, [{ id: "slopeAsIntercept", at: 1, vars }, { id: "slopePerMark", at: 2, vars }], fill(W.slopeQ, { eq, m: short(l.m) }),
        [`\\text{${fill(W.slopeMeans, vars)}}`], pic);
    return pick(options, 1, [{ id: "interceptAsSlope", at: 0, vars }], fill(W.interceptQ, { eq, c: l.c }), [`\\text{${fill(W.interceptMeans, vars)}}`], pic);
  }

  const t = r.pick(["residual", "better", "cause"] as const);
  if (t === "residual") {
    const l = marksLine();
    const x = r.int(2, 9);
    const p = l.m * x + l.c;
    // Above or below the line, but on the grid.
    const d = r.int(3, 15);
    const v = p + d > 98 ? -d : p - d < 2 ? d : r.pick([-1, 1]) * d;
    const y = p + v;
    return {
      prompt: fill(W.residual, { eq: lineText(l), x, y: short(y) }), q: "", pic: marksPic([...around(l, 6).filter(([px]) => px !== x), [x, y]], [{ l }]),
      answer: { ...num(v), traps: [{ id: "residualSign", a: num(-v), vars: { y: short(y), p: short(p), v: short(v) } }] },
      show: short(v), plain: short(v), format: "number",
      steps: [`\\hat y = ${short(l.m)} \\times ${x} + ${l.c} = ${short(p)}`, `${short(y)} - ${short(p)} = ${short(v)}`],
    };
  }
  if (t === "better") {
    // Four points; line B fits all of them better, line A goes through one of them exactly.
    for (;;) {
      const m = r.pick([1, 2, 3]);
      const c = r.int(1, 5);
      const pts: Pt[] = [1, 2, 3, 4].map((x) => [x, m * x + c + r.pick([-2, -1, 1, 2])] as Pt);
      const B: Line = { m, c };
      const k = r.int(0, 3);
      const ma = m + r.pick([-1, 1]) * r.pick([1, 1.5]);
      const A: Line = { m: ma, c: pts[k][1] - ma * pts[k][0] };
      const [sa, sb] = [sse(pts, A), sse(pts, B)];
      if (sa < sb + 2 || A.c < -3) continue;
      const lines = r.next() < 0.5 ? [A, B] : [B, A];
      const right = lines.indexOf(B);
      const names = [fill(W.lineName, { n: "A", eq: lineText(lines[0]) }), fill(W.lineName, { n: "B", eq: lineText(lines[1]) })];
      const pic = picOf(scatterSvg(pts, { xMax: 5, yMax: Math.ceil((Math.max(...pts.map((p) => p[1])) + 3) / 5) * 5, xStep: 1, yStep: 5, lines: lines.map((l, i) => ({ l, name: LETTERS[i] })) }));
      const sq = (l: Line) => pts.map(([x, y]) => `${short(y - (l.m * x + l.c))}^2`).join(" + ");
      return pick(names, right, [{ id: "fitByOnePoint", at: 1 - right, vars: { n: LETTERS[1 - right], a: short(sa), b: short(sb) } }], W.better, [
        `A: ${sq(lines[0])} = ${short(sse(pts, lines[0]))}`,
        `B: ${sq(lines[1])} = ${short(sse(pts, lines[1]))}`,
      ], pic);
    }
  }
  const k = r.pick(["ice", "shoe", "fire"] as const);
  const Q = { ice: [W.iceQ, W.iceNo, W.iceZ], shoe: [W.shoeQ, W.shoeNo, W.shoeZ], fire: [W.fireQ, W.fireNo, W.fireZ] }[k];
  const right = r.int(0, 1);
  const options = right === 0 ? [Q[1], W.yesStrong] : [W.yesStrong, Q[1]];
  return pick(options, right, [{ id: "correlationCause", at: 1 - right, vars: { z: Q[2] } }], Q[0], [`\\text{${Q[1]}}`]);
};

export default gen;
