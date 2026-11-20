// Practice: The Riemann integral by Darboux sums. Easy finds the upper or lower sum of a monotone function on equal
// parts (the other sum, the width left out, named); medium finds how many equal parts bring U − L below ε (the n that
// only reaches ε, the width left out, named); hard says whether a function is Riemann integrable on [0, 1] (a jump
// taken to rule it out, bounded taken to be enough, an improper integral taken for a Riemann one, named).
import { exact, pickOf, word } from "../calculusTwo";
import type { Frac } from "../fraction";
import type { MistakeId } from "../mistakes";
import { darboux, epsTex, F, wholeOf } from "../realAnalysis";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

type Fn = { tex: string; f: (x: Frac) => Frac };

/** mx + c, or x² + c: monotone on [a, b] with a ≥ 0. */
function monotone(r: Rng): Fn {
  const c = r.int(-3, 3);
  const cT = c === 0 ? "" : ` ${c < 0 ? "-" : "+"} ${Math.abs(c)}`;
  if (r.next() < 0.5) return { tex: `x^{2}${cT}`, f: (x) => x.mul(x).add(F(c)) };
  const m = r.nz(-3, 3);
  return { tex: `${m === 1 ? "" : m === -1 ? "-" : m}x${cT}`, f: (x) => x.mul(F(m)).add(F(c)) };
}

/** U(f, P) or L(f, P) for n equal parts of [a, b]. */
function sumPart(r: Rng, w: PracticeWords): Part {
  const fn = monotone(r);
  const a = r.int(0, 1);
  const b = a + r.int(1, 3);
  const n = r.int(2, 5);
  const upper = r.next() < 0.5;
  const [A, B] = [F(a), F(b)];
  const h = B.sub(A).div(F(n));
  const s = darboux(fn.f, A, B, n, upper);
  const other = darboux(fn.f, A, B, n, !upper);
  // The value used on each piece: the larger (smaller) end.
  const vals = Array.from({ length: n }, (_, i) => {
    const [l, rr] = [fn.f(A.add(h.mul(F(i)))), fn.f(A.add(h.mul(F(i + 1))))];
    return upper === l.toNumber() > rr.toNumber() ? l : rr;
  });
  const slips: [MistakeId, Frac][] = [["otherDarbouxSum", other], ["sumWithoutWidth", s.div(h)]];
  return {
    prompt: fill(upper ? w.real.prompt.upperSum : w.real.prompt.lowerSum, { a, b, n }),
    q: `f(x) = ${fn.tex}`,
    ...exact(s, slips),
    steps: [`h = ${h.tex()}`, `${upper ? "U" : "L"}(f, P) = ${h.tex()}\\left(${vals.map((v) => v.texP()).join(" + ")}\\right) = ${s.tex()}`],
  };
}

/** U − L = |f(b) − f(a)|(b − a)/n for a monotone f: the first n with U − L < ε = 1/k. */
function withinPart(r: Rng, w: PracticeWords): Part {
  const fn = monotone(r);
  const a = r.int(0, 1);
  const b = a + r.int(1, 3);
  const k = r.pick([10, 20, 100]);
  const rise = Math.abs(fn.f(F(b)).sub(fn.f(F(a))).toNumber());
  const D = rise * (b - a);
  return {
    prompt: fill(w.real.prompt.sumsWithin, { a, b }),
    q: `f(x) = ${fn.tex}, \\quad ${epsTex(k)}`,
    ...wholeOf(D * k + 1, [["epsilonBoundaryN", D * k], ["sumWithoutWidth", rise * k + 1]]),
    steps: [`U - L = |f(${b}) - f(${a})| \\cdot \\frac{${b - a}}{n} = \\frac{${D}}{n}`, `\\frac{${D}}{n} < \\frac{1}{${k}} \\iff n > ${D * k}`, `n = ${D * k + 1}`],
  };
}

const cases = (rows: [string, string][]) => `\\begin{cases} ${rows.map(([v, when]) => `${v} & ${when}`).join(" \\\\ ")} \\end{cases}`;

/** Riemann integrable on [0, 1], or not? */
function integrablePart(r: Rng, w: PracticeWords): Part {
  const countable = `\\text{${w.real.why.countable}}`;
  const unbounded = `\\text{${w.real.why.unbounded}}`;
  const Q = "x \\in \\mathbb{Q}";
  const notQ = "x \\notin \\mathbb{Q}";
  const all: { f: string; yes: boolean; slip: MistakeId; step: string }[] = [
    { f: cases([["1", Q], ["0", notQ]]), yes: false, slip: "boundedMeansIntegrable", step: "U(f, P) = 1, \\quad L(f, P) = 0" },
    { f: cases([["x", Q], ["0", notQ]]), yes: false, slip: "boundedMeansIntegrable", step: "U(f, P) \\to \\frac{1}{2}, \\quad L(f, P) = 0" },
    { f: cases([["\\frac{1}{q}", "x = \\frac{p}{q}, \\; \\gcd(p, q) = 1"], ["0", notQ]]), yes: true, slip: "discontinuousNotIntegrable", step: `${countable}: \\quad \\int_0^1 f = 0` },
    { f: cases([["0", "x < \\frac{1}{2}"], ["1", "x \\ge \\frac{1}{2}"]]), yes: true, slip: "discontinuousNotIntegrable", step: `${countable}: \\quad \\int_0^1 f = \\frac{1}{2}` },
    { f: cases([["\\sin\\frac{1}{x}", "x > 0"], ["0", "x = 0"]]), yes: true, slip: "discontinuousNotIntegrable", step: countable },
    { f: cases([["\\frac{1}{n}", "\\frac{1}{n + 1} < x \\le \\frac{1}{n}"], ["0", "x = 0"]]), yes: true, slip: "discontinuousNotIntegrable", step: countable },
    { f: cases([["\\frac{1}{\\sqrt{x}}", "x > 0"], ["0", "x = 0"]]), yes: false, slip: "improperAsRiemann", step: `${unbounded}: \\quad \\sup_{(0, \\, h)} f = \\infty` },
  ];
  const c = r.pick(all);
  const options = [word(w.real.integrable), word(w.real.notIntegrable)];
  const right = c.yes ? 0 : 1;
  return {
    prompt: w.real.prompt.integrable,
    q: `f(x) = ${c.f}`,
    ...pickOf(options, right, [[c.slip, 1 - right]]),
    steps: [c.step, `\\text{${options[right].text}}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? sumPart(r, w) : L === 2 ? withinPart(r, w) : integrablePart(r, w));

export default gen;
