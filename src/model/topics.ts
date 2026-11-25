// The topics of the site's Learn pages (#448): fractions, algebra, geometry and so on, each with its practice skills
// and the menu sections (src/menus.ts) whose tools, live pieces and games belong to it. Every practice skill is in
// exactly one topic, so a topic's bar (its skills' secure levels out of all their levels) and the progress page add up;
// a menu section may serve two topics (graphs and charts are both functions and statistics).
import type { SkillId } from "../math/practiceSkills.ts";
import type { Word } from "../tools.ts";
import { itemsOf, roadNext, skills, type Next, type Roadmap, type Work } from "./roadmap.ts";

export type TopicId =
  | "numbers" | "fractions" | "numberTheory" | "algebra" | "functions" | "geometry" | "trigonometry" | "vectors"
  | "calculus" | "analysis" | "probability" | "statistics" | "discrete" | "logic" | "algorithms" | "abstract"
  | "optimisation" | "topology" | "finance" | "ai";
/** A shelf on the Learn page: topics that go together, from the first a learner meets to the last. */
export type ShelfId = "start" | "school" | "beyond" | "university";
export type Topic = { id: TopicId; shelf: ShelfId; icon: string; skills: readonly SkillId[]; sections: readonly Word[] };

export const TOPICS: readonly Topic[] = [
  {
    id: "numbers", shelf: "start", icon: "123",
    skills: ["compare", "quickLook", "ordinals", "skipCount", "estimateLine", "closerTo", "placeValue", "addSubtract", "tables", "divide", "times", "columnSums", "longDivide", "money", "time", "measure", "makeTarget", "kakooma", "integers", "order", "barModels", "rounding"],
    sections: ["secCounting", "secCalculating", "secTime", "senseNumber", "senseFacts"],
  },
  {
    id: "fractions", shelf: "start", icon: "½",
    skills: ["makeWhole", "equivalent", "orderFractions", "shadeFraction", "compareFractions", "fractionSums", "fractions", "decimals", "decimalTimes", "percent", "convert", "stackedFractions", "ratio", "rate"],
    sections: ["secFractions", "senseFraction"],
  },
  {
    id: "geometry", shelf: "start", icon: "△",
    skills: ["shapeArea", "areaPerimeter", "estimateAngle", "missingAngle", "triangleInequality", "symmetryLines", "cubeNets", "circles", "powerPoint", "arcs", "similarity", "volume"],
    sections: ["secMeasuring", "secPlane", "secSolids", "senseShape"],
  },
  {
    id: "algebra", shelf: "school", icon: "x²",
    skills: ["balance", "shapePatterns", "findRule", "growingPattern", "sameExpression", "linear", "proportion", "inequalities", "expand", "factor", "algFractions", "formulae", "quadratic", "simultaneous", "polynomials", "indices", "logs", "surds", "sequences", "series"],
    sections: ["secExpressions", "senseAlgebra", "senseWhich", "senseCrux"],
  },
  {
    id: "functions", shelf: "school", icon: "f(x)",
    skills: ["graphStory", "functions", "coordinates", "slope", "line", "distance"],
    sections: ["secFunctions", "senseChart"],
  },
  { id: "trigonometry", shelf: "school", icon: "θ", skills: ["trigexact", "righttri", "practicalTrig", "trigRules", "identities"], sections: ["secTrig"] },
  {
    id: "probability", shelf: "school", icon: "🎲",
    skills: ["probability", "counting", "expectation", "conditional", "distributions", "bayes", "densities", "jointDist", "mgf", "limitTheorems", "markov", "randomWalks", "poissonProcess", "brownian"],
    sections: ["secChance"],
  },
  {
    id: "statistics", shelf: "school", icon: "📊",
    skills: ["readChart", "diagrams", "average", "ci", "correlation", "hypothesis", "estimators", "mle", "regression", "chiSquared", "anova"],
    sections: ["secStatistics", "senseChart"],
  },
  {
    id: "numberTheory", shelf: "beyond", icon: "ℤ",
    skills: ["divisibility", "hcf", "primes", "squares", "bases", "modular", "bezout", "congruences", "crt", "fermatEuler", "rsa", "residues", "discreteLog", "elGamal", "ellipticCurves"],
    sections: ["senseNumberPatterns"],
  },
  { id: "finance", shelf: "beyond", icon: "%", skills: ["currency", "inflation", "interestRates", "amortisation", "npv", "bonds", "binomialPricing", "optionPricing"], sections: [] },
  {
    id: "logic", shelf: "beyond", icon: "∀∃",
    skills: ["proofs", "logic", "quantifiers", "sets", "mappings", "relations", "induction", "cardinality", "normalForms", "structures", "ordinalArith"],
    sections: ["secDiscrete"],
  },
  {
    id: "discrete", shelf: "beyond", icon: "⬡",
    skills: ["oneStroke", "colouring", "shortestPath", "spanningTree", "parity", "recurrences", "growth", "generating", "inclusionExclusion", "pigeonhole", "graphTheory"],
    sections: ["secDiscrete", "secProblemSolving", "senseGraph"],
  },
  { id: "algorithms", shelf: "beyond", icon: "⇅", skills: ["inversions"], sections: ["secAlgorithms", "senseAlgo", "senseData", "senseSystem"] },
  {
    id: "vectors", shelf: "university", icon: "[ ]",
    skills: ["vectors", "dotangle", "projection", "complex", "polarForm", "deMoivre", "matrices", "determinant", "elimination", "eigen", "subspaces", "basis", "rankNullity", "linearMaps", "innerProducts", "spectral", "svd"],
    sections: ["secCoordinates", "secMatrices"],
  },
  {
    id: "calculus", shelf: "university", icon: "∫",
    skills: ["differentiate", "tangent", "stationary", "integrate", "definite", "limits", "implicit", "intTechniques", "improper", "intApplications", "taylor", "powerSeries", "convergence", "partials", "chainMulti", "extremaMulti", "multipleIntegrals", "changeVariables", "lineIntegrals", "vectorTheorems", "odeFirst", "odeSecond", "odeSystems", "laplace", "stability", "bifurcations", "iteratedMaps", "lyapunov", "fourier", "pdeClassify", "separation"],
    sections: ["secCalculus"],
  },
  {
    id: "analysis", shelf: "university", icon: "ε",
    skills: ["supInf", "seqLimits", "epsilonDelta", "mvt", "riemann", "uniform", "analytic", "contour", "laurent", "residueCalc", "numroots", "numint", "floatingPoint", "interpolation", "numericalOde", "linearSolvers", "convergenceOrder", "lebesgueMeasure", "simpleIntegrals", "convergenceTheorems", "norms", "operatorNorms", "hilbertSpaces"],
    sections: [],
  },
  {
    id: "abstract", shelf: "university", icon: "G",
    skills: ["groups", "elementOrder", "subgroups", "permutations", "homomorphisms", "rings", "polyRings", "fieldExt", "finiteFields", "galois"],
    sections: [],
  },
  { id: "optimisation", shelf: "university", icon: "max", skills: ["linearProgramming", "simplex", "convex", "normalForm", "mixedNash", "backwardInduction"], sections: [] },
  {
    id: "topology", shelf: "university", icon: "○",
    skills: ["metrics", "openClosed", "compactness", "connected", "topologies", "curves", "surfaces", "nonEuclidean", "projective"],
    sections: [],
  },
  {
    id: "ai", shelf: "university", icon: "🧠",
    skills: ["descent", "backprop", "softmax", "overfitting", "precision", "clustering"],
    sections: ["secAiSteps", "secAiLearning", "secAiModels", "secAiDeep"],
  },
];
export const SHELVES: readonly ShelfId[] = ["start", "school", "beyond", "university"];
export const TOPIC_IDS = TOPICS.map((t) => t.id);
export const isTopic = (v: unknown): v is TopicId => TOPIC_IDS.includes(v as TopicId);
export const topicOf = (id: TopicId): Topic => TOPICS.find((t) => t.id === id)!;
/** The topics shown first on the home page, as in the design (#448). */
export const FEATURED: readonly TopicId[] = ["fractions", "algebra", "geometry", "probability", "calculus", "statistics", "vectors", "logic"];

