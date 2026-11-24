// Practice: Stacked fractions, a fraction with a fraction inside it, worked out as one number. On one line 1/2/3
// doesn't say which bar divides: (1/2)/3 is 1/6 and 1/(2/3) is 3/2, so the main bar is drawn the longest and reading it
// as ÷ is the first step. Easy: a fraction over a whole number, or a whole number over a fraction. Medium: a fraction
// over a fraction. Hard: a sum or a difference above or below the bar, 1 ± 1/n over 1 ± 1/m, or mixed numbers. The
// slips named: dividing at a short bar first, turning the top over instead of the bottom, and multiplying the two as
// they stand. The worked solution is the fraction tool's ÷ picture under the stacked fraction (src/math/fracop.ts),
// or the lines of working when a sum comes first.
import type { Frac } from "../fraction";
import type { MistakeId } from "../mistakes";
import { fr, fracTex, gcd, mixedTex, num, overTex, plainFrac } from "../practiceKit";
import type { Gen, PracticeWords, Rng, Trap } from "../practiceTypes";

/** A number as the question writes it: its value, its LaTeX and the text the fraction tool reads ("3", "2/3", "1 1/2"). */
type N = { f: Frac; tex: string; txt: string };

const whole = (n: number): N => ({ f: fr(n), tex: String(n), txt: String(n) });
const frac = (n: number, d: number): N => ({ f: fr(n, d), tex: fracTex(n, d), txt: `${n}/${d}` });
const mixed = (w: number, n: number, d: number): N => ({ f: fr(w * d + n, d), tex: mixedTex(w, n, d), txt: `${w} ${n}/${d}` });
const valueOf = (f: Frac): N => (f.d === 1 ? whole(f.n) : frac(f.n, f.d));

/** A fraction below 1 in lowest terms, its bottom from 2 to maxD. */
function proper(r: Rng, maxD: number): N {
  for (;;) {
    const d = r.int(2, maxD);
    const n = r.int(1, d - 1);
    if (gcd(n, d) === 1) return frac(n, d);
  }
}

/** The answer in LaTeX: an improper one as a mixed number too. */
function show(res: Frac): string {
  const w = Math.trunc(res.n / res.d);
  return res.d === 1 || w === 0 ? res.tex() : `${res.tex()} = ${mixedTex(w, res.n % res.d, res.d)}`;
}

/**
 * top over bottom as a question: the answer, and the slips that give another number than it (and than each other).
 * `wrongBar` is the value a short bar read as the main one gives, where the question has one.
 */
function over(top: N, bottom: N, w: PracticeWords, wrongBar?: Frac) {
  const res = top.f.div(bottom.f);
  const work = `${top.txt} ÷ ${bottom.txt} = ${plainFrac(top.f)} × ${plainFrac(fr(bottom.f.d, bottom.f.n))} = ${plainFrac(res)}`;
  const slips: [MistakeId, Frac][] = [...(wrongBar ? [["stackWrongBar", wrongBar] as [MistakeId, Frac]] : []), ["stackNoFlip", top.f.mul(bottom.f)], ["stackFlipTop", bottom.f.div(top.f)]];
  const seen = [res];
  const traps: Trap[] = [];
  for (const [id, v] of slips) {
    if (seen.some((s) => s.sub(v).isZero())) continue;
    seen.push(v);
    traps.push({ id, a: num(v.toNumber()), vars: { x: plainFrac(v), work } });
  }
  return { prompt: w.prompts.fractions, answer: { ...num(res.toNumber(), 1e-9, { lowest: true }), traps }, show: show(res), plain: plainFrac(res), format: "fraction" as const };
}

/** One number over another, worked by the fraction tool: the ÷ picture, then the working from the long bar on. */
function plain(top: N, bottom: N, w: PracticeWords, wrongBar?: Frac): ReturnType<Gen> {
  return { ...over(top, bottom, w, wrongBar), q: overTex(top.tex, bottom.tex), solution: { kind: "model", spec: { type: "fracop", op: "÷", a: top.txt, b: bottom.txt, step: 99, over: true } } };
}

