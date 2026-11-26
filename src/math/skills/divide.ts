// Practice: Division. The facts of the tables of 2, 3, 4, 5 and 10 turned round, then those of 6 to 9 and a missing
// number, then remainders, quotients past the tables (84 ÷ 6, as long division) and multiples of ten (2400 ÷ 60).
// Division as sharing out and as making groups, drawn as dots and plates; the multiplication that answers a division
// (4 × □ = 20, so 20 ÷ 4 = □) and the facts of one family; which equation a sharing story makes and a story of packs;
// then a story in two steps (trays of rolls packed in bags).
import { fill } from "../chart";
import { pickPart } from "../mulDivKit";
import { sharePic } from "../mulPics";
import { num } from "../practiceKit";
import type { Gen, Part, Trap } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const out = (q: string, v: number, more: Pick<Part, "steps" | "solution" | "pic"> & { traps?: Trap[]; prompt?: string }): ReturnType<Gen> => ({
    prompt: more.prompt ?? w.prompts.times, q, answer: { ...num(v), traps: more.traps ?? [] }, show: String(v), plain: String(v), format: "number",
    ...(more.solution ? { solution: more.solution } : { steps: more.steps }), ...(more.pic ? { pic: more.pic } : {}),
  });
  const W = w.mulDiv;
  /** a shared into b, or made into groups of b: b taken away once, and a multiplied by b, are the slips. */
  const slips = (a: number, b: number): Trap[] => {
    const v = a / b;
    const traps: Trap[] = [];
    if (a - b !== v) traps.push({ id: "takenNotShared", a: num(a - b), vars: { x: a - b, a, b, v } });
    traps.push({ id: "multipliedForDivide", a: num(a * b), vars: { x: a * b, a, b, v } });
    return traps;
  };
  const undo = (a: number, b: number) => [`${b} \\times ${a / b} = ${a}`, `${a} \\div ${b} = ${a / b}`];
  /** ab ÷ a = b, read off the times-table fact. */
  const fact = (a: number, b: number) => out(`${a * b} \\div ${a}`, b, { steps: [`${b} \\times ${a} = ${a * b}`, `${a * b} \\div ${a} = ${b}`] });
  if (L === 1) {
    const kind = r.int(0, 3);
    if (kind === 1) {
      // Sharing onto plates, or making teams: the same division.
      const [b, k] = [r.int(2, 5), r.int(2, 5)];
      const a = b * k;
      return r.next() < 0.5
        ? out("", k, { prompt: fill(W.share, { a, b }), traps: slips(a, b), pic: sharePic(a, b), solution: { kind: "model", spec: { type: "multiply", style: "groups", a: b, b: k, step: 999 } } })
        : out("", k, { prompt: fill(W.teams, { a, b }), traps: slips(a, b), steps: undo(a, b) });
    }
    if (kind === 2) {
      // The multiplication that answers a division.
      const [b, k] = [r.pick([2, 3, 4, 5, 10]), r.int(2, 10)];
      const a = b * k;
      return out("", k, { prompt: fill(W.related, { a, b }), traps: [{ id: "multipliedForDivide", a: num(a * b), vars: { x: a * b, a, b, v: k } }], steps: undo(a, b) });
    }
    if (kind === 3) {
      // The facts of one family: the product divided by a factor gives the other, never the other way round.
      const [a, b] = [r.pick([2, 3, 4, 5, 10]), r.int(2, 9)];
      if (a === b) return fact(a, b);
      const c = a * b;
      const right = `${c} \\div ${a} = ${b}`;
      return pickPart(r, fill(W.family, { a, b, c }), right, [{ tex: `${a} \\div ${c} = ${b}`, id: "divisionTurnedRound", vars: { right: `${c} ÷ ${a} = ${b}` } }], [`${c} - ${a} = ${b}`], {
        steps: [`${a} \\times ${b} = ${c}`, `${b} \\times ${a} = ${c}`, `${c} \\div ${a} = ${b}`, `${c} \\div ${b} = ${a}`],
      });
    }
    return fact(r.pick([2, 3, 4, 5, 10]), r.int(2, 10));
  }
  const kind = r.int(0, L === 2 ? 4 : 3);
  if (L === 2) {
    if (kind === 3) {
      // Which equation a sharing story makes.
      const [b, k] = [r.int(3, 9), r.int(4, 9)];
      const a = b * k;
      const vars = { a, b, v: k };
      return pickPart(r, fill(W.stickers, { a, b }), `${a} \\div ${b} = \\square`, [
        { tex: `${a} \\times ${b} = \\square`, id: "multipliedForDivide", vars },
        { tex: `${a} - ${b} = \\square`, id: "takenNotShared", vars },
      ], [], { steps: undo(a, b) });
    }
    if (kind === 4) {
      const [b, k] = [r.int(3, 9), r.int(4, 9)];
      return out("", k, { prompt: fill(W.packs, { a: b * k, b }), traps: slips(b * k, b), steps: undo(b * k, b) });
    }
    const [a, b] = [r.int(6, 9), r.int(3, 9)];
    if (kind === 0) return fact(a, b);
    if (kind === 1) return out(`\\square \\div ${a} = ${b}`, a * b, { prompt: w.basics.missing, steps: [`\\square = ${b} \\times ${a} = ${a * b}`] });
    return out(`${a * b} \\div \\square = ${b}`, a, { prompt: w.basics.missing, steps: [`${a} \\times ${b} = ${a * b}`, `\\square = ${a * b} \\div ${b} = ${a}`] });
  }
  if (kind === 0) {
    // A remainder: what is left after the whole groups; the number of groups is the slip.
    const [b, k] = [r.int(3, 9), r.int(3, 11)];
    const rem = r.int(1, b - 1);
    const a = b * k + rem;
    const traps: Trap[] = k !== rem ? [{ id: "quotientForRemainder", a: num(k), vars: { x: k, b, m: b * k, a, v: rem } }] : [];
    return out("", rem, { prompt: fill(w.basics.remainder, { a, b }), traps, steps: [`${b} \\times ${k} = ${b * k}`, `${a} - ${b * k} = ${rem}`] });
  }
  if (kind === 3) {
    // Two steps: all the rolls (a trays of b), then the bags of c. Stopping after the first step is the slip.
    const [a, b] = [r.int(3, 9), r.pick([6, 8, 10, 12])];
    const n = a * b;
    const c = r.pick([3, 4, 5, 6].filter((c) => n % c === 0 && c !== b));
    const v = n / c;
    return out("", v, {
      prompt: fill(W.baker, { a, b, c }),
      traps: [{ id: "secondStepMissed", a: num(n), vars: { x: n, first: `${a} × ${b} = ${n}`, second: `${n} ÷ ${c} = ${v}`, v } }],
      steps: [`${a} \\times ${b} = ${n}`, `${n} \\div ${c} = ${v}`],
    });
  }
  if (kind === 1) {
    const [b, k] = [r.int(3, 9), r.int(11, 29)];
    return out(`${b * k} \\div ${b}`, k, { solution: { kind: "model", spec: { type: "division", style: "bracket", a: b * k, b, decimals: 0, step: 999 } } });
  }
  // Multiples of ten: 2400 ÷ 60 is 240 ÷ 6, read off 24 ÷ 6.
  const [p, k] = [r.int(2, 9), r.int(2, 9)];
  const e = r.int(1, 2);
  const d = r.int(0, 1);
  const [a, b, v] = [p * k * 10 ** e, p * 10 ** d, k * 10 ** (e - d)];
  return out(`${a} \\div ${b}`, v, { steps: [`${p * k} \\div ${p} = ${k}`, ...(d ? [`${a} \\div ${b} = ${a / 10} \\div ${p}`] : []), `${a} \\div ${b} = ${v}`] });
};

export default gen;
