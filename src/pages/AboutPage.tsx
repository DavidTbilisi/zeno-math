// The front page for schools (#/about): what Zeno is, what a class gets, how a class starts, and where the data lives.
// Its centrepiece is Zeno's own paradox played out: each right answer covers half of the gap that is left.
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ZenoMark } from "../components/ZenoMark";
import { LangSelect, useI18n } from "../i18n";
import { fill } from "../math/text";

/** A skill counts as mastered past this, as BKT's usual threshold has it (model/mastery.ts). */
const MASTERED = 0.95;
/** Ticks at ½, ¾, ⅞, …: where the first right answers land. */
const TICKS = [1, 2, 3, 4, 5, 6].map((k) => 1 - 2 ** -k);
const TICK_LABELS = ["½", "¾", "⅞"];

const ask = () => [2 + Math.floor(Math.random() * 8), 3 + Math.floor(Math.random() * 7)] as const;

/** (2^k − 1)/2^k, the part covered after k right answers, set as a stacked fraction. */
function Covered({ steps }: { steps: number }) {
  if (steps === 0) return <span className="z-frac-zero">0</span>;
  const d = 2 ** steps;
  return (
    <span className="z-frac">
      <span>{d - 1}</span>
      <span>{d}</span>
    </span>
  );
}

function ZenoDemo() {
  const { t } = useI18n();
  const a = t.about;
  const [steps, setSteps] = useState(0);
  const [q, setQ] = useState(ask);
  const [typed, setTyped] = useState("");
  const [said, setSaid] = useState(a.start);
  const input = useRef<HTMLInputElement>(null);
  const restarted = useRef(false);
  const covered = 1 - 2 ** -steps;
  const done = covered >= MASTERED;
  // The answer box is back only once "Start again" has rendered; the cursor goes into it then.
  useEffect(() => {
    if (!done && restarted.current) input.current?.focus();
    restarted.current = false;
  }, [done]);

  const check = (e: FormEvent) => {
    e.preventDefault();
    if (!typed.trim()) return;
    const [x, y] = q;
    if (Number(typed.trim()) === x * y) {
      setSteps((s) => s + 1);
      setSaid(a.right);
    } else setSaid(fill(a.wrong, { q: `${x} × ${y}`, a: x * y }));
    setQ(ask());
    setTyped("");
    input.current?.focus();
  };
  const again = () => {
    setSteps(0);
    setSaid(a.start);
    setQ(ask());
    restarted.current = true;
  };
  const [before, after] = a.covered.split("{f}");

  return (
    <>
      <form className="z-ask" onSubmit={check}>
        <h2 className="z-ask-title">{a.demoTitle}</h2>
        {done ? (
          <p className="z-ask-q">{a.masteredTitle}</p>
        ) : (
          <label className="z-ask-q">
            <span>{q[0]} × {q[1]} =</span>
            <input ref={input} inputMode="numeric" autoComplete="off" aria-label={a.answer} value={typed}
              onChange={(e) => setTyped(e.target.value.replace(/[^\d]/g, "").slice(0, 3))} />
          </label>
        )}
        <p className="z-ask-said" aria-live="polite">{done ? a.mastered : said}</p>
        <div className="z-ask-foot">
          <span className="z-ask-covered">
            {before}<Covered steps={steps} />{after}
          </span>
          {done ? (
            <button type="button" className="z-btn z-btn-ink" onClick={again}>{a.again}</button>
          ) : (
            <button className="z-btn z-btn-ink" disabled={!typed}>{a.check}</button>
          )}
        </div>
      </form>

      <div className="z-line" role="img" aria-label={fill(a.lineLabel, { p: `${2 ** steps - 1}/${2 ** steps}` })}>
        <div className="z-line-track">
          <div className="z-line-fill" style={{ transform: `scaleX(${covered})` }} />
          {TICKS.map((x, i) => (
            <span key={x} className={`z-tick${i < steps ? " passed" : ""}`} style={{ left: `${x * 100}%` }}>
              {TICK_LABELS[i] && <span className="z-tick-label">{TICK_LABELS[i]}</span>}
            </span>
          ))}
          <span className="z-gate" style={{ left: `${MASTERED * 100}%` }}>
            <span className="z-gate-label">{a.line}</span>
          </span>
          <span className="z-runner" style={{ left: `${covered * 100}%` }} />
        </div>
        <span className="z-line-end z-line-zero">0</span>
        <span className="z-line-end z-line-one">1</span>
      </div>
    </>
  );
}

export function AboutPage() {
  const { t } = useI18n();
  const a = t.about;
  return (
    <div className="z">
      <header className="z-bar">
        <a className="z-brand" href="#/"><ZenoMark size={18} /><span>{t.appName}</span></a>
        <nav className="z-nav">
          <a href="#/">{t.myBoards}</a>
          <LangSelect />
        </nav>
      </header>

      <main>
        <section className="z-hero">
          <div className="z-hero-text">
            <h1>{a.title}</h1>
            <p className="z-lede">{a.lede}</p>
            <div className="z-ctas">
              <a className="z-btn z-btn-ink" href="#/practice">{a.tryPractice}</a>
              <a className="z-btn z-btn-line" href="#/teacher">{a.forTeachers}</a>
            </div>
          </div>
          <ZenoDemo />
        </section>

        <section className="z-section">
          <h2>{a.getsTitle}</h2>
          <dl className="z-facts">
            {a.facts.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="z-section">
          <h2>{a.stepsTitle}</h2>
          <ol className="z-steps">
            {a.steps.map((s) => <li key={s}>{s}</li>)}
          </ol>
        </section>

        <section className="z-own">
          <div>
            <h2>{a.ownTitle}</h2>
            <p>{a.own}</p>
            <p>{a.own2} <a href="https://github.com/DavidTbilisi/zeno-math">{a.source}</a></p>
          </div>
        </section>

        <footer className="z-end">
          <p>{a.endTitle}</p>
          <a className="z-btn z-btn-ink" href="#/practice">{a.tryPractice}</a>
        </footer>
      </main>
    </div>
  );
}
