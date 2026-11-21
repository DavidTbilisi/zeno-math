// The order of the practice skills for the fixed sequence, and what each one builds on for the adaptive one. Both
// follow the usual school order: number, then algebra and geometry side by side, calculus last; data where its maths
// is ready. University maths for machine learning follows (probability, then linear algebra), and machine learning
// itself comes last, each piece on the school maths it uses: descent on finding a minimum, softmax on logs and
// probability, k-means on distance. A class can practise any subset; prerequisites outside the subset are ignored.
import type { SkillId } from "../math/practiceSkills.ts";

export const CURRICULUM: readonly SkillId[] = [
  "quickLook", "compare", "ordinals", "shapePatterns", "estimateLine", "closerTo", "times", "money", "time", "measure", "barModels", "shapeArea", "readChart", "diagrams", "symmetryLines", "estimateAngle", "cubeNets", "makeTarget", "kakooma", "oneStroke", "colouring", "shortestPath", "spanningTree", "integers", "parity", "coordinates", "order", "inversions", "shadeFraction", "compareFractions", "equivalent", "orderFractions", "makeWhole", "fractions", "decimals", "percent", "ratio", "rate", "rounding", "divisibility", "hcf", "primes", "bases", "modular", "average", "missingAngle", "triangleInequality", "findRule", "growingPattern", "balance", "sameExpression", "graphStory", "linear", "proportion", "inequalities", "expand", "factor", "algFractions", "formulae", "slope", "line", "distance", "righttri", "practicalTrig", "trigRules",
  "probability", "similarity", "volume", "circles", "powerPoint", "arcs", "indices", "simultaneous", "quadratic", "surds", "trigexact", "counting",
  "sequences", "series", "logs", "polynomials", "functions", "identities", "complex", "polarForm", "deMoivre", "bezout", "congruences", "crt", "fermatEuler", "rsa", "residues", "discreteLog", "elGamal", "ellipticCurves", "groups", "elementOrder", "subgroups", "permutations", "homomorphisms", "rings", "polyRings", "fieldExt", "finiteFields", "galois", "vectors", "dotangle", "nonEuclidean", "projective", "differentiate", "tangent",
  "stationary", "integrate", "definite", "numroots", "numint", "limits", "implicit", "intTechniques", "improper", "intApplications", "taylor", "powerSeries", "convergence", "partials", "chainMulti", "extremaMulti", "multipleIntegrals", "changeVariables", "lineIntegrals", "vectorTheorems", "odeFirst", "odeSecond", "laplace", "bifurcations", "iteratedMaps", "lyapunov", "supInf", "seqLimits", "epsilonDelta", "mvt", "riemann", "uniform", "analytic", "contour", "laurent", "residueCalc", "metrics", "openClosed", "compactness", "connected", "topologies", "floatingPoint", "interpolation", "numericalOde", "convergenceOrder", "fourier", "pdeClassify", "separation", "lebesgueMeasure", "simpleIntegrals", "convergenceTheorems", "curves", "surfaces", "ci", "proofs", "logic", "quantifiers", "sets", "mappings", "relations", "induction", "cardinality", "recurrences", "generating", "inclusionExclusion", "pigeonhole", "graphTheory", "normalForms", "structures", "ordinalArith",
  "expectation", "conditional", "distributions", "correlation", "hypothesis", "densities", "jointDist", "mgf", "limitTheorems", "estimators", "mle", "regression", "chiSquared", "anova", "bayes",
  "projection", "matrices", "determinant", "elimination", "eigen", "subspaces", "basis", "rankNullity", "linearMaps", "innerProducts", "spectral", "svd", "linearSolvers", "odeSystems", "stability", "norms", "operatorNorms", "hilbertSpaces", "markov", "randomWalks", "poissonProcess", "brownian", "interestRates", "amortisation", "binomialPricing", "optionPricing",
  "linearProgramming", "simplex", "convex", "normalForm", "mixedNash", "backwardInduction", "descent", "backprop", "softmax", "overfitting", "precision", "clustering",
];

