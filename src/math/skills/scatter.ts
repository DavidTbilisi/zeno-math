// Practice: scatter plots and lines of fit (#652). Easy: the direction of an association, and the point that does not
// follow the pattern. Medium: a prediction from the line of fit, and what its slope and its intercept mean. Hard: a
// residual, which of two lines fits better by the squared residuals, and, in a new setting, whether a strong
// association shows a cause. The direction read backwards, the far point taken for the odd one, the intercept left
// out, the slope and the intercept swapped or the slope read upside down, the residual's sign, the fit judged by one
// point, and cause read from association are slips.
// Since #737 half the questions at each level come from `more()`: L1 a point placed from its two numbers, which data
// suits a scatter plot, which variable goes across, and a plot described as strong, weak or curved; L2 the slope of a
// drawn line of fit from two of its points and its equation picked; L3 r matched to a plot, a residual plot read, the
// pull of a far point on the slope, interpolation or extrapolation, and a prediction from regression output.
import { fill } from "../chart";
import { num } from "../practiceKit";
import type { Gen, Part, Trap } from "../practiceTypes";
import { tableSvg } from "../displays";
import { shuffled } from "../logicSets";
import { bestLine, corr, lineText, residualSvg, scatterSvg, short, sse, type Line, type Pt } from "../scatterFit";

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

  const K = w.scK;
  /** The options in a random order, the right one and the slips moved with them. */
  const mixed = (options: string[], right: number, traps: { id: Trap["id"]; at: number; vars?: Record<string, string | number> }[], prompt: string, steps: string[], p?: Part["pic"]): Part => {
    const pos = shuffled(r, options.map((_, i) => i));
    const shown = options.map((_, j) => options[pos.indexOf(j)]);
    return pick(shown, pos[right], traps.map((t) => ({ ...t, at: pos[t.at] })), prompt, steps, p);
  };
  /** A number answer; a slip equal to the answer or to one before it is dropped. */
  const numPart = (prompt: string, v: number, traps: Trap[], steps: string[], p?: Part["pic"]): Part => {
    const val = (t: Trap) => (t.a.k === "num" ? t.a.v : NaN);
    const far = (a: number, b: number) => Math.abs(a - b) > 0.02;
    return {
      prompt, q: "", ...(p ? { pic: p } : {}),
      answer: { ...num(v), traps: traps.filter((t, i) => far(val(t), v) && traps.findIndex((u) => !far(val(u), val(t))) === i) },
      show: short(v), plain: short(v), format: "number", steps,
    };
  };
  const trap = (id: Trap["id"], v: number, vars: Record<string, string | number>): Trap => ({ id, a: num(Math.round(v * 100) / 100, 0.006), vars });
  const fine = (pts: Pt[], lines: { l: Line; name?: string }[], names?: (string | null)[]) =>
    picOf(scatterSvg(pts, { xMax: 10, yMax: 100, xStep: 2, yStep: 10, xLabel: W.hours, yLabel: W.mark, lines, names }));
  const plain = (pts: Pt[], xMax = 10) => picOf(scatterSvg(pts, { xMax, yMax: 100, xStep: 2, yStep: 20 }));
  const noisy = (f: (x: number) => number, spread: number): Pt[] =>
    [1, 2, 3, 4, 5, 6, 7, 8, 9].map((x) => [x, Math.max(2, Math.min(98, Math.round(f(x) + (r.next() * 2 - 1) * spread)))] as Pt);

  const more = (): Part => {
    if (L === 1) {
      const t = r.pick(["point", "suit", "axis", "describe"] as const);
      if (t === "point") {
        // Cars on a falling trend; the car asked about, its numbers swapped, and two others are named.
        for (;;) {
          const [a, b] = [r.int(1, 9), r.int(1, 9)];
          if (Math.abs(a - b) < 2) continue;
          const pts: Pt[] = [[a, b], [b, a]];
          for (let x = 1; x <= 9 && pts.length < 9; x++) {
            const y = Math.max(1, Math.min(9, 10 - x + r.int(-1, 1)));
            if (!pts.some((p) => (p[0] === x && p[1] === y) || (p[0] === x && Math.abs(p[1] - y) < 2))) pts.push([x, y]);
          }
          if (pts.length < 6) continue;
          const order = shuffled(r, [0, 1, 2, 3]);
          const names = pts.map((_, i) => (i < 4 ? LETTERS[order[i]] : null));
          return pick(LETTERS, order[0], [{ id: "pointAxesSwapped", at: order[1], vars: { a, b, p: LETTERS[order[1]] } }], fill(K.pointQ, { a, b }),
            [`\\text{${fill(K.pointWhy, { a, b, p: LETTERS[order[0]] })}}`],
            picOf(scatterSvg(pts, { xMax: 10, yMax: 10, xStep: 1, yStep: 1, xLabel: K.age, yLabel: K.value, names })));
        }
      }
      if (t === "suit") {
        const k = r.int(0, 1);
        const o = [[K.suit0, K.suit0cat, K.suit0one], [K.suit1, K.suit1cat, K.suit1one]][k];
        return mixed(o, 0, [{ id: "categoryForScatter", at: 1 }, { id: "oneVariableForScatter", at: 2 }], K.suitQ, [`\\text{${K.suitWhy}}`]);
      }
      if (t === "axis") {
        const [q, x, y] = r.next() < 0.5 ? [K.axisQ0, K.temp, K.sold] : [K.axisQ1, K.hoursCap, K.markCap];
        return mixed([x, y], 0, [{ id: "responseOnX", at: 1, vars: { x, y } }], q, [`\\text{${K.axisWhy}}`]);
      }
      const kind = r.pick(["strong", "weak", "curve"] as const);
      for (;;) {
        const sl = r.pick([2, 2.5, 3]);
        const pts = kind === "strong" ? noisy((x) => sl * x + 30, 3)
          : kind === "weak" ? noisy((x) => 8 * x + 10, 45)
          : (() => { const up = r.next() < 0.5; return noisy((x) => (up ? 15 + 4.5 * (x - 5) ** 2 : 88 - 4.5 * (x - 5) ** 2), 3); })();
        const c = Math.abs(corr(pts));
        if (kind === "strong" ? c < 0.9 : kind === "weak" ? c < 0.3 || c > 0.65 : c > 0.3) continue;
        const right = { strong: 0, weak: 1, curve: 2 }[kind];
        return pick([K.strongLin, K.weakLin, K.curved], right, [{ id: kind === "curve" ? "curveAsLinear" : "strengthBySteepness", at: kind === "strong" ? 1 : kind === "weak" ? 0 : 1 }],
          K.describeQ, [`\\text{${{ strong: K.whyStrong, weak: K.whyWeak, curve: K.whyCurve }[kind]}}`], plain(pts));
      }
    }

    if (L === 2) {
      const l = marksLine();
      const [y1, y2] = [l.m * 2 + l.c, l.m * 8 + l.c];
      const pic = fine(around(l, 6), [{ l }]);
      const sv = { dy: short(y2 - y1), dx: 6, v: short(l.m) };
      if (r.next() < 0.5)
        return numPart(fill(K.slopeEstQ, { p: `(2, ${short(y1)})`, q: `(8, ${short(y2)})` }), l.m,
          [trap("slopeRunOverRise", 6 / (y2 - y1), sv), trap("slopeFromOrigin", y2 / 8, { ...sv, y: short(y2), x: 8 })],
          [`\\frac{${short(y2)} - ${short(y1)}}{8 - 2} = \\frac{${short(y2 - y1)}}{6} = ${short(l.m)}`], pic);
      const options = [lineText(l), lineText({ m: -l.m, c: l.c }), lineText({ m: l.m, c: y1 }), lineText({ m: Math.round(100 / l.m) / 100, c: l.c })];
      return mixed(options, 0, [{ id: "slopeSignFlipped", at: 1, vars: { m: short(l.m) } }, { id: "interceptAtFirstX", at: 2, vars: { y: short(y1), c: l.c } }, { id: "slopeRunOverRise", at: 3, vars: sv }],
        K.eqQ, [`\\text{${fill(K.eqWhy, { c: l.c, m: short(l.m) })}}`], pic);
    }

    const t = r.pick(["r", "resid", "influence", "extrap", "output"] as const);
    if (t === "r") {
      const [s, strong] = [r.pick([-1, 1]), r.next() < 0.5];
      for (;;) {
        const pts = noisy((x) => 50 + s * 8 * (x - 5), strong ? 12 : 60);
        const c = corr(pts);
        if (Math.sign(c) !== s || (strong ? Math.abs(c) < 0.85 || Math.abs(c) > 0.97 : Math.abs(c) < 0.3 || Math.abs(c) > 0.55)) continue;
        const right = s < 0 ? (strong ? 0 : 1) : strong ? 3 : 2;
        return pick(["r = −0.9", "r = −0.4", "r = 0.4", "r = 0.9"], right,
          [{ id: "rSignIgnored", at: 3 - right, vars: { d: s > 0 ? K.dirPos : K.dirNeg } }, { id: "rStrengthMisjudged", at: s < 0 ? 1 - right : 5 - right }],
          K.rQ, [`\\text{${s > 0 ? K.dirPos : K.dirNeg}}`, `r \\approx ${short(c)}`], plain(pts));
      }
    }
    if (t === "resid") {
      const curve = r.next() < 0.5;
      for (;;) {
        const a = r.pick([-0.5, 0.5]);
        const pts: Pt[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((x) => [x, Math.round((curve ? a * ((x - 5.5) ** 2 - 8.25) + (r.next() * 2 - 1) : (r.next() * 2 - 1) * 4.5) * 10) / 10] as Pt);
        const bend = Math.abs(corr(pts.map(([x, y]) => [(x - 5.5) ** 2, y] as Pt)));
        if (curve ? bend < 0.85 : bend > 0.3 || Math.abs(corr(pts)) > 0.3) continue;
        return pick([K.residYes, K.residNo], curve ? 1 : 0, [{ id: curve ? "residualPatternIgnored" : "residualsNotZero", at: curve ? 0 : 1 }], K.residQ,
          [`\\text{${curve ? K.residWhyCurve : K.residWhyRandom}}`], picOf(residualSvg(pts, 10, 2 * Math.ceil((Math.max(...pts.map(([, y]) => Math.abs(y))) + 0.3) / 2), K.residual)));
      }
    }
    if (t === "influence") {
      for (;;) {
        const l: Line = { m: r.pick([4, 5, 6]), c: r.int(10, 20) };
        const pts: Pt[] = [1, 2, 3, 4, 5, 6, 7, 8].map((x) => [x, Math.round(l.m * x + l.c + r.int(-5, 5))] as Pt);
        const top = l.m * 12 + l.c;
        const up = top + 40 <= 98 && r.next() < 0.5;
        const P: Pt = [12, Math.round(up ? top + r.int(30, 40) : top - r.int(40, 55))];
        const [s1, s0] = [bestLine([...pts, P]).m, bestLine(pts).m];
        if (Math.abs(s1 - s0) / s0 < 0.25) continue;
        const right = s0 > s1 ? 0 : 1;
        const vars = { a: short(s1), b: short(s0) };
        return pick([K.steeper, K.lessSteep, K.same], right, [{ id: "influenceIgnored", at: 2, vars }, { id: "influenceReversed", at: 1 - right, vars }], K.inflQ,
          [`\\text{${fill(K.inflWhy, vars)}}`], picOf(scatterSvg([...pts, P], { xMax: 12, yMax: 100, xStep: 2, yStep: 20, lines: [{ l: bestLine([...pts, P]) }], names: [...pts.map(() => null), "P"] })));
      }
    }
    if (t === "extrap") {
      const inside = r.next() < 0.5;
      const x = inside ? r.pick([2.5, 4.5, 6.5, 7.5]) : r.pick([12, 15, 20]);
      const vars = { x: short(x), lo: 1, hi: 9, w: inside ? K.insideWord : K.outsideWord };
      return pick([K.interp, K.extrap], inside ? 0 : 1, [{ id: "interpExtrapSwapped", at: inside ? 1 : 0, vars }], fill(K.extrapQ, vars),
        [`\\text{${fill(K.extrapWhy, vars)}}`], marksPic(around(marksLine(), 6)));
    }
    const c = r.int(150, 450) / 10;
    const m = r.int(25, 75) / 10;
    const se = r.int(3, 12) / 10;
    const x = r.int(2, 8);
    const v = Math.round((c + m * x) * 100) / 100;
    const vars = { c: short(c), m: short(m), x, v: short(v) };
    return numPart(fill(K.outputQ, { x }), v, [trap("coefSwapped", m + c * x, vars), trap("seForSlope", c + se * x, vars)],
      [`\\hat y = ${short(c)} + ${short(m)} \\times ${x} = ${short(v)}`],
      picOf(tableSvg([K.predictor, K.coef, K.seCoef], [[K.constant, c.toFixed(1), (r.int(15, 40) / 10).toFixed(1)], [K.hoursCap, m.toFixed(1), se.toFixed(1)]])));
  };
  if (r.int(0, 9) >= 5) return more();

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
