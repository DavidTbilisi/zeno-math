// Practice: Linear congruences. Easy finds a⁻¹ mod n by the extended Euclidean algorithm (the additive inverse n − a,
// the coefficient that gives −1, named); medium lists every solution of ax ≡ b (mod n) when d = gcd(a, n) > 1 (one
// solution only, n left undivided, named); hard counts the solutions (one only, the gcd test left out, named) or finds
// the modulus left after cancelling c (n not divided by gcd(c, n), named).
import { pickOf, sym } from "../calculusTwo";
import { elementsOf, gcd, invMod, mod, setOfTex } from "../groups";
import { euclidTex, extGcd } from "../numberTheoryTwo";
import { wholeOf } from "../realAnalysis";
import { fill } from "../text";
import type { MistakeId } from "../mistakes";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

function inversePart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const n = r.pick([26, 35, 39, 40, 45, 51, 56, 63, 77, 91, 100]);
    const a = r.int(3, n - 2);
    const inv = invMod(a, n);
    if (Number.isNaN(inv) || inv === a || inv === n - a) continue;
    const e = extGcd(n, a);
    return {
      prompt: fill(w.nt.prompt.inverse, { a, n }),
      q: `${a}x \\equiv 1 \\pmod{${n}}`,
      ...wholeOf(inv, [["inverseWrongOperation", n - a], ["bezoutSignSlip", n - inv]]),
      steps: [...euclidTex(n, a), `1 = ${n} \\cdot (${e.x}) + ${a} \\cdot (${e.y})`, `${a}^{-1} \\equiv ${e.y === inv ? "" : `${e.y} \\equiv `}${inv} \\pmod{${n}}`, `${a} \\cdot ${inv} = ${a * inv} \\equiv 1 \\pmod{${n}}`],
    };
  }
}

/** ax ≡ b (mod n) with d = gcd(a, n) > 1 dividing b (or not, when `solvable` is false). */
function congruenceOf(r: Rng, solvable: boolean): { a: number; b: number; n: number; d: number } {
  for (;;) {
    const n = r.pick([12, 15, 18, 20, 21, 24, 28, 30, 35, 36, 40, 42, 45, 48]);
    const a = r.int(2, n - 1);
    const d = gcd(a, n);
    if (d === 1 || d === a || d > 6) continue;
    const b = solvable ? d * r.int(1, n / d - 1) : r.int(1, n - 1);
    if (!solvable && b % d === 0) continue;
    return { a, b, n, d };
  }
}

function solveAllPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const { a, b, n, d } = congruenceOf(r, true);
    const m = n / d;
    const x0 = mod(invMod(a / d, m) * (b / d), m);
    const xs = Array.from({ length: d }, (_, k) => x0 + k * m);
    const undivided = invMod(a / d, n);
    const slips: [MistakeId, number[]][] = [["onlyOneSolution", [x0]]];
    if (!Number.isNaN(undivided)) slips.push(["modulusNotDivided", [mod(undivided * (b / d), n)]]);
    if (m < 3) continue;
    return {
      prompt: fill(w.nt.prompt.solveAll, { n }),
      q: `${a}x \\equiv ${b} \\pmod{${n}}`,
      ...elementsOf(xs, slips),
      steps: [
        `\\gcd(${a}, ${n}) = ${d} \\mid ${b}`,
        `${a / d}x \\equiv ${b / d} \\pmod{${m}}`,
        `x \\equiv ${b / d} \\cdot ${invMod(a / d, m)} \\equiv ${x0} \\pmod{${m}}`,
        `x \\in ${setOfTex(xs)} \\pmod{${n}}`,
      ],
    };
  }
}

function hardPart(r: Rng, w: PracticeWords): Part {
  if (r.int(0, 1) === 0) {
    const solvable = r.int(0, 1) === 0;
    const { a, b, n, d } = congruenceOf(r, solvable);
    const options = [sym("0", "0"), sym("1", "1"), sym(String(d), String(d))];
    const right = solvable ? 2 : 0;
    return {
      prompt: fill(w.nt.prompt.solutionCount, { n }),
      q: `${a}x \\equiv ${b} \\pmod{${n}}`,
      ...pickOf(options, right, [solvable ? ["onlyOneSolution", 1] : ["solvableWithoutGcd", 2]]),
      steps: [`\\gcd(${a}, ${n}) = ${d}`, solvable ? `${d} \\mid ${b} \\Rightarrow ${d}` : `${d} \\nmid ${b} \\Rightarrow 0`],
    };
  }
  for (;;) {
    const n = r.pick([18, 20, 24, 28, 30, 36, 40, 42, 45, 48, 60, 63, 72, 84]);
    const c = r.int(2, 12);
    const g = gcd(c, n);
    if (g === 1 || g === c || n / g < 3) continue;
    const x = r.int(2, n / g - 1);
    return {
      prompt: fill(w.nt.prompt.cancel, { c, x }),
      q: `${c}x \\equiv ${c} \\cdot ${x} \\pmod{${n}}`,
      ...wholeOf(n / g, [["modulusNotDivided", n]]),
      steps: [`${n} \\mid ${c}(x - ${x})`, `\\gcd(${c}, ${n}) = ${g} \\Rightarrow ${n / g} \\mid x - ${x}`, `x \\equiv ${x} \\pmod{${n / g}}`],
    };
  }
}

const gen: Gen = (r, L, w) => (L === 1 ? inversePart(r, w) : L === 2 ? solveAllPart(r, w) : hardPart(r, w));

export default gen;