/** The skills each skill builds on directly. */
export const PREREQUISITES: Readonly<Partial<Record<SkillId, readonly SkillId[]>>> = {
  times: ["compare"],
  estimateLine: ["compare"],
  closerTo: ["estimateLine"],
  shapeArea: ["times"],
  symmetryLines: ["shapeArea"],
  estimateAngle: ["compare"],
  cubeNets: ["shapeArea"],
  missingAngle: ["estimateAngle", "integers"],
  triangleInequality: ["missingAngle"],
  readChart: ["times"],
  diagrams: ["readChart"],
  oneStroke: ["compare"],
  colouring: ["oneStroke"],
  shortestPath: ["oneStroke"],
  spanningTree: ["shortestPath"],
  parity: ["integers"],
  inversions: ["order"],
  coordinates: ["integers"],
  graphStory: ["coordinates", "findRule"],
  slope: ["coordinates", "fractions"],
  makeTarget: ["times"],
  kakooma: ["times"],
  integers: ["times"],
  order: ["integers"],
  shadeFraction: ["times"],
  compareFractions: ["compare", "times"],
  equivalent: ["compareFractions"],
  orderFractions: ["compareFractions"],
  makeWhole: ["equivalent"],
  money: ["times"],
  time: ["times"],
  measure: ["times"],
  fractions: ["times"],
  decimals: ["fractions", "money"],
  percent: ["fractions"],
  ratio: ["fractions"],
  barModels: ["times", "money"],
  rate: ["decimals"],
  rounding: ["times"],
  divisibility: ["times"],
  hcf: ["times"],
  primes: ["times"],
  bases: ["times"],
  modular: ["primes", "decimals"],
  ordinals: ["compare"],
  shapePatterns: ["ordinals"],
  findRule: ["times"],
  growingPattern: ["findRule"],
  balance: ["times"],
  sameExpression: ["findRule"],
  average: ["fractions"],
  linear: ["fractions"],
  proportion: ["rate", "linear"],
  inequalities: ["linear", "integers"],
  expand: ["linear"],
  factor: ["expand"],
  algFractions: ["factor"],
  formulae: ["linear"],
  line: ["linear"],
  distance: ["line"],
  righttri: ["fractions"],
  practicalTrig: ["righttri"],
  trigRules: ["practicalTrig"],
  probability: ["fractions"],
  similarity: ["percent"],
  volume: ["times"],
  circles: ["linear"],
  powerPoint: ["circles", "similarity"],
  arcs: ["volume", "circles"],
  indices: ["times"],
  simultaneous: ["linear"],
  quadratic: ["factor"],
  surds: ["indices"],
  trigexact: ["righttri"],
  counting: ["times"],
  sequences: ["linear"],
  series: ["sequences"],
  logs: ["indices"],
  polynomials: ["factor"],
  functions: ["linear"],
  identities: ["trigexact"],
  vectors: ["line"],
  dotangle: ["vectors", "trigexact"],
  differentiate: ["indices", "functions"],
  tangent: ["differentiate", "line"],
  stationary: ["differentiate", "quadratic"],
  integrate: ["differentiate"],
  definite: ["integrate"],
  numroots: ["functions"],
  numint: ["definite"],
  limits: ["functions"],
  implicit: ["differentiate"],
  intTechniques: ["integrate"],
  improper: ["definite", "limits"],
  intApplications: ["definite"],
  taylor: ["differentiate", "series"],
  powerSeries: ["taylor", "limits"],
  convergence: ["series", "limits"],
  partials: ["differentiate"],
  chainMulti: ["partials"],
  extremaMulti: ["partials", "stationary"],
  multipleIntegrals: ["definite"],
  changeVariables: ["multipleIntegrals", "trigexact"],
  lineIntegrals: ["partials", "definite"],
  vectorTheorems: ["lineIntegrals", "multipleIntegrals"],
  odeFirst: ["intTechniques"],
  odeSecond: ["odeFirst", "complex"],
  odeSystems: ["odeSecond", "eigen"],
  laplace: ["odeFirst", "improper"],
  stability: ["odeSystems", "partials"],
  bifurcations: ["odeFirst", "stationary"],
  iteratedMaps: ["stationary", "sequences"],
  lyapunov: ["iteratedMaps", "logs"],
  supInf: ["sequences", "limits"],
  seqLimits: ["supInf"],
  epsilonDelta: ["seqLimits"],
  mvt: ["epsilonDelta", "taylor"],
  riemann: ["supInf", "definite"],
  uniform: ["seqLimits", "powerSeries"],
  analytic: ["deMoivre", "partials"],
  contour: ["analytic", "lineIntegrals"],
  laurent: ["contour", "powerSeries"],
  residueCalc: ["laurent", "improper"],
  ci: ["average"],
  expectation: ["probability", "average"],
  proofs: ["parity", "primes", "expand"],
  logic: ["proofs"],
  quantifiers: ["logic"],
  sets: ["logic"],
  mappings: ["sets", "functions"],
  relations: ["sets", "modular"],
  induction: ["proofs", "series"],
  cardinality: ["mappings"],
  recurrences: ["induction", "sequences"],
  generating: ["counting", "series", "recurrences"],
  inclusionExclusion: ["counting", "sets"],
  pigeonhole: ["counting", "proofs"],
  graphTheory: ["spanningTree", "counting"],
  normalForms: ["logic"],
  structures: ["quantifiers", "relations"],
  ordinalArith: ["cardinality", "induction"],
  conditional: ["probability"],
  distributions: ["expectation", "counting"],
  correlation: ["expectation"],
  hypothesis: ["distributions", "ci"],
  densities: ["distributions", "integrate"],
  jointDist: ["conditional", "expectation"],
  mgf: ["densities", "expectation"],
  limitTheorems: ["mgf", "distributions"],
  estimators: ["expectation", "limitTheorems"],
  mle: ["distributions", "densities"],
  regression: ["correlation"],
  chiSquared: ["hypothesis"],
  anova: ["hypothesis"],
  bayes: ["conditional", "densities"],
  markov: ["conditional", "matrices"],
  randomWalks: ["markov", "distributions"],
  poissonProcess: ["distributions", "densities"],
  brownian: ["limitTheorems", "randomWalks"],
  interestRates: ["percent", "series", "logs"],
  amortisation: ["interestRates"],
  binomialPricing: ["expectation", "interestRates"],
  optionPricing: ["binomialPricing"],
  projection: ["dotangle"],
  matrices: ["dotangle"],
  determinant: ["matrices"],
  elimination: ["simultaneous", "determinant"],
  eigen: ["elimination", "quadratic"],
  subspaces: ["vectors", "elimination"],
  basis: ["subspaces"],
  rankNullity: ["basis"],
  linearMaps: ["matrices", "basis"],
  innerProducts: ["projection", "basis"],
  spectral: ["eigen", "linearMaps"],
  svd: ["spectral", "innerProducts"],
  complex: ["quadratic", "surds"],
  polarForm: ["complex", "trigexact"],
  deMoivre: ["polarForm"],
  bezout: ["hcf", "modular"],
  congruences: ["bezout"],
  crt: ["congruences"],
  fermatEuler: ["congruences", "primes"],
  rsa: ["fermatEuler"],
  discreteLog: ["rsa"],
  elGamal: ["discreteLog"],
  ellipticCurves: ["residues", "discreteLog"],
  residues: ["fermatEuler"],
  groups: ["modular"],
  elementOrder: ["groups"],
  subgroups: ["elementOrder"],
  permutations: ["groups", "inversions"],
  homomorphisms: ["subgroups", "permutations"],
  rings: ["homomorphisms", "congruences"],
  polyRings: ["rings", "polynomials"],
  fieldExt: ["polyRings", "surds"],
  finiteFields: ["fieldExt", "fermatEuler"],
  galois: ["finiteFields", "permutations"],
  metrics: ["seqLimits", "distance"],
  openClosed: ["metrics"],
  compactness: ["openClosed", "seqLimits"],
  connected: ["openClosed"],
  topologies: ["openClosed", "epsilonDelta"],
  floatingPoint: ["rounding", "differentiate"],
  interpolation: ["polynomials"],
  numericalOde: ["odeFirst", "numint"],
  linearSolvers: ["elimination"],
  convergenceOrder: ["numroots"],
  fourier: ["intTechniques", "convergence"],
  pdeClassify: ["partials"],
  separation: ["odeSecond", "fourier", "pdeClassify"],
  lebesgueMeasure: ["riemann", "convergence"],
  simpleIntegrals: ["lebesgueMeasure"],
  convergenceTheorems: ["simpleIntegrals", "uniform"],
  norms: ["innerProducts", "convergenceTheorems"],
  operatorNorms: ["norms", "spectral"],
  hilbertSpaces: ["norms", "fourier"],
  curves: ["intApplications", "vectors"],
  surfaces: ["partials", "curves"],
  nonEuclidean: ["trigRules", "circles"],
  projective: ["vectors", "similarity"],
  linearProgramming: ["inequalities", "simultaneous"],
  simplex: ["linearProgramming", "elimination"],
  convex: ["extremaMulti", "linearProgramming"],
  normalForm: ["linearProgramming"],
  mixedNash: ["normalForm", "expectation"],
  backwardInduction: ["normalForm"],
  descent: ["stationary"],
  backprop: ["descent"],
  softmax: ["logs", "probability"],
  overfitting: ["polynomials", "average"],
  precision: ["conditional"],
  clustering: ["distance", "average"],
};

