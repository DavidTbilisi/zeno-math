// Software engineer: the discrete maths a programmer leans on (logic, sets and relations, counting, recurrences,
// graphs), how computers hold numbers, the algorithm games, the probability behind hashing and testing, the vectors
// and matrices of graphics, and the number theory of cryptography.
import { games, skills, type Roadmap } from "../roadmap.ts";

export const SOFTWARE: Roadmap = {
  id: "software",
  order: "list",
  stages: [
    { id: "numbers", items: [...skills("bases", "divisibility", "hcf", "primes", "modular", "rounding", "floatingPoint"), ...games("primeSlice")] },
    { id: "logic", items: skills("logic", "quantifiers", "proofs", "sets", "mappings", "relations") },
    { id: "counting", items: skills("sequences", "series", "induction", "recurrences", "counting", "inclusionExclusion", "pigeonhole") },
    { id: "graphs", items: [...skills("oneStroke", "shortestPath", "spanningTree", "colouring", "graphTheory"), ...games("connectTowns", "shortestPath")] },
    { id: "algorithms", items: [...skills("inversions"), ...games("beSort", "beSearch", "beBinary", "bePointers", "beWindow", "beStack", "beHeap", "beTree", "beUnion", "beTopo", "beDp", "beBacktrack")] },
    { id: "chance", items: skills("probability", "conditional", "expectation", "distributions") },
    { id: "graphics", items: skills("coordinates", "vectors", "dotangle", "matrices", "determinant", "linearMaps") },
    { id: "crypto", items: skills("congruences", "crt", "fermatEuler", "rsa", "discreteLog") },
  ],
};
