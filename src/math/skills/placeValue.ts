// Practice: Place value. What a digit is worth, a number put together from its parts (600 + 8) and a number as so
// many tens: in three-digit numbers, then four and five digits with × and ÷ by 10, 100 and 1000, then six digits and
// decimals. Each level also writes a number from its words, and the hardest a decimal from its words; the first makes
// the largest or smallest number from three digits, the second the smallest from four with a 0 among them and a
// number from too many hundreds (3 thousands, 14 hundreds and 5 ones), the third the same in tenths and hundredths,
// a decimal times or divided by a power of ten, and the larger of a number in figures and one in words. A digit given
// for its value, a zero place left out, the parts written one after another, the opposite number made, a 0 put first,
// the counts set side by side, the point moved the wrong way and two forms compared by their look are the slips.
import { fill } from "../chart";
import { decimalInWords, numberInWords } from "../numberWords";
import { pickText } from "../mulDivKit";
import { num, tidy } from "../practiceKit";
import type { Gen, Part, Rng, Trap } from "../practiceTypes";

/** n different digits, none of them 0. */
export function differentDigits(r: Rng, n: number): number[] {
  const ds: number[] = [];
  while (ds.length < n) {
    const d = r.int(1, 9);
    if (!ds.includes(d)) ds.push(d);
  }
  return ds;
}
/** A whole number in threes, as it is printed: 248 915 (a thin gap that doesn't break). */
export const spaced = (n: number) => String(n).replace(/\B(?=(\d{3})+$)/g, "\u202f");
const RED = "#e03131";
/** 10 to the power k, written as it is printed in a sentence: 10². */
const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const tenTo = (k: number) => `10${String(k).split("").map((d) => SUP[Number(d)]).join("")}`;