/** A class's skills in curriculum order, without repeats or unknown ones. */
export const inCurriculumOrder = (skills: readonly string[]): SkillId[] => CURRICULUM.filter((k) => skills.includes(k));

/** A year of Singapore's 2021 primary mathematics syllabus, P1 to P6 (the Standard track). */
export type Year = 1 | 2 | 3 | 4 | 5 | 6;
export const YEARS: readonly Year[] = [1, 2, 3, 4, 5, 6];
type Y = Year | null;

/**
 * The year of the primary syllabus each skill's three levels belong to: the first year by which the syllabus has taught
 * every kind of question the level asks, or null when some of them go past P6 (negative numbers, the LCM of two-digit
 * numbers, the median, cylinders). Skills left out have no level in the primary syllabus: graph theory, which it
 * doesn't teach, and the secondary topics.
 */
export const SYLLABUS: Readonly<Partial<Record<SkillId, readonly [Y, Y, Y]>>> = {
  quickLook: [1, 1, 1], // counting a set, adding three 1-digit numbers
  compare: [1, 2, null], // numbers to 10, to 1000; decimals, fractions and negatives
  estimateLine: [1, 2, null], // 0–20, 0–1000; then 0–1 or −10–10
  closerTo: [1, 4, 4], // to 100; fractions and decimals near 0, ½, 1; rounding to estimate (≈, P4)
  times: [3, 4, 4], // 2 digits by 1 (P3), by 2 and 3 digits by 2 (P4)
  money: [2, 3, 4], // decimal notation and cents (P2), adding and subtracting (P3), decimals × a digit (P4)
  measure: [2, 3, 3], // reading a ruler, a scale and a jug (P2); two units, one changed into the other, added and taken away (P3)
  time: [2, 3, 4], // a clock with hands to 5 minutes, a.m. and p.m. (P2); how long and when, in hours and minutes (P3); the 24-hour clock (P4)
  makeTarget: [1, 5, 5], // + and − within 20 (brackets can always be dropped); × and ÷ with brackets (P5)
  kakooma: [1, 1, 3], // addition within 10, within 20 (P1); the multiplication tables (P3)
  makeWhole: [3, 5, 5], // related fractions within one whole (P3); three different denominators (P5)
  equivalent: [2, 3, 5], // part of a whole, equivalent fractions, fractions as decimals and percentages
  orderFractions: [2, 3, 4], // unit fractions, unlike fractions, mixed numbers
  shadeFraction: [2, 3, 4], // part of a whole, an equivalent one, part of a set
  compareFractions: [2, 3, 3], // like fractions, then unlike
  fractions: [6, 6, null], // reciprocals and ÷ by a fraction (P6); a mixed number ÷ a mixed number
  decimals: [4, 5, 5], // + −, × ÷ by a digit (P4); by 10, 100, 1000 and units in decimal form (P5)
  percent: [5, 6, 6], // a percentage of a whole (P5); increase and decrease, the whole from a part (P6)
  ratio: [6, 6, 6],
  barModels: [3, 4, 5], // comparison and part-whole (P3); sum and difference, units, intervals (P4); before and after, leftover and shortage (P5)
  rate: [5, 6, 6], // the rate for one unit (P5); speed, its average and meeting or catching up (P6)
  rounding: [4, null, null], // decimals to 1 or 2 places; standard form and bounds
  divisibility: [4, 4, 4], // multiples of a 1-digit number
  hcf: [4, null, 4], // common factors of two numbers (P4); the LCM of two-digit numbers
  balance: [6, 6, null], // a linear equation with whole number coefficients; two unknowns
  ordinals: [1, 1, 1], // 1st to 10th in a line of pictures, from the left or the right (P1)
  shapePatterns: [1, 1, 3], // the next shape, the repeating part (P1); a far term by the remainder (P3)
  findRule: [3, null, null], // one step within the tables; two steps with negative numbers
  growingPattern: [2, 4, 6], // continuing it, a far figure, which figure (an equation, P6)
  sameExpression: [6, null, null], // like terms without brackets (P6); brackets
  shapeArea: [3, 5, 4], // rectangles (P3), triangles (P5), area and perimeter of rectilinear figures (P4)
  estimateAngle: [3, 4, 5], // about a right angle, in degrees, angles at a point
  missingAngle: [5, 5, null], // on a line, at a point, in a triangle; any quadrilateral
  symmetryLines: [4, 4, 4],
  cubeNets: [4, 4, 4],
  readChart: [3, 3, 3], // bar graphs and their scales
  diagrams: [2, 4, 6], // picture graphs (P2), line graphs (P4), pie charts and stem-and-leaf plots (P6)
  average: [6, null, null], // the mean; the median, the standard deviation
};

