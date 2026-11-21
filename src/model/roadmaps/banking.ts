// Banking: money, decimals and percentages, the formulae of interest and repayment (sequences and series, indices and
// logarithms), interest and annuities, reading the charts a bank's figures come in, and risk and probability.
import { games, skills, type Roadmap } from "../roadmap.ts";

export const BANKING: Roadmap = {
  id: "banking",
  order: "list",
  stages: [
    { id: "money", items: [...skills("money", "integers", "decimals", "rounding", "percent", "ratio", "rate"), ...games("estimate")] },
    { id: "formulae", items: [...skills("formulae", "linear", "proportion", "indices", "logs"), ...games("balance")] },
    { id: "interest", items: skills("sequences", "series", "interestRates") },
    { id: "charts", items: [...skills("readChart", "diagrams", "graphStory", "average"), ...games("barChart", "graphStory")] },
    { id: "risk", items: skills("probability", "conditional", "expectation", "distributions", "correlation") },
  ],
};
