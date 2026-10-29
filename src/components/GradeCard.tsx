// Where the learner is in the course, on the practice page: the grades from 1 to university as a ladder with theirs
// marked, how much of it is secure, and the two ways on: practise that grade, or find it with a short placement.
import type { PracticeWords } from "../math/practice";
import { fill } from "../math/text";
import { GRADES, type Grade } from "../model/curriculum";
import { currentGrade, gradeProgress, MAX_PLACEMENT, placedGrade, type Placement } from "../model/placement";
import type { Progress } from "../practiceProgress";

type Words = PracticeWords["grades"];
/** A grade's name: "Grade 7", "Grades 9–10", "University". */
export const gradeName = (g: Grade, w: Words) =>
  g === 13 ? w.uni : g === 10 || g === 12 ? fill(w.pair, { a: g - 1, b: g }) : fill(w.grade, { n: g });
/** Its rung on the ladder: "7", "9–10", "Uni". */
const rung = (g: Grade, w: Words) => (g === 13 ? w.uniShort : g === 10 || g === 12 ? `${g - 1}–${g}` : String(g));

type Props = {
  progress: Progress;
  /** The placement under way, if any. */
  placing: Placement | null;
  /** Practising the grade now (rather than an area's skills). */
  practising: boolean;
  justPlaced: boolean;
  onPractise: () => void;
  onPlace: () => void;
  w: Words;
};

export function GradeCard({ progress, placing, practising, justPlaced, onPractise, onPlace, w }: Props) {
  const placed = progress.placed ?? null;
  const grade = currentGrade(placed, progress.cells ?? {});
  const { secure, total } = gradeProgress(grade, progress.cells ?? {});
  const found = placing && placedGrade(placing);
  // Before a placement or any practice there is nowhere to mark yet.
  const known = !!(placed || progress.cells);
  // While placing, the ladder shows the grades still possible; otherwise where the learner is.
  const state = (g: Grade, i: number) =>
    placing ? (i >= placing.lo && i <= placing.hi ? "open" : "out")
    : !known ? "" : g === grade ? "here" : GRADES.indexOf(g) < GRADES.indexOf(grade) ? "past" : "";
  return (
    <section className="practice-side-card grade-card" aria-label={w.title}>
      <h2>{w.title}</h2>
      <ol className="grade-ladder" aria-hidden="true">
        {GRADES.map((g, i) => <li key={g} className={state(g, i)}>{rung(g, w)}</li>)}
      </ol>
      {placing && !found ? (
        <p className="hint" role="status">
          {fill(w.placing, { i: placing.asked + 1, n: MAX_PLACEMENT })} {fill(w.between, { a: gradeName(GRADES[placing.lo], w), b: gradeName(GRADES[placing.hi], w) })}
        </p>
      ) : found ? (
        <p role="status"><strong>{fill(w.found, { grade: gradeName(found, w) })}</strong></p>
      ) : known ? (
        <>
          <p>
            <strong>{fill(justPlaced ? w.found : w.here, { grade: gradeName(grade, w) })}</strong>
          </p>
          <p className="hint">{fill(w.secure, { secure, total })}</p>
          <div className="grade-meter" aria-hidden="true"><span style={{ width: `${(100 * secure) / Math.max(1, total)}%` }} /></div>
        </>
      ) : (
        <p className="hint">{w.intro}</p>
      )}
      {!placing && (
        <div className="field-row wrap">
          {known && !practising && (
            <button className="btn primary small" onClick={onPractise}>{fill(w.practise, { grade: gradeName(grade, w) })}</button>
          )}
          <button className={`btn small${known ? "" : " primary"}`} onClick={onPlace}>{placed ? w.placeAgain : w.place}</button>
        </div>
      )}
    </section>
  );
}
