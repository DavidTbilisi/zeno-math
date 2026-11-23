// Wrong predictions on topic pages (issue #578, server/predictions.ts): which student guessed what on a piece's
// "predict, then reveal", and what really happened. Kept for the teacher only: no part of mastery. Shown once anyone has
// made a prediction.
import type { Dashboard } from "../../server/dashboard";
import { studentName } from "../api";
import type { Dict } from "../locales/en";
import { fill } from "../math/text";

export function PredictionList({ predictions, numbers, t, showCodes }: {
  predictions: Dashboard["predictions"];
  numbers: ReadonlyMap<string, number | null>;
  t: Dict;
  showCodes: boolean;
}) {
  const w = t.teacher;
  if (!predictions.made) return null;
  const say = (k: (typeof predictions.wrong)[number]) => t.site.predict.pieces[k.kind];
  return (
    <section className="card stuck-list pace-list" aria-labelledby="predictions-title">
      <h3 id="predictions-title">{w.predictions}</h3>
      <p className="hint">{fill(w.predictionsHint, { made: predictions.made, wrong: predictions.wrong.length })}</p>
      <ul>
        {predictions.wrong.map((r) => (
          <li key={`${r.student} ${r.kind}`} className="stuck-row">
            <strong className="mono">{studentName(r.student, numbers.get(r.student), showCodes ? r.code : undefined)}</strong>
            <span>{fill(w.predictionRow, { ask: say(r).ask, pick: say(r).options[r.pick], outcome: say(r).options[r.outcome] })}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
