// The practice study, for the student: join a class with its code (or come back with your own student code); from then
// on every question you work on is saved under that code. Joining shows what taking part means first (what is saved,
// the two groups, how to stop and delete it all), and waits for the student to agree. Signed in, it lists the skills
// they have kept (right on a review days later), those mastered whose review is still to come, and those they are
// practising again after a wrong review (issue #264, holdOf in spacing.ts). The student also gives their number in the
// class list, which only the teacher sees: a student who lost their code gets it back from the teacher by it, and one
// who gives a number already in the class is asked whether they joined before rather than given a second record.
// A join link (#/join/<code>) opens it with the class code already typed in.
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ApiError, study } from "../api";
import type { Student } from "../learner";
import type { PracticeWords } from "../math/practice";
import { fill } from "../math/text";
import type { Hold } from "../model/spacing";

/** The highest number in a class list (MAX_LIST_NO on the server). */
const MAX_LIST_NO = 99;

export function StudentPanel({ student, pending, ui, skills, invite, onChange }: {
  student: Student | null;
  pending: number;
  ui: PracticeWords["ui"];
  /** The names of the class's skills by how they hold, once the plan is here. */
  skills?: Record<Hold, string[]>;
  /** The class code from a join link: the panel opens with it typed in. */
  invite?: string;
  /** forgot: the student's records were deleted on the server. */
  onChange: (s: Student | null, forgot?: boolean) => void;
}) {
  const [classCode, setClassCode] = useState(invite ?? "");
  const [listNo, setListNo] = useState("");
  /** The number someone in the class already gave, when joining with it was refused. */
  const [taken, setTaken] = useState<number | null>(null);
  const box = useRef<HTMLDetailsElement>(null);
  // From a join link the panel is what the student came for: open, and in view.
  useEffect(() => {
    if (!invite || !box.current) return;
    box.current.open = true;
    box.current.scrollIntoView({ block: "center" });
  }, [invite]);
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
      if (e instanceof ApiError && e.status === 409) setTaken(Number(listNo));
      else setError(e instanceof ApiError && e.status === 404 ? notFound : ui.offline);
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
        {skills && (skills.kept.length || skills.mastered.length || skills.again.length) ? (
          <div className="practice-holds" aria-label={ui.yourSkills}>
            <strong>{ui.yourSkills}</strong>
            {skills.kept.length > 0 && <span className="hold-kept">★ {fill(ui.keptList, { list: skills.kept.join(", ") })}</span>}
            {skills.mastered.length > 0 && <span className="hold-mastered">✓ {fill(ui.masteredList, { list: skills.mastered.join(", ") })}</span>}
            {skills.again.length > 0 && <span className="hold-again">↺ {fill(ui.againList, { list: skills.again.join(", ") })}</span>}
          </div>
        ) : null}
        {unsaved}
        {error && <span className="error">{error}</span>}
      </div>
    );
  }

  const number = /^\d+$/.test(listNo.trim()) && Number(listNo) >= 1 && Number(listNo) <= MAX_LIST_NO ? Number(listNo) : null;
  const join = (again = false) => agreed && number !== null && run(async () => onChange(await study.join(classCode, number, again)), ui.noClass);
  const signIn = () =>
    run(async () => {
      const s = await study.student(ownCode);
      onChange({ code: s.code, class: s.class, condition: s.condition, feature: s.feature, arm: s.arm });
    }, ui.noStudent);
  const onEnter = (go: () => void) => (e: KeyboardEvent) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    go();
  };
  return (
    <details className="practice-join" ref={box}>
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
            value={classCode} onChange={(e) => setClassCode(e.target.value)} onKeyDown={onEnter(() => join())} />
        </div>
        <div className="field-row">
          <input type="number" inputMode="numeric" min={1} max={MAX_LIST_NO} aria-label={ui.listNo} placeholder={ui.listNo}
            value={listNo} onChange={(e) => (setListNo(e.target.value), setTaken(null))} onKeyDown={onEnter(() => join())} />
          <button className="btn small" disabled={busy || !classCode.trim() || !agreed || number === null} onClick={() => join()}>{ui.join}</button>
        </div>
        {taken !== null && (
          <div className="practice-taken" role="alert">
            <span>{fill(ui.numberTaken, { n: taken })}</span>
            <button className="btn small" disabled={busy} onClick={() => join(true)}>{ui.joinAnyway}</button>
          </div>
        )}
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
