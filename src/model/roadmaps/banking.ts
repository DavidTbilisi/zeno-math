// Banking: money, decimals and percentages, the formulae of interest and repayment (sequences and series, indices and
// logarithms), interest and annuities, reading the charts a bank's figures come in, and risk and probability.
import { games, reads, skills, type Roadmap } from "../roadmap.ts";

export const BANKING: Roadmap = {
  id: "banking",
  order: "list",
  stages: [
    { id: "money", items: [...reads("numbers"), ...skills("money", "integers", "decimals", "rounding", "percent", "ratio", "rate"), ...games("estimate")] },
    { id: "formulae", items: [...reads("algebra"), ...skills("formulae", "linear", "proportion", "indices", "logs"), ...games("balance")] },
    { id: "interest", items: [...reads("finance"), ...skills("sequences", "series", "interestRates", "amortisation")] },
    { id: "charts", items: [...reads("statistics"), ...skills("readChart", "diagrams", "graphStory", "average"), ...games("barChart", "graphStory")] },
    { id: "risk", items: [...reads("probability"), ...skills("probability", "conditional", "expectation", "distributions", "correlation")] },
  ],
};
