// The numbers the front page states (components/Landing.tsx), kept beside its words so the page published on its own
// needn't import the skills, the library and the mistakes to count them. Each is a floor ("more than …"), and
// tests/about.test.ts fails when one is above the real count or has fallen far behind it.
export const COUNTS = {
  /** Practice skills, each with three levels (model/topics.ts). */
  skills: 250,
  /** Topics on the Learn page. */
  topics: 20,
  /** Tools, hands-on pieces and games in the library (library.ts). */
  pieces: 180,
  /** Mistakes the checker knows by name (math/mistakes.ts). */
  mistakes: 1100,
} as const;

/** The topics of the page's path (the words' `path`), stage by stage in the same order: what each name links to.
 *  model/topics.ts has them; they are repeated here for the same reason as the counts, and the same test holds them. */
export const PATH_TOPICS: readonly (readonly string[])[] = [
  ["numbers", "fractions", "geometry"],
  ["algebra", "functions", "trigonometry", "probability", "statistics"],
  ["numberTheory", "finance", "logic", "discrete", "algorithms"],
  ["vectors", "calculus", "analysis", "abstract", "optimisation", "topology", "ai"],
];
