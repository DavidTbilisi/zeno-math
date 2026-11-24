// The numbers the front page states (components/Landing.tsx), kept beside its words so the page published on its own
// needn't import the skills, the library and the mistakes to count them. Each is a floor ("more than …"), and
// tests/about.test.ts fails when one is above the real count or has fallen far behind it.
export const COUNTS = {
  /** Practice skills, each with three levels (model/topics.ts). */
  skills: 230,
  /** Topics on the Learn page. */
  topics: 20,
  /** Tools, hands-on pieces and games in the library (library.ts). */
  pieces: 170,
  /** Mistakes the checker knows by name (math/mistakes.ts). */
  mistakes: 900,
} as const;
