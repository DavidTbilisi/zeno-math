// What the pieces that step through frames share: the step and the play timer, the drawn line of steps, the caption
// with its question when the pupil takes a turn, and the scenes stacked into one picture.
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Frame } from "../math/patternSteps";
import type { Scene } from "./scenes";
import { Pill, Track } from "./hand";
import { fill, FONT } from "./ui";

const STEPS_W = 460;

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

/**
 * The steps as a line to drag along (or tap where to go; the arrow keys step one, Home and End go to the ends), with a
 * play pill before it and a pill to the end after it, all drawn. An open question is as far as the line goes, and with
 * `lockLast` it can't be skipped to the end either.
 */
export function StepBar({ s, w, frames, lockLast }: { s: Pick<Stepper, "k" | "last" | "asking" | "playing" | "setPlaying" | "go">; w: StepWords; frames: Frame[]; lockLast?: boolean }) {
  const { k, last, asking, playing, setPlaying, go } = s;
  const play = () => {
    if (playing) return setPlaying(false);
    if (k >= last) go(0);
    setPlaying(true);
  };
  // What the line's numbers mean, when the piece says more than "Step k of n", stays written under it.
  const note = frames.length > 0 && /[:：]/.test(w.step) ? fill(w.step, { k, n: last }) : null;
  return (
    <>
      <svg className="hand-pic live-steps" width={STEPS_W} height={44} viewBox={`0 0 ${STEPS_W} 44`} fontFamily={FONT}>
        <Pill x={0} y={7} w={100} text={`${playing ? "⏸" : "⏵"} ${playing ? w.pause : w.play}`} title={playing ? w.pause : w.play} strong disabled={!frames.length || asking} onTap={play} />
        <Track x={104} y={2} w={STEPS_W - 156} value={k} min={0} max={asking ? k : last} label={frames.length ? fill(w.step, { k, n: last }) : w.step} lead={64}
          disabled={!frames.length} show={(v) => (frames.length ? `${v} / ${last}` : "")}
          onChange={(v, done) => {
            if (!done && v === k) return;
            setPlaying(false);
            go(v);
          }} />
        <Pill x={STEPS_W - 48} y={7} w={48} text="⏭" title={w.last} disabled={k >= last || (!!lockLast && asking)} onTap={() => go(last)} />
      </svg>
      {note && <span className="live-note">{note}</span>}
    </>
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
