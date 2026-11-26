// Practice: Linear equations. Every level keeps its older question (four times in ten): a two-step equation, letters
// on both sides, a bracket. #721 added the rest of the unit. Easy: one-step equations with negatives, fractions and
// decimals, which value is a solution, the first wrong line of a worked one-step equation, a sentence or a story made
// into an equation, and a tape diagram read as one. Medium: two-step equations, letters on both sides and brackets
// with decimals and fractions, the first wrong line of a two-step solution, and stories of a charge to start and a
// charge for each unit, read and solved. Hard, in a new setting: how many solutions an equation has, the number that
// gives it infinitely many, an equation solved for x with letters for its numbers, and puzzles about consecutive
// integers. The operation in the equation used instead of undone, a lost sign, the number in front of x left out, a
// later line taken for the first wrong one, the story's operation swapped, a tape misread, a number moved across
// with its sign, the x terms added across the sides, a bracket multiplied out on its first term only, the two
// numbers of a story swapped, no solution and every number confused, and the middle number given for the smallest
// are slips.
import { C, fill, FONT, r2 } from "../chart";
import { parseE } from "../expr";
import type { ExprOption } from "../exprMatch";
import type { Frac } from "../fraction";
import { bracket, fr, num, plainFrac, polyStr, T } from "../practiceKit";
import type { Gen, Part, PracticeWords as Words, Rng, Trap } from "../practiceTypes";

function old(r: Rng, L: number, w: Words): Part {
  let eq: string;
  let x: Frac;
  if (L === 1) {
    const a = r.int(2, 9);
    const xv = r.nz(-9, 9);
    const b = r.nz(-15, 15);
    eq = `${polyStr([b, a])} = ${a * xv + b}`;
    x = fr(xv);
  } else if (L === 2) {
    let a = r.int(2, 9);
    let c = r.int(1, 9);
    while (c === a) c = r.int(1, 9);
    if (r.next() < 0.5) [a, c] = [c, a];
    const xv = r.nz(-9, 9);
    const b = r.int(-12, 12);
    const d = (a - c) * xv + b;
    eq = `${polyStr([b, a])} = ${polyStr([d, c])}`;
    x = fr(xv);
  } else {
    const a = r.int(2, 6);
    const b = r.nz(-6, 6);
    let c = r.int(1, 9);
    while (c === a) c = r.int(1, 9);
    const d = r.int(-12, 12);
    eq = `${a}${bracket(1, b)} = ${polyStr([d, c])}`;
    x = fr(d - a * b, a - c);
  }
  return { prompt: w.prompts.linear, q: T(eq.split("=")[0]) + " = " + T(eq.split("=")[1]), answer: num(x.toNumber()), show: `x = ${x.tex()}`, plain: plainFrac(x), format: "exact", solution: { kind: "algebra", spec: { topic: "linear", eq, method: "factor" } } };
}

const gen: Gen = (r, L, w) => {
  const extra = r.int(0, 9);
  if (extra >= 4) return more(r, L, extra, w);
  return old(r, L, w);
};

