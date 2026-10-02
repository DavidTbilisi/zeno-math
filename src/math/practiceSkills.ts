// The practice areas and their skills: kept apart from the generators so the menus and the tool search can list
// them without loading any maths.
export type Area = "number" | "algebra" | "geometry" | "calculus" | "data";
export const AREAS: Area[] = ["number", "algebra", "geometry", "calculus", "data"];
export const SKILLS = {
  number: ["times", "fractions", "percent", "hcf", "primes"],
  algebra: ["linear", "expand", "factor", "quadratic", "simultaneous", "indices", "logs", "surds", "sequences", "series", "functions"],
  geometry: ["line", "distance", "trigexact", "righttri", "identities", "vectors", "dotangle"],
  calculus: ["differentiate", "tangent", "stationary", "integrate", "definite"],
  data: ["average", "probability", "counting", "ci"],
} as const satisfies Record<Area, readonly string[]>;
export type SkillId = (typeof SKILLS)[Area][number];
export const ALL_SKILLS: SkillId[] = AREAS.flatMap((a) => [...SKILLS[a]]);
export const areaOf = (s: SkillId): Area => AREAS.find((a) => (SKILLS[a] as readonly string[]).includes(s))!;
