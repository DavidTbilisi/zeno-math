// Practice: Inequalities. Every level keeps its older question half the time (solving, a compound inequality, the
// lift). #723 added the rest of the unit: easy, a number tested against x < t, the inequality a number line shows,
// the line an inequality has, one-step inequalities, and words such as "at least" written as one; medium, values
// tested in a two-step inequality and two-step stories asking at most or at least how many; hard, a compound
// inequality read off a line, numbers tested against an "or", and the "or" a line shows. The end point taken in by
// < or >, the line read the wrong way, the operation done again instead of undone, "at least" read as more than, a
// count rounded the wrong way and "or" read as "and" are slips, besides the end point and the sign not turned round.
import { REL_TEX } from "../algebra";
import { fill, r2 } from "../chart";
import { ineqLineSvg } from "../ineqFind";
import { FLIP, ineqPlain, ineqTex, num, polyStr, T } from "../practiceKit";
import type { Bound, Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { pickPart } from "../tTails";

const gen: Gen = (r, L, w) => {
  if (r.int(0, 9) >= 5) return more(r, L, r.int(0, 9), w);
  const RELS = ["<", "<=", ">", ">="] as const;
  /** x rel v as ends of the set. */
  const ends = (rel: string, v: number): [Bound | null, Bound | null] => (rel[0] === ">" ? [{ v, closed: rel === ">=" }, null] : [null, { v, closed: rel === "<=" }]);
  const result = (eq: string, q: string, lo: Bound | null, hi: Bound | null, flipped: boolean) => {
    const toggle = (b: Bound | null) => b && { ...b, closed: !b.closed };
    const traps: Trap[] = [{ id: "boundary", a: { k: "ineq", lo: toggle(lo), hi: toggle(hi) } }];
    // Not flipped: the ends swap sides (x > 4 for x < 4), each keeping its own sign.
    if (flipped) traps.unshift({ id: "noFlip", a: { k: "ineq", lo: hi, hi: lo } });
    return { prompt: w.prompts.ineqSolve, q, answer: { k: "ineq" as const, lo, hi, traps }, show: ineqTex(lo, hi), plain: ineqPlain(lo, hi), format: "inequality" as const, solution: { kind: "algebra" as const, spec: { topic: "inequality", eq, method: "factor" } } };
  };
  const side = (s: string) => T(s);
  if (L < 3) {
    const rel = r.pick(RELS);
    const x0 = r.nz(-9, 9);
    let left: string;
    let right: string;
    let coef: number;
    if (L === 1) {
      const a = r.int(2, 9);
      const b = r.nz(-15, 15);
      if (r.next() < 0.5) {
        [left, right, coef] = [polyStr([b, a]), String(a * x0 + b), a];
      } else {
        // ax + b rel cx + d, with c < a: no flip.
        const c = r.int(1, a - 1);
        [left, right, coef] = [polyStr([b, a]), polyStr([(a - c) * x0 + b, c]), a - c];
      }
    } else {
      const a = r.int(2, 9);
      const b = r.int(-12, 15);
      if (r.next() < 0.5) {
        // b − ax rel c
        [left, right, coef] = [polyStr([b, -a]), String(b - a * x0), -a];
      } else {
        const c = a + r.int(1, 5);
        [left, right, coef] = [polyStr([b, a]), polyStr([b + (a - c) * x0, c]), a - c];
      }
    }
    const final = coef < 0 ? FLIP[rel] : rel;
    const [lo, hi] = ends(final, x0);
    return result(`${left} ${rel} ${right}`, `${side(left)} ${REL_TEX[rel]} ${side(right)}`, lo, hi, coef < 0);
  }
  if (r.next() < 0.6) {
    const x1 = r.int(-8, 4);
    const x2 = x1 + r.int(2, 8);
    const a = r.int(2, 5) * (r.next() < 0.35 ? -1 : 1);
    const b = r.int(-9, 9);
    const [r1, r2] = [r.pick(["<", "<="] as const), r.pick(["<", "<="] as const)];
    const [L1, L2] = a > 0 ? [a * x1 + b, a * x2 + b] : [a * x2 + b, a * x1 + b];
    const lo = a > 0 ? { v: x1, closed: r1 === "<=" } : { v: x1, closed: r2 === "<=" };
    const hi = a > 0 ? { v: x2, closed: r2 === "<=" } : { v: x2, closed: r1 === "<=" };
    const mid = polyStr([b, a]);
    return result(`${L1} ${r1} ${mid} ${r2} ${L2}`, `${L1} ${REL_TEX[r1]} ${side(mid)} ${REL_TEX[r2]} ${L2}`, lo, hi, a < 0);
  }
  const [m, p, b] = [50 * r.int(4, 20), r.int(60, 95), r.int(15, 45)];
  const v = Math.floor((m - p) / b);
  return {
    prompt: fill(w.prompts.ineqWord, { m, p, b }),
    q: "",
    answer: num(v),
    show: String(v),
    plain: String(v),
    format: "number",
    solution: { kind: "algebra", spec: { topic: "inequality", eq: `${b}n + ${p} <= ${m}`, method: "factor" } },
  };
};

type Rel = "<" | "<=" | ">" | ">=";
const SAY: Record<Rel, string> = { "<": "<", "<=": "≤", ">": ">", ">=": "≥" };
const TOGGLE: Record<Rel, Rel> = { "<": "<=", "<=": "<", ">": ">=", ">=": ">" };
const sg = (v: number) => String(v).replace(/^-/, "−");
const holds = (u: number, rel: Rel, v: number) => (rel === "<" ? u < v : rel === "<=" ? u <= v : rel === ">" ? u > v : u >= v);
/** x rel t as the ends of its set. */
const endsOf = (rel: Rel, t: number): [Bound | null, Bound | null] => (rel[0] === ">" ? [{ v: t, closed: rel === ">=" }, null] : [null, { v: t, closed: rel === "<=" }]);
const place = (body: string) => (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${body}</g>`;
const linePic = (lo: number, hi: number, sets: { lo: Bound | null; hi: Bound | null }[]) => {
  const p = ineqLineSvg(lo, hi, sets);
  return { svg: place(p.body), w: p.w, h: p.h };
};

/** x rel t to type, with the end point toggled as `boundary` and other slips. */
function ineqPart(prompt: string, q: string, rel: Rel, t: number, slips: [Trap["id"], Rel, number, Record<string, string | number>][], steps: string[]): Part {
  const [lo, hi] = endsOf(rel, t);
  const v = ineqPlain(lo, hi).replace(/<=/, "≤").replace(/>=/, "≥").replace(/-/g, "−");
  // The end point toggled is "boundary", unless a slip of the question's own names it better.
  const named = slips.some(([, sr, st]) => sr === TOGGLE[rel] && st === t);
  const traps: Trap[] = named ? [] : [{ id: "boundary", a: { k: "ineq", lo: lo && { ...lo, closed: !lo.closed }, hi: hi && { ...hi, closed: !hi.closed } } }];
  for (const [id, sr, st, vars] of slips) {
    if (sr === rel && st === t) continue;
    const [a, b] = endsOf(sr, st);
    traps.push({ id, a: { k: "ineq", lo: a, hi: b }, vars: { v, x: `x ${SAY[sr]} ${sg(st)}`, ...vars } });
  }
  return { prompt, q, answer: { k: "ineq", lo, hi, traps }, show: ineqTex(lo, hi), plain: ineqPlain(lo, hi), format: "inequality", steps };
}

/** Distinct numbers, the first kept first. */
const uniq = (xs: number[]) => xs.filter((x, i) => xs.indexOf(x) === i);

function more(r: Rng, L: number, kind: number, w: PracticeWords): Part {
  const W = w.inqP;
  const rel = r.pick(["<", "<=", ">", ">="] as const);
  const t = r.nz(-5, 5);
  const side = (k: Rel) => (k[0] === "<" ? W.smaller : W.larger);
  if (L === 1) {
    if (kind <= 1) {
      // A number tested against x rel t: one inside, the end point (a slip when it is left out), two outside.
      const dir = rel[0] === "<" ? -1 : 1;
      const right = rel.length === 2 && r.next() < 0.4 ? t : t + dir * r.int(1, 4);
      const outs = uniq([t - dir * r.int(1, 3), t - dir * r.int(4, 6), t - dir * 7].filter((x) => x !== t));
      const opts = uniq([right, ...(right === t ? [] : rel.length === 1 ? [t] : []), ...outs]).slice(0, 4).map(sg);
      const at = opts.indexOf(sg(t));
      const traps = rel.length === 1 && at > 0 ? [{ id: "strictEndIncluded" as const, at, vars: { t: sg(t), r: SAY[rel], v: sg(right) } }] : [];
      return pickPart(r, opts, 0, traps, fill(W.test, { e: `x ${SAY[rel]} ${sg(t)}` }), [`${sg(right)} ${SAY[rel]} ${sg(t)}`.replace(/−/g, "-").replace("≤", "\\le").replace("≥", "\\ge")]);
    }
    if (kind <= 3) {
      // The inequality a number line shows.
      const [lo, hi] = endsOf(rel, t);
      return { ...ineqPart(W.fromLine, "", rel, t, [["rayDirectionSwapped", (rel[0] === "<" ? ">" : "<") + (rel.length === 2 ? "=" : "") as Rel, t, { t: sg(t), d: side(rel) }]], [ineqTex(lo, hi)]), pic: linePic(t - 5, t + 5, [{ lo, hi }]) };
    }
    if (kind <= 5) {
      // The line an inequality has, described: the dot and the side.
      const desc = (k: Rel) => fill(W.lineSays, { d: k.length === 2 ? W.filled : W.open, t: sg(t), s: k[0] === "<" ? W.left : W.right });
      const flip = ((rel[0] === "<" ? ">" : "<") + (rel.length === 2 ? "=" : "")) as Rel;
      const opts = [rel, TOGGLE[rel], flip, TOGGLE[flip]].map(desc);
      return pickPart(r, opts, 0, [{ id: "boundary", at: 1 }, { id: "rayDirectionSwapped", at: 2, vars: { t: sg(t), d: side(rel), v: opts[0], x: opts[2] } }],
        fill(W.toLine, { e: `x ${SAY[rel]} ${sg(t)}` }), [`\\text{${opts[0]}}`]);
    }
    if (kind <= 7) {
      // One step: x + b, x − b, ax or x/a against c; −ax turns the sign round.
      const form = r.int(0, 4);
      const a = r.int(2, 6);
      const b = r.int(1, 9);
      if (form <= 1) {
        const plus = form === 0;
        const c = t + (plus ? b : -b);
        const e = `x ${plus ? "+" : "−"} ${b} ${SAY[rel]} ${sg(c)}`;
        const st = plus ? c + b : c - b;
        return withQ(ineqPart(W.solve, "", rel, t, [["oneStepOpWrong", rel, st, { w: `${sg(c)} ${plus ? "−" : "+"} ${b} = ${sg(t)}` }]], [ineqTex(...endsOf(rel, t))]), e);
      }
      if (form <= 3) {
        const times = form === 2;
        const c = times ? a * t : t;
        const x = times ? t : t * a;
        const e = times ? `${a}x ${SAY[rel]} ${sg(c)}` : `x/${a} ${SAY[rel]} ${sg(c)}`;
        const st = times ? c * a : c / a;
        const part = ineqPart(W.solve, "", rel, x, Number.isInteger(st) ? [["oneStepOpWrong", rel, st, { w: times ? `${sg(c)} ÷ ${a} = ${sg(x)}` : `${sg(c)} × ${a} = ${sg(x)}` }]] : [], [ineqTex(...endsOf(rel, x))]);
        return withQ(part, e);
      }
      // −ax rel c: dividing by −a turns the sign round.
      const c = -a * t;
      const fl = FLIP[rel] as Rel;
      return withQ(ineqPart(W.solve, "", fl, t, [["noFlip", rel, t, {}]], [`x ${SAY[fl]} ${sg(c)} \\div (-${a})`.replace("≤", "\\le").replace("≥", "\\ge"), ineqTex(...endsOf(fl, t))]), `−${a}x ${SAY[rel]} ${sg(c)}`);
    }
    // Words: at least, at most, more than, fewer than.
    const n = r.int(3, 40);
    const phrases: [string, Rel][] = [[W.atLeast, ">="], [W.atMost, "<="], [W.moreThan, ">"], [W.lessThan, "<"], [W.noMore, "<="], [W.noLess, ">="]];
    const [p0, pr] = r.pick(phrases);
    const p = fill(p0, { n });
    const story = r.pick([W.story0, W.story1, W.story2]);
    return ineqPart(fill(story, { p }), "", pr, n, [["wordsEndMisread", TOGGLE[pr], n, { p, e: pr.length === 2 ? W.takesEnd : W.leavesEnd }]], [ineqTex(...endsOf(pr, n))]);
  }
  if (L === 2) {
    if (kind <= 4) {
      // Which value solves ax + b rel c; with a negative a the side turns round.
      const a = r.pick([-4, -3, -2, 2, 3, 4]);
      const b = r.int(-9, 9);
      const c = a * t + b;
      const fl = (a < 0 ? FLIP[rel] : rel) as Rel;
      const dir = fl[0] === "<" ? -1 : 1;
      const right = t + dir * r.int(1, 3);
      const wrongSide = t - dir * r.int(1, 3);
      const opts = uniq([right, wrongSide, ...(rel.length === 1 ? [t] : [t - dir * 4]), t - dir * 5]).slice(0, 4);
      const traps: { id: Trap["id"]; at: number; vars?: Record<string, string | number> }[] = [];
      if (a < 0) traps.push({ id: "noFlip", at: 1 });
      if (rel.length === 1) traps.push({ id: "strictEndIncluded", at: 2, vars: { t: sg(t), r: SAY[fl], v: sg(right) } });
      const e = `${polyStr([b, a]).replace(/-/g, "−")} ${SAY[rel]} ${sg(c)}`;
      if (opts.some((x) => x !== right && holds(a * x + b, rel, c))) return more(r, L, kind, w);
      return pickPart(r, opts.map(sg), 0, traps, fill(W.testTwo, { e }), [`${a}(${right}) ${b < 0 ? "-" : "+"} ${Math.abs(b)} = ${a * right + b}`, `x ${SAY[fl]} ${sg(t)}`.replace(/−/g, "-").replace("≤", "\\le").replace("≥", "\\ge")]);
    }
    // Two-step stories: at most how many (rounded down), or at least how many (rounded up).
    const most = kind <= 7;
    const p = r.pick([3, 4, 6, 7, 8, 9, 12, 15]);
    const b = r.pick([5, 10, 12, 15, 20, 25]);
    const k = r.int(3, 12);
    const m = b + p * k + r.int(1, p - 1);
    const exact = (m - b) / p;
    const v = most ? Math.floor(exact) : Math.ceil(exact);
    const x = most ? v + 1 : v - 1;
    return {
      prompt: fill(most ? W.budget : W.points, { m, p, b }), q: "",
      answer: { ...num(v), traps: [{ id: "roundedWrongWay", a: num(x), vars: { x, v, w: `${b} + ${p} × ${x} = ${b + p * x}`, y: fill(most ? W.overBudget : W.short, { m }) } }] },
      show: String(v), plain: String(v), format: "number",
      steps: [`${b} + ${p}n ${most ? "\\le" : "\\ge"} ${m}`, `n ${most ? "\\le" : "\\ge"} ${r2(exact)}`, `n = ${v}`],
    };
  }
  // A compound inequality read off a line: t1 rel x rel t2.
  const t1 = r.int(-6, 2);
  const t2 = t1 + r.int(2, 6);
  const [c1, c2] = [r.next() < 0.5, r.next() < 0.5];
  if (kind <= 3) {
    const lo = { v: t1, closed: c1 };
    const hi = { v: t2, closed: c2 };
    const tog = (b: Bound) => ({ ...b, closed: !b.closed });
    return {
      prompt: W.fromLine, q: "", answer: { k: "ineq", lo, hi, traps: [{ id: "boundary", a: { k: "ineq", lo: tog(lo), hi: tog(hi) } }] },
      show: ineqTex(lo, hi), plain: ineqPlain(lo, hi), format: "inequality", steps: [ineqTex(lo, hi)], pic: linePic(t1 - 3, t2 + 3, [{ lo, hi }]),
    };
  }
  // x < t1 or x > t2: the two rays.
  const r1: Rel = c1 ? "<=" : "<";
  const r2_: Rel = c2 ? ">=" : ">";
  const orSay = (a: Rel, b: Rel) => `x ${SAY[a]} ${sg(t1)} ${W.or} x ${SAY[b]} ${sg(t2)}`;
  // What is left between the rays (the "and" a slip reads), and the same with its ends taken the other way.
  const between = `${sg(t1)} ${SAY[TOGGLE[r1]]} x ${SAY[TOGGLE[FLIP[r2_] as Rel]]} ${sg(t2)}`;
  const betweenToggled = `${sg(t1)} ${SAY[r1]} x ${SAY[FLIP[r2_] as Rel]} ${sg(t2)}`;
  if (kind <= 6) {
    // Which number solves the "or": one beyond an end, the others between (a slip when "or" is read as "and").
    const right = r.next() < 0.5 ? t1 - r.int(1, 3) : t2 + r.int(1, 3);
    const inside = t1 + 1 + r.int(0, t2 - t1 - 2);
    const opts = uniq([right, inside, ...(c1 ? [] : [t1]), ...(c2 ? [] : [t2]), t1 + 1, t2 - 1].filter((x) => x === right || !(holds(x, r1, t1) || holds(x, r2_, t2)))).slice(0, 4);
    if (opts.length < 3) return more(r, L, 7, w);
    const traps: { id: Trap["id"]; at: number; vars?: Record<string, string | number> }[] = [{ id: "orReadAsAnd", at: 1, vars: { x: sg(inside), v: sg(right), e: orSay(r1, r2_) } }];
    const endAt = opts.findIndex((x, i) => i > 1 && (x === t1 || x === t2));
    if (endAt > 0) traps.push({ id: "strictEndIncluded", at: endAt, vars: { t: sg(opts[endAt]), r: opts[endAt] === t1 ? "<" : ">", v: sg(right) } });
    return pickPart(r, opts.map(sg), 0, traps, fill(W.test, { e: orSay(r1, r2_) }), [`${sg(right)}`]);
  }
  // The "or" a line shows, picked.
  const opts = [orSay(r1, r2_), between, orSay(TOGGLE[r1], TOGGLE[r2_]), betweenToggled];
  const p = pickPart(r, opts, 0, [{ id: "orReadAsAnd", at: 1, vars: { x: between, v: opts[0], e: opts[0] } }, { id: "boundary", at: 2 }], W.fromLine, [`\\text{${opts[0]}}`]);
  return { ...p, pic: linePic(t1 - 3, t2 + 3, [{ lo: null, hi: { v: t1, closed: c1 } }, { lo: { v: t2, closed: c2 }, hi: null }]) };
}

/** The inequality shown as the question's line. */
const withQ = (p: Part, e: string): Part => ({ ...p, q: T(e.split(/ (<|≤|>|≥) /)[0].replace(/−/g, "-")) + " " + ({ "<": "<", "≤": "\\le", ">": ">", "≥": "\\ge" } as Record<string, string>)[e.split(/ (<|≤|>|≥) /)[1]] + " " + e.split(/ (<|≤|>|≥) /)[2].replace(/−/g, "-") });

export default gen;
