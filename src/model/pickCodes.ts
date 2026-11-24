// The codes a word problem's marks are recorded as (src/math/wordMarks.ts, #582), here without imports so the server,
// which runs src/model's .ts files as they are, can check an attempt's marks.
/** Every code a pick can be recorded as: the mark, and on a relation whose amount was picked ("relation:0"). */
export const PICK_CODES: readonly string[] = ["given", "asked", "notNeeded", "relation:0", "relation:1"];