/** A number as read in a hint: a true minus, a fraction with a slash, a decimal as it is. */
const say = (v: Frac | number) => {
  const s = typeof v === "number" ? String(Number(v.toFixed(6))) : v.isInt() ? String(v.n) : `${v.n}/${v.d}`;
  return s.replace(/^-/, "−");
};
/** A decimal as typed: 0.3, −1.25. */
const decStr = (v: Frac) => String(Number(v.toNumber().toFixed(6)));
/** The TeX of plain typed maths (x as the letter), with a true minus. */
const tx = (s: string) => T(s);
/** Plain maths as a hint reads it. */
const plainSay = (s: string) => s.replace(/\*/g, "").replace(/ - /g, " − ").replace(/^-/, "−").replace(/\(-/g, "(−");

function shuffled<T>(r: Rng, xs: T[]): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = r.int(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

type Slip = [Trap["id"], Frac, Record<string, string | number>];

/** x to type: a fraction or a whole number (format exact), or a decimal; slips that differ from it are named. */
function solvePart(prompt: string, q: string, v: Frac, slips: Slip[], steps: string[], decimal = false): Part {
  const traps: Trap[] = slips
    .filter(([, s]) => !s.sub(v).isZero())
    .map(([id, s, vars]) => ({ id, a: num(s.toNumber(), 1e-9), vars: { x: decimal ? decStr(s).replace(/^-/, "−") : say(s), v: decimal ? decStr(v).replace(/^-/, "−") : say(v), ...vars } }));
  if (decimal) return { prompt, q, answer: { ...num(v.toNumber(), 1e-9), traps }, show: `x = ${decStr(v)}`, plain: decStr(v), format: "number", steps };
  return { prompt, q, answer: { ...num(v.toNumber(), 1e-9), traps }, show: `x = ${v.tex()}`, plain: plainFrac(v), format: "exact", steps };
}

/** One of several equations (or words) picked; the slip, when given, is named. */
function pickPart(r: Rng, prompt: string, q: string, right: string, others: string[], slip: [Trap["id"], string, Record<string, string | number>] | null, steps: string[], words = false, pic?: Part["pic"]): Part {
  const texts = shuffled(r, [right, ...others]);
  const options: ExprOption[] = texts.map((t) => (words ? { text: t, plain: t, tex: `\\text{${t}}` } : { text: plainSay(t), plain: t, tex: t.includes("=") ? eqTex(t) : tx(t) }));
  const traps: Trap[] = slip ? [{ id: slip[0], a: { k: "pick", options, right: texts.indexOf(slip[1]) }, vars: { x: words ? slip[1] : plainSay(slip[1]), v: words ? right : plainSay(right), ...slip[2] } }] : [];
  return { prompt, q, answer: { k: "pick", options, right: texts.indexOf(right), traps }, show: options[texts.indexOf(right)].tex, plain: options[texts.indexOf(right)].plain, format: "pick", steps, ...(pic ? { pic } : {}) };
}

/** Lines of working, numbered, as one TeX block. */
const linesTex = (lines: string[]) => `\\begin{array}{ll}${lines.map((l, i) => `\\text{${i + 1}.} & ${l}`).join(" \\\\ ")}\\end{array}`;

/** (x + b) as TeX, its brackets kept. */
const brTex = (b: number) => `\\left(x ${b < 0 ? "-" : "+"} ${Math.abs(b)}\\right)`;

/** Equation sides as TeX, each side parsed with x as its letter. */
const eqTex = (s: string) => s.split("=").map((p) => tx(p.trim())).join(" = ");

function more(r: Rng, L: number, kind: number, w: Words): Part {
  const W = w.linP;
  const solve = w.prompts.linear;
  if (L === 1) {
    if (kind === 4) {
      // One step with whole numbers, negatives among them: the operation undone.
      const form = r.int(0, 3);
      if (form <= 1) {
        const b = r.int(2, 15);
        const v = r.nz(-12, 12);
        const plus = form === 0;
        const c = plus ? v + b : v - b;
        const work = plus ? `${say(c)} − ${b} = ${say(v)}` : `${say(c)} + ${b} = ${say(v)}`;
        return solvePart(solve, eqTex(`x ${plus ? "+" : "-"} ${b} = ${c}`), fr(v), [["inverseNotUsed", fr(plus ? c + b : c - b), { w: work }]], [`x = ${c} ${plus ? "-" : "+"} ${b} = ${v}`]);
      }
      if (form === 2) {
        const a = r.pick([-9, -8, -7, -6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8, 9]);
        const v = r.nz(-9, 9);
        const c = a * v;
        const work = `${say(c)} ÷ ${say(a)} = ${say(v)}`;
        const slips: Slip[] = a < 0 || c < 0 ? [["divideSignLost", fr(-v), { w: work }]] : [];
        return solvePart(solve, eqTex(`${a}x = ${c}`), fr(v), [...slips, ["inverseNotUsed", fr(c * a), { w: work }]], [`x = \\frac{${c}}{${a}} = ${v}`]);
      }
      const a = r.pick([2, 3, 4, 5, 6, -2, -3, -4]);
      const c = r.nz(-9, 9);
      const v = a * c;
      const work = `${say(c)} × ${say(a)} = ${say(v)}`;
      return solvePart(solve, `\\frac{x}{${a}} = ${c}`, fr(v), [["inverseNotUsed", fr(c, a), { w: work }], ...(a < 0 ? ([["divideSignLost", fr(-v), { w: work }]] as Slip[]) : [])], [`x = ${c} \\times ${a < 0 ? `(${a})` : a} = ${v}`]);
    }
    if (kind === 5) {
      // One step with fractions or decimals.
      const form = r.int(0, 3);
      if (form === 0) {
        const b = fr(r.int(11, 49), 10);
        const v = fr(r.nz(-60, 60), 10);
        const c = v.add(b);
        return solvePart(solve, `x + ${decStr(b)} = ${decStr(c)}`, v, [["inverseNotUsed", c.add(b), { w: `${say(c.toNumber())} − ${decStr(b)} = ${say(v.toNumber())}` }]], [`x = ${decStr(c)} - ${decStr(b)} = ${decStr(v)}`], true);
      }
      if (form === 1) {
        const [p, q] = r.pick([[1, 4], [3, 4], [1, 3], [2, 3], [1, 2], [2, 5], [5, 6]] as const);
        const [s, t] = r.pick([[1, 2], [1, 6], [3, 8], [5, 12], [2, 9], [1, 10]] as const);
        const b = fr(p, q);
        const c = fr(s, t);
        const v = c.add(b);
        return solvePart(solve, `x - ${b.tex()} = ${c.tex()}`, v, [["inverseNotUsed", c.sub(b), { w: `${say(c)} + ${say(b)} = ${say(v)}` }]], [`x = ${c.tex()} + ${b.tex()} = ${v.tex()}`]);
      }
      if (form === 2) {
        const [p, q] = r.pick([[2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [5, 6], [3, 8]] as const);
        const c = p * r.int(1, 6);
        const v = fr(c * q, p);
        return solvePart(solve, `\\frac{${p}}{${q}}x = ${c}`, v, [["inverseNotUsed", fr(c * p, q), { w: `${c} × ${q}/${p} = ${say(v)}` }]], [`x = ${c} \\times \\frac{${q}}{${p}} = ${v.tex()}`]);
      }
      const d = fr(r.pick([2, 4, 5, 8]), 10);
      const v = fr(r.int(2, 15));
      const c = d.mul(v);
      return solvePart(solve, `${decStr(d)}x = ${decStr(c)}`, v, [["inverseNotUsed", c.mul(d), { w: `${decStr(c)} ÷ ${decStr(d)} = ${say(v)}` }]], [`x = \\frac{${decStr(c)}}{${decStr(d)}} = ${v.n}`], true);
    }
    if (kind === 6) {
      // Which value is a solution: each tried in the equation.
      const a = r.int(2, 6);
      const b = r.nz(-12, 12);
      let v = r.nz(-8, 8);
      while (v === -b || a * v + b === -b) v = r.nz(-8, 8);
      const c = a * v + b;
      const slip = c - b;
      const cands = [...new Set([v, slip, -v, v + 1, v - 1, c])].filter((u, i) => i < 2 || (u !== v && u !== slip));
      const pool = [v, slip, ...cands.slice(2, 4)];
      const eqs = `${polyStr([b, a])} = ${c}`;
      const check = `${a} × ${say(v)} ${b < 0 ? "−" : "+"} ${Math.abs(b)} = ${say(c)}`;
      return pickPart(r, W.isSolution, eqTex(eqs), String(v), pool.slice(1).map(String), ["coefficientIgnored", String(slip), { a, w: check }], [`${a}(${v}) ${b < 0 ? "-" : "+"} ${Math.abs(b)} = ${c}`]);
    }
    if (kind === 7) {
      // The first wrong line of a worked one-step equation.
      const b = r.int(3, 15);
      const c = r.int(-10, 20);
      const plus = r.next() < 0.5;
      const early = r.next() < 0.7;
      const right = plus ? c - b : c + b;
      const eq = `x ${plus ? "+" : "-"} ${b} = ${c}`;
      const lines = early
        ? [eqTex(eq), `x = ${c} ${plus ? "+" : "-"} ${b}`, `x = ${plus ? c + b : c - b}`]
        : [eqTex(eq), `x = ${c} ${plus ? "-" : "+"} ${b}`, `x = ${right + r.pick([-2, -1, 1, 2, 10])}`];
      return mistakePart(r, W, lines, early ? 2 : 3, early ? 3 : null, `x = ${c} ${plus ? "-" : "+"} ${b} = ${right}`);
    }
    if (kind === 8) {
      // A sentence or a story made into an equation (picked), or a sentence solved.
      if (r.next() < 0.5) {
        const op = r.pick(["more", "less", "times", "part"] as const);
        const b = r.int(3, 12);
        const c = op === "part" ? r.int(2, 9) : op === "times" ? b * r.int(2, 9) : r.int(b + 2, 40);
        const v = op === "more" ? c - b : op === "less" ? c + b : op === "times" ? c / b : c * b;
        const slip = op === "more" ? c + b : op === "less" ? c - b : op === "times" ? c * b : c / b;
        const eq = op === "more" ? `x + ${b} = ${c}` : op === "less" ? `x - ${b} = ${c}` : op === "times" ? `${b}x = ${c}` : `x/${b} = ${c}`;
        const back = op === "more" ? `${c} − ${b}` : op === "less" ? `${c} + ${b}` : op === "times" ? `${c} ÷ ${b}` : `${c} × ${b}`;
        return solvePart(fill(W[op], { b, c }), "", fr(v), [["inverseNotUsed", fr(slip), { w: `${back} = ${v}` }]], [`${eqTex(eq.replace(`x/${b}`, `x / ${b}`))}`, `x = ${v}`]);
      }
      const gave = r.next() < 0.5;
      const b = r.int(3, 12);
      const c = gave ? r.int(4, 30) : b * r.int(3, 9);
      const right = gave ? `x - ${b} = ${c}` : `${b}x = ${c}`;
      const slip = `x + ${b} = ${c}`;
      const others = gave ? [slip, `${b} - x = ${c}`, `x = ${b} - ${c}`] : [slip, `x/${b} = ${c}`, `${c}x = ${b}`];
      return pickPart(r, fill(gave ? W.gave : W.boxes, { b, c }), "", right, others, ["storyOpSwapped", slip, {}], [`x = ${gave ? c + b : c / b}`]);
    }
    // A tape diagram: n equal parts of x and one part b make c.
    const n = r.int(2, 4);
    const v = r.int(3, 12);
    const b = r.int(2, 15);
    const c = n * v + b;
    const right = `${n}x + ${b} = ${c}`;
    const slip = `${n}(x + ${b}) = ${c}`;
    return pickPart(r, W.tape, "", right, [slip, `x + ${b} = ${c}`, `${n}x = ${c} + ${b}`], ["tapeMisread", slip, { n, b, c }], [`${n}x + ${b} = ${c}`, `x = ${v}`], false, tapePic(n, v, b, c));
  }
  if (L === 2) {
    if (kind === 4) {
      // Two steps with a fraction or decimals.
      if (r.next() < 0.5) {
        const a = r.int(2, 6);
        const b = r.nz(-9, 9);
        const c = r.int(-6, 9);
        const v = a * (c - b);
        return solvePart(solve, `\\frac{x}{${a}} ${b < 0 ? "-" : "+"} ${Math.abs(b)} = ${c}`, fr(v), [["constantSignKept", fr(a * (c + b)), { b: say(b), w: `x ÷ ${a} = ${say(c)} ${b < 0 ? "+" : "−"} ${Math.abs(b)} = ${say(c - b)}` }]],
          [`\\frac{x}{${a}} = ${c} ${b < 0 ? "+" : "-"} ${Math.abs(b)} = ${c - b}`, `x = ${c - b} \\times ${a} = ${v}`]);
      }
      const d = fr(r.pick([2, 4, 5, 6, 8, 12, 15, 25]), 10);
      const v = r.int(2, 12);
      const e = fr(r.int(3, 40), 10);
      const f = d.mul(fr(v)).sub(e);
      return solvePart(solve, `${decStr(d)}x - ${decStr(e)} = ${decStr(f)}`, fr(v), [["constantSignKept", f.sub(e).div(d), { b: `−${decStr(e)}`, w: `${decStr(d)}x = ${decStr(f)} + ${decStr(e)} = ${decStr(f.add(e))}` }]],
        [`${decStr(d)}x = ${decStr(f)} + ${decStr(e)} = ${decStr(f.add(e))}`, `x = \\frac{${decStr(f.add(e))}}{${decStr(d)}} = ${v}`], true);
    }
    if (kind === 5) {
      // Letters on both sides, with decimals or fractions.
      if (r.next() < 0.5) {
        let p = r.int(2, 9);
        let q = r.int(1, 9);
        while (q === p) q = r.int(1, 9);
        if (p < q) [p, q] = [q, p];
        const [P, Q] = [fr(p, 10), fr(q, 10)];
        const v = r.int(2, 20);
        const b = r.int(-9, 9);
        const c = P.sub(Q).mul(fr(v)).add(fr(b));
        const lhs = `${decStr(P)}x ${b < 0 ? "-" : "+"} ${Math.abs(b)}`;
        const rhs = `${decStr(Q)}x + ${decStr(c)}`.replace("+ -", "- ");
        return solvePart(solve, `${lhs} = ${rhs}`.replace(/ \+ 0 =/, " ="), fr(v), [["xTermsAdded", c.sub(fr(b)).div(P.add(Q)), { q: `${decStr(Q)}x`, w: `${decStr(P.sub(Q))}x = ${say(c.sub(fr(b)).toNumber())}` }]],
          [`${decStr(P.sub(Q))}x = ${decStr(c)} ${b < 0 ? "+" : "-"} ${Math.abs(b)} = ${decStr(c.sub(fr(b)))}`, `x = ${v}`], true);
      }
      const [p, q] = r.pick([[2, 3], [2, 4], [3, 4], [2, 5], [3, 6], [4, 6]] as const);
      const t = r.int(1, 4);
      const v = p * q * t;
      const b = r.int(-6, 6);
      const c = q * t - p * t + b;
      const diff = fr(1, p).sub(fr(1, q));
      return solvePart(solve, `\\frac{x}{${p}} ${b < 0 ? "-" : "+"} ${Math.abs(b)} = \\frac{x}{${q}} ${c < 0 ? "-" : "+"} ${Math.abs(c)}`.replace(/ \+ 0( |$)/g, "$1"), fr(v),
        [["xTermsAdded", fr(c - b).div(fr(1, p).add(fr(1, q))), { q: `x/${q}`, w: `${say(diff)} x = ${c - b}` }]],
        [`\\frac{x}{${p}} - \\frac{x}{${q}} = ${c} ${b < 0 ? "+" : "-"} ${Math.abs(b)}`, `${diff.tex()}x = ${c - b}`, `x = ${v}`]);
    }
    if (kind === 6) {
      // A bracket with a fraction or a decimal in front.
      if (r.next() < 0.5) {
        const [p, q] = r.pick([[1, 2], [1, 3], [2, 3], [3, 4], [2, 5], [3, 5]] as const);
        const b = r.nz(-8, 8);
        const t = r.int(1, 6);
        const v = q * t - b;
        const c = p * t;
        return solvePart(solve, `\\frac{${p}}{${q}}${brTex(b)} = ${c}`, fr(v), [["bracketFirstTermOnly", fr(c - b).mul(fr(q, p)), { a: `${p}/${q}`, w: `x ${b < 0 ? "−" : "+"} ${Math.abs(b)} = ${c} × ${q}/${p} = ${q * t}` }]],
          [`x ${b < 0 ? "-" : "+"} ${Math.abs(b)} = ${c} \\times \\frac{${q}}{${p}} = ${q * t}`, `x = ${v}`]);
      }
      const d = fr(r.pick([2, 4, 5, 6, 8]), 10);
      const s = r.int(2, 15);
      const b = r.int(2, 9);
      const v = s + b;
      const c = d.mul(fr(s));
      return solvePart(solve, `${decStr(d)}(x - ${b}) = ${decStr(c)}`, fr(v), [["bracketFirstTermOnly", c.add(fr(b)).div(d), { a: decStr(d), w: `x − ${b} = ${decStr(c)} ÷ ${decStr(d)} = ${s}` }]],
        [`x - ${b} = \\frac{${decStr(c)}}{${decStr(d)}} = ${s}`, `x = ${v}`], true);
    }
    if (kind === 7) {
      // The first wrong line of a worked two-step equation.
      const a = r.int(2, 6);
      const v = r.nz(-8, 9);
      const b = r.nz(-12, 12);
      const c = a * v + b;
      const at = r.pick([2, 2, 3, 4]);
      const l2 = at === 2 ? `${a}x = ${c} ${b < 0 ? "-" : "+"} ${Math.abs(b)}` : `${a}x = ${c} ${b < 0 ? "+" : "-"} ${Math.abs(b)}`;
      const top = at === 2 ? c + b : c - b;
      const l3 = at === 3 ? `x = ${top} \\times ${a}` : `x = \\frac{${top}}{${a}}`;
      const shown = at === 3 ? top * a : top / a;
      const l4 = `x = ${at === 4 ? v + r.pick([-2, -1, 1, 2]) : Number.isInteger(shown) ? shown : fr(top, a).tex()}`;
      return mistakePart(r, W, [eqTex(`${polyStr([b, a])} = ${c}`), l2, l3, l4], at, at < 4 ? 4 : null, `${a}x = ${c - b}, x = ${v}`);
    }
    const story = r.pick(["gym", "taxi"] as const);
    const a = story === "gym" ? r.pick([10, 12, 15, 20, 25]) : r.pick([2, 3, 4, 5]);
    const b = story === "gym" ? r.pick([20, 30, 40, 50]) : r.pick([3, 4, 5, 6, 8]);
    const u = r.int(3, 12);
    const c = a * u + b;
    const letter = story === "gym" ? "m" : "k";
    if (kind === 8) {
      // A story's equation read: what each number stands for.
      const coef = r.next() < 0.6;
      const meaning = story === "gym" ? [W.perMonth, W.joinFee, W.gymTotal, W.months] : [W.perKm, W.startFee, W.taxiTotal, W.kms];
      const right = coef ? meaning[0] : meaning[1];
      const slip = coef ? meaning[1] : meaning[0];
      return pickPart(r, fill(W.interpret, { s: fill(W[`${story}Say`], { a, b, c }), e: `${a}${letter} + ${b} = ${c}`, t: coef ? a : b }), "", right, meaning.filter((m) => m !== right), ["termsMeaningSwapped", slip, { u: letter, a, b, p: meaning[0], f: meaning[1] }], [`${a}${letter} + ${b} = ${c}`], true);
    }
    // A story solved: the charge to start taken away first, then the rest shared by the charge for each unit.
    return solvePart(fill(W[story], { a, b, c }), "", fr(u), [["constantSignKept", fr(c + b, a), { b, w: `${a}${letter} = ${c} − ${b} = ${c - b}` }]],
      [`${a}${letter} + ${b} = ${c}`, `${a}${letter} = ${c - b}`, `${letter} = ${u}`]);
  }
  if (kind <= 5) {
    // How many solutions: both sides collected, then the x terms and the numbers compared.
    const a = r.int(2, 6);
    const b = r.nz(-6, 6);
    const k = r.int(-9, 9);
    const which = r.pick(["one", "none", "many"] as const);
    const d = which === "one" ? r.pick([a - 1, a + 1, a + 2, -a].filter((u) => u !== 0)) : a;
    const e = which === "many" ? a * b + k : which === "none" ? a * b + k + r.nz(-5, 5) : r.int(-12, 12);
    const left = `${a}${bracket(1, b)}${k ? (k < 0 ? ` - ${-k}` : ` + ${k}`) : ""}`;
    const right = polyStr([e, d]);
    const collected = polyStr([a * b + k, a]);
    const names = { one: W.one, none: W.none, many: W.many };
    const why = { one: W.whyOne, none: W.whyNone, many: W.whyMany };
    const slip = which === "many" ? "none" : which === "none" ? "many" : null;
    return pickPart(r, W.count, `${tx(left)} = ${tx(right)}`, names[which], (["one", "none", "many"] as const).filter((x) => x !== which).map((x) => names[x]),
      slip ? ["solutionCountSwapped", names[slip], { L: plainSay(collected), R: plainSay(right), why: why[which] }] : null, [`${tx(collected)} = ${tx(right)}`], true);
  }
  if (kind === 6) {
    // The number that makes both sides the same: the bracket multiplied out on every term.
    const a = r.int(2, 7);
    const b = r.nz(-9, 9);
    const k = a * b;
    const work = `${a}(x ${b < 0 ? "−" : "+"} ${Math.abs(b)}) = ${a}x ${k < 0 ? "−" : "+"} ${Math.abs(k)}`;
    const part = solvePart(W.findK, `${a}${brTex(b)} = ${a}x + k`, fr(k), [["bracketFirstTermOnly", fr(b), { a, w: work }]], [`${a}${brTex(b)} = ${tx(polyStr([k, a]))}`, `k = ${k}`]);
    return { ...part, show: `k = ${k}` };
  }
  if (kind === 7) {
    // An equation solved for x with letters for its numbers.
    const form = r.int(0, 2);
    const V = ["a", "b", "c"] as const;
    const E = (s: string) => parseE(s, V);
    const [q, right, slip, id, w2]: [string, string, string, Trap["id"], string] =
      form === 0 ? ["ax + b = c", "(c - b)/a", "(c + b)/a", "constantSignKept", "ax = c − b"]
      : form === 1 ? ["ax - b = c", "(c + b)/a", "(c - b)/a", "constantSignKept", "ax = c + b"]
      : ["a(x + b) = c", "c/a - b", "(c - b)/a", "bracketFirstTermOnly", "x + b = c/a"];
    return {
      prompt: W.letters, q,
      answer: { k: "expr", e: E(right), vars: V, traps: [{ id, a: { k: "expr", e: E(slip), vars: V }, vars: { x: plainSay(slip), v: plainSay(right), b: form === 1 ? "−b" : "b", a: "a", w: w2 } }] },
      show: `x = ${right === "c/a - b" ? "\\frac{c}{a} - b" : `\\frac{${right.slice(1, 6)}}{a}`}`, plain: right, format: "formula",
      steps: [w2.replace("−", "-"), `x = ${right === "c/a - b" ? "\\frac{c}{a} - b" : `\\frac{${right.slice(1, 6)}}{a}`}`],
    };
  }
  // Consecutive integers: the middle one is the sum shared by three.
  const even = kind === 9 && r.next() < 0.5;
  const n = even ? 2 * r.int(-10, 30) : r.int(-15, 60);
  const gap = even ? 2 : 1;
  const s = 3 * n + 3 * gap;
  const mid = n + gap;
  const largest = !even && kind === 9;
  const v = largest ? n + 2 * gap : n;
  const prompt = fill(even ? W.consecEven : largest ? W.consecLarge : W.consecSmall, { s: say(s) });
  return solvePart(prompt, "", fr(v), [["middleForSmallest", fr(mid), { s: say(s), p: say(n), q: say(mid), t: say(n + 2 * gap) }]],
    [`x + (x + ${gap}) + (x + ${2 * gap}) = ${s}`, `3x + ${3 * gap} = ${s}`, `x = ${n}`, ...(largest ? [`x + 2 = ${v}`] : [])]);
}

/** Lines of working, one of them the first wrong one; the line where the slip first shows is the slip. */
function mistakePart(r: Rng, W: Words["linP"], lines: string[], wrong: number, later: number | null, fix: string): Part {
  const labels = lines.slice(1).map((_, i) => fill(W.line, { k: i + 2 }));
  const options: ExprOption[] = labels.map((t) => ({ text: t, plain: t, tex: `\\text{${t}}` }));
  const traps: Trap[] = later ? [{ id: "mistakeLaterLine", a: { k: "pick", options, right: later - 2 }, vars: { x: later, v: wrong, w: fix } }] : [];
  void r;
  return { prompt: W.mistake, q: linesTex(lines), answer: { k: "pick", options, right: wrong - 2, traps }, show: options[wrong - 2].tex, plain: labels[wrong - 2], format: "pick", steps: [fix.replace(/−/g, "-")] };
}

/** A tape diagram: the whole c over n parts of x and one part b, each as long as it is. */
function tapePic(n: number, v: number, b: number, c: number): Part["pic"] {
  const [W, H] = [320, 104];
  const k = (W - 20) / c;
  let body = `<rect x="10" y="10" width="${r2(c * k)}" height="32" fill="#f1f3f5" stroke="${C.ink}" stroke-width="1.5"/>`;
  body += `<text x="${r2(10 + (c * k) / 2)}" y="31" ${FONT} font-size="15" text-anchor="middle" fill="${C.ink}">${c}</text>`;
  let x = 10;
  for (let i = 0; i <= n; i++) {
    const wd = (i < n ? v : b) * k;
    body += `<rect x="${r2(x)}" y="56" width="${r2(wd)}" height="32" fill="${i < n ? "#e7f5ff" : "#fff4e6"}" stroke="${C.ink}" stroke-width="1.5"/>`;
    body += `<text x="${r2(x + wd / 2)}" y="77" ${FONT} font-size="15" text-anchor="middle" fill="${i < n ? C.blue : C.orange}" font-style="${i < n ? "italic" : "normal"}">${i < n ? "x" : b}</text>`;
    x += wd;
  }
  return { w: W, h: H, svg: (ox, oy) => `<g transform="translate(${r2(ox)} ${r2(oy)})">${body}</g>` };
}

export default gen;
