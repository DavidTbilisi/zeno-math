// Practice: Techniques of integration. Easy is a substitution, the derivative of the inside already there up to a
// number (that number not divided out, named); medium is by parts once: x eᵃˣ, x sin ax, x cos ax, x ln x, ln x (the
// second term with the wrong sign, named); hard is partial fractions over two linear factors (the two numbers of the
// cover-up swapped, named) or sin² and cos² by the double angle (the 1/(2a) of the inside left out, named). Each
// question is made from its answer, so differentiating the answer gives back what is integrated.
import { byParts, partialOrTrig, substitution, type Integral } from "../calculusTwo";
import { parseE, tex } from "../expr";
import type { Gen, Part, Trap } from "../practiceTypes";

function integralPart(I: Integral, prompt: string): Part {
  const [f, Fe] = [parseE(I.f), parseE(I.F)];
  const traps: Trap[] = I.slip ? [{ id: I.slip.id, a: { k: "expr", e: parseE(I.slip.F), mode: "plusC" } }] : [];
  return {
    prompt,
    q: `\\int ${tex(f)} \\, dx`,
    answer: { k: "expr", e: Fe, mode: "plusC", ...(traps.length ? { traps } : {}) },
    show: `${tex(Fe)} + C`,
    plain: `${I.F} + C`,
    format: "antiderivative",
    steps: [`\\int ${tex(f)} \\, dx = ${tex(Fe)} + C`, `\\frac{d}{dx}\\left(${tex(Fe)}\\right) = ${tex(f)}`],
  };
}

const gen: Gen = (r, L, w) => {
  const P = w.calc2.prompt;
  if (L === 1) return integralPart(substitution(r), P.substitute);
  if (L === 2) return integralPart(byParts(r), P.parts);
  const I = partialOrTrig(r);
  return integralPart(I, I.f.includes("/(") ? P.partial : P.doubleAngle);
};

export default gen;
