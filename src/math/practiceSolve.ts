// The worked solution of a practice question: the picture of the tool that covers its topic, loaded when needed.
import type { Dict } from "../locales/en";
import type { RenderedSvg } from "./latex";
import type { SolutionKind } from "./practice";

export async function renderSolution(sol: { kind: SolutionKind; spec: unknown }, t: Dict): Promise<RenderedSvg> {
  // Each tool checks its own spec; the generator builds them in the tool's format.
  const s = sol.spec as never;
  switch (sol.kind) {
    case "compare":
      return (await import("./compare")).renderCompare(s);
    case "fractionBars": {
      // The bars, with the written steps beneath.
      const spec = s as import("./compare").FractionBarsSpec;
      const steps = spec.steps?.length ? (await import("./practice")).renderSteps(spec.steps) : null;
      return (await import("./compare")).renderFractionBars(spec, steps);
    }
    case "model":
      return (await import("./models")).renderModel(s);
    case "algebra":
      return (await import("./algebra")).renderAlgebra(s, t.algebraWords);
    case "powers":
      return (await import("./powers")).renderPowers(s, t.powersWords);
    case "coord":
      return (await import("./coordgeom")).renderCoord(s, t.coordWords);
    case "trig":
      return (await import("./trig")).renderTrig(s, t.trigWords);
    case "deriv":
      return (await import("./derive")).renderDeriv(s, t.derivWords);
    case "applied":
      return (await import("./applied")).renderApplied(s, t.appWords);
    case "statistics":
      return (await import("./statistics")).renderStatistics(s, t.statWords);
    case "comb":
      return (await import("./combinatorics")).renderComb(s, t.combWords);
    case "nt":
      return (await import("./numtheory")).renderNt(s, t.ntWords);
    case "inference":
      return (await import("./inference")).renderInference(s, t.infWords);
    case "vectors":
      return (await import("./vectors")).renderVectors(s, t.vecWords);
    case "sequences":
      return (await import("./sequences")).renderSequences(s, t.seqWords);
    case "functions":
      return (await import("./functions")).renderFunctions(s, t.fnWords);
    case "identities":
      return (await import("./identities")).renderIdentities(s, t.idWords);
    case "polynomials":
      return (await import("./polynomials")).renderPolynomials(s, t.polyWords);
    case "euclid":
      return (await import("./euclid")).renderEuclid(s, t.euclidWords);
    case "shape": {
      // The shape that does it on the grid, with the written steps beneath.
      const spec = s as import("./geoPlay").ShapeSolution & { steps: string[] };
      return (await import("./geoPlay")).renderShape(spec, (await import("./practice")).renderSteps(spec.steps));
    }
    case "pin": {
      // The number on the line, with the written steps beneath.
      const spec = s as import("./estimate").PinSolution & { steps: string[] };
      return (await import("./estimate")).renderPin(spec, (await import("./practice")).renderSteps(spec.steps));
    }
    case "numerical":
      return (await import("./numerical")).renderNumerical(s, t.numWords);
  }
}
