// The teacher's homework (issue #297): homework made for every student from their own records, how far each got and
// how they did, and the sheets to print for students without a device. Homework opens only once the class has taken
// its delayed post-test (server/homework.ts); until then the card says why and the button is off.
import { lazy, Suspense, useState } from "react";
import { ApiError, studentName, type ClassSummary, type Dashboard, type teacherApi } from "../api";
import type { Dict } from "../locales/en";
import type { SkillId } from "../math/practiceSkills";
import { fill } from "../math/text";
import { HOMEWORK_LENGTH, MAX_HOMEWORK, MIN_HOMEWORK } from "../model/homework";

const PrintableHomework = lazy(() => import("./PrintableHomework").then((m) => ({ default: m.PrintableHomework })));

type Row = Dashboard["homework"]["rows"][number];

export function HomeworkCard({ klass, data, api, t, lang, showCodes, onMade }: {
  klass: ClassSummary;
  data: Dashboard;
  api: ReturnType<typeof teacherApi>;
  t: Dict;
  lang: string;
  showCodes: boolean;
  onMade: () => void;
}) {
  const w = t.teacher;
  const [length, setLength] = useState(HOMEWORK_LENGTH);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const { open, rows } = data.homework;
  const students = new Map(data.students.map((s) => [s.id, s]));
  const nameOf = (id: string) => studentName(id, students.get(id)?.number, showCodes ? students.get(id)?.code : undefined);
  const skillName = (k: SkillId) => t.pracWords.skills[k];
  const ideaName = (idea: string) => (t.pracWords.ideas as Record<string, string>)[idea] ?? idea;
  const made = rows.length ? Math.max(...rows.map((r) => r.createdAt)) : null;

  const make = async () => {
    setBusy(true);
    setFailed(null);
    try {
      await api.homework(klass.code, length);
      onMade();
    } catch (e) {
      setFailed(e instanceof ApiError && e.status === 409 ? w.homeworkLocked : w.homeworkFailed);
    } finally {
      setBusy(false);
    }
  };
  const mark = (it: Row["items"][number]) => (it.outcome === null ? "○" : it.firstCorrect ? "✓" : "✗");
  const title = (it: Row["items"][number]) =>
    [skillName(it.skill), t.pracWords.levels[String(it.level) as "1" | "2" | "3"], w.homeworkWhy[it.why], it.idea && ideaName(it.idea)].filter(Boolean).join(" · ");

  return (
    <section className="card homework-card" aria-labelledby="homework-title">
      <h3 id="homework-title">{w.homework}</h3>
      {!open ? (
        <p className="hint">{w.homeworkLocked}</p>
      ) : (
        <>
          <p className="hint">{w.homeworkHint}</p>
          <div className="field-row wrap">
            <label className="field-row">
              <span>{w.homeworkLength}</span>
              <input type="number" min={MIN_HOMEWORK} max={MAX_HOMEWORK} value={length} style={{ width: 70 }}
                onChange={(e) => setLength(Math.min(MAX_HOMEWORK, Math.max(MIN_HOMEWORK, Math.round(Number(e.target.value) || HOMEWORK_LENGTH))))} />
            </label>
            <button className="btn primary small" disabled={busy || !data.students.length} onClick={() => void make()}>
              {rows.length ? w.homeworkRemake : w.homeworkMake}
            </button>
            {!!rows.length && <button className="btn small" onClick={() => setPrinting(true)}>{w.homeworkPrint}</button>}
          </div>
        </>
      )}
      {failed && <p className="error">{failed}</p>}
      {!!rows.length && (
        <>
          {made !== null && <p className="hint">{fill(w.homeworkMade, { date: new Date(made).toLocaleString(lang, { dateStyle: "medium", timeStyle: "short" }) })}</p>}
          <table className="data-table homework-table">
            <thead>
              <tr>
                <th scope="col">{w.paperStudent}</th>
                <th scope="col">{w.homeworkDone}</th>
                <th scope="col">{w.homeworkRight}</th>
                <th scope="col">{w.homeworkQuestions}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const done = r.items.filter((it) => it.outcome !== null).length;
                const right = r.items.filter((it) => it.firstCorrect).length;
                return (
                  <tr key={r.student}>
                    <th scope="row">{nameOf(r.student)}</th>
                    <td>{done}/{r.items.length}</td>
                    <td>{done ? `${right}/${done}` : "—"}</td>
                    <td className="homework-items">
                      {r.items.map((it, i) => (
                        <span key={i} className={`hw-mark ${it.outcome === null ? "todo" : it.firstCorrect ? "right" : "wrong"}`} title={title(it)}>
                          {it.why === "review" ? "↻" : it.why === "stretch" ? "↑" : ""}{mark(it)}
                        </span>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="hint">{w.homeworkLegend}</p>
        </>
      )}
      {printing && (
        <Suspense fallback={null}>
          <PrintableHomework klass={klass} rows={rows} nameOf={(id) => studentName(id, students.get(id)?.number)} w={w} pw={t.pracWords} onClose={() => setPrinting(false)} />
        </Suspense>
      )}
    </section>
  );
}
