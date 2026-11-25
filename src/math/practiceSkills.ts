// The practice areas and their skills: kept apart from the generators so the menus and the tool search can list
// them without loading any maths.
export type Area = "number" | "algebra" | "geometry" | "calculus" | "data";
export const AREAS: Area[] = ["number", "algebra", "geometry", "calculus", "data"];
export const SKILLS = {
  number: ["compare", "quickLook", "ordinals", "skipCount", "estimateLine", "closerTo", "placeValue", "addSubtract", "tables", "divide", "times", "columnSums", "longDivide", "money", "time", "measure", "makeTarget", "kakooma", "makeWhole", "equivalent", "orderFractions", "shadeFraction", "integers", "order", "compareFractions", "fractionSums", "fractions", "decimals", "decimalTimes", "percent", "convert", "stackedFractions", "ratio", "rate", "scale", "currency", "inflation", "moneySense", "barModels", "rounding", "divisibility", "hcf", "primes", "squares", "realNumbers", "bases", "modular", "bezout", "congruences", "crt", "fermatEuler", "rsa", "residues", "discreteLog", "elGamal", "ellipticCurves"],
  algebra: ["balance", "shapePatterns", "findRule", "growingPattern", "sameExpression", "graphStory", "readFunction", "linear", "proportion", "inequalities", "regions", "absoluteValue", "expand", "factor", "algFractions", "formulae", "quadratic", "quadraticGraph", "simultaneous", "polynomials", "polyGraph", "rationalFn", "indices", "logs", "exponential", "surds", "sequences", "series", "functions", "complex", "polarForm", "deMoivre", "matrices", "determinant", "elimination", "eigen", "subspaces", "basis", "rankNullity", "linearMaps", "innerProducts", "spectral", "svd", "groups", "elementOrder", "subgroups", "permutations", "homomorphisms", "rings", "polyRings", "fieldExt", "finiteFields", "galois", "linearProgramming", "simplex", "convex", "normalForm", "mixedNash", "backwardInduction"],
  geometry: ["shapeKinds", "shapeArea", "areaPerimeter", "estimateAngle", "missingAngle", "parallelAngles", "triangleInequality", "symmetryLines", "transformations", "congruence", "constructions", "cubeNets", "coordinates", "slope", "line", "distance", "pythagoras", "trigexact", "righttri", "practicalTrig", "trigRules", "circles", "powerPoint", "arcs", "similarity", "volume", "crossSections", "identities", "vectors", "dotangle", "projection", "metrics", "openClosed", "compactness", "connected", "topologies", "curves", "surfaces", "nonEuclidean", "projective"],
  calculus: ["differentiate", "tangent", "stationary", "integrate", "definite", "numroots", "numint", "descent", "backprop", "limits", "implicit", "intTechniques", "improper", "intApplications", "taylor", "powerSeries", "convergence", "partials", "chainMulti", "extremaMulti", "multipleIntegrals", "changeVariables", "lineIntegrals", "vectorTheorems", "odeFirst", "odeSecond", "odeSystems", "laplace", "stability", "bifurcations", "iteratedMaps", "lyapunov", "supInf", "seqLimits", "epsilonDelta", "mvt", "riemann", "uniform", "analytic", "contour", "laurent", "residueCalc", "floatingPoint", "interpolation", "numericalOde", "linearSolvers", "convergenceOrder", "fourier", "pdeClassify", "separation", "lebesgueMeasure", "simpleIntegrals", "convergenceTheorems", "norms", "operatorNorms", "hilbertSpaces"],
  data: ["readChart", "diagrams", "oneStroke", "colouring", "shortestPath", "spanningTree", "parity", "inversions", "average", "spread", "twoWay", "scatter", "sampling", "probability", "counting", "ci", "expectation", "conditional", "distributions", "correlation", "hypothesis", "tTests", "twoSample", "densities", "jointDist", "mgf", "limitTheorems", "estimators", "mle", "regression", "chiSquared", "anova", "bayes", "markov", "randomWalks", "poissonProcess", "brownian", "interestRates", "amortisation", "npv", "bonds", "binomialPricing", "optionPricing", "softmax", "overfitting", "precision", "clustering", "proofs", "logic", "quantifiers", "sets", "mappings", "relations", "induction", "cardinality", "recurrences", "growth", "generating", "inclusionExclusion", "pigeonhole", "graphTheory", "normalForms", "structures", "ordinalArith"],
} as const satisfies Record<Area, readonly string[]>;
export type SkillId = (typeof SKILLS)[Area][number];
/**
 * The practice menu's sections: each area's skills in named groups, from school to university, so the topics read as
 * a short list of sections rather than one wall of chips. Every skill of an area sits in exactly one of its groups
 * (checked by npm test); the area a skill belongs to, and so the learner model, is unchanged.
 */
