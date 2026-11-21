// Finance: percentages, rates and charts, the algebra of growth (indices, logarithms, sequences and series), change and
// optimisation, probability, statistics and regression, then interest, the binomial model, option pricing and
// Brownian motion.
import { games, skills, type Roadmap } from "../roadmap.ts";

export const FINANCE: Roadmap = {
  id: "finance",
  order: "list",
  stages: [
    { id: "number", items: [...skills("decimals", "percent", "ratio", "rate", "rounding", "readChart", "diagrams", "average"), ...games("barChart")] },
    { id: "growth", items: skills("linear", "proportion", "formulae", "indices", "logs", "sequences", "series", "functions") },
    { id: "change", items: skills("differentiate", "stationary", "integrate", "partials") },
    { id: "chance", items: skills("probability", "conditional", "expectation", "distributions", "randomWalks") },
    { id: "data", items: skills("correlation", "regression", "hypothesis", "ci") },
    { id: "pricing", items: skills("interestRates", "binomialPricing", "brownian", "optionPricing") },
  ],
};