const gen: Gen = (r, L, w) => {
  const out = (prompt: string, q: string, v: number, steps: string[], traps: Trap[] = []): ReturnType<Gen> => ({
    prompt, q, answer: { ...num(v), traps }, show: tidy(v), plain: tidy(v), format: "number", steps,
  });
  /**
   * The value of one digit of a number: `ds` its digits, `at` the one asked for, `point` how many of them are after
   * the decimal point. The working writes the number as its parts, the asked one in red.
   */
  const digitValue = (ds: number[], at: number, point = 0): Part => {
    const place = (i: number) => (ds[i] * 10 ** (ds.length - 1 - i)) / 10 ** point;
    const whole = ds.slice(0, ds.length - point).join("");
    const n = point ? `${whole}.${ds.slice(-point).join("")}` : spaced(Number(whole));
    const v = Number(tidy(place(at)));
    const parts = ds.map((_, i) => (i === at ? `\\color{${RED}}{${tidy(place(i))}}` : tidy(place(i))));
    const traps: Trap[] = ds[at] !== v ? [{ id: "digitNotValue", a: num(ds[at]), vars: { x: ds[at], n, v: tidy(v) } }] : [];
    return out(fill(w.basics.digitValue, { d: ds[at], n }), "", v, [`${n.replace(/\u202f/g, "\\,")} = ${parts.join(" + ")}`], traps);
  };
  /**
   * A number put together from its parts, some places empty: `ds` its digits (0 for an empty place), `point` how many
   * are after the point. With an empty place between two parts, the digits set side by side is the slip.
   */
  const together = (ds: number[], point = 0): Part => {
    const f = 10 ** point;
    const parts = ds.map((d, i) => (d * 10 ** (ds.length - 1 - i)) / f).filter((x) => x > 0);
    const v = Number(tidy(parts.reduce((s, x) => s + x, 0)));
    const kept = ds.filter((d) => d > 0);
    // The digits with no zero between them, the point where it was: 600 + 8 → 68, 3 + 0.07 → 3.7.
    const wholeDigits = ds.slice(0, ds.length - point).filter((d) => d > 0).length;
    const slip = Number(kept.slice(0, wholeDigits).join("") + (point ? `.${kept.slice(wholeDigits).join("")}` : ""));
    const traps: Trap[] = slip !== v ? [{ id: "zeroPlaceSkipped", a: num(slip), vars: { x: tidy(slip), v: tidy(v) } }] : [];
    const q = parts.map(tidy).join(" + ");
    return out(w.prompts.times, q, v, [`${q} = ${tidy(v)}`], traps);
  };
  /** n = □ × f: how many tens, hundreds or thousands a number is. */
  /** The digits in an order the seed sets. */
  const shuffled = (xs: number[]) => {
    const all = [...xs];
    for (let i = all.length - 1; i > 0; i--) {
      const j = r.int(0, i);
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all;
  };
  const groups = (k: number, f: number) => out(w.basics.missing, `${k * f} = \\square \\times ${f}`, k, [`${k} \\times ${f} = ${k * f}`]);
  const W = w.place;
  /**
   * A whole number from its words. Writing the first part as it is said and the rest after it (three thousand and
   * forty-two → 300042, two hundred and six → 2006) is the slip.
   */
  const toFigures = (n: number): Part => {
    const big = n >= 1000 ? 1000 : 100;
    const parts = [Math.floor(n / big) * big, n % big].filter((x) => x > 0);
    const x = Number(parts.map(String).join(""));
    const traps: Trap[] = parts.length > 1 ? [{ id: "wordPartsJoined", a: num(x), vars: { x: spaced(x), work: parts.map(spaced).join(" + "), v: spaced(n) } }] : [];
    return out(fill(W.toFigures, { words: numberInWords(n, W.lang) }), "", n, [parts.length > 1 ? `${parts.join(" + ")} = ${n}` : `${n}`], traps);
  };
  /** The largest or smallest number from these digits, each once. The opposite one, and a 0 put first, are slips. */
  const makeFrom = (ds: number[], largest: boolean): Part => {
    const down = [...ds].sort((a, b) => b - a);
    const up = [...ds].sort((a, b) => a - b);
    // The smallest can't begin with 0: the smallest digit that isn't 0 goes first, then the 0s.
    const lead = up.findIndex((d) => d > 0);
    const smallest = [up[lead], ...up.filter((_, i) => i !== lead)];
    const v = Number((largest ? down : smallest).join(""));
    const opposite = Number((largest ? smallest : down).join(""));
    const traps: Trap[] = [{ id: largest ? "smallestForLargest" : "largestForSmallest", a: num(opposite), vars: { x: opposite, v } }];
    if (!largest && lead > 0) traps.push({ id: "zeroFirst", a: num(Number(up.join(""))), vars: { x: Number(up.join("")), v } });
    return out(fill(largest ? W.largest : W.smallest, { d: ds.join(", ") }), "", v, [`${(largest ? down : smallest).join("\\,")} = ${v}`], traps);
  };
  /**
   * A number from counts of its places, one count more than 9 (3 thousands, 14 hundreds and 5 ones): `counts` from
   * the highest place, `places` their names, `point` how many of them are after the point. The counts written side by
   * side, 0 where a place is not said, is the slip.
   */
  const regroup = (counts: number[], places: string[], values: number[]): Part => {
    const v = Number(tidy(counts.reduce((acc, c, i) => acc + c * values[i], 0)));
    const said = counts.map((c, i) => [c, places[i]] as const).filter(([c]) => c > 0).map(([c, name]) => `${c} ${name}`);
    const list = said.length > 1 ? `${said.slice(0, -1).join(", ")} ${W.and} ${said.at(-1)}` : said[0];
    const work = counts.map((c, i) => tidy(c * values[i])).filter((t) => t !== "0");
    const whole = values.filter((x) => x >= 1).length;
    const side = counts.map(String);
    const x = Number(side.slice(0, whole).join("") + (whole < counts.length ? `.${side.slice(whole).join("")}` : ""));
    const big = Math.max(...counts);
    const traps: Trap[] = x !== v ? [{ id: "regroupSideBySide", a: num(x), vars: { x: tidy(x), big, work: work.join(" + "), v: tidy(v) } }] : [];
    return out(fill(W.regroup, { list }), "", v, [`${work.join(" + ")} = ${tidy(v)}`], traps);
  };
  /** A decimal from its words; the digits written straight after the point, with no 0 to hold a place, is the slip. */
  const decimalToFigures = (whole: number, f: number, p: 2 | 3): Part => {
    const v = Number(tidy(whole + f / 10 ** p));
    const x = Number(`${whole}.${f}`);
    const traps: Trap[] = x !== v ? [{ id: "zeroPlaceSkipped", a: num(x), vars: { x: tidy(x), v: tidy(v) } }] : [];
    return out(fill(W.decimal, { words: decimalInWords(whole, f, p, W.lang) }), "", v, [`${whole ? `${whole} + ` : ""}\\dfrac{${f}}{${10 ** p}} = ${tidy(v)}`], traps);
  };
  /** A decimal times or divided by 10 to a power: the point moves that many places. Moving it the other way is the slip. */
  const byPower = (d: number, k: number, times: boolean): Part => {
    const f = 10 ** k;
    const v = Number(tidy(times ? d * f : d / f));
    const x = Number(tidy(times ? d / f : d * f));
    return out(w.prompts.times, `${tidy(d)} ${times ? "\\times" : "\\div"} 10^{${k}}`, v, [`10^{${k}} = ${f}`, `${tidy(d)} ${times ? "\\times" : "\\div"} ${f} = ${tidy(v)}`], [{ id: "pointWrongWay", a: num(x), vars: { f: tenTo(k) } }]);
  };
  /** The larger of a number in figures and one in words, close to it. Judging by how they look is the slip. */
  const larger = (a: number, b: number): Part => {
    const options = [{ text: spaced(a), plain: String(a), tex: spaced(a).replace(/\u202f/g, "\\,") }, { text: numberInWords(b, W.lang), plain: numberInWords(b, W.lang), tex: `\\text{${numberInWords(b, W.lang)}}` }];
    const right = a > b ? 0 : 1;
    return {
      prompt: W.larger,
      q: "",
      answer: { k: "pick", options, right, traps: [{ id: "formsComparedByLook", a: { k: "pick", options, right: 1 - right }, vars: { a: spaced(a), b: spaced(b), v: spaced(Math.max(a, b)) } }] },
      show: options[right].tex,
      plain: options[right].plain,
      format: "pick",
      steps: [`${options[1].tex} = ${spaced(b).replace(/\u202f/g, "\\,")}`, `${spaced(Math.max(a, b)).replace(/\u202f/g, "\\,")} > ${spaced(Math.min(a, b)).replace(/\u202f/g, "\\,")}`],
    };
  };
  /** A number with an empty place: the hundreds, or the tens, are 0. */
  const withGap = (lo: number, hi: number) => {
    const ds = String(r.int(lo, hi)).split("").map(Number);
    ds[r.int(1, ds.length - 2)] = 0;
    return Number(ds.join(""));
  };

  if (L === 1) {
    const kind = r.int(0, 4);
    if (kind === 3) return toFigures(r.next() < 0.6 ? withGap(101, 999) : r.int(101, 999));
    if (kind === 4) return makeFrom(differentDigits(r, 3), r.next() < 0.5);
    if (kind === 0) return digitValue(differentDigits(r, 3), r.int(0, 2));
    if (kind === 1) {
      const ds = differentDigits(r, 3);
      if (r.next() < 0.5) ds[1] = 0;
      return together(ds);
    }
    return groups(r.int(12, 99), 10);
  }
  if (L === 2) {
    const kind = r.int(0, 4);
    if (kind === 3) return toFigures(r.next() < 0.5 ? withGap(1001, 9999) : withGap(10001, 99999));
    if (kind === 4) {
      if (r.next() < 0.5) {
        const ds = differentDigits(r, 3);
        return makeFrom(shuffled([0, ...ds]), false);
      }
      // Too many hundreds or tens: one count is 10 to 19, the others 2 to 9.
      const counts = [r.int(2, 9), r.int(2, 9), r.int(2, 9), r.int(2, 9)];
      const at = r.int(1, 2);
      counts[at] = r.int(11, 19);
      // Sometimes a place not said at all: the tens or the ones, never the one with too many.
      if (r.next() < 0.5) counts[at === 2 ? 3 : r.pick([2, 3])] = 0;
      return regroup(counts, [W.places.thousands, W.places.hundreds, W.places.tens, W.places.ones], [1000, 100, 10, 1]);
    }
    const len = r.int(4, 5);
    if (kind === 0) return digitValue(differentDigits(r, len), r.int(0, len - 2));
    if (kind === 1) {
      const ds = differentDigits(r, len);
      ds[r.int(1, len - 2)] = 0;
      if (r.next() < 0.5) ds[r.int(1, len - 2)] = 0;
      return together(ds);
    }
    const [m, f] = [r.int(12, 999), r.pick([10, 100, 1000])];
    const way = r.int(0, 2);
    if (way === 0) return out(w.prompts.times, `${m} \\times ${f}`, m * f, [`${m} \\times ${f} = ${m * f}`]);
    if (way === 1) return out(w.prompts.times, `${m * f} \\div ${f}`, m, [`${m * f} \\div ${f} = ${m}`]);
    return groups(m, f);
  }
  const kind = r.int(0, 7);
  if (kind === 7) {
    // Comparing place values (#704): the same digit one or two places apart, 0.47 and 0.047. How many times one is the
    // other is a pick; the ratio turned round is the slip.
    const g = r.int(1, 9);
    const o = r.int(1, 9);
    const gap = r.next() < 0.7 ? 1 : 2;
    const hi = r.int(1, 2);
    const asText = (places: number) => tidy((g * 10 + o) / 10 ** (places + 1));
    const [a, b] = [asText(hi), asText(hi + gap)];
    const [va, vb] = [tidy(g / 10 ** hi), tidy(g / 10 ** (hi + gap))];
    const n = 10 ** gap;
    return pickText(r, fill(w.decPics.placeTimes, { g, a, b }), String(n), [{ text: `1/${n}`, id: "placeRatioFlipped", vars: { x: `1/${n}`, g, a, b, va, vb, n } }], [String(10 ** (3 - gap))], {
      steps: [`${va} = ${n} \\times ${vb}`],
    });
  }
  if (kind === 3) {
    const p = r.next() < 0.6 ? 2 : 3;
    // Thousandths end in a digit that isn't 0, so the words name the last place (not "fifty thousandths").
    const f = p === 2 ? r.int(1, 9) : 10 * r.int(1, 9) + r.int(1, 9);
    return decimalToFigures(r.next() < 0.3 ? 0 : r.int(1, 25), f, p);
  }
  if (kind === 4) {
    const counts = [r.int(2, 9), r.int(11, 19), r.int(2, 9)];
    return regroup(counts, [W.places.ones, W.places.tenths, W.places.hundredths], [1, 0.1, 0.01]);
  }
  if (kind === 5) {
    const k = r.int(1, 3);
    const times = r.next() < 0.5;
    const d = times ? r.int(11, 999) / 1000 : r.int(11, 999) / 10;
    return byPower(Number(tidy(d)), k, times);
  }
  if (kind === 6) {
    // Two numbers that differ in one place, one written in words: 340 500 or three hundred and four thousand five hundred.
    const a = 1000 * r.int(101, 989) + 100 * r.int(1, 9);
    const ds = String(a).split("");
    const at = r.int(1, 3);
    ds[at] = String((Number(ds[at]) + r.int(1, 8)) % 10);
    const b = Number(ds.join(""));
    return r.next() < 0.5 ? larger(a, b) : larger(b, a);
  }
  if (kind === 0) return digitValue(differentDigits(r, 6), r.int(0, 3));
  if (kind === 1) {
    // A decimal: one or two digits before the point, two or three after it, and a digit after the point asked for.
    const [before, after] = [r.int(1, 2), r.int(2, 3)];
    return digitValue(differentDigits(r, before + after), before + r.int(0, after - 1), after);
  }
  const ds = differentDigits(r, 4);
  if (r.next() < 0.5) ds[0] = 0;
  if (r.next() < 0.6) ds[2] = 0;
  return together(ds, 2);
};

export default gen;
