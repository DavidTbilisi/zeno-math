// The answer to a question answered by doing rather than typing, whatever the doing is: a shape on a dot grid, or a
// pin on a number line. Each gives its answer as text, so checking, logging and marking stay the same.
import type { Play } from "../math/practice";
import { GeoAnswer } from "./GeoAnswer";
import { PinAnswer } from "./PinAnswer";

export function PlayAnswer({ play, ...rest }: {
  play: Play;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label: string;
  tone?: "right" | "wrong" | null;
}) {
  return play.kind === "grid" ? <GeoAnswer play={play} {...rest} /> : <PinAnswer play={play} {...rest} />;
}
