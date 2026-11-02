// Typing in a test written on paper (the printout, when the network or the devices failed): the teacher picks the
// student, the test and the form on their sheet, and types each answer beside the same question as the printout shows
// it, blank for one left blank. The server marks them as it marks answers typed online (POST /api/classes/:code/paper),
// keeps any the student already answered online, and swaps the student's form order when they wrote the other of A and
// B before taking any test, so their next test is the form they haven't seen. Loaded only when its section is opened:
// the questions are drawn with MathJax.
import { useEffect, useMemo, useState } from "react";
import { ApiError, studentName, study, type Dashboard, type PaperResult, type teacherApi } from "../api";
import type { Dict } from "../locales/en";
import { fill } from "../math/text";
import { areaOf, exercise, renderPractice, type PracticeWords } from "../math/practice";
import { svgToDataUrl } from "../math/svg";
import type { SkillId } from "../math/practiceSkills";
import { testItems, TEST_PHASES, type Form, type TestPhase } from "../model/testForms";
import { SpokenMath } from "./SpokenMath";

const MARK: Record<string, string> = { correct: "✓", close: "≈", wrong: "✗", skipped: "–" };

export function PaperTest({ klass, students, api, w, pw, onSaved }: {
  klass: { code: string; skills: readonly SkillId[]; testLength: number };
  students: Dashboard["students"];
  api: ReturnType<typeof teacherApi>;
  w: Dict["teacher"];
  pw: PracticeWords;
  onSaved: () => void;
}) {
  const sorted = useMemo(() => [...students].sort((a, b) => (a.number ?? Infinity) - (b.number ?? Infinity)), [students]);
  const [student, setStudent] = useState("");
  const [phase, setPhase] = useState<TestPhase>("pre");
  const [form, setForm] = useState<Form | null>(null);
  /** The form the student's order says; another is refused unless their order can still be swapped to fit it. */
  const [planned, setPlanned] = useState<Form | null>(null);
  /** The questions this student answered online on this test, by number. */
  const [online, setOnline] = useState<number[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<PaperResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // A new student or test: their form and what they answered online, from the plan their browser would get.
  useEffect(() => {
    setResult(null);
    setError("");
    setAnswers(Array(klass.testLength).fill(""));
    if (!student) return setForm(null), setPlanned(null);
    let live = true;
    study.plan(student).then(
      (p) => live && (setForm(p.tests[phase].form), setPlanned(p.tests[phase].form), setOnline(p.tests[phase].answered)),
      () => live && setError(w.paperOffline),
    );
    return () => void (live = false);
  }, [student, phase, klass.testLength, w.paperOffline]);

  const items = useMemo(
    // Each question drawn as the printout draws it, so the teacher matches the sheet by eye.
    () => (form ? testItems(klass.code, klass.skills, form, klass.testLength).map((it) => ({
      ex: exercise(it.skill, it.level, it.seed, pw),
      card: svgToDataUrl(renderPractice({ area: areaOf(it.skill), skill: it.skill, level: it.level, seed: it.seed, count: 1, answers: false }, pw).svg),
    })) : []),
    [klass, form, pw],
  );

  const save = async () => {
    if (!form) return;
    setBusy(true);
    setError("");
    try {
      const r = await api.paper(klass.code, student, phase, form, answers);
      setResult(r);
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError && e.status === 409 ? fill(w.paperWrongForm, { form: planned ?? "?" }) : w.paperOffline);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="paper-test">
      <div className="field-row wrap">
        <label className="field-row">
          <span>{w.paperStudent}</span>
          <select value={student} onChange={(e) => setStudent(e.target.value)}>
            <option value="">{w.paperPick}</option>
            {sorted.map((s) => <option key={s.id} value={s.code}>{studentName(s.id, s.number, s.code)}</option>)}
          </select>
        </label>
        <label className="field-row">
          <span>{w.paperWhich}</span>
          <select value={phase} onChange={(e) => setPhase(e.target.value as TestPhase)}>
            {TEST_PHASES.map((p) => <option key={p} value={p}>{w[p]}</option>)}
          </select>
        </label>
        {form && (
          <label className="field-row">
            <span>{w.paperForm}</span>
            <select value={form} disabled={!!result} onChange={(e) => (setForm(e.target.value as Form), setError(""))}>
              {(phase === "delayed" ? ["C"] : ["A", "B"]).map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
        )}
      </div>
      {form && (
        <>
          <ol className="paper-items">
            {items.map(({ ex, card }, i) => {
              const done = online.includes(i);
              const mark = result?.verdicts[i];
              return (
                <li key={`${form}-${i}`}>
                  <img className="paper-card-img" src={card} alt="" />
                  <SpokenMath text={ex.prompt} tex={ex.q} />
                  <div className="field-row">
                    <input className="mono" aria-label={fill(w.paperAnswer, { n: i + 1 })} disabled={done || !!result || busy}
                      placeholder={done ? w.paperOnline : ""} value={done ? "" : answers[i]}
                      onChange={(e) => setAnswers((a) => a.map((x, j) => (j === i ? e.target.value : x)))} />
                    {mark && <span className={`paper-mark ${mark}`}>{MARK[mark]}</span>}
                  </div>
                </li>
              );
            })}
          </ol>
          {result ? (
            <p className="hint" role="status">
              {fill(w.paperSaved, { n: result.stored, right: result.verdicts.filter((v) => v === "correct").length })}
              {result.kept > 0 && ` ${fill(w.paperKept, { n: result.kept })}`}
              {result.reordered && ` ${fill(w.paperReordered, { form: result.form })}`}
            </p>
          ) : (
            <button className="btn primary" disabled={busy} onClick={() => void save()}>{w.paperSave}</button>
          )}
        </>
      )}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
