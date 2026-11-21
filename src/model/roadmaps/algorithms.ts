// Algorithms and interviews: the maths of counting steps (induction, recurrences, generating functions), counting and
// chance, graphs, then the be-the-algorithm games pattern by pattern and the system-design games.
import { games, skills, type Roadmap } from "../roadmap.ts";

export const ALGORITHMS: Roadmap = {
  id: "algorithms",
  order: "list",
  stages: [
    { id: "steps", items: skills("logic", "proofs", "sequences", "series", "induction", "recurrences") },
    { id: "counting", items: skills("counting", "generating", "pigeonhole", "inclusionExclusion", "probability", "expectation") },
    { id: "graphs", items: [...skills("graphTheory", "shortestPath", "spanningTree"), ...games("connectTowns", "shortestPath")] },
    { id: "search", items: [...skills("inversions"), ...games("beSearch", "beBinary", "beSort")] },
    { id: "patterns", items: games("bePointers", "beWindow", "beStack", "beHeap", "beTree", "beUnion", "beTopo", "beDp", "beBacktrack", "beName") },
    { id: "systems", items: games("beCache", "beBalance", "beRing", "beLimit", "beQuorum", "beQueue", "beComp") },
  ],
};
