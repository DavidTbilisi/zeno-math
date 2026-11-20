// Practice: norms. Easy finds the 1-, 2- or ∞-norm of a vector (the signs kept, the square root left off, the
// largest signed entry, named); medium finds a norm of a function on [0, 1]: c·xᵏ (the supremum for the integral and
// the other way round, the square root left off, named) or |a − b x| crossing 0 (the absolute value dropped, named);
// hard finds the best constant C in ‖x‖ₚ ≤ C‖x‖_q on ℝⁿ (n for √n, √n for n, the constant of the other direction,
// named).
import { exact } from "../calculusTwo";
import { F } from "../measureTheory";
import { WHOLE_NORM, absLineIntegral, norm1, norm2sq, normInf, vecTex } from "../functionalAnalysis";
import type { NumSlip } from "../calculusTwo";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

type P = "1" | "2" | "\\infty";
const pText = (p: P) => (p === "\\infty" ? "∞" : p);

/** A whole-norm vector, its entries shuffled and some made negative. */
function vectorOf(r: Rng): [number[], number] {
  const [base, two] = r.pick(WHOLE_NORM);
  const x = [...base];
  for (let i = x.length - 1; i > 0; i--) {
    const j = r.int(0, i);
    [x[i], x[j]] = [x[j], x[i]];
  }
  const signed = x.map((v) => (r.next() < 0.45 ? -v : v));
  if (signed.every((v) => v > 0)) signed[r.int(0, signed.length - 1)] *= -1;
  return [signed, two];
}

function vectorPart(r: Rng, w: PracticeWords): Part {
  const [x, two] = vectorOf(r);
  const p = r.pick(["1", "2", "\\infty"] as const);
  const q = `x = ${vecTex(x)}, \\quad \\|x\\|_{${p}}`;
  const prompt = fill(w.fa.prompt.vectorNorm, { p: pText(p) });
  if (p === "1")
    return { prompt, q, ...exact(F(norm1(x)), [["entriesSigned", x.reduce((s, v) => s + v, 0)]]), steps: [`\\|x\\|_1 = ${x.map((v) => `|${v}|`).join(" + ")} = ${norm1(x)}`] };
  if (p === "2")
    return {
      prompt,
      q,
      ...exact(F(two), [["squaresNoRoot", norm2sq(x)]]),
      steps: [`\\|x\\|_2 = \\sqrt{${x.map((v) => (v < 0 ? `(${v})^2` : `${v}^2`)).join(" + ")}} = \\sqrt{${norm2sq(x)}} = ${two}`],
    };
  return { prompt, q, ...exact(F(normInf(x)), [["maxEntrySigned", Math.max(...x)]]), steps: [`\\|x\\|_\\infty = \\max\\left(${x.map((v) => `|${v}|`).join(", ")}\\right) = ${normInf(x)}`] };
}

/** A norm of c·xᵏ on [0, 1], or the 1-norm of a − b x that crosses 0. */
function functionPart(r: Rng, w: PracticeWords): Part {
  if (r.next() < 0.3) {
    const b = r.int(2, 6);
    const a = r.int(1, b - 1);
    const [n, d] = absLineIntegral(a, b);
    const v = F(n, d);
    const signed = F(a).sub(F(b, 2));
    return {
      prompt: fill(w.fa.prompt.functionNorm, { p: "1" }),
      q: `f(x) = ${a} - ${b}x, \\quad \\|f\\|_1`,
      ...exact(v, [["absDropped", signed]]),
      steps: [
        `f(x) = 0 \\text{ at } x = ${F(a, b).tex()}`,
        `\\|f\\|_1 = \\int_0^{${F(a, b).tex()}} (${a} - ${b}x) \\, dx + \\int_{${F(a, b).tex()}}^1 (${b}x - ${a}) \\, dx = ${F(a * a, 2 * b).tex()} + ${F((b - a) * (b - a), 2 * b).tex()} = ${v.tex()}`,
      ],
    };
  }
  const c = r.int(2, 9);
  const p = r.pick(["1", "2", "\\infty"] as const);
  const k = p === "2" ? r.pick([4, 12]) : r.int(1, 4);
  const root = Math.sqrt(2 * k + 1);
  const f = `f(x) = ${c}x^{${k}}`;
  const prompt = fill(w.fa.prompt.functionNorm, { p: pText(p) });
  const q = `${f}, \\quad \\|f\\|_{${p}}`;
  if (p === "1") return { prompt, q, ...exact(F(c, k + 1), [["supForIntegral", c]]), steps: [`\\|f\\|_1 = \\int_0^1 ${c}x^{${k}} \\, dx = ${F(c, k + 1).tex()}`] };
  if (p === "\\infty") return { prompt, q, ...exact(F(c), [["integralForSup", F(c, k + 1)]]), steps: [`\\|f\\|_\\infty = \\sup_{[0, 1]} ${c}x^{${k}} = ${c} \\text{ at } x = 1`] };
  return {
    prompt,
    q,
    ...exact(F(c, root), [["squaresNoRoot", F(c * c, 2 * k + 1)], ["supForIntegral", c]]),
    steps: [`\\|f\\|_2^2 = \\int_0^1 ${c * c}x^{${2 * k}} \\, dx = ${F(c * c, 2 * k + 1).tex()}`, `\\|f\\|_2 = \\sqrt{${F(c * c, 2 * k + 1).tex()}} = ${F(c, root).tex()}`],
  };
}

/** The best C with ‖x‖ₚ ≤ C‖x‖_q on ℝⁿ. */
function equivalencePart(r: Rng, w: PracticeWords): Part {
  const n = r.pick([4, 9, 16, 25]);
  const s = Math.sqrt(n);
  const kind = r.int(0, 4);
  const [p, q, v, slips, why]: [P, P, number, NumSlip[], string] =
    kind === 0
      ? ["1", "\\infty", n, [["rootWhereNone", s]], `|x_i| \\le \\|x\\|_\\infty \\implies \\|x\\|_1 \\le ${n}\\|x\\|_\\infty, \\text{ equal for } (1, \\dots, 1)`]
      : kind === 1
        ? ["2", "\\infty", s, [["constantNoRoot", n]], `\\|x\\|_2^2 \\le ${n}\\|x\\|_\\infty^2 \\implies \\|x\\|_2 \\le \\sqrt{${n}}\\,\\|x\\|_\\infty = ${s}\\|x\\|_\\infty`]
        : kind === 2
          ? ["1", "2", s, [["constantNoRoot", n]], `\\|x\\|_1 = \\langle |x|, (1, \\dots, 1) \\rangle \\le \\sqrt{${n}}\\,\\|x\\|_2 = ${s}\\|x\\|_2 \\text{ (Cauchy–Schwarz)}`]
          : kind === 3
            ? ["\\infty", "1", 1, [["constantForOtherWay", n]], `\\max |x_i| \\le \\sum |x_i| \\implies C = 1, \\text{ equal for } (1, 0, \\dots, 0)`]
            : ["2", "1", 1, [["constantForOtherWay", s]], `\\sum x_i^2 \\le \\left(\\sum |x_i|\\right)^2 \\implies C = 1, \\text{ equal for } (1, 0, \\dots, 0)`];
  return {
    prompt: w.fa.prompt.equivalence,
    q: `\\|x\\|_{${p}} \\le C\\,\\|x\\|_{${q}} \\text{ for all } x \\in \\mathbb{R}^{${n}}`,
    ...exact(F(v), slips),
    steps: [why, `C = ${v}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? vectorPart(r, w) : L === 2 ? functionPart(r, w) : equivalencePart(r, w));

export default gen;
