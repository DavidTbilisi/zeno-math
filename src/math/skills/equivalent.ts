// Practice: Equal fractions.
// The one of four equal to a fraction: shaded parts, then a fraction, then a decimal or percentage. At P3 fractions are
// numbers on a line as well (#702): the fraction a point shows, where 1 is, a point past 1, the point a fraction bar
// matches, a whole number as a fraction, a fraction against 1, the same point on a line cut finer and the pieces
// shaded over two bars of one whole each. The marks counted for the parts, the parts after a whole counted alone, the
// last mark before 1 taken for 1, the parts not shaded read, the whole number left as it is, a fraction past 1 taken
// for less, the top kept on the finer line and every piece of both bars taken as the bottom are named.
import { fill, r2 } from "../chart";
import { eqQuestion, partsSvg } from "../equivMatch";
import { fracLine, wholeBars } from "../fracLinePics";
import { pickPart, pickText } from "../mulDivKit";
import { num } from "../practiceKit";
import type { Exercise, Gen, Part, Rng, PracticeWords, Trap } from "../practiceTypes";

/** A fraction typed (3/4), any equal one accepted; its slips by their values. */
const typed = (prompt: string, q: string, n: number, d: number, traps: Trap[], more: { pic?: Exercise["pic"]; steps: string[] }): Part => ({
  prompt, q, answer: { ...num(n / d), traps }, show: `\\frac{${n}}{${d}}`, plain: `${n}/${d}`, format: "fraction", ...more,
});
const frac = (n: number, d: number) => `${n}/${d}`;
/** Labels at 0 and at each whole. */
const wholes = (k: number, d: number): [number, string][] => Array.from({ length: k + 1 }, (_, i) => [i * d, String(i)]);
const LETTERS = ["A", "B", "C"];

