// The top of the teacher page: who is stuck, on what, and why (server/dashboard.ts, src/model/stuckList.ts). Students
// are grouped by the gap they share, so the teacher can take a group together; "Seen" takes a student off the list
// until ten more questions on the skill go by without three right in a row.
import { lazy, Suspense } from "react";
import type { Dashboard, StuckRow } from "../../server/dashboard";
import { studentName } from "../api";
import type { Dict } from "../locales/en";
import type { SkillId } from "../math/practiceSkills";
import { fill } from "../math/text";

const MistakeHint = lazy(() => import("./MistakeHint").then((m) => ({ default: m.MistakeHint })));

export function StuckList({ stuck, numbers, t, skillName, showCodes, onSeen }: {
  stuck: Dashboard["stuck"];
  /** Each student's number in the class list, by their id ("s12"), for those who gave one. */
  numbers: ReadonlyMap<string, number | null>;
  t: Dict;
  skillName: (k: SkillId) => string;
  showCodes: boolean;
  onSeen: (row: StuckRow) => void;
}) {
  const w = t.teacher;
  const ideaName = (idea: string) => (t.pracWords.ideas as Record<string, string>)[idea] ?? idea;
  return (
    <section className="card stuck-list" aria-labelledby="stuck-title">
      <h3 id="stuck-title">{w.stuck}</h3>
      <p className="hint">{w.stuckHint}</p>
      {!stuck.length && <p className="muted">{w.noneStuck}</p>}
      {stuck.map((g) => {
        const b = g.rows[0].because;
        return (
          <div key={g.key} className="stuck-group">
            <p className="stuck-why">
              {!b ? (
                w.noReason
              ) : b.kind === "mistake" ? (
                <>
                  {fill(w.becauseMistake, { input: `“${b.example.input}”` })}{" "}
                  <Suspense fallback={null}>
                    <MistakeHint example={b.example} pw={t.pracWords} />
                  </Suspense>
                </>
              ) : (
                <>
                  {w.becauseIdea} <strong>{ideaName(b.idea)}</strong>
                </>
              )}
            </p>
            <ul>
              {g.rows.map((r) => {
                const who = studentName(r.student, numbers.get(r.student), showCodes ? r.code : undefined);
                return (
                  <li key={`${r.student} ${r.skill}`} className="stuck-row">
                    <strong className="mono">{who}</strong>
                    <span>{skillName(r.skill)}</span>
                    <span className="muted small">{fill(w.stuckAnswers, { n: r.answers })}</span>
                    <button className="btn small" aria-label={fill(w.seenLabel, { who, skill: skillName(r.skill) })} onClick={() => onSeen(r)}>
                      {w.seen}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
