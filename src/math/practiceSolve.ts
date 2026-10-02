// The worked solution of a practice question: the picture of the tool that covers its topic, loaded when needed.
import type { Dict } from "../locales/en";
import type { RenderedSvg } from "./latex";
import type { SolutionKind } from "./practice";

export async function renderSolution(sol: { kind: SolutionKind; spec: unknown }, t: Dict): Promise<RenderedSvg> {
  // Each tool checks its own spec; the generator builds them in the tool's format.
  const s = sol.spec as never;
  switch (sol.kind) {
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
  }
}
