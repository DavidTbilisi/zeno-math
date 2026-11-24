// The front page for schools and universities, in the app (pages/AboutPage.tsx) and published on its own (landing.tsx):
// what Zeno is, a wrong answer named as the practice names it, the whole path from first steps to a degree, what a
// class gets, how a class starts, and where the data lives. Its centrepiece is Zeno's own paradox played out: each
// right answer covers half of the gap that is left. The bar and the calls to action come from the page using it.
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { COUNTS, PATH_TOPICS } from "../locales/about/counts";
import type { About } from "../locales/about/en";
import { across, DEMO_SUMS, judge, plain, type DemoVerdict, type Frac } from "../math/fracDemo";
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

function ZenoDemo({ a }: { a: About }) {
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

function Stacked({ f }: { f: Frac }) {
  return (
    <span className="z-frac z-frac-big" role="img" aria-label={plain(f)}>
      <span>{f.n}</span>
      <span>{f.d}</span>
    </span>
  );
}

/** A sum of fractions answered as many students answer it, tops added and bottoms added: the page says so, as the
 *  practice does. The box starts with that answer in it, so one press shows the mistake named. */
function MistakeDemo({ a }: { a: About }) {
  const [at, setAt] = useState(0);
  const [x, y] = DEMO_SUMS[at % DEMO_SUMS.length];
  const tempting = plain(across(x, y));
  const [typed, setTyped] = useState(tempting);
  const [verdict, setVerdict] = useState<DemoVerdict | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const q = `${plain(x)} + ${plain(y)}`;

  const check = (e: FormEvent) => {
    e.preventDefault();
    if (verdict?.kind === "right") {
      const [nx, ny] = DEMO_SUMS[(at + 1) % DEMO_SUMS.length];
      setAt(at + 1);
      setTyped(plain(across(nx, ny)));
      setVerdict(null);
      return;
    }
    setVerdict(judge(x, y, typed));
    input.current?.focus();
  };
  const said =
    verdict === null ? fill(a.mistakeHint, { r: tempting })
    : verdict.kind === "right" ? fill(a.mistakeRight, { q, a: verdict.sum })
    : verdict.kind === "across" ? fill(a.mistakeAcross, { r: verdict.r, big: verdict.big })
    : verdict.kind === "wrong" ? fill(a.mistakeWrong, { steps: verdict.steps })
    : a.mistakeUnread;

  return (
    <form className="z-try" onSubmit={check}>
      <h3 className="z-ask-title">{a.mistakeCard}</h3>
      <label className="z-ask-q">
        <span className="z-try-sum"><Stacked f={x} /> + <Stacked f={y} /> =</span>
        <input ref={input} inputMode="text" autoComplete="off" aria-label={a.mistakeAnswer} value={typed} readOnly={verdict?.kind === "right"}
          onChange={(e) => setTyped(e.target.value.replace(/[^\d/ ]/g, "").slice(0, 7))} />
      </label>
      <p className={`z-ask-said z-try-said${verdict ? ` ${verdict.kind}` : ""}`} aria-live="polite">{said}</p>
      <div className="z-ask-foot">
        <span />
        <button className="z-btn z-btn-ink" disabled={!typed.trim()}>{verdict?.kind === "right" ? a.mistakeNext : a.check}</button>
      </div>
    </form>
  );
}

type LandingProps = {
  a: About;
  bar: ReactNode;
  /** The hero's buttons, and the one at the foot of the page. */
  ctas: ReactNode;
  endCta: ReactNode;
  /** Where a topic of the path leads: its page in the app, or the one published beside the front page. */
  topicHref: (id: string) => string;
};

export function Landing({ a, bar, ctas, endCta, topicHref }: LandingProps) {
  return (
    <div className="z">
      {bar}
      <main className="z-main">
        <section className="z-hero">
          <div className="z-hero-text">
            <h1>{a.title}</h1>
            <p className="z-lede">{a.lede}</p>
            <div className="z-ctas">{ctas}</div>
          </div>
          <ZenoDemo a={a} />
        </section>

        <section className="z-section z-mistake">
          <div>
            <h2>{a.mistakeTitle}</h2>
            <p>{fill(a.mistakeLede, COUNTS)}</p>
            <p>{a.mistakeTeacher}</p>
          </div>
          <MistakeDemo a={a} />
        </section>

        <section className="z-section">
          <h2>{a.pathTitle}</h2>
          <p className="z-section-lede">{fill(a.pathLede, COUNTS)}</p>
          <ol className="z-path">
            {a.path.map(([stage, topics], i) => (
              <li key={stage}>
                <strong>{stage}</strong>
                <ul>
                  {topics.map((x, j) => <li key={x}><a href={topicHref(PATH_TOPICS[i][j])}>{x}</a></li>)}
                </ul>
              </li>
            ))}
          </ol>
        </section>

        <section className="z-section">
          <h2>{a.getsTitle}</h2>
          <dl className="z-facts">
            {a.facts.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{fill(v, COUNTS)}</dd>
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
          {endCta}
        </footer>
      </main>
    </div>
  );
}
