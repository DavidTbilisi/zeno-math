// Practice: Find the rule. #722 added, four times in ten at the medium and hard levels (the easy one is grade 3 and
// stays as it was): a rule in two variables in words, and how the terms of two patterns compare; then, in a new
// setting, two patterns as points of a graph, and the y that goes with a given x when neither starts at 0. Adding
// before multiplying, the difference of the steps taken for their ratio, x and y swapped, and the value of x taken
// for the term number are slips.
import { fill } from "../chart";
import { machineAnswer, ruleQuestion, ruleSteps, ruleTable, scaledOutput, undoOrder } from "../machine";
import { num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { pickPart } from "../tTails";

const gen: Gen = (r, L, w) => {
  if (L > 1 && r.int(0, 9) >= 6) return more(r, L, r.int(0, 9), w);
  // A machine's rule from four pairs (src/math/machine.ts): what comes out for a bigger number, or what went in.
  const q = ruleQuestion(L, r.next);
  const v = machineAnswer(q);
  const traps: Trap[] = [];
  const scaled = scaledOutput(q);
  if (scaled) traps.push({ id: "scaledOutput", a: num(scaled.v), vars: { k: scaled.k, o: scaled.o } });
  const back = undoOrder(q);
  // Named only when the machine adds: "take −4 away first" would say it worse than the steps do.
  if (back !== null && q.rule.add > 0 && q.ask.dir === "in")
    traps.push({ id: "undoOrder", a: num(back), vars: { rule: `${q.rule.mul}n + ${q.rule.add}`, a: q.rule.add, out: q.ask.out, r: q.ask.out - q.rule.add, m: q.rule.mul } });
  return {
    prompt: q.ask.dir === "out" ? fill(w.prompts.findRuleOut, { n: q.ask.n }) : fill(w.prompts.findRuleIn, { out: q.ask.out }),
    q: ruleTable(q),
    answer: { ...num(v), traps },
    show: q.ask.dir === "out" ? `${q.ask.n} \\mapsto ${v}` : `${v} \\mapsto ${q.ask.out}`,
    plain: String(v),
    format: "number",
    steps: ruleSteps(q),
  };
};

const sgn = (v: number) => String(v).replace(/^-/, "−");

function more(r: Rng, L: number, kind: number, w: PracticeWords): Part {
  const W = w.fndP;
  const numQ = (prompt: string, v: number, slip: [Trap["id"], number, Record<string, string | number>], steps: string[]): Part => ({
    prompt, q: "", answer: { ...num(v), traps: slip[1] !== v ? [{ id: slip[0], a: num(slip[1]), vars: { x: sgn(slip[1]), v: sgn(v), ...slip[2] } }] : [] }, show: sgn(v), plain: String(v), format: "number", steps,
  });
  if (L === 2) {
    if (kind <= 4) {
      // A rule in words: a times x first, then b more or less.
      const [a, b, n] = [r.int(2, 6), r.int(1, 9), r.int(2, 12)];
      const more = r.next() < 0.6;
      const v = more ? a * n + b : a * n - b;
      return numQ(fill(more ? W.ruleMore : W.ruleLess, { a, b, n }), v, ["ruleOrderSwapped", more ? a * (n + b) : a * (n - b), { a, b, w: `${a} × ${n} ${more ? "+" : "−"} ${b}` }], [`y = ${a} \\times ${n} ${more ? "+" : "-"} ${b} = ${v}`]);
    }
    // Two patterns from 0: each term of B is q/p times A's.
    const p = r.int(2, 5);
    const t = r.int(2, 4);
    const q = p * t;
    const [s3, t3] = [3 * p, 3 * q];
    return numQ(fill(W.patterns, { p, q }), t, ["patternGapAsRatio", q - p, { p, q, w: `${t3} ÷ ${s3} = ${t}` }], [`A: 0, ${p}, ${2 * p}, ${3 * p}`, `B: 0, ${q}, ${2 * q}, ${3 * q}`, `${t3} \\div ${s3} = ${t}`]);
  }
  if (kind <= 4) {
    // Two patterns as points (x, y) of a graph.
    const [p, q] = [r.int(1, 4), r.int(2, 6)];
    if (p === q) return more(r, L, kind, w);
    const k = r.int(2, 5);
    const pt = (x: number, y: number) => `(${x}, ${y})`;
    const right = pt(k * p, k * q);
    const slip = pt(k * q, k * p);
    return pickPart(r, [right, slip, pt(k * p, (k + 1) * q), pt(k * p + 1, k * q + 1)], 0, [{ id: "pointCoordsSwapped", at: 1, vars: { x: slip, v: right, w: `${k} × ${p} = ${k * p}, ${k} × ${q} = ${k * q}` } }],
      fill(W.graphPts, { p, q }), [`x: 0, ${p}, ${2 * p}, \\dots`, `y: 0, ${q}, ${2 * q}, \\dots`, right]);
  }
  // The y with a given x, when the patterns start elsewhere: how many steps along that x is.
  const [x0, p, y0, q] = [r.int(1, 5), r.int(2, 4), r.int(0, 9), r.int(2, 7)];
  const t = r.int(3, 8);
  const n = x0 + p * t;
  const v = y0 + q * t;
  return numQ(fill(W.termOf, { x0, p, y0, q, n }), v, ["termNumberForValue", y0 + q * n, { n, t, w: `${y0} + ${q} × ${t}` }], [`(${n} - ${x0}) \\div ${p} = ${t}`, `y = ${y0} + ${q} \\times ${t} = ${v}`]);
}

export default gen;