export const GROUPS = {
  number: {
    counting: ["compare", "quickLook", "ordinals", "skipCount", "estimateLine", "closerTo", "makeTarget", "kakooma"],
    arithmetic: ["placeValue", "addSubtract", "tables", "divide", "times", "columnSums", "longDivide", "integers", "order", "rounding"],
    everyday: ["money", "time", "measure", "currency", "inflation", "moneySense"],
    fractions: ["makeWhole", "equivalent", "orderFractions", "shadeFraction", "compareFractions", "fractionSums", "fractions", "decimals", "decimalTimes", "percent", "convert", "stackedFractions"],
    ratio: ["ratio", "rate", "scale", "barModels"],
    factors: ["divisibility", "hcf", "primes", "squares", "realNumbers", "bases"],
    numberTheory: ["modular", "bezout", "congruences", "crt", "fermatEuler", "residues"],
    crypto: ["rsa", "discreteLog", "elGamal", "ellipticCurves"],
  },
  algebra: {
    patterns: ["balance", "shapePatterns", "findRule", "growingPattern", "sameExpression", "graphStory"],
    equations: ["linear", "proportion", "inequalities", "regions", "absoluteValue", "formulae", "quadratic", "quadraticGraph", "simultaneous"],
    expressions: ["expand", "factor", "algFractions", "polynomials", "polyGraph", "indices", "logs", "surds"],
    functions: ["readFunction", "sequences", "series", "functions", "exponential", "rationalFn"],
    complex: ["complex", "polarForm", "deMoivre"],
    linearAlgebra: ["matrices", "determinant", "elimination", "eigen", "subspaces", "basis", "rankNullity", "linearMaps", "innerProducts", "spectral", "svd"],
    groups: ["groups", "elementOrder", "subgroups", "permutations", "homomorphisms"],
    rings: ["rings", "polyRings", "fieldExt", "finiteFields", "galois"],
    optimisation: ["linearProgramming", "simplex", "convex", "normalForm", "mixedNash", "backwardInduction"],
  },
  geometry: {
    shapes: ["shapeKinds", "shapeArea", "areaPerimeter", "estimateAngle", "missingAngle", "parallelAngles", "triangleInequality", "symmetryLines", "transformations", "congruence", "constructions", "cubeNets"],
    coordinates: ["coordinates", "slope", "line", "distance"],
    trig: ["pythagoras", "trigexact", "righttri", "practicalTrig", "trigRules", "identities"],
    circles: ["circles", "powerPoint", "arcs", "similarity", "volume", "crossSections"],
    vectors: ["vectors", "dotangle", "projection"],
    topology: ["metrics", "openClosed", "compactness", "connected", "topologies"],
    differential: ["curves", "surfaces", "nonEuclidean", "projective"],
  },
  calculus: {
    differentiation: ["limits", "differentiate", "tangent", "stationary", "implicit"],
    integration: ["integrate", "definite", "intTechniques", "improper", "intApplications"],
    series: ["taylor", "powerSeries", "convergence"],
    multivariable: ["partials", "chainMulti", "extremaMulti", "multipleIntegrals", "changeVariables", "lineIntegrals", "vectorTheorems"],
    ode: ["odeFirst", "odeSecond", "odeSystems", "laplace", "stability"],
    dynamics: ["bifurcations", "iteratedMaps", "lyapunov"],
    numerical: ["numroots", "numint", "descent", "backprop", "floatingPoint", "interpolation", "numericalOde", "linearSolvers", "convergenceOrder"],
    realAnalysis: ["supInf", "seqLimits", "epsilonDelta", "mvt", "riemann", "uniform"],
    complexAnalysis: ["analytic", "contour", "laurent", "residueCalc"],
    pde: ["fourier", "pdeClassify", "separation"],
    measure: ["lebesgueMeasure", "simpleIntegrals", "convergenceTheorems", "norms", "operatorNorms", "hilbertSpaces"],
  },
  data: {
    charts: ["readChart", "diagrams", "average", "spread", "twoWay", "scatter", "sampling"],
    graphs: ["oneStroke", "colouring", "shortestPath", "spanningTree", "graphTheory"],
    probability: ["probability", "counting", "conditional", "expectation", "distributions", "densities", "jointDist", "mgf", "limitTheorems"],
    statistics: ["ci", "correlation", "hypothesis", "tTests", "twoSample", "estimators", "mle", "regression", "chiSquared", "anova", "bayes"],
    processes: ["markov", "randomWalks", "poissonProcess", "brownian"],
    finance: ["interestRates", "amortisation", "npv", "bonds", "binomialPricing", "optionPricing"],
    ml: ["softmax", "overfitting", "precision", "clustering"],
    discrete: ["parity", "inversions", "recurrences", "growth", "generating", "inclusionExclusion", "pigeonhole"],
    logic: ["proofs", "logic", "quantifiers", "sets", "mappings", "relations", "induction", "cardinality", "normalForms", "structures", "ordinalArith"],
  },
} as const satisfies { [A in Area]: Record<string, readonly (typeof SKILLS)[A][number][]> };
export type GroupId = { [A in Area]: keyof (typeof GROUPS)[A] }[Area];
/** An area's groups in menu order, each with its skills. */
export const groupsOf = (a: Area) => Object.entries(GROUPS[a]) as [GroupId, readonly SkillId[]][];
/**
 * The skills before negative numbers, order of operations, rounding and inequalities came (October 2026): what the
 * published simulations ran on, and what a class made then without a skill list practised ("all" at the time).
 */
export const FIRST_SKILLS = {
  number: ["times", "fractions", "percent", "hcf", "primes"],
  algebra: ["linear", "expand", "factor", "quadratic", "simultaneous", "polynomials", "indices", "logs", "surds", "sequences", "series", "functions"],
  geometry: ["line", "distance", "trigexact", "righttri", "circles", "similarity", "volume", "identities", "vectors", "dotangle"],
  calculus: ["differentiate", "tangent", "stationary", "integrate", "definite", "numroots", "numint"],
  data: ["average", "probability", "counting", "ci"],
} as const satisfies Record<Area, readonly SkillId[]>;
export const ALL_SKILLS: SkillId[] = AREAS.flatMap((a) => [...SKILLS[a]]);
const AREA_OF = new Map<string, Area>(AREAS.flatMap((a) => SKILLS[a].map((s) => [s, a] as const)));
/** The area a skill belongs to (the learner model asks on every prediction, so this is a lookup, not a search). */
export const areaOf = (s: SkillId): Area => AREA_OF.get(s)!;