/** The skills with a level in the given year of the syllabus, in curriculum order. */
export const skillsOfYear = (year: Year): SkillId[] => CURRICULUM.filter((k) => SYLLABUS[k]?.includes(year));

// ---------- grades: where each level sits in the course, from grade 1 to university ----------

/**
 * A stage of the course, named by the school grade that finishes it: grades 1 to 8 one by one, then 10 for grades 9–10
 * and 12 for grades 11–12, which Singapore's syllabuses teach as two-year blocks (Secondary 3/4, and the two years of
 * junior college for H2 Mathematics), and 13 for university. Grades 1 to 6 are P1 to P6, 7 and 8 are Secondary 1 and 2.
 */
export type Grade = Year | 7 | 8 | 10 | 12 | 13;
export const GRADES: readonly Grade[] = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 13];
type G = Grade | null;

/**
 * The grade of each level past the primary syllabus, by the same rule as SYLLABUS (the first grade by which every kind
 * of question the level asks has been taught), from Singapore's syllabuses: O-Level Mathematics, Secondary 1 to 4
 * (2020; Sec 1 is grade 7, Sec 2 grade 8, Sec 3/4 grades 9–10), O-Level Additional Mathematics (2020, Sec 3/4) and
 * H2 Mathematics 9758 (junior college, grades 11–12); 13 is past all of them (numerical methods, confidence
 * intervals). A null is a level SYLLABUS already places, or one no syllabus here teaches (bounds); skills left out of
 * both are graph theory and other puzzles that no school syllabus here teaches.
 */
