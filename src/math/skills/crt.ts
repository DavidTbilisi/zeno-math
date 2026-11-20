// Practice: The Chinese remainder theorem. Easy solves two congruences with coprime moduli (Σ rᵢMᵢ without the
// inverses, named); medium three (the inverses left out, the first two only, named); hard two with a common factor,
// answered as x ≡ r (mod m) (the product of the moduli taken for their lcm, named).
import { gcd, invMod, lcm, mod, rowOf } from "../groups";
import { crtSolve } from "../numberTheoryTwo";
import { wholeOf } from "../realAnalysis";
import { fill } from "../text";
import type { MistakeId } from "../mistakes";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const systemTex = (rs: number[], ms: number[]) =>
  `\\begin{cases} ${rs.map((r, i) => `x \\equiv ${r} \\pmod{${ms[i]}}`).join(" \\\\ ")} \\end{cases}`;

/** Pairwise coprime moduli with product at most `max`, and residues 1 ≤ rᵢ < mᵢ. */
function systemOf(r: Rng, pool: number[], count: number, min: number, max: number): { rs: number[]; ms: number[]; M: number } {
  for (;;) {
    const ms = Array.from({ length: count }, () => r.pick(pool)).sort((p, q) => p - q);
    const M = ms.reduce((p, q) => p * q, 1);
    if (M < min || M > max || ms.some((m, i) => ms.slice(i + 1).some((n) => gcd(m, n) !== 1))) continue;
    return { rs: ms.map((m) => r.int(1, m - 1)), ms, M };
  }
}

function solvedPart(r: Rng, w: PracticeWords, count: number): Part {
  const pool = count === 2 ? [5, 7, 8, 9, 11, 13, 16, 17, 19, 23] : [3, 4, 5, 7, 8, 9, 11, 13];
  const { rs, ms, M } = systemOf(r, pool, count, count === 2 ? 60 : 100, count === 2 ? 400 : 1200);
  const x = crtSolve(rs, ms)!.x;
  const Ms = ms.map((m) => M / m);
  const ys = ms.map((m, i) => invMod(Ms[i] % m, m));
  const sum = rs.reduce((s, ri, i) => s + ri * Ms[i] * ys[i], 0);
  const slips: [MistakeId, number][] = [["crtForgotInverse", mod(rs.reduce((s, ri, i) => s + ri * Ms[i], 0), M)]];
  if (count === 3) slips.push(["crtFirstTwoOnly", crtSolve(rs.slice(0, 2), ms.slice(0, 2))!.x]);
  return {
    prompt: fill(w.nt.prompt.crt, { M }),
    q: systemTex(rs, ms),
    ...wholeOf(x, slips),
    steps: [
      `M = ${ms.join(" \\cdot ")} = ${M}`,
      ms.map((m, i) => `M_{${i + 1}} = ${Ms[i]}, \\; M_{${i + 1}}^{-1} \\equiv ${ys[i]} \\pmod{${m}}`).join(", \\quad "),
      `x \\equiv ${rs.map((ri, i) => `${ri} \\cdot ${Ms[i]} \\cdot ${ys[i]}`).join(" + ")} = ${sum} \\equiv ${x} \\pmod{${M}}`,
    ],
  };
}

function commonFactorPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const [m1, m2] = [r.pick([4, 6, 8, 9, 10, 12, 14, 15]), r.pick([6, 9, 10, 12, 14, 15, 18, 20, 21])];
    const g = gcd(m1, m2);
    if (m1 === m2 || g === 1 || g === m1 || g === m2) continue;
    const L = lcm(m1, m2);
    const x = r.int(1, L - 1);
    const rs = [x % m1, x % m2];
    if (rs[0] === 0 || rs[1] === 0) continue;
    return {
      prompt: w.nt.prompt.crtClass,
      q: systemTex(rs, [m1, m2]),
      ...rowOf([x, L], [["crtProductNotLcm", [x, m1 * m2]]], "pair"),
      steps: [
        `\\gcd(${m1}, ${m2}) = ${g}, \\quad ${rs[0]} \\equiv ${rs[1]} \\pmod{${g}}`,
        `x = ${rs[0]} + ${m1}t \\equiv ${rs[1]} \\pmod{${m2}} \\Rightarrow x \\equiv ${x}`,
        `\\operatorname{lcm}(${m1}, ${m2}) = ${L}: \\quad x \\equiv ${x} \\pmod{${L}}`,
      ],
    };
  }
}

const gen: Gen = (r, L, w) => (L === 1 ? solvedPart(r, w, 2) : L === 2 ? solvedPart(r, w, 3) : commonFactorPart(r, w));

export default gen;
