// The practice study, for the student: join a class with its code (or come back with your own student code); from then
// on every question you work on is saved under that code. Joining shows what taking part means first (what is saved,
// the two groups, how to stop and delete it all), and waits for the student to agree.
import { useState, type KeyboardEvent } from "react";
import { ApiError, study } from "../api";
import type { Student } from "../learner";
import type { PracticeWords } from "../math/practice";
import { fill } from "../math/chart";

export function StudentPanel({ student, pending, ui, onChange }: {
  student: Student | null;
  pending: number;
  ui: PracticeWords["ui"];
  /** forgot: the student's records were deleted on the server. */
  onChange: (s: Student | null, forgot?: boolean) => void;
}) {
  const [classCode, setClassCode] = useState("");
  const [ownCode, setOwnCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sure, setSure] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const run = async (work: () => Promise<void>, notFound: string) => {
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (e) {
      setError(e instanceof ApiError && e.status === 404 ? notFound : ui.offline);
    } finally {
      setBusy(false);
    }
  };
  const unsaved = pending > 0 && <small className="hint">{fill(ui.unsaved, { n: pending })}</small>;

  if (student) {
    const forget = () => {
      if (!sure) return setSure(true);
      run(async () => {
        try {
          await study.forget(student.code);
        } catch (e) {
          if (!(e instanceof ApiError && e.status === 404)) throw e; // already gone
        }
        setSure(false);
        onChange(null, true);
      }, ui.noStudent);
    };
    return (
      <div className="practice-class">
        <div className="field-row">
          <strong className="mono">{fill(ui.joinedAs, { code: student.code })}</strong>
          <button className="btn small" disabled={busy} onClick={() => onChange(null)}>{ui.signOut}</button>
          <button className={`btn small${sure ? " danger" : ""}`} disabled={busy} onClick={forget} onBlur={() => setSure(false)}>
            {sure ? ui.forgetSure : ui.forget}
          </button>
        </div>
        <small className="hint">{ui.keepCode}</small>
        {unsaved}
        {error && <span className="error">{error}</span>}
      </div>
    );
  }

  const join = () => agreed && run(async () => onChange(await study.join(classCode)), ui.noClass);
  const signIn = () =>
    run(async () => {
      const s = await study.student(ownCode);
      onChange({ code: s.code, class: s.class, condition: s.condition });
    }, ui.noStudent);
  const onEnter = (go: () => void) => (e: KeyboardEvent) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    go();
  };
  return (
    <details className="practice-join">
      <summary className="hint">{ui.joinClass}</summary>
      <div className="practice-class">
        <div className="practice-consent" role="group" aria-labelledby="practice-consent-title">
          <strong id="practice-consent-title">{ui.consentTitle}</strong>
          <ul>
            <li>{ui.consentSaved}</li>
            <li>{ui.consentGroups}</li>
            <li>{ui.consentStop}</li>
          </ul>
          <label className="check inline">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            {ui.consentAgree}
          </label>
        </div>
        <div className="field-row">
          <input className="mono" aria-label={ui.classCode} placeholder={ui.classCode} autoComplete="off" spellCheck={false}
            value={classCode} onChange={(e) => setClassCode(e.target.value)} onKeyDown={onEnter(join)} />
          <button className="btn small" disabled={busy || !classCode.trim() || !agreed} onClick={join}>{ui.join}</button>
        </div>
        <div className="field-row">
          <input className="mono" aria-label={ui.haveCode} placeholder={ui.haveCode} autoComplete="off" spellCheck={false}
            value={ownCode} onChange={(e) => setOwnCode(e.target.value)} onKeyDown={onEnter(signIn)} />
          <button className="btn small" disabled={busy || !ownCode.trim()} onClick={signIn}>{ui.signIn}</button>
        </div>
        {unsaved}
        {error && <span className="error">{error}</span>}
      </div>
    </details>
  );
}
