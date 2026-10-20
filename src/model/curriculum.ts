// The order of the practice skills for the fixed sequence, and what each one builds on for the adaptive one. Both
// follow the usual school order: number, then algebra and geometry side by side, calculus last; data where its maths
// is ready. A class can practise any subset; prerequisites outside the subset are ignored.
import type { SkillId } from "../math/practiceSkills.ts";

export const CURRICULUM: readonly SkillId[] = [
  "quickLook", "compare", "estimateLine", "closerTo", "times", "money", "shapeArea", "readChart", "symmetryLines", "estimateAngle", "cubeNets", "makeTarget", "kakooma", "oneStroke", "colouring", "shortestPath", "spanningTree", "integers", "coordinates", "order", "shadeFraction", "compareFractions", "equivalent", "orderFractions", "makeWhole", "fractions", "decimals", "percent", "ratio", "rate", "rounding", "divisibility", "hcf", "primes", "average", "missingAngle", "findRule", "growingPattern", "balance", "sameExpression", "graphStory", "linear", "inequalities", "expand", "factor", "slope", "line", "distance", "righttri",
  "probability", "similarity", "volume", "circles", "indices", "simultaneous", "quadratic", "surds", "trigexact", "counting",
  "sequences", "series", "logs", "polynomials", "functions", "identities", "vectors", "dotangle", "differentiate", "tangent",
  "stationary", "integrate", "definite", "numroots", "numint", "ci",
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
  readChart: ["times"],
  oneStroke: ["compare"],
  colouring: ["oneStroke"],
  shortestPath: ["oneStroke"],
  spanningTree: ["shortestPath"],
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
  fractions: ["times"],
  decimals: ["fractions", "money"],
  percent: ["fractions"],
  ratio: ["fractions"],
  rate: ["decimals"],
  rounding: ["times"],
  divisibility: ["times"],
  hcf: ["times"],
  primes: ["times"],
  findRule: ["times"],
  growingPattern: ["findRule"],
  balance: ["times"],
  sameExpression: ["findRule"],
  average: ["fractions"],
  linear: ["fractions"],
  inequalities: ["linear", "integers"],
  expand: ["linear"],
  factor: ["expand"],
  line: ["linear"],
  distance: ["line"],
  righttri: ["fractions"],
  probability: ["fractions"],
  similarity: ["percent"],
  volume: ["times"],
  circles: ["linear"],
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
  ci: ["average"],
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
  rate: [5, 5, 5],
  rounding: [4, null, null], // decimals to 1 or 2 places; standard form and bounds
  divisibility: [4, 4, 4], // multiples of a 1-digit number
  hcf: [4, null, 4], // common factors of two numbers (P4); the LCM of two-digit numbers
  balance: [6, 6, null], // a linear equation with whole number coefficients; two unknowns
  findRule: [3, null, null], // one step within the tables; two steps with negative numbers
  growingPattern: [2, 4, 6], // continuing it, a far figure, which figure (an equation, P6)
  sameExpression: [6, null, null], // like terms without brackets (P6); brackets
  shapeArea: [3, 5, 4], // rectangles (P3), triangles (P5), area and perimeter of rectilinear figures (P4)
  estimateAngle: [3, 4, 5], // about a right angle, in degrees, angles at a point
  missingAngle: [5, 5, null], // on a line, at a point, in a triangle; any quadrilateral
  symmetryLines: [4, 4, 4],
  cubeNets: [4, 4, 4],
  readChart: [3, 3, 3], // bar graphs and their scales
  average: [6, null, null], // the mean; the median, the standard deviation
};

/** The skills with a level in the given year of the syllabus, in curriculum order. */
export const skillsOfYear = (year: Year): SkillId[] => CURRICULUM.filter((k) => SYLLABUS[k]?.includes(year));
