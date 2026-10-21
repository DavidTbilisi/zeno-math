// The practice page's session (free practice): ten questions with how each went, a summary at the end, and the
// missed questions waiting to come back. Class practice has the class's own timed session instead.
import type { PracticeWords, SkillId } from "../math/practice";
import { fill } from "../math/text";

/** Questions in a session of free practice on the page. */
export const SESSION = 10;
/** How a question of the session ended: right first time or not (the first final outcome, as the stats count it). */
export type SessionResult = { skill: SkillId; right: boolean };
/** A missed question queued to come back once `due` questions have been answered. */
export type Due = { skill: SkillId; due: number };

/** Where the student is in the session: a dot for each question, green when right, orange when missed. */
export function SessionCard({ results, streak, w }: { results: readonly SessionResult[]; streak: number; w: PracticeWords }) {
  const right = results.filter((r) => r.right).length;
  return (
    <section className="practice-side-card practice-session" aria-label={w.ui.sessionTitle}>
      <h2>{w.ui.sessionTitle}</h2>
      <div className="session-dots" aria-hidden="true">
        {Array.from({ length: SESSION }, (_, i) => (
          <span key={i} className={i < results.length ? (results[i].right ? "right" : "missed") : i === results.length ? "now" : ""} />
        ))}
      </div>
      <small className="hint">
        {fill(w.ui.sessionCount, { done: results.length, n: SESSION })} · {fill(w.ui.sessionRight, { right, streak })}
      </small>
    </section>
  );
}

/** The end of a session: the score, each topic's share right, and how many misses will come back. */
export function SessionSummary({ results, comingBack, w, onAgain }: { results: readonly SessionResult[]; comingBack: number; w: PracticeWords; onAgain: () => void }) {
  const right = results.filter((r) => r.right).length;
  const topics = [...new Set(results.map((r) => r.skill))].map((skill) => {
    const of = results.filter((r) => r.skill === skill);
    return { skill, right: of.filter((r) => r.right).length, seen: of.length };
  });
  return (
    <section className="practice-summary" aria-label={w.ui.sessionDone}>
      <h2>{w.ui.sessionDone}</h2>
      <p className="practice-summary-score">{fill(w.ui.sessionScore, { right, n: results.length })}</p>
      <div className="session-dots" aria-hidden="true">
        {results.map((r, i) => <span key={i} className={r.right ? "right" : "missed"} />)}
      </div>
      <h3>{w.ui.sessionTopics}</h3>
      <ul>
        {topics.map((t) => <li key={t.skill}>{fill(w.ui.sessionTopic, { skill: w.skills[t.skill], right: t.right, seen: t.seen })}</li>)}
      </ul>
      <p>{comingBack ? fill(w.ui.sessionBack, { n: comingBack }) : w.ui.sessionClean}</p>
      <div className="field-row">
        <button className="btn primary" autoFocus onClick={onAgain}>{fill(w.ui.sessionAgain, { n: SESSION })}</button>
      </div>
    </section>
  );
}

/** The missed questions waiting to come back, soonest first. */
export function ComingBack({ mistakes, answered, w }: { mistakes: readonly Due[]; answered: number; w: PracticeWords }) {
  if (!mistakes.length) return null;
  return (
    <section className="practice-side-card" aria-label={w.ui.comingBack}>
      <h2>{w.ui.comingBack}</h2>
      <ul>
        {[...mistakes].sort((a, b) => a.due - b.due).slice(0, 6).map((m, i) => (
          <li key={i}>
            {w.skills[m.skill]} <span className="hint">· {m.due <= answered ? w.ui.backNext : fill(w.ui.backIn, { n: m.due - answered })}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
