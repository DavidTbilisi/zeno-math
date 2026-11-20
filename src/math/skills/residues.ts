// Practice: Quadratic residues and the Legendre symbol. Easy lists the non-zero quadratic residues mod p (the squares
// not reduced, 0 counted, named); medium finds (a/p) by Euler's criterion (a^(p−1) for a^((p−1)/2), only perfect
// squares taken for residues, named); hard finds (q/p) by quadratic reciprocity (the sign left out, a sign put in that
// is not there, named).
import { pickOf, sym } from "../calculusTwo";
import { elementsOf, setOfTex } from "../groups";
import { legTex, legendre, powMod, residuesMod, squaringTex } from "../numberTheoryTwo";
import { fill } from "../text";
import type { MistakeId } from "../mistakes";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const signOptions = [sym("1", "1"), sym("-1", "-1")];
const SQUARES = [1, 4, 9, 16, 25, 36];

function listPart(r: Rng, w: PracticeWords): Part {
  const p = r.pick([7, 11, 13, 17, 19, 23]);
  const h = (p - 1) / 2;
  const ks = Array.from({ length: h }, (_, i) => i + 1);
  const qr = residuesMod(p);
  return {
    prompt: fill(w.nt.prompt.residues, { p }),
    q: `x^{2} \\equiv r \\pmod{${p}}`,
    ...elementsOf(qr, [["squaresNotReduced", ks.map((k) => k * k)], ["zeroAsResidue", [0, ...qr]]]),
    steps: [
      ks.map((k) => `${k}^{2} \\equiv ${(k * k) % p}`).join(", \\; ") + ` \\pmod{${p}}`,
      `(${p} - k)^{2} \\equiv k^{2}: \\quad ${setOfTex(qr)}`,
    ],
  };
}

function eulerPart(r: Rng, w: PracticeWords): Part {
  const p = r.pick([7, 11, 13, 17, 19, 23, 29]);
  const a = r.int(2, p - 2);
  const s = legendre(a, p);
  const right = s === 1 ? 0 : 1;
  const h = (p - 1) / 2;
  const slips: [MistakeId, number][] = s === -1 ? [["eulerExponentWrong", 0]] : SQUARES.includes(a) ? [] : [["squareOnlyIfPerfect", 1]];
  return {
    prompt: w.nt.prompt.euler,
    q: legTex(a, p),
    ...pickOf(signOptions, right, slips),
    steps: [
      `${legTex(a, p)} \\equiv ${a}^{\\frac{${p} - 1}{2}} = ${a}^{${h}} \\pmod{${p}}`,
      ...squaringTex(a, h, p),
      `${powMod(a, h, p)} \\equiv ${s} \\pmod{${p}} \\Rightarrow ${legTex(a, p)} = ${s}`,
    ],
  };
}

function reciprocityPart(r: Rng, w: PracticeWords): Part {
  const q = r.pick([3, 5, 7, 11, 13]);
  const p = r.pick([17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97]);
  const both = p % 4 === 3 && q % 4 === 3;
  const sign = both ? -1 : 1;
  const rem = p % q;
  const t = legendre(rem, q);
  const v = sign * t;
  const qr = residuesMod(q);
  return {
    prompt: w.nt.prompt.reciprocity,
    q: legTex(q, p),
    ...pickOf(signOptions, v === 1 ? 0 : 1, [[both ? "reciprocitySignIgnored" : "reciprocitySignAlways", v === 1 ? 1 : 0]]),
    steps: [
      `${legTex(q, p)} ${legTex(p, q)} = (-1)^{\\frac{${q} - 1}{2} \\cdot \\frac{${p} - 1}{2}} = ${sign}`,
      `${legTex(p, q)} = ${legTex(rem, q)}, \\quad ${rem} ${t === 1 ? "\\in" : "\\notin"} ${setOfTex(qr)} \\Rightarrow ${legTex(rem, q)} = ${t}`,
      `${legTex(q, p)} = ${sign} \\cdot ${t === 1 ? "1" : "(-1)"} = ${v}`,
    ],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? listPart(r, w) : L === 2 ? eulerPart(r, w) : reciprocityPart(r, w));

export default gen;
