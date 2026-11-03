// The practice page's session (free practice): five or ten questions, as the student chooses, shown as a ring that
// fills beside the question; a summary when the ring is full, and the next session only when the student asks for it;
// the missed questions waiting to come back; and, after about 25 minutes of answering, a word that it is a good moment
// for a break. Class practice has the class's own timed session instead.
import type { PracticeWords, SkillId } from "../math/practice";
import { fill } from "../math/text";
import { LENGTHS, type Length } from "../math/sessionPace";
import { Segmented } from "./ui";

/** How a question of the session ended: right first time or not (the first final outcome, as the stats count it). */
export type SessionResult = { skill: SkillId; right: boolean };
/** A missed question queued to come back once `due` questions have been answered. */
export type Due = { skill: SkillId; due: number };

/** The ring's segments: one per question, right, missed, the one being asked, or still to come. */
function Ring({ results, n, size = 52 }: { results: readonly SessionResult[]; n: number; size?: number }) {
  const gap = n > 1 ? 0.14 : 0;
  return (
    <svg className="session-ring" width={size} height={size} viewBox="0 0 52 52" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <circle
          key={i}
          className={i < results.length ? (results[i].right ? "right" : "missed") : i === results.length ? "now" : ""}
          cx="26"
          cy="26"
          r="21"
          pathLength={n}
          strokeDasharray={`${1 - gap} ${n - 1 + gap}`}
          transform={`rotate(${-90 + (i * 360) / n + (gap * 180) / n} 26 26)`}
        />
      ))}
      <text x="26" y="26" dominantBaseline="central" textAnchor="middle">
        {Math.min(results.length, n)}/{n}
      </text>
    </svg>
  );
}

/** Where the student is in the session, beside the question: the ring, the count and, before the first answer, the length. */
export function SessionRing({ results, n, streak, w, onLength }: {
  results: readonly SessionResult[];
  n: Length;
  streak: number;
  w: PracticeWords;
  onLength: (n: Length) => void;
}) {
  const right = results.filter((r) => r.right).length;
  return (
    <section className="practice-ring" aria-label={w.ui.sessionTitle}>
      <Ring results={results} n={n} />
      <div className="practice-ring-text">
        <span>{fill(w.ui.sessionCount, { done: results.length, n })}</span>
        <small className="hint">{fill(w.ui.sessionRight, { right, streak })}</small>
      </div>
      {results.length === 0 && (
        <Segmented items={LENGTHS} value={n} onChange={onLength} ariaLabel={w.ui.sessionLength} label={(k) => fill(w.ui.sessionOf, { n: k })} />
      )}
    </section>
  );
}

/** The end of a session: the full ring, the score, each topic's share right, and how many misses will come back. The next
 *  session waits for a tap, in either length. */
export function SessionSummary({ results, comingBack, n, w, onAgain }: {
  results: readonly SessionResult[];
  comingBack: number;
  n: Length;
  w: PracticeWords;
  onAgain: (n: Length) => void;
}) {
  const right = results.filter((r) => r.right).length;
  const topics = [...new Set(results.map((r) => r.skill))].map((skill) => {
    const of = results.filter((r) => r.skill === skill);
    return { skill, right: of.filter((r) => r.right).length, seen: of.length };
  });
  return (
    <section className="practice-summary" aria-label={w.ui.sessionDone}>
      <h2>{w.ui.sessionDone}</h2>
      <div className="practice-summary-head">
        <Ring results={results} n={results.length} size={72} />
        <p className="practice-summary-score">{fill(w.ui.sessionScore, { right, n: results.length })}</p>
      </div>
      <h3>{w.ui.sessionTopics}</h3>
      <ul>
        {topics.map((t) => <li key={t.skill}>{fill(w.ui.sessionTopic, { skill: w.skills[t.skill], right: t.right, seen: t.seen })}</li>)}
      </ul>
      <p>{comingBack ? fill(w.ui.sessionBack, { n: comingBack }) : w.ui.sessionClean}</p>
      <div className="field-row">
        {LENGTHS.map((k) => (
          <button key={k} className={`btn${k === n ? " primary" : ""}`} autoFocus={k === n} onClick={() => onAgain(k)}>
            {fill(w.ui.sessionAgain, { n: k })}
          </button>
        ))}
      </div>
    </section>
  );
}

/** The break prompt: said once a stretch has run about 25 minutes; the student can wave it away and carry on. */
export function BreakPrompt({ w, onDismiss }: { w: PracticeWords; onDismiss: () => void }) {
  return (
    <div className="practice-break" role="status">
      <span>☕ {w.ui.breakTime}</span>
      <button className="btn small" onClick={onDismiss}>{w.ui.breakOn}</button>
    </div>
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
