// Practice: Ratio.
import { fill } from "../chart";
import { type RatioSolution, ratioSteps } from "../ratioPics";
import { fr, fracTex, gcd, num, plainFrac, withIdeas } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { tapePic } from "../propPics";
import { opt, pickOf, word } from "../signedKit";

/** Whole numbers from 1 to max with no common factor, all different. */
function coprimeOf(r: Rng, n: number, max: number, min = 1): number[] {
  for (;;) {
    const vs = Array.from({ length: n }, () => r.int(min, max));
    if (vs.reduce(gcd) === 1 && new Set(vs).size === n) return vs;
  }
}
/** A ratio in its simplest form. */
const simplest = (a: number, b: number) => [a / gcd(a, b), b / gcd(a, b)];

/**
 * The kinds #708 added. Easy: a ratio table with a gap, a tape diagram (one part taken for B is the slip), and which
 * necklace has the same ratio (the same number added to both is the slip). Medium: equivalent ratios in a recipe or a
 * paint mix. Hard, the new settings: a ratio of two amounts in different units (the units left mixed is the slip), and
 * a ratio on the coordinate plane (A and B the wrong way round is the slip).
 */
function more(r: Rng, L: number, kind: number, w: PracticeWords): Part {
  const W = w.prop;
  if (L === 1 && kind === 1) {
    const [m, n] = coprimeOf(r, 2, 9);
    const k1 = r.int(2, 4);
    const k2 = r.int(5, 9);
    const q = `\\begin{array}{c|ccc} A & ${m} & ${k1 * m} & ${k2 * m} \\\\ \\hline B & ${n} & ${k1 * n} & ? \\end{array}`;
    const traps: Trap[] = [{ id: "addedNotScaled", a: num(k2 * m + n - m), vars: { a: m, b: k2 * m, k: k2 } }];
    return withIdeas(["ratioScale"], { prompt: W.ratioTable, q, answer: { ...num(k2 * n), traps }, show: String(k2 * n), plain: String(k2 * n), format: "number", steps: [`${k2 * m} \\div ${m} = ${k2}`, `${n} \\times ${k2} = ${k2 * n}`] });
  }
  if (L === 1 && kind === 2) {
    const [m, n] = coprimeOf(r, 2, 6);
    const u = r.int(2, 12);
    const v = u * n;
    const traps: Trap[] = n > 1 ? [{ id: "onePartOnly", a: num(u), vars: { u, n, v } }] : [];
    return withIdeas(["ratioParts"], { prompt: fill(W.tape, { r: `${m} : ${n}`, a: u * m }), q: "", pic: tapePic(m, n, u * m), answer: { ...num(v), traps }, show: String(v), plain: String(v), format: "number", steps: [`${u * m} \\div ${m} = ${u}`, `${n} \\times ${u} = ${v}`] });
  }
  if (L === 1) {
    // Which necklace keeps the ratio: both counts times the same number.
    const [a, b] = coprimeOf(r, 2, 6, 2);
    const k = r.int(2, 4);
    const d = r.int(1, 4);
    const beads = (x: number, y: number) => word(fill(W.beads, { a: x, b: y }));
    const right = beads(k * a, k * b);
    const added = beads(a + d, b + d);
    const others = [beads(k * b, k * a), beads(k * a, k * b + 1)].filter((o) => o.text !== added.text);
    return withIdeas(["ratioScale"], pickOf(r, fill(W.sameMix, { a, b }), right, [{ o: added, id: "addedNotScaled", vars: { a, b: a + d, k: plainFrac(fr(a + d, a)) } }], others, { steps: [`${a} : ${b} = ${k} \\times ${a} : ${k} \\times ${b} = ${k * a} : ${k * b}`] }));
  }
  if (L === 2) {
    // A recipe or a paint mix: so much of one for every so much of the other.
    const [a, b] = coprimeOf(r, 2, 9, 2);
    const k = r.int(2, 6);
    const c = b * k;
    const traps: Trap[] = [{ id: "addedNotScaled", a: num(a + c - b), vars: { a: b, b: c, k } }];
    return withIdeas(["ratioScale"], { prompt: fill(kind === 1 ? W.flour : W.paint, { a, b, c }), q: "", answer: { ...num(a * k), traps }, show: String(a * k), plain: String(a * k), format: "number", steps: [`${c} \\div ${b} = ${k}`, `${a} \\times ${k} = ${a * k}`] });
  }
  if (kind === 1) {
    // Two amounts in different units: written in the smaller unit first.
    const [small, big, f] = r.pick([[w.units.cm, w.units.m, 100], [w.units.g, w.units.kg, 1000], [w.units.ml, w.units.l, 1000], [w.time.min, w.time.h, 60], [w.units.m, w.units.km, 1000]] as [string, string, number][]);
    let a: number, b: number;
    do {
      a = f === 60 ? 5 * r.int(1, 11) : (f / 10) * r.int(1, 9) * (r.next() < 0.5 ? 1 : 0.5);
      b = r.int(1, 5);
    } while (!Number.isInteger(a) || a % f === 0 || simplest(a, b * f).join() === simplest(a, b).join());
    const right = simplest(a, b * f);
    const mixed = simplest(a, b);
    const traps: Trap[] = [{ id: "ratioUnitsMixed", a: { k: "ratio", vs: mixed }, vars: { a: `${a} ${small}`, b: `${b} ${big}`, a2: `${a} ${small}`, b2: `${b * f} ${small}`, v: right.join(" : ") } }];
    return withIdeas(["ratioUnits", "ratioSimplify"], { prompt: fill(W.units, { a: `${a} ${small}`, b: `${b} ${big}` }), q: "", answer: { k: "ratio", vs: right, traps }, show: right.join(" : "), plain: right.join(" : "), format: "ratio", steps: [`${b}\\text{ ${big}} = ${b * f}\\text{ ${small}}`, `${a} : ${b * f} = ${right.join(" : ")}`] });
  }
  // A ratio on the coordinate plane, A across and B up: its points lie on one line through (0, 0).
  const [m, n] = coprimeOf(r, 2, 6);
  const k = r.int(2, 5);
  const pt = (x: number, y: number) => opt(`(${x}, ${y})`);
  const right = pt(k * m, k * n);
  const swapped = pt(k * n, k * m);
  const others = [pt(m + k, n + k), pt(k * m, k * n + 1)].filter((o) => o.text !== right.text && o.text !== swapped.text);
  return withIdeas(["ratioOrder", "ratioScale"], pickOf(r, fill(W.plane, { r: `${m} : ${n}` }), right, [{ o: swapped, id: "ratioPointSwapped", vars: { p: k * m, q: k * n } }], others, { steps: [`${m} : ${n} = ${k * m} : ${k * n}`, `(${k * m}, ${k * n})`] }));
}

