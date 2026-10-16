// The answer to "where does this number go?": a line with only its ends labelled, and a pin to tap or drag onto it.
// The answer is still text ("pin:36.8"), so it is checked, logged and marked again on the server like a typed one.
import { useRef, useState } from "react";
import { decodePin, encodePin, numText, shareAlong, type PinPlay } from "../math/estimate";
import { FONT, INK, svgPoint } from "../live/ui";

const W = 480;
const H = 96;
const X0 = 36;
const X1 = W - 36;
const Y = 54;

export function PinAnswer({ play, value, onChange, disabled, label, tone }: {
  play: PinPlay;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label: string;
  tone?: "right" | "wrong" | null;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const X = (v: number) => X0 + shareAlong(play, v) * (X1 - X0);
  const at = (e: { clientX: number; clientY: number }) => {
    const [x] = svgPoint(svgRef.current!, e);
    return play.from + Math.max(0, Math.min(1, (x - X0) / (X1 - X0))) * (play.to - play.from);
  };
  const pin = drag ?? decodePin(value);
  const color = tone === "right" ? "#2f9e44" : tone === "wrong" ? "#e03131" : "#1971c2";
  return (
    <div className="geo-answer">
      <svg
        ref={svgRef}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        fontFamily={FONT}
        role="img"
        aria-label={label}
        className="pin-line"
        style={{ cursor: disabled ? "default" : "pointer", touchAction: "none" }}
        onPointerDown={(e) => {
          if (disabled || !svgRef.current || e.button > 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          setDrag(at(e));
        }}
        onPointerMove={(e) => drag !== null && setDrag(at(e))}
        onPointerUp={() => {
          if (drag === null) return;
          onChange(encodePin(play, drag));
          setDrag(null);
        }}
        onPointerCancel={() => setDrag(null)}
      >
        <rect width={W} height={H} fill="#fff" />
        <line x1={X0} y1={Y} x2={X1} y2={Y} stroke={INK} strokeWidth={2.5} />
        {[play.from, play.to].map((v) => (
          <g key={v}>
            <line x1={X(v)} y1={Y - 11} x2={X(v)} y2={Y + 11} stroke={INK} strokeWidth={2.5} />
            <text x={X(v)} y={Y + 34} fontSize={18} fontWeight={700} textAnchor="middle" fill={INK}>{numText(v)}</text>
          </g>
        ))}
        {pin !== null && pin >= play.from && pin <= play.to && (
          <g>
            <line x1={X(pin)} y1={Y - 22} x2={X(pin)} y2={Y + 6} stroke={color} strokeWidth={3} />
            <circle cx={X(pin)} cy={Y - 26} r={drag !== null ? 9 : 7} fill={color} />
          </g>
        )}
      </svg>
    </div>
  );
}
