// The practice areas and their skills: kept apart from the generators so the menus and the tool search can list
// them without loading any maths.
export type Area = "number" | "algebra" | "geometry" | "calculus" | "data";
export const AREAS: Area[] = ["number", "algebra", "geometry", "calculus", "data"];
export const SKILLS = {
  number: ["times", "integers", "order", "fractions", "percent", "rounding", "hcf", "primes"],
  algebra: ["linear", "inequalities", "expand", "factor", "quadratic", "simultaneous", "polynomials", "indices", "logs", "surds", "sequences", "series", "functions"],
  geometry: ["line", "distance", "trigexact", "righttri", "circles", "similarity", "volume", "identities", "vectors", "dotangle"],
  calculus: ["differentiate", "tangent", "stationary", "integrate", "definite", "numroots", "numint"],
  data: ["average", "probability", "counting", "ci"],
} as const satisfies Record<Area, readonly string[]>;
export type SkillId = (typeof SKILLS)[Area][number];
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
export const areaOf = (s: SkillId): Area => AREAS.find((a) => (SKILLS[a] as readonly string[]).includes(s))!;
