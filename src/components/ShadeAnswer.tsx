// The answer to "shade ¾ of the shape": the shape cut into pieces, tapped to shade or unshade. The answer is the
// pieces shaded as text ("shade:0,1,5"), so it is checked, logged and marked again on the server like a typed one.
import { decodeShade, encodeShade, piecesOf, shapeBox, type ShadePlay } from "../math/shadeFrac";
import { ShadePieces } from "../live/ShadePieces";

export function ShadeAnswer({ play, value, onChange, disabled, label, tone }: {
  play: ShadePlay;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label: string;
  tone?: "right" | "wrong" | null;
}) {
  const shaded = decodeShade(value) ?? [];
  const box = shapeBox(play, 280);
  const toggle = (k: number) => !disabled && onChange(shaded.includes(k) ? (shaded.length > 1 ? encodeShade(shaded.filter((i) => i !== k)) : "") : encodeShade([...shaded, k]));
  return (
    <div className="geo-answer">
      <svg width={box.w + 8} height={box.h + 8} viewBox={`-4 -4 ${box.w + 8} ${box.h + 8}`} role="group" aria-label={label} className="shade-shape">
        <ShadePieces pieces={piecesOf(play, 280)} shaded={shaded} onTap={toggle} disabled={disabled} tone={tone === "right" ? "right" : null} />
      </svg>
    </div>
  );
}