const gen: Gen = (r, L, w) => {
  const extra = r.int(0, L === 1 ? 3 : 2);
  if (extra > 0) return more(r, L, extra, w);
  // Ratios of whole numbers (P6): whole numbers from 1 to max with no common factor, all different.
  const coprime = (n: number, max: number) => coprimeOf(r, n, max);
  // The picture: the bar model, a row of equal parts for each of A, B (and C), what is asked green; the working beneath.
  const model = (spec: RatioSolution) => ({ kind: "ratio" as const, spec: { ...spec, steps: ratioSteps(spec) } });
  const asked = (vs: number[], k: number, prompt: string) => {
    const terms = vs.map((v) => k * v);
    return withIdeas(["ratioSimplify"], { prompt, q: terms.join(" : "), answer: { k: "ratio" as const, vs }, show: vs.join(" : "), plain: vs.join(" : "), format: "ratio" as const, solution: model({ pic: "simplify", vs, k }) });
  };
  if (L === 1) {
    const [m, n] = coprime(2, 9);
    const k = r.int(2, 9);
    if (r.next() < 0.5) return asked([m, n], k, w.prompts.ratioSimplify);
    // The missing term of two equal ratios. Adding what the first term grew by, instead of multiplying, is the trap.
    const traps: Trap[] = [{ id: "addedNotScaled", a: num(k * m + n - m), vars: { a: m, b: k * m, k } }];
    return withIdeas(["ratioScale"], { prompt: w.prompts.ratioMissing, q: `${m} : ${n} = ${k * m} : \\,?`, answer: { ...num(k * n), traps }, show: String(k * n), plain: String(k * n), format: "number", solution: model({ pic: "partKnown", vs: [m, n], u: k, whole: false, missing: true }) });
  }
  if (L === 2) {
    const [m, n] = coprime(2, 9);
    const u = r.int(2, 12);
    if (r.next() < 0.5) {
      // A total shared in a ratio: m + n equal parts. Taking A's share as m/n of the total is the trap.
      const second = r.next() < 0.5;
      const T = u * (m + n);
      const v = u * (second ? n : m);
      const traps: Trap[] = !second && m < n && (T * m) % n === 0 ? [{ id: "ratioAsFraction", a: num((T * m) / n), vars: { m, n, s: m + n } }] : [];
      return withIdeas(["ratioParts"], { prompt: fill(w.prompts.ratioShare, { t: T, r: `${m} : ${n}`, who: second ? "B" : "A" }), q: "", answer: { ...num(v), traps }, show: String(v), plain: String(v), format: "number", solution: model({ pic: "share", vs: [m, n], u, who: second ? 1 : 0 }) });
    }
    // One part known: the other part (adding what A's part grew by is the trap), or the whole.
    const whole = r.next() < 0.5;
    const v = u * (whole ? m + n : n);
    const traps: Trap[] = whole ? [] : [{ id: "addedNotScaled", a: num(u * m + n - m), vars: { a: m, b: u * m, k: u } }];
    return withIdeas(whole ? ["ratioParts"] : ["ratioScale"], { prompt: fill(whole ? w.prompts.ratioWhole : w.prompts.ratioPart, { r: `${m} : ${n}`, a: u * m }), q: "", answer: { ...num(v), traps }, show: String(v), plain: String(v), format: "number", solution: model({ pic: "partKnown", vs: [m, n], u, whole }) });
  }
  const kind = r.int(0, 2);
  if (kind === 0) return asked(coprime(3, 9), r.int(2, 6), w.prompts.ratioSimplify);
  if (kind === 1) {
    // Shared between three.
    const vs = coprime(3, 6);
    const u = r.int(2, 12);
    const T = u * vs.reduce((s, v) => s + v, 0);
    const who = r.int(0, 2);
    return withIdeas(["ratioParts"], { prompt: fill(w.prompts.ratioShare3, { t: T, r: vs.join(" : "), who: "ABC"[who] }), q: "", answer: num(u * vs[who]), show: String(u * vs[who]), plain: String(u * vs[who]), format: "number", solution: model({ pic: "share", vs, u, who }) });
  }
  // A part as a fraction of the whole (fraction and ratio). Taking m : n as m/n is the trap.
  const [m, n] = coprime(2, 9);
  const s = m + n;
  const traps: Trap[] = [{ id: "ratioAsFraction", a: num(m / n), vars: { m, n, s } }];
  return withIdeas(["ratioParts"], { prompt: fill(w.prompts.ratioFraction, { r: `${m} : ${n}` }), q: "", answer: { ...num(m / s, 1e-9, { lowest: true }), traps }, show: fracTex(m, s), plain: `${m}/${s}`, format: "fraction", solution: model({ pic: "fraction", vs: [m, n] }) });
};

export default gen;
