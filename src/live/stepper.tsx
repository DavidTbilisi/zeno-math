// What the pieces that step through frames share: the step and the play timer, the row of step buttons, the caption
// with its question when the pupil takes a turn, and the scenes stacked into one picture.
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Frame } from "../math/patternSteps";
import type { Scene } from "./scenes";
import { fill } from "./ui";

export const PLAY_MS = 1100;
export type StepWords = { play: string; pause: string; first: string; prev: string; next: string; last: string; step: string; right: string; wrong: string };

export function useStepper(frames: Frame[], step: number, quiz: boolean, setStep: (k: number) => void) {
  const last = Math.max(0, frames.length - 1);
  const k = Math.min(Math.max(0, step), last);
  const frame: Frame | undefined = frames[k];
  const asking = quiz && !!frame?.ask && k < last;
  const [playing, setPlaying] = useState(false);
  const [said, setSaid] = useState<{ right: boolean; why?: string } | null>(null);
  // The latest setter for the play timer, which the board's re-renders mustn't restart.
  const latest = useRef(setStep);
  latest.current = setStep;
  useEffect(() => {
    if (!playing) return;
    if (k >= last || asking) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => latest.current(k + 1), PLAY_MS);
    return () => clearTimeout(t);
  }, [playing, k, last, asking]);
  const go = (s: number) => {
    setSaid(null);
    setStep(Math.max(0, Math.min(last, s)));
  };
  /** New inputs: the play stops and the feedback goes. */
  const stop = () => {
    setPlaying(false);
    setSaid(null);
  };
  return { k, last, frame, asking, playing, setPlaying, said, setSaid, go, stop };
}
export type Stepper = ReturnType<typeof useStepper>;

/** ⏮ ◀ ⏵ ▶ ⏭ and "Step k of n"; with `lockLast` an open question can't be skipped to the end either. */
export function StepBar({ s, w, frames, lockLast }: { s: Stepper; w: StepWords; frames: Frame[]; lockLast?: boolean }) {
  const { k, last, asking, playing, setPlaying, go } = s;
  return (
    <div className="live-bar">
      <button className="live-btn" disabled={k === 0} title={w.first} aria-label={w.first} onClick={() => go(0)}>⏮</button>
      <button className="live-btn" disabled={k === 0} title={w.prev} aria-label={w.prev} onClick={() => go(k - 1)}>◀</button>
      <button
        className="live-btn primary"
        disabled={!frames.length || asking}
        title={playing ? w.pause : w.play}
        aria-label={playing ? w.pause : w.play}
        onClick={() => {
          if (playing) return setPlaying(false);
          if (k >= last) go(0);
          setPlaying(true);
        }}
      >
        {playing ? "⏸" : "⏵"} {playing ? w.pause : w.play}
      </button>
      <button className="live-btn" disabled={k >= last || asking} title={w.next} aria-label={w.next} onClick={() => go(k + 1)}>▶</button>
      <button className="live-btn" disabled={k >= last || (!!lockLast && asking)} title={w.last} aria-label={w.last} onClick={() => go(last)}>⏭</button>
      {frames.length > 0 && <span className="live-note">{fill(w.step, { k, n: last })}</span>}
    </div>
  );
}

/**
 * The error, or the step's caption: what happened, and what comes next (as a question when the pupil takes a turn).
 * `onAnswer` hears every answer, right or not; `optionsClass` goes on the row of options.
 */
export function StepSaid({ s, w, error, setStep, onAnswer, optionsClass }: { s: Stepper; w: StepWords; error: string | null; setStep: (k: number) => void; onAnswer?: (right: boolean) => void; optionsClass?: string }) {
  const { k, last, frame, asking, said, setSaid } = s;
  if (error) return <p className="live-said">{error}</p>;
  if (!frame) return null;
  return (
    <div className="live-pattern-said">
      <p className={`live-said ${k === last ? "ok" : "info"}`}>{frame.note}</p>
      {asking ? (
        <div className={optionsClass ? `live-bar ${optionsClass}` : "live-bar"}>
          <span className="live-pattern-q">{frame.ask!.q}</span>
          {frame.ask!.options.map((o, i) => (
            <button
              key={i}
              className="live-btn"
              onClick={() => {
                onAnswer?.(i === frame.ask!.answer);
                if (i !== frame.ask!.answer) return setSaid({ right: false });
                setStep(k + 1);
                setSaid({ right: true, why: frame.then });
              }}
            >
              {o}
            </button>
          ))}
          {said && !said.right && <span className="live-said">{w.wrong}</span>}
        </div>
      ) : (
        frame.then && k < last && <p className="live-said info live-pattern-then">→ {frame.then}</p>
      )}
      {said?.right && <p className="live-said ok">{w.right} {said.why}</p>}
    </div>
  );
}

/** The scenes one under another, with the height they need together. */
export function stackScenes(scenes: Scene[]): { height: number; drawn: ReactNode[] } {
  const GAP = 14;
  let height = 4;
  const drawn = scenes.map((s, i) => {
    const el = <g key={i}>{s.draw(height)}</g>;
    height += s.h + GAP;
    return el;
  });
  return { height: Math.max(120, height - GAP + 4), drawn };
}
