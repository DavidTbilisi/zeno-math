// Predict, then reveal (issue #578, src/model/predict.ts): above a piece on a topic page, the change about to be made
// and three choices for what one quantity will do. The piece is still until a choice is made; then the change plays
// and the choice is marked beside it. The first choice is kept (and sent to the teacher when signed in to a class);
// the reveal can be played again, and after it the piece is free to use.
import { useEffect, useRef, useState } from "react";
import { study } from "../api";
import { useI18n } from "../i18n";
import { loadStudent } from "../learner";
import { CHANGES, keepGuess, PREDICTIONS, readGuesses, type Change, type Guess, type PredictKind, type Prediction } from "../model/predict";

/** How many steps the change plays in, and how long it takes. */
const FRAMES = 24;
const PLAY_MS = 1400;

export function Predict<S>({ kind, show }: { kind: PredictKind; show: (s: S) => void }) {
  const { t } = useI18n();
  const w = t.site.predict;
  const words = w.pieces[kind];
  const p = PREDICTIONS[kind] as unknown as Prediction<S>;
  const [guess, setGuess] = useState<Guess | null>(() => readGuesses()[kind] ?? null);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => {
    if (timer.current !== null) clearInterval(timer.current);
  }, []);

  const play = () => {
    if (timer.current !== null) clearInterval(timer.current);
    const still = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still) return show(p.after);
    let i = 0;
    show(p.before);
    setPlaying(true);
    timer.current = window.setInterval(() => {
      i++;
      show(i >= FRAMES ? p.after : p.frame(i, FRAMES));
      if (i >= FRAMES) {
        clearInterval(timer.current!);
        timer.current = null;
        setPlaying(false);
      }
    }, PLAY_MS / FRAMES);
  };

  const pick = (c: Change) => {
    if (guess) return;
    const g = keepGuess(kind, c);
    setGuess(g);
    const me = loadStudent();
    if (me) study.predict(me.code, kind, c).catch(() => {});
    play();
  };

  return (
    <div className={`predict${guess ? " done" : ""}`} role="group" aria-label={w.title}>
      <p className="predict-change"><strong>{w.title}.</strong> {words.change}</p>
      <p className="predict-ask" id={`predict-${kind}`}>{words.ask}</p>
      <div className="predict-picks" role="radiogroup" aria-labelledby={`predict-${kind}`}>
        {CHANGES.map((c) => (
          <button key={c} type="button" role="radio" aria-checked={guess?.pick === c} disabled={!!guess && guess.pick !== c}
            className={`btn small${guess?.pick === c ? (guess.right ? " right" : " wrong") : ""}`} onClick={() => pick(c)}>
            {words.options[c]}
          </button>
        ))}
      </div>
      {guess && !playing && (
        <p className={`predict-verdict ${guess.right ? "right" : "wrong"}`} role="status">
          {guess.right ? `✓ ${w.right}` : `✗ ${w.wrong}`} {words.why}{" "}
          <button type="button" className="btn small ghost" onClick={play}>↻ {w.replay}</button>
        </p>
      )}
    </div>
  );
}
