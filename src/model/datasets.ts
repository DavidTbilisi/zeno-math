// Public data sets of real students' answers, turned into the observations the learner model learns from, so it can
// be tried on real answers before any class has used Zeno. The first is ASSISTments 2009–2010 "skill builder" (Feng,
// Heffernan & Koedinger 2009): middle-school maths, one row per problem a student answered, with whether the first
// attempt was right.
import type { Observation } from "./elo.ts";

/**
 * CSV records from text that arrives in pieces (a file stream), RFC 4180: quoted fields may hold commas, line breaks
 * and doubled quotes, and a piece may end anywhere, even inside a quoted field.
 */
export async function* csvRecords(pieces: AsyncIterable<string> | Iterable<string>): AsyncGenerator<string[]> {
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let quoteSeen = false; // a quote inside a quoted field, waiting for the next character to say if it is doubled
  let afterCr = false;
  for await (const piece of pieces) {
    for (let i = 0; i < piece.length; i++) {
      const c = piece[i];
      if (afterCr) {
        afterCr = false;
        if (c === "\n") continue;
      }
      if (quoteSeen) {
        quoteSeen = false;
        if (c === '"') {
          cell += '"';
          continue;
        }
        quoted = false;
      }
      if (quoted) {
        if (c === '"') quoteSeen = true;
        else cell += c;
      } else if (c === '"') quoted = true;
      else if (c === ",") row.push(cell), (cell = "");
      else if (c === "\n" || c === "\r") {
        afterCr = c === "\r";
        row.push(cell);
        if (row.length > 1 || row[0]) yield row;
        row = [];
        cell = "";
      } else cell += c;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    if (row.length > 1 || row[0]) yield row;
  }
}

/**
 * A coarse grouping of ASSISTments skill names into topics, for the middle (area) layer of the learner model. It is a
 * heuristic, by keywords, checked by eye on the 2009–2010 skill list; skills it doesn't place are "other".
 */
const TOPICS: [string, RegExp][] = [
  ["data", /graph|plot|mean|median|mode|range|probability|venn|table|counting|stem and leaf|box and whisker|scatter|histogram|statistic|outcome|frequency|combinat|permutation/i],
  ["geometry", /angle|area|perimeter|volume|circle|triangle|polygon|pythag|congruen|similar|transformation|rotation|reflection|translation|surface|net|solid|quadrilateral|parallel|perpendicular|symmetry|coordinate|circumference|geometr|prism|cylinder|cone|sphere|unit conversion|measure/i],
  ["algebra", /equation|expression|inequalit|slope|linear|pattern|variable|algebra|function|intercept|polynomial|exponent|scientific notation|square root|distributive|substitut|order of operations|absolute value|proportion|rate|ratio/i],
  ["number", /addition|subtraction|multiplication|division|fraction|decimal|percent|integer|rounding|number|factor|multiple|prime|divisib|estimation|place value|reciprocal|greatest common|least common/i],
];
export const assistmentsTopic = (skill: string) => TOPICS.find(([, re]) => re.test(skill))?.[0] ?? "other";

export type Dataset = {
  source: string;
  observations: Observation[];
  /** The topic of each skill, for the model's area layer. */
  areas: Record<string, string>;
  /**
   * The class each student is counted in, for resampling whole classes: the one they answered most kept problems in
   * (the first such on a tie), since a student can be in several. Empty when the file names no classes.
   */
  classes: Record<string, string>;
  /** What was read and what was kept; classes and inSeveralClasses only when the file names classes. */
  counts: { rows: number; kept: number; students: number; skills: number; classes?: number; inSeveralClasses?: number };
};

/**
 * One kept ASSISTments answer with what the importer's observations leave out: the assignment it was given in, the
 * problem, the hints asked for and the first action (0 an attempt, 1 a hint, 2 the scaffolding; ASSISTments counts
 * the last two as wrong), and how long the first response took. Columns the file lacks are empty, 0 or NaN.
 */
export type Attempt = {
  order: number; student: string; skill: string; correct: boolean; group: string;
  assignment: string; problem: string; hints: number; firstAction: string; ms: number;
};
/** The rows fromAssistments keeps, by the same cleaning, as attempts in the order they were given. */
export async function assistmentsAttempts(records: AsyncIterable<string[]>): Promise<{ read: number; attempts: Attempt[] }> {
  let header: string[] | null = null;
  let col: Record<string, number> = {};
  const rows: Attempt[] = [];
  const seen = new Set<string>();
  let read = 0;
  for await (const r of records) {
    if (!header) {
      header = r.map((h) => h.trim());
      col = Object.fromEntries(header.map((h, i) => [h, i]));
      for (const need of ["order_id", "user_id", "original", "correct"])
        if (!(need in col)) throw new Error(`not an ASSISTments file: no ${need} column`);
      if (!("skill_name" in col) && !("skill_id" in col)) throw new Error("not an ASSISTments file: no skill_name or skill_id column");
      continue;
    }
    read++;
    // The corrected 2009–2010 file writes a missing value as NA (it was made with R), so NA is empty too.
    const get = (name: string) => {
      const v = name in col ? (r[col[name]] ?? "").trim() : "";
      return v === "NA" ? "" : v;
    };
    if (get("original") !== "1") continue;
    const correct = get("correct");
    if (correct !== "0" && correct !== "1") continue;
    const skill = get("skill_name") || get("skill_id");
    const order = Number(get("order_id"));
    const student = get("user_id");
    if (!skill || !student || !Number.isFinite(order)) continue;
    const key = `${order}\u0000${skill}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      order, student, skill, correct: correct === "1", group: get("student_class_id"),
      assignment: get("assignment_id"), problem: get("problem_id"), hints: Number(get("hint_count")) || 0,
      firstAction: get("first_action"), ms: get("ms_first_response") ? Number(get("ms_first_response")) : NaN,
    });
  }
  rows.sort((a, b) => a.order - b.order);
  return { read, attempts: rows };
}

/**
 * ASSISTments rows as observations, by the usual cleaning: main problems only (original = 1, not the scaffolding
 * questions a wrong answer opens), a skill and a 0/1 first-attempt result present (a missing value may be written as
 * NA), and the same problem counted once per skill. A problem tagged with several skills becomes one observation for
 * each where the file has a row per skill, as in most knowledge-tracing work; the corrected 2009–2010 file has one
 * row per problem, under the first of its skills. Answers are put in the order they were given (order_id). Every question counts as level 2: the data has no
 * levels, and the model's level step then plays no part. Students in one class share a teacher and lessons, so the
 * class (student_class_id) is kept for analyses that resample classes rather than students.
 */
export async function fromAssistments(records: AsyncIterable<string[]>, source = "ASSISTments 2009–2010 skill builder"): Promise<Dataset> {
  const { read, attempts: rows } = await assistmentsAttempts(records);
  // order_id names the problem log, so a problem tagged with several skills has the same problem on each of its observations.
  const observations: Observation[] = rows.map(({ student, skill, correct, order }) => ({ student, skill, level: 2, correct, problem: String(order) }));
  const skills = [...new Set(rows.map((r) => r.skill))];
  // Kept problems per student and class, in the order first met, so a tie goes to the class met first.
  const perClass = new Map<string, Map<string, number>>();
  for (const { student, group } of rows) {
    if (!group) continue;
    const of = perClass.get(student) ?? perClass.set(student, new Map()).get(student)!;
    of.set(group, (of.get(group) ?? 0) + 1);
  }
  const classes = Object.fromEntries([...perClass].map(([student, of]) => [student, [...of].reduce((a, b) => (b[1] > a[1] ? b : a))[0]]));
  const counts: Dataset["counts"] = { rows: read, kept: rows.length, students: new Set(rows.map((r) => r.student)).size, skills: skills.length };
  if (perClass.size) {
    counts.classes = new Set(Object.values(classes)).size;
    counts.inSeveralClasses = [...perClass.values()].filter((of) => of.size > 1).length;
  }
  return { source, observations, areas: Object.fromEntries(skills.map((k) => [k, assistmentsTopic(k)])), classes, counts };
}

/** The file the importer writes: observations as compact [student, skill, level, right, problem] rows (problem where known), and each student's class. */
export type DatasetFile = { source: string; areas: Record<string, string>; classes?: Record<string, string>; counts: Dataset["counts"]; rows: ([string, string, number, 0 | 1] | [string, string, number, 0 | 1, string])[] };
export const toFile = (d: Dataset): DatasetFile => ({
  source: d.source,
  areas: d.areas,
  classes: d.classes,
  counts: d.counts,
  rows: d.observations.map((o) => (o.problem === undefined ? [o.student, o.skill, o.level, o.correct ? 1 : 0] : [o.student, o.skill, o.level, o.correct ? 1 : 0, o.problem])),
});
export function fromFile(f: DatasetFile): Dataset {
  if (!f || !Array.isArray(f.rows)) throw new Error("not a data set file: no rows");
  return {
    source: f.source,
    areas: f.areas ?? {},
    // Files written before classes were kept have none.
    classes: f.classes ?? {},
    counts: f.counts,
    // Files written before problems were kept have none.
    observations: f.rows.map(([student, skill, level, right, problem]) => ({ student, skill, level: (level === 1 || level === 3 ? level : 2) as 1 | 2 | 3, correct: right === 1, ...(problem === undefined ? {} : { problem }) })),
  };
}

/**
 * Only the practices of at least `min` answers, a practice being a student's answers on one skill, kept whole and in
 * order. ASSISTments' skill builders mostly end at three right in a row, so its practices are short; the long ones are
 * those that went on, the check of whether a result holds beyond the streak rule's own stopping point.
 */
export function longPractices(observations: Observation[], min: number): Observation[] {
  const length = new Map<string, number>();
  const key = (o: Observation) => `${o.student}\u0000${o.skill}`;
  for (const o of observations) length.set(key(o), (length.get(key(o)) ?? 0) + 1);
  return observations.filter((o) => length.get(key(o))! >= min);
}
