// Practice: Addition and subtraction. The facts within 20 and the bonds to 10 and 20, then two-digit sums and
// differences in the head and the bonds to 100, then three-digit ones and a number missing from a subtraction. Each
// level also tells stories (put together, take away, more and fewer, how many more, the start missing, two steps),
// and asks what the equal sign means, which fact goes with another, which numbers make a number, how to add three or
// four numbers, and which rounding shortcut is right; the hardest picks the equation that a two-step story makes.
import { fill } from "../chart";
import { num } from "../practiceKit";
import type { Gen, Part, Rng, Trap } from "../practiceTypes";

/** Each column of a and b put through `f`, the results set side by side as the digits of one number. */
const byColumn = (a: number, b: number, f: (x: number, y: number) => number) => {
  let v = 0;
  for (let k = 1; a > 0 || b > 0; a = Math.floor(a / 10), b = Math.floor(b / 10), k *= 10) v += f(a % 10, b % 10) * k;
  return v;
};
/** a + b with every carry left out: 47 + 38 → 75. */
export const noCarry = (a: number, b: number) => byColumn(a, b, (x, y) => (x + y) % 10);
/** Several numbers added with every carry left out: 23 + 48 + 19 → 70. */
export const noCarryAll = (ns: number[]) => ns.slice(1).reduce((acc, n) => noCarry(acc, n), ns[0]);
/** a − b with the smaller digit taken from the larger in every column: 52 − 38 → 26. */
export const digitwise = (a: number, b: number) => byColumn(a, b, (x, y) => Math.abs(x - y));

