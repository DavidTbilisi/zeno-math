// Finance: percentages, rates and charts, the algebra of growth (indices, logarithms, sequences and series), change and
// optimisation, probability, statistics and regression, then interest, the binomial model, option pricing and
// Brownian motion.
import { games, reads, skills, type Roadmap } from "../roadmap.ts";

export const FINANCE: Roadmap = {
  id: "finance",
  order: "list",
  stages: [
    { id: "number", items: [...reads("fractions"), ...skills("decimals", "percent", "ratio", "rate", "inflation", "rounding", "readChart", "diagrams", "average"), ...games("barChart")] },
    { id: "growth", items: [...reads("algebra"), ...skills("linear", "proportion", "formulae", "indices", "logs", "sequences", "series", "functions")] },
    { id: "change", items: [...reads("calculus"), ...skills("differentiate", "stationary", "integrate", "partials")] },
    { id: "chance", items: [...reads("probability"), ...skills("probability", "conditional", "expectation", "distributions", "randomWalks")] },
    { id: "data", items: [...reads("statistics"), ...skills("correlation", "regression", "hypothesis", "ci")] },
    { id: "pricing", items: [...reads("finance"), ...skills("interestRates", "amortisation", "npv", "bonds", "binomialPricing", "brownian", "optionPricing")] },
  ],
};
