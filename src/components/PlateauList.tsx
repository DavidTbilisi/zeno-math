// A plateau on the teacher page (issue #580, src/model/plateau.ts): students who have kept a skill and stopped getting
// faster on its top level. Offered as a suggestion: on ASSISTments a flagged plateau could not be shown to stay flat.
import type { Dashboard } from "../../server/dashboard";
import { studentName, type Who } from "../api";
import type { Dict } from "../locales/en";
import type { SkillId } from "../math/practiceSkills";
import { fill } from "../math/text";

export function PlateauList({ plateau, numbers, t, skillName, showCodes }: {
  plateau: Dashboard["plateau"];
  numbers: ReadonlyMap<string, Who>;
  t: Dict;
  skillName: (k: SkillId) => string;
  showCodes: boolean;
}) {
  const w = t.teacher;
  if (!plateau.length) return null;
  return (
    <section className="card stuck-list pace-list" aria-labelledby="plateau-title">
      <h3 id="plateau-title">{w.plateau}</h3>
      <p className="hint">{w.plateauHint}</p>
      <ul>
        {plateau.map((r) => (
          <li key={`${r.student} ${r.skill}`} className="stuck-row">
            <strong className="mono">{studentName(r.student, numbers.get(r.student), showCodes ? r.code : undefined)}</strong>
            <span>{fill(w.plateauRow, { skill: skillName(r.skill), best: r.best })}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
