// The order of the practice skills for the fixed sequence, and what each one builds on for the adaptive one. Both
// follow the usual school order: number, then algebra and geometry side by side, calculus last; data where its maths
// is ready. A class can practise any subset; prerequisites outside the subset are ignored.
import type { SkillId } from "../math/practiceSkills.ts";

export const CURRICULUM: readonly SkillId[] = [
  "times", "fractions", "percent", "hcf", "primes", "average", "linear", "expand", "factor", "line", "distance", "righttri",
  "probability", "similarity", "volume", "circles", "indices", "simultaneous", "quadratic", "surds", "trigexact", "counting",
  "sequences", "series", "logs", "polynomials", "functions", "identities", "vectors", "dotangle", "differentiate", "tangent",
  "stationary", "integrate", "definite", "numroots", "numint", "ci",
];

/** The skills each skill builds on directly. */
export const PREREQUISITES: Readonly<Partial<Record<SkillId, readonly SkillId[]>>> = {
  fractions: ["times"],
  percent: ["fractions"],
  hcf: ["times"],
  primes: ["times"],
  average: ["fractions"],
  linear: ["fractions"],
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