const minus = (n: number) => String(n).replace("-", "−");
/** The options in an order the seed sets, so the right one is not always first. */
function shuffled<T>(r: Rng, xs: T[]): T[] {
  const all = [...xs];
  for (let i = all.length - 1; i > 0; i--) {
    const j = r.int(0, i);
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}
/** An expression offered to pick, typed with a real minus sign and drawn with TeX's. */
const expr = (s: string) => ({ text: s.replace(/-/g, "−"), plain: s.replace(/-/g, "−"), tex: s });

const gen: Gen = (r, L, w) => {
  const out = (q: string, v: number, more: Pick<Part, "steps" | "solution"> & { traps?: Trap[]; prompt?: string }): ReturnType<Gen> => ({
    prompt: more.prompt ?? w.prompts.times, q, answer: { ...num(v), traps: more.traps ?? [] }, show: String(v), plain: String(v), format: "number",
    ...(more.solution ? { solution: more.solution } : { steps: more.steps }),
  });
  const model = (spec: object) => ({ kind: "model" as const, spec });
  /** A slip that gives x: the number put in the box and what it makes, then the operation that undoes the one shown. */
  const inverse = (x: number, made: string, c: number, undo: string, v: number): Trap => ({ id: "inverseMissed", a: num(x), vars: { x, check: made, c, undo, v } });
  /** a + b: the tens of b added first, then its ones (hundreds first for three digits). */
  const add = (a: number, b: number) => {
    const big = b >= 100 ? Math.floor(b / 100) * 100 : Math.floor(b / 10) * 10;
    const [rest, v] = [b - big, a + b];
    const traps: Trap[] = noCarry(a, b) !== v ? [{ id: "carryDropped", a: num(noCarry(a, b)), vars: { x: noCarry(a, b), a, b, v } }] : [];
    return out(`${a} + ${b}`, v, { traps, steps: rest ? [`${a} + ${b} = ${a} + ${big} + ${rest}`, `= ${a + big} + ${rest} = ${v}`] : [`${a} + ${b} = ${v}`] });
  };
  const sub = (a: number, b: number) => {
    const big = b >= 100 ? Math.floor(b / 100) * 100 : Math.floor(b / 10) * 10;
    const [rest, v] = [b - big, a - b];
    const traps: Trap[] = digitwise(a, b) !== v ? [{ id: "smallerFromLarger", a: num(digitwise(a, b)), vars: { x: digitwise(a, b), a, b, v } }] : [];
    return out(`${a} - ${b}`, v, { traps, steps: rest ? [`${a} - ${b} = ${a} - ${big} - ${rest}`, `= ${a - big} - ${rest} = ${v}`] : [`${a} - ${b} = ${v}`] });
  };
  /** a + □ = c, drawn as a number bond. */
  const bond = (a: number, c: number, more: Trap[] = []) => {
    const v = c - a;
    return out(`${a} + \\square = ${c}`, v, {
      prompt: w.basics.missing,
      traps: [...more, inverse(a + c, `${a} + ${a + c} = ${2 * a + c}`, c, `${c} − ${a}`, v)],
      solution: model({ type: "bond", whole: String(c), parts: [String(a), String(v)] }),
    });
  };
  const W = w.addSub;
  /**
   * A one-step story: its answer drawn as a number bond of the whole and its two parts (for a subtraction, the part
   * left and the part taken), and the other operation named as the slip.
   */
  const story = (text: string, v: number, whole: number, parts: [number, number], op: "+" | "-", why: string): ReturnType<Gen> => {
    const [p, t] = parts;
    const [right, wrong, x] = op === "+" ? [`${p} + ${t}`, `${Math.max(p, t)} − ${Math.min(p, t)}`, Math.abs(p - t)] : [`${whole} − ${t}`, `${whole} + ${t}`, whole + t];
    const traps: Trap[] = x !== v ? [{ id: "storyOperation", a: num(x), vars: { x, wrong, right, why, v } }] : [];
    return out("", v, { prompt: text, traps, solution: model({ type: "bond", whole: String(whole), parts: parts.map(String) }) });
  };
  /** A two-step story: some taken away, then some added. Taking both away is the slip. */
  const twoStep = (text: string, a: number, b: number, c: number) => {
    const v = a - b + c;
    const x = a - b - c;
    return out("", v, {
      prompt: text,
      traps: x >= 0 && x !== v ? [{ id: "bothTakenAway", a: num(x), vars: { x, c, work: `${a} − ${b} + ${c}`, v } }] : [],
      steps: [`${a} - ${b} = ${a - b}`, `${a - b} + ${c} = ${v}`],
    });
  };
  /** a + b = □ + c: both sides make the same number. The sum of the left, and all three added, are the slips. */
  const balance = (a: number, b: number, c: number) => {
    const s = a + b;
    const v = s - c;
    const vars = { a, b, c, s, v };
    return out(`${a} + ${b} = \\square + ${c}`, v, {
      prompt: W.equalSign,
      traps: [{ id: "equalsAnswerNext", a: num(s), vars: { ...vars, x: s } }, { id: "equalsAllAdded", a: num(s + c), vars: { ...vars, x: s + c } }],
      steps: [`${a} + ${b} = ${s}`, `\\square + ${c} = ${s}`, `\\square = ${s} - ${c} = ${v}`],
    });
  };
  /** From a + b = c, the subtraction that goes with it: c − b = □. Adding b on again is the slip. */
  const related = (a: number, b: number) => {
    const c = a + b;
    return out(`${c} - ${b} = \\square`, a, {
      prompt: fill(W.related, { a, b, c }),
      traps: [{ id: "relatedAddedBack", a: num(c + b), vars: { x: c + b, a, b, c } }],
      solution: model({ type: "bond", whole: String(c), parts: [String(a), String(b)] }),
    });
  };
  /** Which of three sums makes n: one does, the others are one out. */
  const makes = (n: number) => {
    const p = r.int(1, n - 1);
    const right = `${p} + ${n - p}`;
    const near = (d: number) => {
      const q = r.int(1, n - 1);
      return `${q} + ${n - q + d}`;
    };
    const options = shuffled(r, [right, near(1), near(-1)].map(expr));
    const k = options.findIndex((o) => o.tex === right);
    return { prompt: fill(W.makes, { n }), q: "", answer: { k: "pick" as const, options, right: k }, show: options[k].tex, plain: options[k].plain, format: "pick" as const, steps: [`${right} = ${n}`] };
  };
  /** Three or four numbers added: the tens first, then the ones. A carry left out is the slip. */
  const addAll = (ns: number[], prompt?: string) => {
    const v = ns.reduce((x, y) => x + y, 0);
    const tens = ns.reduce((x, y) => x + y - (y % 10), 0);
    const ones = ns.reduce((x, y) => x + (y % 10), 0);
    const nc = noCarryAll(ns);
    const traps: Trap[] = nc !== v ? [{ id: "carryDropped", a: num(nc), vars: { x: nc, a: ns[0], b: ns.slice(1).join(" + "), v } }] : [];
    return out(prompt ? "" : ns.join(" + "), v, { prompt, traps, steps: [`${ns.map((n) => n - (n % 10)).join(" + ")} = ${tens}`, `${ns.map((n) => n % 10).join(" + ")} = ${ones}`, `${tens} + ${ones} = ${v}`] });
  };
  /**
   * a ± b with b just under a round number: which shortcut is right. Rounding b up and adjusting the wrong way is
   * the slip, the third a round number that is not near b.
   */
  const shortcut = (a: number, b: number, round: number, sign: "+" | "-") => {
    const d = round - b;
    const q = `${a} ${sign} ${b}`;
    const [right, wrong, off] = sign === "+"
      ? [`${a} + ${round} - ${d}`, `${a} + ${round} + ${d}`, `${a} + ${round - (round >= 100 ? 100 : 10)} - ${d}`]
      : [`${a} - ${round} + ${d}`, `${a} - ${round} - ${d}`, `${a} - ${round - (round >= 100 ? 100 : 10)} + ${d}`];
    const options = shuffled(r, [right, wrong, off].map(expr));
    const at = (t: string) => options.findIndex((o) => o.tex === t);
    const v = sign === "+" ? a + b : a - b;
    return {
      prompt: fill(W.shortcut, { q: q.replace("-", "−") }),
      q: "",
      answer: {
        k: "pick" as const, options, right: at(right),
        traps: [{ id: sign === "+" ? "roundedAddWrongWay" : "roundedTakeWrongWay", a: { k: "pick" as const, options, right: at(wrong) }, vars: { x: wrong.replace(/-/g, "−"), b, r: round, d, v } }],
      },
      show: options[at(right)].tex,
      plain: options[at(right)].plain,
      format: "pick" as const,
      steps: [`${right} = ${v}`],
    };
  };
  /** The equation a two-step story makes: some taken, some added. Taking both away is the slip. */
  const whichEquation = (a: number, b: number, c: number) => {
    const forms = [`${a} - ${b} + ${c} = \\square`, `${a} - ${b} - ${c} = \\square`, `${a} + ${b} + ${c} = \\square`];
    const options = shuffled(r, forms.map((t) => ({ text: t.replace(/-/g, "−").replace("\\square", "□"), plain: t.replace(/-/g, "−").replace("\\square", "□"), tex: t })));
    const at = (t: string) => options.findIndex((o) => o.tex === t);
    return {
      prompt: `${fill(W.stall, { a, b, c })} ${W.whichEquation}`,
      q: "",
      answer: { k: "pick" as const, options, right: at(forms[0]), traps: [{ id: "bothTakenAway", a: { k: "pick" as const, options, right: at(forms[1]) }, vars: { x: options[at(forms[1])].plain, c, work: `${a} − ${b} + ${c}`, v: a - b + c } }] },
      show: options[at(forms[0])].tex,
      plain: options[at(forms[0])].plain,
      format: "pick" as const,
      steps: [`${a} - ${b} = ${a - b}`, `${a - b} + ${c} = ${a - b + c}`],
    };
  };

  if (L === 1) {
    const kind = r.int(0, 6);
    if (kind === 3) {
      const t = r.int(0, 2);
      if (t === 0) {
        const a = r.int(2, 9);
        const b = r.int(2, Math.min(9, 20 - a));
        return story(fill(W.together, { a, b }), a + b, a + b, [a, b], "+", W.why.together);
      }
      const a = r.int(6, 20);
      const b = r.int(2, Math.min(a - 2, 9));
      return t === 1
        ? story(fill(W.takeAway, { a, b }), a - b, a, [a - b, b], "-", W.why.takeAway)
        : story(fill(W.fewer, { a, b }), a - b, a, [a - b, b], "-", W.why.fewer);
    }
    if (kind === 4) {
      const a = r.int(3, 9);
      const b = r.int(2, 9);
      return balance(a, b, r.int(1, Math.min(a, b) - 1 || 1));
    }
    if (kind === 5) return related(r.int(3, 9), r.int(3, 9));
    if (kind === 6) return makes(r.int(6, 10));
    if (kind === 0) {
      const a = r.int(2, 11);
      const b = r.int(2, Math.min(9, 20 - a));
      return out(`${a} + ${b}`, a + b, { solution: model({ type: "addition", style: "counters", a, b, step: 999 }) });
    }
    if (kind === 1) {
      const a = r.int(5, 20);
      const b = r.int(2, Math.min(a - 1, 12));
      return out(`${a} - ${b}`, a - b, { solution: model({ type: "subtraction", style: "takeaway", a, b, step: 999 }) });
    }
    const c = r.pick([10, 10, 20]);
    return bond(r.int(1, c - 1), c);
  }
  if (L === 2) {
    const kind = r.int(0, 6);
    if (kind === 3) {
      const t = r.int(0, 2);
      if (t === 0) {
        const a = r.int(21, 64);
        const b = r.int(11, 99 - a);
        return story(fill(W.more, { a, b }), a + b, a + b, [a, b], "+", W.why.more);
      }
      const a = r.int(41, 95);
      const b = r.int(12, a - 11);
      return t === 1
        ? story(fill(W.howManyMore, { a, b }), a - b, a, [a - b, b], "-", W.why.howManyMore)
        : story(fill(W.startUnknown, { b, c: a }), a - b, a, [a - b, b], "-", W.why.startUnknown);
    }
    if (kind === 4) {
      const a = r.int(35, 80);
      // Fewer get on than are left, so taking both away (the slip) still leaves a number.
      const b = r.int(11, a - 15);
      const c = r.int(11, Math.min(40, a - b - 1));
      return twoStep(fill(W.bus, { a, b, c }), a, b, c);
    }
    if (kind === 5) {
      const n = r.next() < 0.5 ? 3 : 4;
      const ns = Array.from({ length: n }, () => r.int(11, 45));
      return n === 4 ? addAll(ns, fill(W.addends, { a: ns[0], b: ns[1], c: ns[2], d: ns[3] })) : addAll(ns);
    }
    if (kind === 6) {
      const round = r.int(3, 7) * 10;
      return shortcut(r.int(21, 60), round - r.int(1, 2), round, "+");
    }
    if (kind === 0) {
      const a = r.int(12, 78);
      return add(a, r.int(11, 99 - a));
    }
    if (kind === 1) {
      const a = r.int(31, 99);
      return sub(a, r.int(12, a - 9));
    }
    // A bond to 100: the ones make a ten, so the tens make only 90 (37 + 73 = 110 is the slip).
    const a = r.int(1, 8) * 10 + r.int(1, 9);
    return bond(a, 100, [{ id: "bondTenOver", a: num(110 - a), vars: { a, x: 110 - a, s: 110, v: 100 - a } }]);
  }
  const kind = r.int(0, 5);
  if (kind === 3) {
    // The same stories as before, in hundreds: a longer flight, and how far apart two journeys are.
    const a = r.int(215, 560);
    const b = r.int(105, 999 - a);
    return r.next() < 0.5
      ? story(fill(W.flight, { a, b }), a + b, a + b, [a, b], "+", W.why.more)
      : story(fill(W.journeys, { a: a + b, b: a }), b, a + b, [b, a], "-", W.why.howManyMore);
  }
  if (kind === 4) {
    const a = r.int(400, 900);
    const b = r.int(105, a - 150);
    return whichEquation(a, b, r.int(105, 380));
  }
  if (kind === 5) {
    const round = r.int(2, 6) * 100;
    const sub = r.next() < 0.5;
    const b = round - r.int(1, 3);
    return sub ? shortcut(r.int(round + 105, 950), b, round, "-") : shortcut(r.int(115, 950 - round), b, round, "+");
  }
  if (kind === 0) {
    const a = r.int(125, 799);
    return add(a, r.int(105, 999 - a));
  }
  if (kind === 1) {
    const a = r.int(300, 999);
    return sub(a, r.int(105, a - 95));
  }
  const b = r.int(105, 480);
  let c = r.int(105, 480);
  if (c === b) c += 7;
  if (r.next() < 0.5) {
    // □ − b = c: the number before the taking away is the two put back together.
    const [v, x] = [b + c, Math.abs(c - b)];
    return out(`\\square - ${b} = ${c}`, v, { prompt: w.basics.missing, traps: [inverse(x, `${x} − ${b} = ${minus(x - b)}`, c, `${c} + ${b}`, v)], steps: [`\\square = ${c} + ${b} = ${v}`] });
  }
  // a − □ = c, with a the larger: what was taken is the difference.
  const a = b + c;
  return out(`${a} - \\square = ${c}`, b, { prompt: w.basics.missing, traps: [inverse(a + c, `${a} − ${a + c} = ${minus(-c)}`, c, `${a} − ${c}`, b)], steps: [`\\square = ${a} - ${c} = ${b}`] });
};

export default gen;
