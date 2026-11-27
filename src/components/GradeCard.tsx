// Where the learner is in the course, on the practice page: the grades from 1 to university as a ladder with theirs
// marked, how much of it is secure, and the ways on: practise that grade, find it with a short placement, or claim
// skills of it the learner knows already and prove them (claim.ts, #823).
import { useState } from "react";
import type { PracticeWords, SkillId } from "../math/practice";
import { fill } from "../math/text";
import { GRADES, type Grade } from "../model/curriculum";
import { currentGrade, gradeProgress, MAX_PLACEMENT, placedGrade, type Placement } from "../model/placement";
import { claimable, nextProof, PROOF_RIGHT, type Claim } from "../model/claim";
import type { Progress } from "../practiceProgress";

type Words = PracticeWords["grades"];
/** A grade's name: "Grade 7", "Grades 9–10", "University". */
export const gradeName = (g: Grade, w: Words) =>
  g === 13 ? w.uni : g === 10 || g === 12 ? fill(w.pair, { a: g - 1, b: g }) : fill(w.grade, { n: g });
/** Its rung on the ladder: "7", "9–10", "Uni". */
export const rung = (g: Grade, w: Words) => (g === 13 ? w.uniShort : g === 10 || g === 12 ? `${g - 1}–${g}` : String(g));

type Props = {
  progress: Progress;
  /** The placement under way, if any. */
  placing: Placement | null;
  /** Practising the grade now (rather than an area's skills). */
  practising: boolean;
  justPlaced: boolean;
  /** The claim being proved, if any, and how the last one ended. */
  claiming: Claim | null;
  claimResult: Claim | null;
  onPractise: () => void;
  onPlace: () => void;
  onClaim: (skills: SkillId[]) => void;
  skillName: (s: SkillId) => string;
  w: Words;
};

export function GradeCard({ progress, placing, practising, justPlaced, claiming, claimResult, onPractise, onPlace, onClaim, skillName, w }: Props) {
  /** The skills ticked, while the learner is choosing what to claim. */
  const [ticked, setTicked] = useState<SkillId[] | null>(null);
  const placed = progress.placed ?? null;
  const grade = currentGrade(placed, progress.cells ?? {});
  const { secure, total } = gradeProgress(grade, progress.cells ?? {});
  const found = placing && placedGrade(placing);
  const open = claimable(grade, progress.cells ?? {});
  // The proof the question on screen belongs to.
  const asked = claiming && nextProof(claiming);
  const proof = asked && claiming.proofs.find((p) => p.skill === asked.skill && !p.result);
  const toggle = (k: SkillId) => setTicked((t) => (t?.includes(k) ? t.filter((x) => x !== k) : [...(t ?? []), k]));
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
      ) : claiming ? (
        <p className="hint" role="status">
          {proof ? fill(w.proving, { skill: skillName(proof.skill), right: proof.right, need: PROOF_RIGHT }) : w.proved}{" "}
          {fill(w.claimLeft, { n: claiming.proofs.filter((p) => !p.result).length })}
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
          {claimResult && (
            <ul className="claim-result" aria-label={w.claimResult}>
              {claimResult.proofs.map((p) => (
                <li key={p.skill} className={p.result === "proved" ? "proved" : "missed"}>
                  {fill(p.result === "proved" ? w.provedOne : w.missedOne, { skill: skillName(p.skill) })}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="hint">{w.intro}</p>
      )}
      {ticked && !placing && !claiming && (
        <fieldset className="claim-pick">
          <legend>{fill(w.claimAsk, { grade: gradeName(grade, w) })}</legend>
          {open.length ? (
            open.map((k) => (
              <label key={k}>
                <input type="checkbox" checked={ticked.includes(k)} onChange={() => toggle(k)} /> {skillName(k)}
              </label>
            ))
          ) : (
            <p className="hint">{fill(w.claimNone, { grade: gradeName(grade, w) })}</p>
          )}
          <p className="hint">{fill(w.claimRule, { n: PROOF_RIGHT })}</p>
          <div className="field-row wrap">
            <button className="btn primary small" disabled={!ticked.length} onClick={() => (onClaim(ticked), setTicked(null))}>
              {fill(w.prove, { n: ticked.length * PROOF_RIGHT })}
            </button>
            <button className="btn small" onClick={() => setTicked(null)}>{w.cancel}</button>
          </div>
        </fieldset>
      )}
      {!placing && !claiming && !ticked && (
        <div className="field-row wrap">
          {known && !practising && (
            <button className="btn primary small" onClick={onPractise}>{fill(w.practise, { grade: gradeName(grade, w) })}</button>
          )}
          <button className={`btn small${known ? "" : " primary"}`} onClick={onPlace}>{placed ? w.placeAgain : w.place}</button>
          {known && open.length > 0 && <button className="btn small" onClick={() => setTicked([])}>{w.claim}</button>}
        </div>
      )}
    </section>
  );
}
