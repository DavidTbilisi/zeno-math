// Practice: inequalities in two variables (#656). Easy: whether a point is a solution, and whether the boundary is solid
// or dashed. Medium: the inequality a picture shows, which side x − y > c shades once the sign turns, and the slope of a
// line in standard form or its point-slope equation. Hard: the point in a system's region, a corner of a region, and,
// in a new setting, a limit told in words written as an inequality. The line's own points misjudged, x and y swapped,
// solid and dashed swapped, the side swapped, the slope's sign kept or turned upside down, the point's signs not
// flipped, one inequality of a system checked, "at most" read as "at least" and the two costs swapped are slips.
import { fill } from "../chart";
import { num } from "../practiceKit";
import type { Gen, Part, Trap } from "../practiceTypes";
import { above, FLIP, holds, ineqText, regionSvg, rhs, sgn, strict, TOGGLE, type Ineq, type Op, type Pt } from "../regions";
import { pickPart } from "../tTails";

const place = (body: string) => (x: number, y: number) => `<g transform="translate(${x} ${y})">${body}</g>`;
const picOf = (p: { body: string; w: number; h: number }) => ({ svg: place(p.body), h: p.h, w: p.w });
const OPS: readonly Op[] = ["<", "≤", ">", "≥"];

const gen: Gen = (r, L, w) => {
  const W = w.rgn;
  const withPic = (p: Part, pic: { body: string; w: number; h: number }): Part => ({ ...p, pic: picOf(pic) });
  const line = (): Ineq => ({ m: r.pick([-2, -1, 1, 2, 3]), c: r.int(-3, 3), op: r.pick(OPS) });
  const pt = (p: Pt) => `(${sgn(p[0])}, ${sgn(p[1])})`;

  if (L === 1) {
    if (r.next() < 0.6) {
      // Is the point a solution? A third of the time it lies on the line; otherwise swapping x and y changes the verdict.
      for (;;) {
        const q = line();
        const x = r.int(-4, 4);
        const onIt = r.next() < 0.35;
        const y = onIt ? q.m * x + q.c : r.int(-6, 6);
        if (Math.abs(y) > 6 || x === y) continue;
        const p: Pt = [x, y];
        const ok = holds(q, p);
        const traps: { id: Trap["id"]; at: number; vars?: Record<string, string | number> }[] = [];
        if (onIt) traps.push({ id: "boundaryMisread", at: ok ? 1 : 0, vars: { op: q.op } });
        else if (holds(q, [y, x]) !== ok) traps.push({ id: "coordsSwapped", at: ok ? 1 : 0, vars: { x: sgn(x), y: sgn(y) } });
        else continue;
        const v = q.m * x + q.c;
        return pickPart(r, [W.yes, W.no], ok ? 0 : 1, traps, fill(W.solutionQ, { q: ineqText(q), p: pt(p) }),
          [`${rhs(q.m, q.c).replaceAll("x", `(${sgn(x)})`)} = ${sgn(v)}`, `${sgn(y)} ${q.op} ${sgn(v)}: \\text{${ok ? W.true : W.false}}`]);
      }
    }
    const q = line();
    return pickPart(r, [W.solid, W.dashed], strict(q.op) ? 1 : 0, [{ id: "lineStyleSwapped", at: strict(q.op) ? 0 : 1 }],
      fill(W.styleQ, { q: ineqText(q) }), [`\\text{${W.styleStep}}`]);
  }

  if (L === 2) {
    const t = r.pick(["picture", "turn", "standard", "pointSlope"] as const);
    if (t === "picture") {
      const q = line();
      const options = [q.op, TOGGLE[q.op], FLIP[q.op], FLIP[TOGGLE[q.op]]].map((op) => ineqText({ ...q, op }));
      return withPic(pickPart(r, options, 0, [{ id: "lineStyleSwapped", at: 1 }, { id: "shadeSideSwapped", at: 2 }], W.pictureQ, [`\\text{${W.pictureStep}}`]), regionSvg([q]));
    }
    if (t === "turn") {
      // a·x − b·y op c with b > 0: dividing by −b turns the sign, so > shades below.
      const a = r.int(1, 3);
      const b = r.int(1, 3);
      const c = r.int(-4, 4);
      const op = r.pick(OPS);
      const below = above(op);
      const lhs = `${a === 1 ? "" : a}x − ${b === 1 ? "" : b}y`;
      return pickPart(r, [W.above, W.below], below ? 1 : 0, [{ id: "shadeSideSwapped", at: below ? 0 : 1 }],
        fill(W.turnQ, { q: `${lhs} ${op} ${sgn(c)}` }), [`y ${FLIP[op]} ${rhs(a / b, -c / b)}`, `\\text{${W.turnStep}}`]);
    }
    if (t === "standard") {
      // Ax + By = C with B dividing A: the slope −A/B is a whole number.
      for (;;) {
        const B = r.pick([1, 2, 3, -2]);
        const k = r.pick([-3, -2, 2, 3, 4]);
        const A = B * k;
        const C = r.int(-12, 12);
        const v = -A / B;
        const traps: Trap[] = [{ id: "slopeSignKept", a: num(A / B), vars: { a: sgn(A), b: sgn(B), v: sgn(v) } }, { id: "slopeUpsideDown", a: num(-B / A, 0.005), vars: { a: sgn(A), b: sgn(B), v: sgn(v) } }];
        const eq = `${sgn(A)}x ${B < 0 ? "−" : "+"} ${Math.abs(B) === 1 ? "" : Math.abs(B)}y = ${sgn(C)}`;
        if (C === 0) continue;
        return { prompt: fill(W.standardQ, { eq }), q: "", answer: { ...num(v), traps }, show: sgn(v), plain: String(v), format: "number",
          steps: [`${sgn(B)}y = ${sgn(-A)}x ${C < 0 ? "−" : "+"} ${Math.abs(C)}`, `m = -\\frac{${A}}{${B}} = ${sgn(v)}`] };
      }
    }
    // Point-slope: through (p, q) with slope m, y − q = m(x − p).
    for (;;) {
      const [p, q] = [r.int(-5, 5), r.int(-5, 5)];
      const m = r.pick([-3, -2, -1, 2, 3, 4]);
      if (p === 0 || q === 0 || p === q) continue;
      const form = (a: number, b: number) => `y ${b < 0 ? "+" : "−"} ${Math.abs(b)} = ${sgn(m)}(x ${a < 0 ? "+" : "−"} ${Math.abs(a)})`;
      return pickPart(r, [form(p, q), form(-p, -q), form(q, p)], 0, [{ id: "pointSignsFlipped", at: 1, vars: { p: sgn(p), q: sgn(q) } }, { id: "coordsSwapped", at: 2, vars: { x: sgn(p), y: sgn(q) } }],
        fill(W.pointSlopeQ, { p: pt([p, q]), m: sgn(m) }), [`y - y_1 = m(x - x_1)`]);
    }
  }

  const t = r.pick(["system", "corner", "words"] as const);
  if (t === "system") {
    // Two inequalities and four named points: one in both, one in each alone, one in neither.
    for (;;) {
      const q1: Ineq = { m: r.pick([1, 2, -1]), c: r.int(-2, 2), op: r.pick([">", "≥"]) };
      const q2: Ineq = { m: r.pick([-2, -1, 0]), c: r.int(1, 4), op: r.pick(["<", "≤"]) };
      if (q1.m === q2.m) continue;
      const want = [[true, true], [true, false], [false, true], [false, false]];
      const pts: Pt[] = [];
      for (const [a, b] of want) {
        let tries = 0;
        let p: Pt;
        do p = [r.int(-5, 5), r.int(-5, 5)];
        while ((holds(q1, p) !== a || holds(q2, p) !== b || q1.m * p[0] + q1.c === p[1] || q2.m * p[0] + q2.c === p[1]) && ++tries < 200);
        if (tries < 200) pts.push(p);
      }
      if (pts.length < 4) continue;
      const order = [0, 1, 2, 3].sort(() => r.next() - 0.5);
      const names = ["A", "B", "C", "D"];
      const named = order.map((k, i) => ({ p: pts[k], name: names[i] }));
      const at = (k: number) => order.indexOf(k);
      return withPic(pickPart(r, names, at(0), [{ id: "oneInequalityOnly", at: at(1), vars: { n: names[at(1)] } }, { id: "oneInequalityOnly", at: at(2), vars: { n: names[at(2)] } }],
        fill(W.systemQ, { a: ineqText(q1), b: ineqText(q2) }), [`\\text{${W.systemStep}}`]), regionSvg([q1, q2], { points: named, shade: false }));
    }
  }
  if (t === "corner") {
    // Two lines meeting at a whole-number corner; asked for its x or y.
    for (;;) {
      const [x, y] = [r.int(-3, 4), r.int(-3, 4)];
      const [m1, m2] = [r.pick([1, 2, 3]), r.pick([-1, -2, -3])];
      const q1: Ineq = { m: m1, c: y - m1 * x, op: "≥" };
      const q2: Ineq = { m: m2, c: y - m2 * x, op: "≤" };
      if (Math.abs(q1.c) > 8 || Math.abs(q2.c) > 8) continue;
      const askX = r.next() < 0.5;
      return withPic({ prompt: fill(askX ? W.cornerX : W.cornerY, { a: ineqText(q1), b: ineqText(q2) }), q: "", answer: num(askX ? x : y), show: sgn(askX ? x : y), plain: String(askX ? x : y), format: "number",
        steps: [`${rhs(m1, q1.c)} = ${rhs(m2, q2.c)}`, `x = ${sgn(x)}, \\quad y = ${sgn(y)}`] }, regionSvg([q1, q2]));
    }
  }
  // A new setting: a limit told in words.
  const [cx, cy] = [r.int(2, 6), r.int(2, 6)];
  if (cx === cy) return gen(r, L, w);
  const cap = r.pick([24, 30, 36, 40, 48]);
  const item = r.pick([W.bakeQ, W.craftQ]);
  const right = `${cx}x + ${cy}y ≤ ${cap}`;
  return pickPart(r, [right, `${cx}x + ${cy}y ≥ ${cap}`, `${cy}x + ${cx}y ≤ ${cap}`], 0,
    [{ id: "atMostAsAtLeast", at: 1 }, { id: "costsSwapped", at: 2, vars: { a: cx, b: cy } }], fill(item, { a: cx, b: cy, n: cap }), [`\\text{${W.wordsStep}}`]);
};

export default gen;
