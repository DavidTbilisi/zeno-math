// Practice: Equilibria and their stability. Easy finds every equilibrium of y′ = f(y), the heights where the slope
// field is flat (the roots' signs flipped, or y = 0 lost by dividing by y, named); medium says whether one is stable,
// unstable or semi-stable from the sign of f′ there, or of f on both sides of a double root (the sign read the wrong
// way, a double root called stable or unstable, named); hard linearises a competition system at an equilibrium (the
// Jacobian transposed, or taken at the origin, named).
import { minusA, pickOf, word } from "../calculusTwo";
import { linTex } from "../odes";
import { env, texM } from "../matrix";
import { M } from "../practiceKit";
import { matOf } from "../linearAlgebra";
import type { MistakeId } from "../mistakes";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const kTex = (k: number) => (k === 1 ? "" : k === -1 ? "-" : String(k));
const yFactor = (a: number) => (a === 0 ? "y" : `\\left(${minusA(a, "y")}\\right)`);
const sorted = (xs: number[]) => [...xs].sort((x, y) => x - y);

/** The equilibria of y′ = ky(y − a)(y − b), written out: 0, a and b. */
function equilibriaPart(r: Rng, w: PracticeWords): Part {
  const a = r.nz(-4, 4);
  let b = r.nz(-4, 4);
  while (b === a) b = r.nz(-4, 4);
  const k = r.pick([1, -1, 2, -2]);
  const vs = sorted([0, a, b]);
  const flipped = sorted([0, -a, -b]);
  const traps: { id: MistakeId; a: { k: "set"; vs: number[]; tol: number; listed: true } }[] = [];
  if (flipped.some((x, i) => x !== vs[i])) traps.push({ id: "rootsSignFlipped", a: { k: "set", vs: flipped, tol: 1e-9, listed: true } });
  traps.push({ id: "equilibriumZeroLost", a: { k: "set", vs: sorted([a, b]), tol: 1e-9, listed: true } });
  return {
    prompt: w.ode.prompt.equilibria,
    q: `y' = ${linTex([[k, "y^{3}"], [-k * (a + b), "y^{2}"], [k * a * b, "y"]])}`,
    answer: { k: "set", vs, tol: 1e-9, listed: true, traps },
    show: `y = ${vs.join(", \\; ")}`,
    plain: vs.join("; "),
    format: "roots",
    steps: [`${kTex(k)}y${yFactor(a)}${yFactor(b)} = 0`, `y = ${vs.join(", \\; ")}`],
  };
}

/** Is y = a stable for y′ = k(y − a)(y − b), or y′ = k(y − a)²(y − b)? */
function stabilityPart(r: Rng, w: PracticeWords): Part {
  const a = r.int(-3, 3);
  let b = r.int(-3, 3);
  while (b === a) b = r.int(-3, 3);
  const k = r.pick([1, -1, 2, -2]);
  const s = k * (a - b);
  const options = [word(w.ode.stable), word(w.ode.unstable), word(w.ode.semiStable)];
  const prompt = fill(w.ode.prompt.stability, { a });
  if (r.next() < 0.6) {
    const right = s < 0 ? 0 : 1;
    return {
      prompt,
      q: `y' = ${kTex(k)}${yFactor(a)}${yFactor(b)}`,
      ...pickOf(options, right, [["stabilitySignSwapped", 1 - right]]),
      steps: [`f'(y) = ${kTex(k)}\\left(2y ${-(a + b) < 0 ? "-" : "+"} ${Math.abs(a + b)}\\right), \\quad f'(${a}) = ${s} ${s < 0 ? "< 0" : "> 0"}`, `\\text{${options[right].text}}`],
    };
  }
  return {
    prompt,
    q: `y' = ${kTex(k)}${yFactor(a)}^{2}${yFactor(b)}`,
    ...pickOf(options, 2, [["semiStableMissed", s < 0 ? 0 : 1]]),
    steps: [`f'(${a}) = 0, \\quad f(${a} \\pm \\varepsilon) ${s < 0 ? "<" : ">"} 0`, `\\text{${options[2].text}}`],
  };
}

/** The Jacobian of x′ = x(a − bx − cy), y′ = y(d − ex − fy) at an equilibrium off the origin. */
function jacobianPart(r: Rng, w: PracticeWords): Part {
  const [b, c, e, f] = [r.int(1, 3), r.int(1, 3), r.int(1, 3), r.int(1, 3)];
  const where = r.int(0, 2);
  let [p, q, a, d] = [0, 0, 0, 0];
  if (where === 0) [p, a, d] = [r.int(1, 3), 0, r.int(1, 6)];
  if (where === 1) [q, a] = [r.int(1, 3), r.int(1, 6)];
  if (where === 2) [p, q] = [r.int(1, 3), r.int(1, 3)];
  if (where !== 1) a = where === 0 ? b * p : b * p + c * q;
  if (where !== 0) d = where === 1 ? f * q : e * p + f * q;
  const J = M([[a - 2 * b * p - c * q, -c * p], [-e * q, d - e * p - 2 * f * q]]);
  const T = M([[J[0][0].toNumber(), J[1][0].toNumber()], [J[0][1].toNumber(), J[1][1].toNumber()]]);
  const general = env([[linTex([[a, ""], [-2 * b, "x"], [-c, "y"]]), linTex([[-c, "x"]])], [linTex([[-e, "y"]]), linTex([[d, ""], [-e, "x"], [-2 * f, "y"]])]]);
  return {
    prompt: fill(w.ode.prompt.jacobian, { p, q }),
    q: `x' = x\\left(${linTex([[a, ""], [-b, "x"], [-c, "y"]])}\\right), \\quad y' = y\\left(${linTex([[d, ""], [-e, "x"], [-f, "y"]])}\\right)`,
    ...matOf(J, [["jacobianTransposed", T], ["linearisedAtOrigin", M([[a, 0], [0, d]])]]),
    steps: [`J(x, y) = ${general}`, `J(${p}, ${q}) = ${texM(J)}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? equilibriaPart(r, w) : L === 2 ? stabilityPart(r, w) : jacobianPart(r, w));

export default gen;
