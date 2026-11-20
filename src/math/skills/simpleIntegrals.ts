// Practice: Lebesgue integrals. Easy integrates a simple function a·χ_A + b·χ_B with intervals that may overlap (the
// heights added without their lengths, the overlap counted once, named); medium integrates a function that is a
// polynomial off the rationals and a constant on them (the rationals' value used, both parts added, named); hard
// integrates a polynomial against Lebesgue measure plus a point mass c·δₚ (the point mass ignored, its weight dropped,
// named).
import { exact } from "../calculusTwo";
import { F, cases, chi, polyIntegral, polyTex } from "../measureTheory";
import type { NumSlip } from "../calculusTwo";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** s = a·χ_[p, q) + b·χ_[u, v). */
function simplePart(r: Rng, w: PracticeWords): Part {
  const a = r.int(2, 7);
  let b = r.int(2, 7);
  if (b === a) b = a + 1;
  const p = r.int(0, 3);
  const q = p + r.int(1, 4);
  const u = r.int(p, q + 2);
  const v = u + r.int(1, 4);
  const lo = Math.max(p, u);
  const hi = Math.min(q, v);
  const both = Math.max(0, hi - lo);
  const val = a * (q - p) + b * (v - u);
  const slips: NumSlip[] = [["heightsAdded", a + b]];
  if (both > 0) slips.push(["overlapCountedOnce", val - Math.min(a, b) * both]);
  return {
    prompt: w.mt.prompt.simple,
    q: `s = ${a}\\,${chi(`[${p}, ${q})`)} + ${b}\\,${chi(`[${u}, ${v})`)}`,
    ...exact(F(val), slips),
    steps: [
      `\\int s \\, d\\lambda = ${a} \\cdot \\lambda\\left([${p}, ${q})\\right) + ${b} \\cdot \\lambda\\left([${u}, ${v})\\right)`,
      `= ${a} \\cdot ${q - p} + ${b} \\cdot ${v - u} = ${val}`,
      ...(both > 0 ? [`s = ${a + b} \\text{ on } [${lo}, ${hi}) \\text{, } \\int s \\, d\\lambda \\text{ is the same}`] : []),
    ],
  };
}

/** f = polynomial on the irrationals, a constant h on the rationals, on [0, B]. */
function aePart(r: Rng, w: PracticeWords): Part {
  const c = r.int(1, 4);
  const k = r.int(1, 3);
  const s = r.int(0, 3);
  const B = r.int(1, 3);
  const h = r.int(5, 12);
  const v = polyIntegral(c, k, s, B);
  const poly = polyTex(c, k, s);
  return {
    prompt: fill(w.mt.prompt.ae, { B }),
    q: `f(x) = ${cases([[poly, "x \\notin \\mathbb{Q}"], [String(h), "x \\in \\mathbb{Q}"]])}`,
    ...exact(v, [["rationalPartUsed", h * B], ["rationalPartAdded", v.add(F(h * B))]]),
    steps: [
      `\\lambda\\left(\\mathbb{Q} \\cap [0, ${B}]\\right) = 0 \\implies f = ${poly} \\text{ a.e.}`,
      `\\int_{[0, ${B}]} f \\, d\\lambda = \\int_0^{${B}} \\left(${poly}\\right) dx = ${v.tex()}`,
    ],
  };
}

/** ∫ f dμ on [0, B] for μ = λ + c·δₚ. */
function diracPart(r: Rng, w: PracticeWords): Part {
  const a = r.int(1, 3);
  const k = r.int(1, 2);
  const s = r.int(1, 4);
  const B = r.int(1, 3);
  const pt = r.int(0, B);
  const c = r.int(2, 5);
  const lam = polyIntegral(a, k, s, B);
  const at = a * pt ** k + s;
  const v = lam.add(F(c * at));
  const poly = polyTex(a, k, s);
  return {
    prompt: fill(w.mt.prompt.dirac, { B }),
    q: `\\mu = \\lambda + ${c}\\,\\delta_{${pt}}, \\quad f(x) = ${poly}`,
    ...exact(v, [["diracIgnored", lam], ["diracWeightDropped", lam.add(F(at))]]),
    steps: [
      `\\int f \\, d\\mu = \\int_0^{${B}} \\left(${poly}\\right) dx + ${c} f(${pt})`,
      `= ${lam.tex()} + ${c} \\cdot ${at} = ${v.tex()}`,
    ],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? simplePart(r, w) : L === 2 ? aePart(r, w) : diracPart(r, w));

export default gen;