/** a + b or a − b on the common denominator: as written, the line that works it out, and its value. */
function sum(a: N, b: N, plus: boolean): { tex: string; line: string; value: N } {
  const L = (a.f.d / gcd(a.f.d, b.f.d)) * b.f.d;
  const [a1, b1] = [(a.f.n * L) / a.f.d, (b.f.n * L) / b.f.d];
  const sign = plus ? "+" : "-";
  const value = valueOf(plus ? a.f.add(b.f) : a.f.sub(b.f));
  const tex = `${a.tex} ${sign} ${b.tex}`;
  const raw = fracTex(plus ? a1 + b1 : a1 - b1, L);
  return { tex, line: `${tex} = ${fracTex(a1, L)} ${sign} ${fracTex(b1, L)} = ${raw}${raw === value.tex ? "" : ` = ${value.tex}`}`, value };
}

/** The last line of working: the long bar as ÷, the bottom turned over, tops times tops, and lowest terms. */
function divideLine(top: N, bottom: N): string {
  const [n, d] = [top.f.n * bottom.f.d, top.f.d * bottom.f.n];
  const res = top.f.div(bottom.f);
  const product = d === 1 ? String(n) : fracTex(n, d);
  return `${overTex(top.tex, bottom.tex)} = ${top.tex} \\div ${bottom.tex} = ${top.tex} \\times ${fr(bottom.f.d, bottom.f.n).tex()} = ${product}${product === res.tex() ? "" : ` = ${res.tex()}`}`;
}

/** A top and a bottom of a fraction below 1 in lowest terms, for a mixed number's fraction part. */
function pair(r: Rng): [number, number] {
  const f = proper(r, 6);
  return [f.f.n, f.f.d];
}

/** A sum or a difference beside the bar, 1 ± 1/n over 1 ± 1/m, or mixed numbers. */
function hard(r: Rng, w: PracticeWords): ReturnType<Gen> {
  const kind = r.int(0, 2);
  if (kind === 2) {
    // Mixed over mixed, mixed over a fraction, or a fraction over mixed: each mixed number becomes an improper fraction first.
    const mixedOne = () => mixed(r.int(1, 3), ...pair(r));
    const which = r.int(0, 2);
    const top = which === 2 ? proper(r, 6) : mixedOne();
    const bottom = which === 1 ? proper(r, 6) : mixedOne();
    return plain(top, bottom, w);
  }
  if (kind === 1) {
    // 1 ± 1/n over 1 ± 1/m.
    const top = sum(whole(1), frac(1, r.int(2, 6)), r.next() < 0.5);
    const bottom = sum(whole(1), frac(1, r.int(2, 6)), r.next() < 0.5);
    return { ...over(top.value, bottom.value, w), q: overTex(top.tex, bottom.tex), steps: [top.line, bottom.line, divideLine(top.value, bottom.value)] };
  }
  // A sum or a difference of two fractions with different bottoms, above or below a fraction or a whole number.
  let [a, b] = [proper(r, 6), proper(r, 6)];
  while (b.f.d === a.f.d) b = proper(r, 6);
  const plus = r.next() < 0.5;
  if (!plus && a.f.toNumber() < b.f.toNumber()) [a, b] = [b, a];
  const s = sum(a, b, plus);
  const other = r.next() < 0.6 ? proper(r, 6) : whole(r.int(2, 5));
  const onTop = r.next() < 0.5;
  const [top, bottom] = onTop ? [s.value, other] : [other, s.value];
  return { ...over(top, bottom, w), q: onTop ? overTex(s.tex, other.tex) : overTex(other.tex, s.tex), steps: [s.line, divideLine(top, bottom)] };
}

const gen: Gen = (r, L, w) => {
  if (L === 1) {
    const f = proper(r, 6);
    if (r.next() < 0.5) {
      // (a/b)/c = a/(bc). Read with the short bar as the main one it is a/(b/c) = ac/b.
      const c = whole(r.int(2, 6));
      return plain(f, c, w, f.f.mul(c.f));
    }
    // a/(b/c) = ac/b. Read with the short bar as the main one it is (a/b)/c = a/(bc).
    const a = whole(r.int(1, 6));
    return plain(a, f, w, a.f.div(fr(f.f.n * f.f.d)));
  }
  if (L === 2) {
    const top = proper(r, 9);
    let bottom = proper(r, 9);
    while (bottom.txt === top.txt) bottom = proper(r, 9);
    return plain(top, bottom, w);
  }
  // A top equal to the bottom is 1 whatever is done with it: another question is drawn.
  for (;;) {
    const ex = hard(r, w);
    if (ex.plain !== "1") return ex;
  }
};

export default gen;
