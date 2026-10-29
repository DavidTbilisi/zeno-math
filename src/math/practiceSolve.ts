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
    case "dots": {
      // The dots coloured by group, with how they add up beneath.
      const spec = s as import("./quickLook").DotsSolution & { steps: string[] };
      return (await import("./quickLook")).renderDots(spec, (await import("./practice")).renderSteps(spec.steps));
    }
    case "wall": {
      // The gap filled with the fewest tiles, with the written steps beneath.
      const spec = s as import("./fractionWall").WallSolution & { steps: string[] };
      return (await import("./fractionWall")).renderWall(spec, (await import("./practice")).renderSteps(spec.steps));
    }
    case "orderline": {
      // The fractions in their places on the line, with the written steps beneath.
      const spec = s as import("./fracOrder").OrderSolution & { steps: string[] };
      return (await import("./fracOrder")).renderOrder(spec, (await import("./practice")).renderSteps(spec.steps));
    }
    case "shade": {
      // The right number of pieces shaded, with the written steps beneath.
      const spec = s as import("./shadeFrac").ShadeSolution & { steps: string[] };
      return (await import("./shadeFrac")).renderShade(spec, (await import("./practice")).renderSteps(spec.steps));
    }
    case "balance": {
      // The scales level, with the working beneath.
      const spec = s as import("./balance").BalanceSolution & { steps: string[] };
      return (await import("./balance")).renderBalance(spec, (await import("./practice")).renderSteps(spec.steps));
    }
    case "grow": {
      // Figures 1 to 3 coloured by the part that stays and the part that grows, with the working beneath.
      const spec = s as import("./growing").GrowSolution & { steps: string[] };
      return (await import("./growing")).renderGrow(spec, (await import("./practice")).renderSteps(spec.steps));
    }
    case "angle": {
      // The angle with its size, with the working beneath.
      const spec = s as import("./angleGuess").AngleSolution & { steps: string[] };
      return (await import("./angleGuess")).renderAngle(spec, (await import("./practice")).renderSteps(spec.steps));
    }
    case "angles": {
      // The figure with the angle filled in, with the working beneath.
      const spec = s as import("./missingAngle").HuntSolution & { steps: string[] };
      return (await import("./missingAngle")).renderHunt(spec, (await import("./practice")).renderSteps(spec.steps));
    }
    case "mirror": {
      // The shape with its mirror lines dashed.
      const spec = s as import("./symmetry").SymSolution;
      return (await import("./symmetry")).renderSym(spec, null);
    }
    case "net": {
      // The net with opposite faces coloured alike, with the working beneath.
      const spec = s as import("./cubeNets").NetSolution & { steps: string[] };
      return (await import("./cubeNets")).renderNet(spec, (await import("./practice")).renderSteps(spec.steps));
    }
    case "plot": {
      // The point with dashed lines to it from the axes, with the working beneath.
      const spec = s as import("./plotPoint").PlotSolution & { steps: string[] };
      return (await import("./plotPoint")).renderPlot(spec, (await import("./practice")).renderSteps(spec.steps));
    }
    case "chart": {
      // The chart with the bars asked about marked, with the working beneath.
      const spec = s as import("./barChart").ChartSolution & { steps: string[] };
      return (await import("./barChart")).renderChart(spec, (await import("./practice")).renderSteps(spec.steps));
    }
    case "story": {
      // The walk's graph with its parts numbered.
      const spec = s as import("./graphStory").StorySolution;
      return (await import("./graphStory")).renderStory(spec, null);
    }
    case "slope": {
      // The line with the step from P to Q drawn, with the working beneath.
      const spec = s as import("./slope").SlopeSolution & { steps: string[] };
      return (await import("./slope")).renderSlope(spec, (await import("./practice")).renderSteps(spec.steps));
    }
    case "stroke": {
      // The odd vertices filled in, or the graph that can be drawn with its stroke numbered, with the working beneath.
      const spec = s as import("./oneStroke").StrokeSolution & { steps: string[] };
      return (await import("./oneStroke")).renderStroke(spec, (await import("./practice")).renderSteps(spec.steps));
    }
    case "colour": {
      // The graph in its fewest colours.
      const spec = s as import("./colouring").ColourSolution;
      return (await import("./colouring")).renderColour(spec, null);
    }
    case "route": {
      // The shortest route drawn, with its roads added up beneath.
      const spec = s as import("./shortestPath").PathSolution & { steps: string[] };
      return (await import("./shortestPath")).renderPath(spec, (await import("./practice")).renderSteps(spec.steps));
    }
    case "network": {
      // The cheapest network drawn, with its roads added up beneath.
      const spec = s as import("./connectTowns").TownSolution & { steps: string[] };
      return (await import("./connectTowns")).renderTowns(spec, (await import("./practice")).renderSteps(spec.steps));
    }
    case "rules":
      // The Divisibility tab's table: each divisor's test applied to the number, with the verdict.
      return (await import("./mental")).renderMental(s, t.mentalWords);
    case "matrix": {
      // The Matrices tool: a calculation's working, or the Vector spaces tab (rank, eigenvalues).
      const spec = s as import("./matrix").MatrixCalcSpec | import("./vectorspace").SpaceSpec;
      if (spec.type === "space") return (await import("./vectorspace")).renderSpace(spec, t.spaceWords);
      const { latexToSvg } = await import("./latex");
      return latexToSvg((await import("./matrix")).matrixLatex(spec));
    }
    case "numerical":
      return (await import("./numerical")).renderNumerical(s, t.numWords);
  }
}
