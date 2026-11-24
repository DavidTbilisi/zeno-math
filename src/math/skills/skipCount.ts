// Practice: Counting in steps. A row of numbers going on or back by the same step, one of them missing: in ones and
// tens within 100 and the tens and ones of a number, then in twos, fives and tens with odd and even, then in threes,
// fours, twenties, twenty-fives, fifties and hundreds to 1000, the step itself asked for, whether a count will say a
// number, and whether a sum is odd without adding. A step of one where the count goes further, the tens and the ones
// swapped or added, the tens digit read for odd or even and the numbers in between given for the step are the slips.
import { fill } from "../chart";
import { num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";

type Words = PracticeWords["count"];
export type Row = { row: number[]; step: number; blank: number };

/**
 * A row of `len` numbers from lo to hi in steps of `step`, on or back, with one place left out: the last one, any but
 * the first, or any at all.
 */
export function countRow(r: Rng, step: number, len: number, lo: number, hi: number, blank: "last" | "notFirst" | "any", onGrid = false): Row {
  const span = step * (len - 1);
  let a = r.int(lo, hi - span);
  if (onGrid) a -= a % step;
  if (a < lo) a += step;
  const up = Array.from({ length: len }, (_, i) => a + i * step);
  const back = r.next() < 0.4;
  const at = blank === "last" ? len - 1 : blank === "notFirst" ? r.int(1, len - 1) : r.int(0, len - 1);
  return { row: back ? up.reverse() : up, step: back ? -step : step, blank: at };
}
/** The row as it is asked: its numbers with a box for the one left out. */
export const rowTex = (row: number[], blank: number | null) => row.map((v, i) => (i === blank ? "\\square" : String(v))).join(",\\enspace ");
const signed = (s: number) => (s < 0 ? `- ${-s}` : `+ ${s}`);

const text = (t: string) => `\\text{${t}}`;
const option = (t: string) => ({ text: t, plain: t, tex: text(t) });

const gen: Gen = (r, L, w) => {
  const W: Words = w.count;
  /** The number left out of a row. One on from its neighbour, where the count goes further, is the slip. */
  const missing = (c: Row, prompt = W.missing): Part => {
    const { row, step, blank } = c;
    const v = row[blank];
    // The neighbour the step is taken from: the one before, or the one after for the first place.
    const from = blank > 0 ? row[blank - 1] : row[1];
    const working = blank > 0 ? `${from} ${signed(step)} = ${v}` : `${from} ${signed(-step)} = ${v}`;
    const slip = blank > 0 ? from + Math.sign(step) : null;
    const traps: Trap[] = slip !== null && Math.abs(step) > 1 ? [{ id: "stepOfOne", a: num(slip), vars: { x: slip, last: from, s: Math.abs(step), v } }] : [];
    // Two neighbours that are both there show the step; then it is taken from the one beside the gap.
    const i = row.findIndex((_, k) => k + 1 < row.length && k !== blank && k + 1 !== blank);
    const steps = [`${row[i]} ${signed(step)} = ${row[i + 1]}`, working];
    return { prompt, q: rowTex(row, blank), answer: { ...num(v), traps }, show: String(v), plain: String(v), format: "number", steps };
  };
  /** t tens and o ones as one number; the two the other way round, and the two added, are the slips. */
  const tensOnes = (t: number, o: number): Part => {
    const v = 10 * t + o;
    const vars = { t, o, tv: 10 * t, v };
    const traps: Trap[] = [
      { id: "tensOnesSwapped", a: num(10 * o + t), vars: { ...vars, x: 10 * o + t } },
      { id: "tensOnesAdded", a: num(t + o), vars: { ...vars, x: t + o } },
    ];
    return { prompt: fill(W.tensOnes, { t, o }), q: "", answer: { ...num(v), traps }, show: String(v), plain: String(v), format: "number", steps: [`${10 * t} + ${o} = ${v}`] };
  };
  /** n = □ tens and o ones. */
  const howManyTens = (n: number): Part => {
    const [t, o] = [Math.floor(n / 10), n % 10];
    return { prompt: fill(W.howManyTens, { n }), q: "", answer: num(t), show: String(t), plain: String(t), format: "number", steps: [`${n} = ${10 * t} + ${o}`, `${10 * t} = ${t} \\times 10`] };
  };
  /** Which of four numbers is odd (or even): one is, and one of the others has a tens digit that looks it. */
  const whichParity = (): Part => {
    const odd = r.next() < 0.5;
    const ends = (wanted: boolean) => r.pick(wanted === odd ? [1, 3, 5, 7, 9] : [0, 2, 4, 6, 8]);
    const tens = (wanted: boolean) => r.pick(wanted === odd ? [1, 3, 5, 7, 9] : [2, 4, 6, 8]);
    const right = 10 * r.int(1, 9) + ends(true);
    // The decoy: its tens digit is the kind asked for, its last digit is not.
    const decoy = 10 * tens(true) + ends(false);
    const others: number[] = [];
    while (others.length < 2) {
      const n = 10 * tens(false) + ends(false);
      if (n !== decoy && !others.includes(n)) others.push(n);
    }
    const all = [right, decoy, ...others];
    // Shuffled by the seed, so the right one is not always first.
    for (let i = all.length - 1; i > 0; i--) {
      const j = r.int(0, i);
      [all[i], all[j]] = [all[j], all[i]];
    }
    const options = all.map((n) => ({ text: String(n), plain: String(n), tex: String(n) }));
    const half = Math.floor(right / 2);
    return {
      prompt: odd ? W.whichOdd : W.whichEven,
      q: "",
      answer: {
        k: "pick", options, right: all.indexOf(right),
        traps: [{ id: "lastDigitDecides", a: { k: "pick", options, right: all.indexOf(decoy) }, vars: { x: decoy, d: decoy % 10, v: right, e: right % 10 } }],
      },
      show: String(right),
      plain: String(right),
      format: "pick",
      steps: [odd ? `${right} = ${half} \\times 2 + 1` : `${right} = ${half} \\times 2`],
    };
  };
  /** The step a row is counted in. How many numbers lie between two of its neighbours is the slip. */
  const whichStep = (c: Row): Part => {
    const s = Math.abs(c.step);
    const [hi, lo] = [Math.max(c.row[0], c.row[1]), Math.min(c.row[0], c.row[1])];
    const traps: Trap[] = s <= 6 ? [{ id: "gapNotStep", a: num(s - 1), vars: { x: s - 1, lo, hi, v: s } }] : [];
    return { prompt: W.step, q: rowTex(c.row, null), answer: { ...num(s), traps }, show: String(s), plain: String(s), format: "number", steps: [`${hi} - ${lo} = ${s}`] };
  };
  /** Counting on from a in steps of s: is n said? */
  const willSay = (a: number, s: number, n: number): Part => {
    const options = [option(W.words.yes), option(W.words.no)];
    const [k, rest] = [Math.floor((n - a) / s), (n - a) % s];
    const said = rest === 0;
    return {
      prompt: fill(W.said, { a, s, n }),
      q: "",
      answer: { k: "pick", options, right: said ? 0 : 1 },
      show: options[said ? 0 : 1].tex,
      plain: options[said ? 0 : 1].plain,
      format: "pick",
      steps: [`${n} - ${a} = ${n - a}`, said ? `${n - a} = ${k} \\times ${s}` : `${n - a} = ${k} \\times ${s} + ${rest}`],
    };
  };
  /** Is a + b odd or even, without adding: two alike make an even sum, two unlike an odd one. */
  const sumParity = (a: number, b: number): Part => {
    const options = [option(W.words.odd), option(W.words.even)];
    const kind = (n: number) => text(n % 2 ? W.words.odd : W.words.even);
    const odd = (a + b) % 2 === 1;
    return {
      prompt: W.sumParity,
      q: `${a} + ${b}`,
      answer: { k: "pick", options, right: odd ? 0 : 1 },
      show: options[odd ? 0 : 1].tex,
      plain: options[odd ? 0 : 1].plain,
      format: "pick",
      steps: [`${kind(a)} + ${kind(b)} = ${kind(a + b)}`],
    };
  };

  const kind = r.int(0, 3);
  if (L === 1) {
    if (kind === 0) return missing(countRow(r, 1, 4, 1, 100, "last"), W.next);
    if (kind === 1) return missing(countRow(r, 10, 4, 1, 100, "last"), W.next);
    const [t, o] = [r.int(1, 9), r.int(1, 9)];
    if (kind === 2) return tensOnes(t, t === o ? (o % 9) + 1 : o);
    return howManyTens(10 * t + o);
  }
  if (L === 2) {
    if (kind === 3) return whichParity();
    const step = [2, 5, 10][kind];
    // Twos from any number (7, 9, 11 are a count in twos as well), fives from a multiple of five, tens from anywhere.
    return missing(countRow(r, step, 5, step === 5 ? 5 : 1, 100, "notFirst", step === 5));
  }
  if (kind === 0) {
    const step = r.pick([3, 4, 20, 25, 50, 100]);
    return missing(countRow(r, step, 5, step < 10 ? 1 : step, step < 10 ? 60 : 1000, "any", step >= 20));
  }
  if (kind === 1) {
    const step = r.pick([3, 4, 6, 20, 25, 50]);
    return whichStep(countRow(r, step, 4, step < 10 ? 1 : step, step < 10 ? 60 : 500, "last", step >= 20));
  }
  if (kind === 2) {
    const s = r.pick([2, 3, 4, 5, 10]);
    const a = r.int(1, s);
    const said = r.next() < 0.5;
    const k = r.int(6, 18);
    return willSay(a, s, a + k * s + (said ? 0 : r.int(1, s - 1)));
  }
  return sumParity(r.int(11, 89), r.int(11, 89));
};

export default gen;
