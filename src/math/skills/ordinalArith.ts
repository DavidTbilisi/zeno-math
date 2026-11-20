// Practice: ordinal arithmetic. Easy picks α + β for ordinals below ω^ω (β + α, the sum the other way, named); medium
// picks α · β (β · α named); hard picks a cardinal among ℵ₀, 𝔠 and 2^𝔠 (a product taken for a power, ℵ₀^ℵ₀ kept
// countable, 𝔠^ℵ₀ taken past 𝔠, named) or the axiom of ZFC that makes a set (Replacement for Separation and the
// other way round, named).
import { pickOf, sym, word } from "../calculusTwo";
import { shuffled } from "../logicSets";
import {
  AXIOM_NAMES,
  CARDINALS,
  CARDINAL_SUMS,
  CONSTRUCTIONS,
  natProduct,
  natural,
  oadd,
  omul,
  ordFactorTex,
  ordTex,
  ordText,
  type Ord,
} from "../foundations";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** A small ordinal below ω³: one to three terms. */
function ordinal(r: Rng, top: number): Ord {
  const out: Ord = [];
  for (let e = r.int(1, top); e >= 0; e--) if (out.length === 0 || r.next() < 0.5) out.push([e, r.int(1, 3)]);
  return out;
}
const same = (a: Ord, b: Ord) => ordText(a) === ordText(b);
const bump = (a: Ord): Ord => a.map(([e, c], i) => [e, i === 0 ? c + 1 : c]);

function arithPart(r: Rng, w: PracticeWords, times: boolean): Part {
  for (;;) {
    const a = r.next() < 0.3 ? [[0, r.int(1, 4)]] as Ord : ordinal(r, times ? 1 : 2);
    const b = r.next() < 0.3 ? [[0, r.int(2, 4)]] as Ord : ordinal(r, times ? 1 : 2);
    if (!times && b[0][0] === 0) continue;
    const right = times ? omul(a, b) : oadd(a, b);
    const swapped = times ? omul(b, a) : oadd(b, a);
    const nat = times ? natProduct(a, b) : natural(a, b);
    if (same(right, swapped)) continue;
    const pool = [right, swapped, nat, bump(right), bump(swapped)];
    const opts: Ord[] = [];
    for (const o of pool) if (!opts.some((x) => same(x, o))) opts.push(o);
    if (opts.length < 4) continue;
    const shown = shuffled(r, opts.slice(0, 4));
    const op = times ? "\\cdot" : "+";
    const steps = times
      ? [
          ...b.map(([e, d]) =>
            e > 0
              ? `${ordFactorTex(a)} \\cdot ${ordTex([[e, d]])} = ${ordTex([[a[0][0] + e, d]])}`
              : `${ordFactorTex(a)} \\cdot ${d} = ${ordTex([[a[0][0], a[0][1] * d], ...a.slice(1)])}`,
          ),
          `${ordFactorTex(a)} \\cdot ${ordFactorTex(b)} = ${ordTex(right)}`,
        ]
      : [`\\text{the terms of } ${ordTex(a)} \\text{ below } ${ordTex([[b[0][0], 1]])} \\text{ are absorbed}`, `${ordTex(a)} + ${ordTex(b)} = ${ordTex(right)}`];
    return {
      prompt: w.fo.prompt.ordinal,
      q: `${times ? ordFactorTex(a) : ordTex(a)} ${op} ${times ? ordFactorTex(b) : ordTex(b)}`,
      ...pickOf(shown.map((o) => sym(ordTex(o), ordText(o))), shown.findIndex((o) => same(o, right)), [
        [times ? "ordinalProductCommuted" : "ordinalSumCommuted", shown.findIndex((o) => same(o, swapped))],
      ]),
      steps,
    };
  }
}

function cardinalPart(r: Rng, w: PracticeWords): Part {
  const c = r.pick(CARDINAL_SUMS);
  return {
    prompt: w.fo.prompt.cardinal,
    q: c.tex,
    ...pickOf(CARDINALS.map((k) => sym(k.tex, k.text)), c.right, c.trap ? [c.trap] : []),
    steps: [c.why, `${c.tex} = ${CARDINALS[c.right].tex}`],
  };
}

function axiomPart(r: Rng, w: PracticeWords): Part {
  const c = r.pick(CONSTRUCTIONS);
  const named = c.trap ? [c.right, c.trap[1]] : [c.right];
  const names = shuffled(r, [...named, ...shuffled(r, AXIOM_NAMES.filter((n) => !named.includes(n))).slice(0, 4 - named.length)]);
  return {
    prompt: w.fo.prompt.axiom,
    q: c.tex,
    ...pickOf(names.map((n) => word(w.fo.axioms[n])), names.indexOf(c.right), c.trap ? [[c.trap[0], names.indexOf(c.trap[1])]] : []),
    steps: [c.why],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? arithPart(r, w, false) : L === 2 ? arithPart(r, w, true) : r.next() < 0.5 ? cardinalPart(r, w) : axiomPart(r, w));

export default gen;