/** Fractions as numbers on a line, P3. */
function onTheLine(r: Rng, kind: number, w: PracticeWords): Part {
  const W = w.fracLine;
  const d = r.pick([2, 3, 4, 6, 8]);
  /** Three points, the right one among them, lettered left to right; the letter each part count gets. */
  const lettered = (parts: number[]) => {
    const sorted = [...new Set(parts)].sort((a, b) => a - b);
    return { letters: sorted.map((p, i) => [p, LETTERS[i]] as [number, string]), of: (p: number) => LETTERS[sorted.indexOf(p)] };
  };
  if (kind === 1) {
    // The fraction a point shows, between 0 and 1. The marks counted (0 too) for the bottom is the slip.
    const k = r.int(1, d - 1);
    const traps: Trap[] = k / (d + 1) !== k / d ? [{ id: "marksForParts", a: num(k / (d + 1)), vars: { x: frac(k, d + 1), d, v: frac(k, d) } }] : [];
    return typed(W.point, "", k, d, traps, { pic: fracLine({ wholes: 1, d, labels: wholes(1, d), dot: k }), steps: [`1 \\div ${d} = \\frac{1}{${d}}`, `${k} \\times \\frac{1}{${d}} = \\frac{${k}}{${d}}`] });
  }
  if (kind === 2) {
    // Where 1 is, from 0 and the first mark: d parts of 1/d. The last mark before it is the slip.
    const dd = r.pick([3, 4, 5, 6]);
    const { letters, of } = lettered([dd - 1, dd, dd + 1]);
    return pickText(r, fill(W.findOne, { f: frac(1, dd) }), of(dd), [{ text: of(dd - 1), id: "oneTooSoon", vars: { k: dd - 1, d: dd, right: of(dd) } }], [of(dd + 1)], {
      pic: fracLine({ wholes: 2, d: dd, labels: [[0, "0"], [1, frac(1, dd)]], letters }),
      steps: [`${dd} \\times \\frac{1}{${dd}} = \\frac{${dd}}{${dd}} = 1`],
    });
  }
  if (kind === 3) {
    // A point past 1. The parts after the last whole counted alone is the slip.
    const dd = r.pick([2, 3, 4]);
    const k = dd * r.int(1, 2) + r.int(1, dd - 1);
    const whole = Math.floor(k / dd);
    return typed(W.point, "", k, dd, [{ id: "partsAfterWhole", a: num((k % dd) / dd), vars: { x: frac(k % dd, dd), w: whole, d: dd, v: frac(k, dd) } }], {
      pic: fracLine({ wholes: 3, d: dd, labels: wholes(3, dd), dot: k }),
      steps: [`${whole} = \\frac{${whole * dd}}{${dd}}`, `\\frac{${whole * dd}}{${dd}} + \\frac{${k % dd}}{${dd}} = \\frac{${k}}{${dd}}`],
    });
  }
  if (kind === 4) {
    // The point a shaded bar matches, the bar as long as one whole. The parts not shaded read is the slip.
    // Three parts or more, and never half shaded, so the shaded and the unshaded points differ.
    const dd = r.pick([3, 4, 5, 6, 8]);
    const k = r.pick(Array.from({ length: dd - 1 }, (_, i) => i + 1).filter((x) => 2 * x !== dd));
    const { letters, of } = lettered([k, dd - k, dd]);
    return pickText(r, fill(W.barToLine, { k, d: dd }), of(k), [{ text: of(dd - k), id: "unshadedRead", vars: { k, d: dd, right: of(k) } }], [of(dd)], {
      pic: fracLine({ wholes: 1, d: dd, labels: wholes(1, dd), letters, bar: k }),
      steps: [`\\frac{${k}}{${dd}}`],
    });
  }
  if (kind === 5) {
    // A whole number as a fraction: m = □/d. The whole number left as it is is the slip.
    const [m, dd] = [r.int(2, 5), r.int(2, 8)];
    return {
      prompt: w.basics.missing, q: `${m} = \\frac{\\square}{${dd}}`, answer: { ...num(m * dd), traps: [{ id: "wholeNotScaled", a: num(m), vars: { x: m, w: m, d: dd, v: m * dd } }] },
      show: String(m * dd), plain: String(m * dd), format: "number",
      pic: fracLine({ wholes: m, d: dd, labels: wholes(m, dd) }),
      steps: [`1 = \\frac{${dd}}{${dd}}`, `${m} = \\frac{${m} \\times ${dd}}{${dd}} = \\frac{${m * dd}}{${dd}}`],
    };
  }
  if (kind === 6) {
    // A fraction against 1: less, equal or greater. Past 1 taken for less (the bigger bottom read as bigger) is the slip.
    const dd = r.int(2, 8);
    const t = r.int(0, 2);
    const n = t === 0 ? r.int(1, dd - 1) : t === 1 ? dd : dd + r.int(1, dd);
    const f = `\\frac{${n}}{${dd}}`;
    const sign = n < dd ? "<" : n === dd ? "=" : ">";
    const vars = { f: frac(n, dd), n, d: dd, sign };
    const slips = n > dd ? [{ tex: `${f} < 1`, id: "pastOneAsLess" as const, vars }] : [];
    const all = ["<", "=", ">"].map((s) => `${f} ${s} 1`);
    return pickPart(r, fill(W.toOne, { f: frac(n, dd) }), `${f} ${sign} 1`, slips, all.filter((o) => o !== `${f} ${sign} 1` && !slips.some((s) => s.tex === o)), {
      steps: [`1 = \\frac{${dd}}{${dd}}`, `${n} ${sign} ${dd} \\Rightarrow ${f} ${sign} 1`],
    });
  }
  if (kind === 7) {
    // The same point on a line cut finer: a/b = □/(b·k). The top kept is the slip.
    const b = r.pick([2, 3, 4]);
    const k = r.pick([2, 3].filter((x) => b * x <= 12));
    const a = r.int(1, b - 1);
    const e = b * k;
    return {
      prompt: W.sameLine, q: `\\frac{${a}}{${b}} = \\frac{\\square}{${e}}`, answer: { ...num(a * k), traps: [{ id: "sameTopKept", a: num(a), vars: { x: a, e, d: b, k, n: a, v: a * k, f: frac(a, b) } }] },
      show: String(a * k), plain: String(a * k), format: "number",
      pic: fracLine({ wholes: 1, d: b, labels: [[0, "0"], [b, "1"], [a, frac(a, b)]], dot: a, under: e }),
      steps: [`\\frac{${a}}{${b}} = \\frac{${a} \\times ${k}}{${b} \\times ${k}} = \\frac{${a * k}}{${e}}`],
    };
  }
  // The pieces shaded over two bars of one whole each, past 1. Every piece of both bars taken as the bottom is the slip.
  const dd = r.pick([3, 4, 5, 6]);
  const n = dd + r.int(1, dd - 1);
  return typed(W.pastOne, "", n, dd, [{ id: "allPiecesAsBottom", a: num(n / (2 * dd)), vars: { x: frac(n, 2 * dd), d: dd, n, v: frac(n, dd) } }], {
    pic: wholeBars(2, dd, n),
    steps: [`1 = \\frac{${dd}}{${dd}}`, `\\frac{${dd}}{${dd}} + \\frac{${n - dd}}{${dd}} = \\frac{${n}}{${dd}}`],
  });
}

const gen: Gen = (r, L, w) => {
  if (L === 2) {
    const kind = r.int(0, 8);
    if (kind > 0) return onTheLine(r, kind, w);
  }
  // The one of four equal to a fraction (src/math/equivMatch.ts); the wrong ones are slips that get named.
  const t = eqQuestion(L, r.next);
  const best = t.options[t.right];
  const f = `\\frac{${t.n}}{${t.d}}`;
  const steps =
    L === 1 ? [`${t.n} + ${t.d - t.n} = ${t.d}, \\quad ${f}`]
    : L === 2 ? [`${f} = \\frac{${t.n} \\times ${t.k}}{${t.d} \\times ${t.k}} = ${best.tex}`]
    : [`${t.n} \\div ${t.d} = ${Number((t.n / t.d).toFixed(3))}`, `${Number((t.n / t.d).toFixed(3))} = ${Number(((t.n / t.d) * 100).toFixed(1))}\\%`];
  const pic = L === 1 ? partsSvg(t.n, t.d) : null;
  return {
    prompt: L === 1 ? w.prompts.equivShaded : fill(L === 2 ? w.prompts.equivFraction : w.prompts.equivDecimal, { f: `${t.n}/${t.d}` }),
    q: L === 1 ? "" : f,
    ...(pic ? { pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic}</g>`, h: 50, w: 240 } } : {}),
    answer: { k: "near", options: t.options, right: t.right, traps: t.traps.map((x) => ({ id: x.id, a: { k: "near", options: t.options, right: x.at }, vars: x.vars })) },
    show: L === 1 ? f : `${f} = ${best.tex}`,
    plain: best.plain,
    format: "near",
    steps,
  };
};

export default gen;
