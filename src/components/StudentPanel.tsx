// The practice study, for the student: join a class with its code; from then on every question you work on is saved
// under your record. Joining shows what taking part means first (what is saved, the two groups, how to stop and delete
// it all), and waits for the student to agree. Signed in, it lists the skills they have kept (right on a review days
// later), those mastered whose review is still to come, and those they are practising again after a wrong review
// (issue #264, holdOf in spacing.ts).
//
// Joining takes an account (#606): the record is then the account's, the teacher sees its name, and signing in on any
// device brings the record back. Someone not signed in gets the sign-in form here, then the class code. A student from
// before accounts still comes back with their student code; signed in, typing that code adds the record to the account.
// A join link (#/join/<code>) opens the panel with the class code already typed in.
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { account, accountState, useAccount } from "../account";
import { ApiError, study } from "../api";
import type { Student } from "../learner";
import type { PracticeWords } from "../math/practice";
import { fill } from "../math/text";
import type { Hold } from "../model/spacing";
import { AccountForm } from "./AccountForm";

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
  const { account: me } = useAccount();
  const [classCode, setClassCode] = useState(invite ?? "");
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
      // 409: the code typed belongs to another account.
      setError(e instanceof ApiError && e.status === 409 ? ui.codeTaken : e instanceof ApiError && e.status === 404 ? notFound : ui.offline);
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
    // Signed in to an account, signing out is signing out of it: the record leaves this browser with the account.
    const signOut = () => (me ? run(async () => (await account.signOut(), onChange(null)), ui.noStudent) : onChange(null));
    return (
      <div className="practice-class">
        <div className="field-row">
          <strong className="mono">{fill(ui.joinedAs, { code: student.code })}</strong>
          <button className="btn small" disabled={busy} onClick={() => void signOut()}>{ui.signOut}</button>
          <button className={`btn small${sure ? " danger" : ""}`} disabled={busy} onClick={forget} onBlur={() => setSure(false)}>
            {sure ? ui.forgetSure : ui.forget}
          </button>
        </div>
        {me ? (
          <small className="hint">{fill(ui.withAccount, { name: me.name })}</small>
        ) : (
          <small className="hint">{ui.keepCode} <a href="#/account">{ui.makeAccount}</a></small>
        )}
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

  const join = () => agreed && run(async () => onChange(await study.join(classCode)), ui.noClass);
  // A student code from before accounts: signed in, it joins the account; otherwise it signs the browser in as before.
  const signIn = () =>
    run(async () => {
      if (me) return onChange(await account.addCode(ownCode));
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
        <p className="hint">{ui.joinWhat}</p>
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
        {me ? (
          <div className="field-row">
            <input className="mono" aria-label={ui.classCode} placeholder={ui.classCode} autoComplete="off" spellCheck={false}
              value={classCode} onChange={(e) => setClassCode(e.target.value)} onKeyDown={onEnter(() => void join())} />
            <button className="btn small" disabled={busy || !classCode.trim() || !agreed} onClick={() => void join()}>{ui.join}</button>
          </div>
        ) : (
          <div className="practice-account">
            <p className="hint">{ui.needAccount}</p>
            {/* An account that is already in a class brings its record: the student is signed in to it at once. */}
            <AccountForm onDone={() => {
              const mine = accountState().student;
              if (mine) onChange(mine);
            }} />
          </div>
        )}
        <div className="field-row">
          <input className="mono" aria-label={ui.haveCode} placeholder={ui.haveCode} autoComplete="off" spellCheck={false}
            value={ownCode} onChange={(e) => setOwnCode(e.target.value)} onKeyDown={onEnter(() => void signIn())} />
          <button className="btn small" disabled={busy || !ownCode.trim()} onClick={() => void signIn()}>{ui.signIn}</button>
        </div>
        {unsaved}
        {error && <span className="error">{error}</span>}
      </div>
    </details>
  );
}
