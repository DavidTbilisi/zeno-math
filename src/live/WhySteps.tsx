// A game's explanation, a step at a time, drawn as a card: a tap on the card (or a swipe to the left) goes on a step,
// a swipe to the right or the small ‹ goes back, and a dot jumps to its step. Beside the sentence, when the game gives
// one, a small picture of the step. The game keeps which step is open (or none) and lights its own picture.
import { useRef, type ReactNode } from "react";
import { BLUE, keyTap, Pill, wrapWords } from "./hand";
import { INK } from "./ui";

const W = 540;
/** The game's small picture: 176 × 112. */
const [PIC_W, PIC_H] = [176, 112];
const SWIPE = 40;

export function WhySteps({ at, of, text, back, next, onStep, picture }: {
  at: number;
  of: number;
  text: string;
  /** The names of the back and on moves, for those who can't see the arrows. */
  back: string;
  next: string;
  onStep: (i: number) => void;
  picture?: ReactNode;
}) {
  const from = useRef<number | null>(null);
  const tx = picture ? PIC_W + 20 : 16;
  const lines = wrapWords(text, Math.floor((W - tx - 14) / 7.1));
  const head = `${at + 1}/${of}`;
  const textH = 14 + lines.length * 18;
  const dotsY = Math.max(textH, picture ? PIC_H + 8 : 0) + 18;
  const H = dotsY + 22;
  const last = at === of - 1;
  const on = () => !last && onStep(at + 1);
  const go = (dx: number) => {
    if (dx > SWIPE) return at > 0 && onStep(at - 1);
    on();
  };
  return (
    <svg className="live-why hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="note" style={{ touchAction: "pan-y" }}>
      {/* The whole sentence in one piece for a screen reader (and a test); the lines drawn below are each their own. */}
      <text x={tx} y={12} fontSize={1} opacity={0}>{`${head} ${text}`}</text>
      <g role="button" tabIndex={last ? -1 : 0} aria-label={next} aria-disabled={last || undefined} style={{ cursor: last ? "default" : "pointer" }}
        onPointerDown={(e) => { from.current = e.clientX; }}
        onPointerUp={(e) => { if (from.current !== null) go(e.clientX - from.current); from.current = null; }}
        onKeyDown={(e) => keyTap(e, on)}>
        <rect x={1} y={1} width={W - 2} height={H - 2} rx={8} fill="#fff9db" stroke="#f59f00" />
        <rect x={1} y={1} width={5} height={H - 2} rx={2} fill="#f59f00" />
        {picture && <g transform="translate(10 8)" pointerEvents="none">{picture}</g>}
        {lines.map((l, i) => (
          <text key={i} x={tx} y={26 + i * 18} fontSize={13} fill={INK} pointerEvents="none" aria-hidden>
            {i === 0 && <tspan fontWeight={700} fill="#f08c00">{head} </tspan>}
            {l}
          </text>
        ))}
        {!last && <text x={W - 12} y={dotsY + 4} fontSize={18} fontWeight={700} textAnchor="end" fill="#f08c00" pointerEvents="none" aria-hidden>›</text>}
      </g>
      <Pill x={tx} y={dotsY - 11} w={30} h={22} size={14} text="‹" title={back} disabled={at === 0} onTap={() => onStep(at - 1)} />
      {Array.from({ length: of }, (_, i) => (
        <g key={i} role="button" tabIndex={0} aria-label={`${i + 1}/${of}`} aria-pressed={i === at} style={{ cursor: "pointer" }}
          onPointerDown={(e) => e.stopPropagation()} onClick={() => onStep(i)} onKeyDown={(e) => keyTap(e, () => onStep(i))}>
          <circle cx={tx + 48 + i * 20} cy={dotsY} r={9} fill="transparent" />
          <circle cx={tx + 48 + i * 20} cy={dotsY} r={i === at ? 6 : 4} fill={i === at ? BLUE : "#fff"} stroke={BLUE} />
        </g>
      ))}
    </svg>
  );
}