/** A topic as a one-stage roadmap, so that its Next is found the way a roadmap's is: lowest grade first. */
const asRoadmap = (t: Topic): Pick<Roadmap, "order" | "stages"> => ({ order: "grade", stages: [{ id: t.id, items: skills(...t.skills) }] });

export type TopicProgress = {
  /** Levels secure, and below the learner's grade (taken as known), of all the topic's levels. */
  secure: number; behind: number; total: number;
  next: Next | null;
};
export function topicProgress(t: Topic, w: Work): TopicProgress {
  let secure = 0, behind = 0;
  for (const k of t.skills)
    for (const L of [1, 2, 3] as const) {
      const s = w.s.level(k, L);
      if (s === "secure") secure++;
      else if (s === "behind") behind++;
    }
  const r = asRoadmap(t);
  return { secure, behind, total: 3 * t.skills.length, next: itemsOf(r).length ? roadNext(r, w) : null };
}
/** Where a topic is on the progress page's filter: finished once nothing is open, started once a level is secure. */
export type TopicStatus = "finished" | "started" | "new";
export const topicStatus = (p: TopicProgress): TopicStatus =>
  p.secure + p.behind >= p.total ? "finished" : p.secure > 0 ? "started" : "new";

/** A student as the class model sees them: the chance of a right first answer at each level of a skill, and on how many answers it rests. */
type ModelStudent = { mastery: Partial<Record<SkillId, { p: readonly number[]; n: number }>> };
/** How far below the class mean a student's share of a topic must be to count as well behind. */
export const WELL_BEHIND = 0.25;
export type ClassTopic = { id: TopicId; skills: readonly SkillId[]; mean: number; behind: number };
/**
 * A class on each topic its skills reach (#448, the teacher's Progress tab), in the units of My progress: each
 * student's share of the topic's levels, a level counting once the learner model's chance of a right first answer
 * reaches `masteredAt` (policy.ts MASTERED_AT); the class mean of those shares, and how many students are WELL_BEHIND
 * or more below it. Only the skills the class practises count.
 */
export function classTopics(classSkills: readonly SkillId[], students: readonly ModelStudent[], masteredAt: number): ClassTopic[] {
  return TOPICS.flatMap((t) => {
    const ks = t.skills.filter((k) => classSkills.includes(k));
    if (!ks.length) return [];
    const levels = (s: ModelStudent) =>
      ks.reduce((sum, k) => {
        const m = s.mastery[k];
        return sum + (m && m.n > 0 ? m.p.filter((p) => p >= masteredAt).length : 0);
      }, 0);
    const shares = students.map((s) => levels(s) / (3 * ks.length));
    const mean = shares.length ? shares.reduce((a, b) => a + b, 0) / shares.length : 0;
    return [{ id: t.id, skills: ks, mean, behind: shares.filter((x) => x <= mean - WELL_BEHIND).length }];
  });
}
