// Software engineer: the discrete maths a programmer leans on (logic, sets and relations, counting, recurrences,
// graphs), how computers hold numbers, the algorithm games, the probability behind hashing and testing, the vectors
// and matrices of graphics, how a computer is built from gates (#845), and the number theory of cryptography.
import { games, labs, reads, skills, type Roadmap } from "../roadmap.ts";

export const SOFTWARE: Roadmap = {
  id: "software",
  order: "list",
  stages: [
    { id: "numbers", items: [...reads("numberTheory"), ...skills("bases", "divisibility", "hcf", "primes", "modular", "rounding", "floatingPoint"), ...games("primeSlice")] },
    { id: "logic", items: [...reads("logic"), ...skills("logic", "quantifiers", "proofs", "sets", "mappings", "relations")] },
    { id: "counting", items: [...reads("discrete"), ...skills("sequences", "series", "induction", "recurrences", "counting", "inclusionExclusion", "pigeonhole")] },
    { id: "graphs", items: [...skills("oneStroke", "shortestPath", "spanningTree", "colouring", "graphTheory"), ...games("connectTowns", "shortestPath")] },
    { id: "algorithms", items: [...reads("algorithms"), ...skills("growth", "inversions"), ...games("beSort", "beSearch", "beBinary", "bePointers", "beWindow", "beStack", "beHeap", "beTree", "beUnion", "beTopo", "beDp", "beBacktrack")] },
    { id: "chance", items: [...reads("probability"), ...skills("probability", "conditional", "expectation", "distributions")] },
    { id: "graphics", items: [...reads("vectors"), ...skills("coordinates", "vectors", "dotangle", "crossPlanes", "matrices", "determinant", "linearMaps"), ...labs("geoLab")] },
    { id: "computer", items: labs("systemLab", "circuitLab", "cpuLab", "baseDots", "pipelineLab", "cacheLab", "pagingLab", "ioLab", "raidLab", "hammingLab") },
    { id: "crypto", items: skills("congruences", "crt", "fermatEuler", "rsa", "discreteLog") },
  ],
};