export const LATER: Readonly<Partial<Record<SkillId, readonly [G, G, G]>>> = {
  compare: [null, null, 7], // negative numbers and their order (Sec 1)
  estimateLine: [null, null, 7], // −10 to 10
  fractions: [null, null, 7], // a mixed number ÷ a mixed number: the four operations on rational numbers
  rounding: [null, 10, null], // significant figures (Sec 1) and standard form (Sec 3/4); bounds aren't in the syllabus
  hcf: [null, 7, null], // the LCM by prime factorisation
  balance: [null, null, 8], // two unknowns: simultaneous equations
  findRule: [null, 7, 7], // two steps with negative numbers; backwards, a linear equation
  sameExpression: [null, 7, 7], // brackets, a² as a × a
  missingAngle: [null, null, 7], // the angle sum of any polygon
  average: [null, 8, 10], // median and mode (Sec 2); standard deviation (Sec 3/4)
  integers: [7, 7, 7],
  primes: [7, 7, 7], // primes and prime factorisation
  order: [7, 7, 7], // the four operations with negative results, squares
  coordinates: [7, 7, 7],
  slope: [7, 7, 7], // the gradient of a linear graph, positive and negative
  graphStory: [7, 7, 7], // a graph as a relationship between two variables
  linear: [7, 7, 7], // including fractional answers
  proportion: [8, 8, 8], // direct and inverse proportion, y = kx, y = k/x, y ∝ x² (Sec 2)
  inequalities: [8, 8, 10], // ax + b < c (Sec 2); simultaneous inequalities (Sec 3/4)
  expand: [8, 8, 8],
  factor: [8, 8, 8],
  algFractions: [8, 8, 8], // simplify, then + − × ÷ over linear and over quadratic bottoms (Sec 2)
  formulae: [8, 8, 8], // substitute; change the subject in one or two steps, squared or rooted, or twice (Sec 2)
  quadratic: [8, 8, 10], // by factorisation (Sec 2); by the formula (Sec 3/4)
  simultaneous: [8, 8, 8],
  practicalTrig: [8, 8, 8],
  trigRules: [10, 10, 10], // obtuse angles, the sine and cosine rules, bearings, elevation (Sec 3/4)
  righttri: [8, 8, 8], // sine, cosine and tangent of acute angles
  similarity: [8, 8, 10], // similar figures (Sec 2); ratios of areas and volumes (Sec 3/4)
  volume: [7, 8, 8], // prisms and cylinders (Sec 1); pyramids, cones and spheres (Sec 2)
  probability: [8, 10, 10], // single events (Sec 2); combined events and tree diagrams (Sec 3/4)
  indices: [10, 10, 10], // zero, negative and fractional indices
  line: [10, 10, 10], // y = mx + c from two points; perpendicular lines (Additional Mathematics)
  distance: [10, 10, 10], // midpoint (Additional Mathematics) and length
  arcs: [10, 10, 10], // arc length and sector area, radian measure (Sec 3/4)
  circles: [10, 10, 10], // angle and symmetry properties; the alternate segment theorem (Additional Mathematics)
  trigexact: [10, 10, 10], // exact values, any angle, radians (Additional Mathematics)
  polynomials: [10, 10, 10], // remainder and factor theorems, the binomial theorem (Additional Mathematics)
  logs: [10, 10, 10],
  surds: [10, 10, 10],
  identities: [10, 10, 10], // compound and double angles, R cos(θ − α)
  differentiate: [10, 10, 10], // powers, eˣ, sin, ln; chain, product and quotient rules
  tangent: [10, 10, 10],
  stationary: [10, 10, 10],
  integrate: [10, 12, 12], // 1/x and 1/(ax + b) come with H2
  definite: [10, 10, 12], // ∫ 1/x is H2
  vectors: [10, 12, 12], // in two dimensions (Sec 3/4); in three, and the scalar product (H2)
  sequences: [7, 12, 12], // the nth term of a linear pattern (Sec 1); geometric and quadratic rules (H2)
  series: [12, 12, 12],
  functions: [12, 12, 12], // composite and inverse functions
  dotangle: [12, 12, 12],
  counting: [12, 12, 12], // permutations and combinations
  numroots: [13, 13, 13],
  numint: [13, 13, 13],
  limits: [13, 13, 13], // factor and cancel, limits at infinity, L'Hôpital, one-sided limits (Spivak, Stewart)
  implicit: [12, 12, 12], // implicit differentiation and connected rates of change (H2)
  intTechniques: [12, 12, 12], // substitution, by parts, partial fractions, sin² and cos² (H2)
  improper: [13, 13, 13], // integrals to infinity and of functions that blow up (Stewart)
  intApplications: [12, 12, 13], // area between curves and volume of revolution (H2); arc length (Stewart)
  taylor: [12, 12, 13], // Maclaurin series (H2); Taylor series about a ≠ 0 (Stewart)
  powerSeries: [13, 13, 13], // radius and interval of convergence (Stewart)
  convergence: [13, 13, 13], // the comparison, ratio, integral and alternating series tests (Stewart)
  partials: [13, 13, 13], // the gradient, directional derivatives, tangent planes (OpenStax Calculus 3, Colley)
  chainMulti: [13, 13, 13], // the chain rule in several variables and the Jacobian (Marsden and Tromba)
  extremaMulti: [13, 13, 13], // critical points, the second-derivative test, Lagrange multipliers (OpenStax Calculus 3)
  multipleIntegrals: [13, 13, 13], // double integrals over rectangles and triangles, reversing the order (Colley)
  changeVariables: [13, 13, 13], // polar, cylindrical and spherical coordinates (OpenStax Calculus 3)
  lineIntegrals: [13, 13, 13], // conservative fields, potentials, line integrals along a curve (Marsden and Tromba)
  vectorTheorems: [13, 13, 13], // Green, the divergence theorem and Stokes (Marsden and Tromba, Colley)
  odeFirst: [13, 13, 13], // separable, linear and exact first-order equations (Boyce and DiPrima)
  odeSecond: [13, 13, 13], // constant coefficients, undetermined coefficients (Boyce and DiPrima, Lebl)
  odeSystems: [13, 13, 13], // x′ = Ax by eigenvalues, phase portraits (Lebl, Strogatz)
  laplace: [13, 13, 13], // the transform, its inverse, initial value problems (Trench, Boyce and DiPrima)
  stability: [13, 13, 13], // equilibria, their stability, linearisation (Strogatz)
  bifurcations: [13, 13, 13], // saddle-node, transcritical and pitchfork bifurcations of x′ = f(x, r) (Strogatz ch. 3)
  iteratedMaps: [13, 13, 13], // fixed points, their stability by |f′|, 2-cycles of the logistic map (Strogatz ch. 10)
  lyapunov: [13, 13, 13], // Lyapunov exponents of shift and tent maps, Feigenbaum's δ (Strogatz ch. 10)
  supInf: [13, 13, 13], // the completeness axiom, suprema and the approximation property (Abbott, Bartle and Sherbert)
  seqLimits: [13, 13, 13], // ε–N, monotone convergence, subsequences (Abbott, Lebl Basic Analysis)
  epsilonDelta: [13, 13, 13], // continuity by ε and δ, uniform continuity (Abbott, Bartle and Sherbert)
  mvt: [13, 13, 13], // Rolle, the mean value theorem, Taylor's remainder (Lebl Basic Analysis, Rudin)
  riemann: [13, 13, 13], // Darboux sums and Riemann integrability (Abbott, Lebl Basic Analysis)
  uniform: [13, 13, 13], // pointwise against uniform convergence, the Weierstrass M-test (Abbott, Rudin)
  analytic: [13, 13, 13], // the Cauchy–Riemann equations, f′ from u, harmonic conjugates (Needham; Brown & Churchill)
  contour: [13, 13, 13], // contour integrals, Cauchy's theorem and integral formula (Brown & Churchill; Stein & Shakarchi)
  laurent: [13, 13, 13], // singularities, Laurent coefficients, a Laurent series on an annulus (Brown & Churchill)
  residueCalc: [13, 13, 13], // residues at simple and double poles, real integrals by residues (Stein & Shakarchi)
  ci: [13, 13, 13],
  expectation: [12, 12, 12], // discrete random variables, E(X) and Var(X) (H2)
  proofs: [13, 13, 13], // ordering a proof and its reasons, a faulty proof, counterexamples (Velleman, Hammack)
  logic: [13, 13, 13], // truth values, truth tables, contrapositive and De Morgan (Velleman, Hammack)
  quantifiers: [13, 13, 13], // for all and there is on a small set, negations, the order of quantifiers and ε–δ
  sets: [13, 13, 13], // a Venn diagram read, |A ∪ B|, |A × B|, |P(A)|, three sets (Halmos, Hammack)
  mappings: [13, 13, 13], // injective, surjective, bijective; composition and inverse
  relations: [13, 13, 13], // reflexive, symmetric, transitive; equivalence classes; a partial order's extremes
  induction: [13, 13, 13], // ordering an induction proof and its reasons, a faulty induction
  cardinality: [13, 13, 13], // countable or not, listing ℤ and ℕ × ℕ, Cantor's diagonal
  recurrences: [13, 13, 13], // linear recurrences, the characteristic equation, the closed form (Rosen; Levin)
  generating: [13, 13, 13], // counting with generating functions (Wilf, generatingfunctionology)
  inclusionExclusion: [13, 13, 13], // inclusion–exclusion, divisibility counts, derangements (Rosen)
  pigeonhole: [13, 13, 13], // the pigeonhole principle and its generalised form (Rosen; Levin)
  graphTheory: [13, 13, 13], // the handshake lemma, trees, Kₙ, Euler circuits, Euler's formula, matchings (Wilson)
  normalForms: [13, 13, 13], // models, full DNF and CNF, tautologies, resolution (Enderton, Logic ch. 1)
  structures: [13, 13, 13], // truth in a finite structure, free variables, models of axioms (Enderton, Logic ch. 2)
  ordinalArith: [13, 13, 13], // ordinal sums and products, cardinal arithmetic, the axioms of ZFC (Enderton, Set Theory ch. 2, 6, 8)
  conditional: [12, 12, 12], // conditional probability (H2)
  distributions: [12, 12, 12], // the binomial and normal distributions (H2)
  correlation: [12, 12, 13], // the product-moment correlation coefficient (H2); covariance from a joint distribution is past it
  hypothesis: [12, 12, 12], // p-values and z tests of a mean (H2)
  densities: [13, 13, 13], // densities, distribution functions, uniform and exponential (Ross; Blitzstein & Hwang)
  jointDist: [13, 13, 13], // joint tables, marginals, conditionals, covariance and independence (Ross; Blitzstein & Hwang)
  mgf: [13, 13, 13], // moment generating functions and sums of independent variables (Ross; Blitzstein & Hwang)
  limitTheorems: [13, 13, 13], // the law of large numbers, the central limit theorem, the normal approximation (Ross; Grinstead & Snell)
  estimators: [13, 13, 13], // bias, mean squared error, consistency (Wackerly, Mendenhall & Scheaffer; Casella & Berger)
  mle: [13, 13, 13], // maximum-likelihood estimates of Bernoulli, Poisson, exponential, normal and uniform samples (Wackerly; Wasserman)
  regression: [13, 13, 13], // the least-squares line, residuals, R² and adjusted R² (OpenIntro Statistics; Wackerly)
  chiSquared: [13, 13, 13], // goodness of fit and independence: expected counts, degrees of freedom, the statistic (OpenIntro; Wackerly)
  anova: [13, 13, 13], // one-way ANOVA: degrees of freedom, sums of squares, the F statistic (OpenIntro; Wackerly)
  bayes: [13, 13, 13], // posterior probabilities, beta–binomial, normal–normal and gamma–Poisson updating (Wasserman; Casella & Berger)
  markov: [13, 13, 13], // transition matrices, n-step probabilities, stationary distributions, return times (Norris; Grinstead & Snell)
  randomWalks: [13, 13, 13], // the simple random walk, the fair and the biased gambler's ruin (Ross; Grimmett & Stirzaker)
  poissonProcess: [13, 13, 13], // Poisson counts, exponential gaps, memorylessness, splitting and merging (Ross)
  brownian: [13, 13, 13], // covariance min(s, t), drift and scaling, the reflection principle (Ross; Grimmett & Stirzaker)
  interestRates: [13, 13, 13], // compound and continuous interest, present value, loans and annuities (Shreve I, ch. 1)
  amortisation: [13, 13, 13], // a loan's schedule: interest and principal, the balance, total interest, payments to clear (#455)
  binomialPricing: [13, 13, 13], // the one-period binomial model: p̃, replication, arbitrage (Shreve I, ch. 1)
  optionPricing: [13, 13, 13], // multi-period European and American options, put–call parity (Shreve I, ch. 1, 4)
  projection: [12, 12, 12], // the length of a projection |a · n̂|, the foot of the perpendicular from a point to a line (H2)
  matrices: [10, 13, 13], // multiplying matrices (Sec 3/4); the transpose and A² = aA + bI are past school
  determinant: [13, 13, 13],
  elimination: [13, 13, 13],
  eigen: [13, 13, 13],
  subspaces: [13, 13, 13], // subspaces, spans and their dimension (Axler, Strang)
  basis: [13, 13, 13], // independence, coordinates in a basis, the dimension of a space
  rankNullity: [13, 13, 13], // rank, nullity and the rank–nullity theorem
  linearMaps: [13, 13, 13], // linear maps, their matrices and change of basis
  innerProducts: [13, 13, 13], // inner products, Gram–Schmidt and least squares
  spectral: [13, 13, 13], // diagonalisation, A = PDP⁻¹ and powers of A
  svd: [13, 13, 13], // the singular value decomposition and low-rank approximation (Strang)
  complex: [12, 12, 12], // complex arithmetic, the conjugate and complex roots of real quadratics (H2 Mathematics 9758)
  polarForm: [12, 12, 12], // the modulus–argument form, re^{iθ}, products as rotations (H2 Mathematics 9758)
  bezout: [13, 13, 13], // the extended Euclidean algorithm and linear Diophantine equations (Burton; Stein; Niven–Zuckerman–Montgomery)
  congruences: [13, 13, 13], // inverses mod n and linear congruences with gcd(a, n) > 1 (Burton; Stein; Niven–Zuckerman–Montgomery)
  crt: [13, 13, 13], // the Chinese remainder theorem, coprime and not (Burton; Stein; Niven–Zuckerman–Montgomery)
  fermatEuler: [13, 13, 13], // φ, Fermat, Euler, primitive roots and Wilson (Burton; Stein; Niven–Zuckerman–Montgomery)
  rsa: [13, 13, 13], // RSA keys, encryption and decryption with small primes (Stein; Burton)
  discreteLog: [13, 13, 13], // orders, primitive roots, discrete logarithms, Diffie–Hellman (Hoffstein, Pipher & Silverman)
  elGamal: [13, 13, 13], // ElGamal keys, encryption, decryption and signatures (Hoffstein, Pipher & Silverman)
  ellipticCurves: [13, 13, 13], // points over ℤₚ, the chord-and-tangent group law, elliptic Diffie–Hellman (Washington)
  residues: [13, 13, 13], // quadratic residues, Euler's criterion and quadratic reciprocity (Burton; Stein; Niven–Zuckerman–Montgomery)
  groups: [13, 13, 13], // the group axioms, ℤₙ, U(n) and the dihedral groups (Pinter; Judson; Gallian)
  elementOrder: [13, 13, 13], // orders of elements, cyclic groups and generators (Pinter; Judson; Gallian)
  subgroups: [13, 13, 13], // subgroups, cosets and Lagrange's theorem (Pinter; Judson; Gallian)
  permutations: [13, 13, 13], // cycle notation, composition, sign, Sₙ and Aₙ (Pinter; Judson; Gallian)
  homomorphisms: [13, 13, 13], // kernels, normal subgroups, quotients, the first isomorphism theorem (Pinter; Judson; Gallian)
  rings: [13, 13, 13], // units, zero divisors, integral domains and fields, ideals and quotient rings (Pinter; Gallian)
  polyRings: [13, 13, 13], // the remainder theorem in ℤₚ[x], Eisenstein's criterion, irreducibility mod p (Gallian; Judson)
  fieldExt: [13, 13, 13], // degrees by the tower law, minimal polynomials, inverses in ℚ(√d) (Stewart, Galois Theory; Judson)
  finiteFields: [13, 13, 13], // GF(p) and GF(pⁿ) = ℤₚ[x]/(f), the cyclic multiplicative group, subfields (Judson; Gallian)
  galois: [13, 13, 13], // Galois groups of splitting fields, cyclotomic fields, the discriminant of a cubic (Stewart; Judson)
  metrics: [13, 13, 13], // metrics on ℝ², the metric axioms, balls of d₁, d₂, d∞ and the discrete metric (Sutherland, Introduction to Metric and Topological Spaces)
  openClosed: [13, 13, 13], // open and closed subsets of ℝ, interior, closure and boundary (Sutherland; Abbott, Understanding Analysis)
  compactness: [13, 13, 13], // Heine–Borel, Bolzano–Weierstrass, finite subcovers, the extreme value theorem (Sutherland; Abbott)
  connected: [13, 13, 13], // connected subsets of ℝ and the plane, components, path-connectedness (Sutherland; Munkres, Topology)
  topologies: [13, 13, 13], // topologies on finite sets, subbases, continuity by preimages, homeomorphisms (Munkres; Sutherland)
  floatingPoint: [13, 13, 13], // absolute and relative error, condition numbers of functions and matrices (Burden & Faires; Trefethen & Bau)
  interpolation: [13, 13, 13], // Lagrange and Newton interpolation, divided differences, the error term (Burden & Faires; Süli & Mayers)
  numericalOde: [13, 13, 13], // Euler, improved Euler and RK4 steps, global error against step size (Burden & Faires; Süli & Mayers)
  linearSolvers: [13, 13, 13], // LU factorisation, Jacobi and Gauss–Seidel sweeps and their convergence (Burden & Faires; Trefethen & Bau)
  convergenceOrder: [13, 13, 13], // bisection steps, Newton at a multiple root, fixed-point rates (Burden & Faires; Süli & Mayers)
  fourier: [13, 13, 13], // Fourier coefficients, parity, convergence at a jump, Parseval (Strauss; Haberman; Lebl)
  pdeClassify: [13, 13, 13], // order, linearity, elliptic/parabolic/hyperbolic, characteristics (Strauss; Haberman)
  separation: [13, 13, 13], // heat, wave and Laplace equations by separation of variables (Strauss; Haberman; Lebl)
  lebesgueMeasure: [13, 13, 13], // outer measure, null sets, Cantor sets, countable additivity, continuity of measure (Axler MIRA ch. 2)
  simpleIntegrals: [13, 13, 13], // integrals of simple functions, almost everywhere, other measures (Axler MIRA ch. 3)
  convergenceTheorems: [13, 13, 13], // monotone and dominated convergence, mass that escapes, Lᵖ norms (Axler MIRA ch. 3, 7)
  norms: [13, 13, 13], // 1-, 2- and ∞-norms of vectors and functions, equivalence constants (Kreyszig ch. 2)
  operatorNorms: [13, 13, 13], // matrix norms, integral and multiplication operators (Kreyszig ch. 2)
  hilbertSpaces: [13, 13, 13], // projection, best approximation, Parseval (Kreyszig ch. 3)
  curves: [13, 13, 13], // speed, arc length, curvature and torsion of space curves (Pressley; do Carmo)
  surfaces: [13, 13, 13], // tangent planes, the first fundamental form, Gaussian curvature (Pressley; do Carmo)
  nonEuclidean: [13, 13, 13], // angle sums, Girard's theorem, hyperbolic area, regular tilings (Greenberg; Stillwell)
  projective: [13, 13, 13], // homogeneous coordinates, meets of lines, cross-ratio, projectivities (Coxeter; Stillwell)
  linearProgramming: [13, 13, 13], // feasible points, corners, the graphical method for max and min (Vanderbei; Hillier & Lieberman)
  simplex: [13, 13, 13], // entering and leaving variables, a pivot, shadow prices and the dual (Vanderbei; Hillier & Lieberman)
  convex: [13, 13, 13], // convex sets and functions, the Hessian test, the KKT conditions (Boyd & Vandenberghe)
  normalForm: [13, 13, 13], // best responses, pure Nash equilibria, iterated dominance (Osborne)
  mixedNash: [13, 13, 13], // saddle points, mixed equilibria by indifference, the value of a zero-sum game (Osborne; Luce & Raiffa)
  backwardInduction: [13, 13, 13], // game trees, subgame-perfect equilibria, the Stackelberg duopoly (Osborne)
  deMoivre: [13, 13, 13], // De Moivre, n-th roots and loci in the Argand diagram (OpenStax Precalculus; Needham)
  descent: [13, 13, 13], // gradient descent: one step, two steps, what the learning rate does
  backprop: [13, 13, 13], // the chain rule through a computational graph, a squared error, a ReLU
  softmax: [13, 13, 13], // softmax probabilities, the cross-entropy loss and its gradient
  overfitting: [13, 13, 13], // training against test error, choosing a degree, early stopping
  precision: [13, 13, 13], // precision, recall and F1 from a confusion matrix or a threshold
  clustering: [13, 13, 13], // a k-nearest-neighbours vote, a k-means step and its sum of squares
};

/** The grade a level belongs to, or null when no syllabus here teaches it. */
export const gradeOf = (skill: SkillId, level: 1 | 2 | 3): Grade | null => SYLLABUS[skill]?.[level - 1] ?? LATER[skill]?.[level - 1] ?? null;
/** The skills with a level in the given grade, in curriculum order (for grades 1 to 6, the same as skillsOfYear). */
export const skillsOfGrade = (grade: Grade): SkillId[] => CURRICULUM.filter((k) => ([1, 2, 3] as const).some((L) => gradeOf(k, L) === grade));
