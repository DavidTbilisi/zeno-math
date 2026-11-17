// A game's explanation, a step at a time: back and on, the step's number and its sentence, and beside them, when the
// game gives one, a small picture of the step. The game keeps which step is open (or none) and lights its own picture.
import type { ReactNode } from "react";

export function WhySteps({ at, of, text, back, next, onStep, picture }: {
  at: number;
  of: number;
  text: string;
  /** The names of the back and on buttons, for those who can't see the arrows. */
  back: string;
  next: string;
  onStep: (i: number) => void;
  picture?: ReactNode;
}) {
  return (
    <div className="live-why" role="note">
      <button className="live-btn" disabled={at === 0} aria-label={back} onClick={() => onStep(at - 1)}>‹</button>
      {picture}
      <p>
        <b>{at + 1}/{of}</b> {text}
      </p>
      <button className="live-btn" disabled={at === of - 1} aria-label={next} onClick={() => onStep(at + 1)}>›</button>
    </div>
  );
}
