// A change of pace on the teacher page (issue #63, src/model/pace.ts): students whose last five timed answers came at least
// twice as fast, or as slow, as their own pace before. Shown only when somebody has one; the faster ones come first.
import type { Dashboard } from "../../server/dashboard";
import { studentName, type Who } from "../api";
import type { Dict } from "../locales/en";
import { fill } from "../math/text";

export function PaceList({ pace, numbers, t, showCodes }: {
  pace: Dashboard["pace"];
  numbers: ReadonlyMap<string, Who>;
  t: Dict;
  showCodes: boolean;
}) {
  const w = t.teacher;
  if (!pace.length) return null;
  return (
    <section className="card stuck-list pace-list" aria-labelledby="pace-title">
      <h3 id="pace-title">{w.pace}</h3>
      <p className="hint">{w.paceHint}</p>
      <ul>
        {pace.map((r) => (
          <li key={r.student} className="stuck-row">
            <strong className="mono">{studentName(r.student, numbers.get(r.student), showCodes ? r.code : undefined)}</strong>
            <span className={r.direction === "faster" ? "pace-faster" : "muted"}>
              {fill(r.direction === "faster" ? w.paceFaster : w.paceSlower, { factor: r.factor })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
