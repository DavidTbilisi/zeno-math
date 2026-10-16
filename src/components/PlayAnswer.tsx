// The answer to a question answered by doing rather than typing, whatever the doing is: a shape on a dot grid, or a
// pin on a number line, dots that flash and are counted. Each gives its answer as text, so checking, logging and
// marking stay the same.
import type { ReactNode } from "react";
import type { Play } from "../math/practice";
import { FlashAnswer } from "./FlashAnswer";
import { GeoAnswer } from "./GeoAnswer";
import { PinAnswer } from "./PinAnswer";

export function PlayAnswer({ play, ...rest }: {
  play: Play;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label: string;
  tone?: "right" | "wrong" | null;
  /** Enter in a box the answer is typed in: check, or go on. */
  onEnter?: () => void;
  /** The words a doing needs ("Look"). */
  look: string;
}) {
  const { onEnter, look, ...common } = rest;
  if (play.kind === "flash") return <FlashAnswer play={play} {...common} onEnter={onEnter} look={look} />;
  return play.kind === "grid" ? <GeoAnswer play={play} {...common} /> : <PinAnswer play={play} {...common} />;
}

/** The answer's field: a label round a typed answer, a plain box round one answered by doing. */
export const AnswerField = ({ play, className, children }: { play: boolean; className: string; children: ReactNode }) =>
  play ? <div className={className}>{children}</div> : <label className={className}>{children}</label>;
