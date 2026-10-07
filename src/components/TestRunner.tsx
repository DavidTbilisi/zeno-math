// A pre- or post-test, one question at a time: the answer is saved without a mark or a solution, and the next question
// follows. Only a form message ("lowest terms", "check your rounding") asks for another try, as in practice, so the
// test measures the maths rather than the notation. Passing a question counts as an answer. Answers go through an
// outbox, like practice, so a dropped connection loses nothing.
import { useMemo, useRef, useState } from "react";
import { newId, type ClassPlan, type Outbox, type Student, type TestAnswer } from "../learner";
import { fill } from "../math/chart";
import { latexToSvg } from "../math/latex";
import { areaOf, check, exercise, preview, renderPractice, type PracticeWords } from "../math/practice";
import { testItems, type TestPhase } from "../model/testForms";
import { svgToDataUrl } from "../math/svg";

export function TestRunner({ plan, phase, student, w, outbox, onAnswered }: {
  plan: ClassPlan;
  phase: TestPhase;
  student: Student;
  w: PracticeWords;
  outbox: Outbox<TestAnswer>;
  /** A question has its answer: the dialog marks it answered and sends what is queued. */
  onAnswered: (item: number) => void;
}) {
  const test = plan.tests[phase];
  const items = useMemo(
    () => testItems(plan.class, plan.skills, test.form, plan.testLength),
    [plan.class, plan.skills, test.form, plan.testLength],
  );
  const index = items.findIndex((_, i) => !test.answered.includes(i));
  const [input, setInput] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const retries = useRef(0);
  const shownAt = useRef(performance.now());
  const inputRef = useRef<HTMLInputElement>(null);

  const item = index >= 0 ? items[index] : null;
  const ex = useMemo(() => item && exercise(item.skill, item.level, item.seed, w), [item?.skill, item?.level, item?.seed, w]);
  const card = useMemo(() => {
    if (!item) return null;
    try {
      return svgToDataUrl(renderPractice({ area: areaOf(item.skill), skill: item.skill, level: item.level, seed: item.seed, count: 1, answers: false }, w).svg);
    } catch {
      return null;
    }
  }, [item?.skill, item?.level, item?.seed, w]);
  const typed = useMemo(() => {
    const p = ex && preview(ex, input);
    if (!p) return null;
    try {
      return svgToDataUrl(latexToSvg(p).svg);
    } catch {
      return null;
    }
  }, [ex, input]);

  if (!item || !ex) return <div className="practice-verdict ok" role="status">✓ {w.ui.testDone}</div>;

  const record = (verdict: TestAnswer["verdict"]) => {
    outbox.add({
      clientId: newId(),
      student: student.code,
      phase,
      item: index,
      input: verdict === "skipped" ? "" : input.trim().slice(0, 200),
      verdict,
      retries: retries.current,
      ms: Math.round(performance.now() - shownAt.current),
    });
    setInput("");
    setMessage(null);
    retries.current = 0;
    shownAt.current = performance.now();
    onAnswered(index);
    inputRef.current?.focus();
  };
  const submit = () => {
    if (!input.trim()) return;
    const v = check(ex, input, w);
    if (!v.ok && v.why) {
      retries.current++;
      setMessage(v.why);
      return;
    }
    record(v.ok ? "correct" : v.close ? "close" : "wrong");
  };

  return (
    <>
      <div className="field-row">
        <strong>{phase === "pre" ? w.ui.preTest : w.ui.postTest}</strong>
        <span className="hint">{fill(w.ui.testProgress, { i: index + 1, n: items.length })}</span>
      </div>
      <small className="hint">{w.ui.testIntro}</small>
      <div className="preview">{card && <img src={card} alt="" style={{ maxWidth: "100%" }} />}</div>
      <label className="field">
        <span>{w.ui.answerHere} <span className="hint">({w.formats[ex.format]})</span></span>
        <div className="field-row">
          <input
            ref={inputRef}
            className="mono practice-input"
            spellCheck={false}
            autoComplete="off"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setMessage(null);
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              submit();
            }}
          />
          {typed && <img className="practice-typed" src={typed} alt="" />}
        </div>
      </label>
      <div className="field-row">
        <button className="btn primary" disabled={!input.trim()} onClick={submit}>{w.ui.submit}</button>
        <button className="btn" onClick={() => record("skipped")}>{w.ui.pass}</button>
      </div>
      {message && <div className="practice-verdict close" role="status">{message}</div>}
    </>
  );
}
