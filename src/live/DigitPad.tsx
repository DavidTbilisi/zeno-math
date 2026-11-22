// A number made by hand inside a picture, for the games whose answer is a number too big for a row of choices: digit
// tiles (and a minus tile) dragged into the answer slot or tapped, the last digit dragged back out of the slot or tapped
// to take it back, and a pill beside the slot to check once there is a number. Typing works too while the slot has the
// focus. It is its own small svg, so its drags are followed here and not by the picture it sits in. Takes the place of
// the bar of buttons in Keypad.tsx.
import type { KeyboardEvent } from "react";
import { BLUE, inBox, keyTap, MUTED, Pill, RED, useDrag } from "./hand";
import { INK } from "./ui";

const [SLOT_W, SLOT_H, TILE, GAP, ROW_Y] = [170, 50, 36, 4, 62];
/** How tall the pad is drawn. */
export const PAD_H = ROW_Y + 42;
const MAX = 6;

export function DigitPad({ x, y, w = 440, value, onChange, label, erase, minus = false, check, disabled }: {
  x: number; y: number; w?: number; value: string; onChange: (v: string) => void; label: string; erase: string; minus?: boolean;
  /** The pill beside the slot: shown when given (the caller decides when there is a number to check). */
  check?: { text: string; onTap: () => void };
  disabled?: boolean;
}) {
  const keys = [..."1234567890", ...(minus ? ["−"] : [])];
  const can = (k: string) => !disabled && (k === "−" ? value === "" : value.replace("−", "").length < MAX);
  const add = (k: string) => can(k) && onChange(value + k);
  const back = () => !disabled && value && onChange(value.slice(0, -1));
  const slot = { x: 0, y: 0, w: SLOT_W, h: SLOT_H };
  // A tile let go over the slot (or tapped) goes in; the last digit let go off the slot (or tapped) comes out.
  const { drag, begin, svgProps } = useDrag<{ k: string; out: boolean }>((d) => {
    const over = inBox({ x: slot.x - 10, y: slot.y - 10, w: slot.w + 20, h: slot.h + 20 }, d.x, d.y);
    if (d.out) {
      if (!d.moved || !over) back();
    } else if (!d.moved || over) add(d.k);
  });
  const key = (e: KeyboardEvent) => {
    if (/^[0-9]$/.test(e.key)) add(e.key);
    else if (e.key === "-" || e.key === "−") add("−");
    else if (e.key === "Backspace" || e.key === "Delete") back();
    else return;
    e.preventDefault();
  };
  const chars = [...value];
  const cw = 22;
  const left = SLOT_W / 2 - (chars.length * cw) / 2;
  const tileX = (i: number) => (w - keys.length * (TILE + GAP) + GAP) / 2 + i * (TILE + GAP);
  const taking = drag?.moved && drag.out && !inBox(slot, drag.x, drag.y);
  return (
    <svg x={x} y={y} width={w} height={PAD_H} overflow="visible" style={{ touchAction: "none" }} {...svgProps}>
      <g role="textbox" tabIndex={disabled ? -1 : 0} aria-label={label} aria-readonly={disabled || undefined} onKeyDown={key}>
        <rect x={0} y={0} width={SLOT_W} height={SLOT_H} rx={10} fill={drag?.moved && !drag.out ? "#e7f5ff" : "#fff"} stroke={BLUE} strokeWidth={2} />
        {!value && <text x={SLOT_W / 2} y={SLOT_H / 2 + 9} fontSize={26} fontWeight={700} textAnchor="middle" fill={MUTED}>?</text>}
        {/* The number as text for a screen reader (and a test): the digits drawn below are each their own. */}
        <text x={SLOT_W / 2} y={SLOT_H / 2} fontSize={1} opacity={0}>{value}</text>
      </g>
      {chars.map((c, i) => {
        const lastOne = i === chars.length - 1;
        const away = lastOne && drag?.moved && drag.out;
        const cx = left + cw * (i + 0.5);
        const t = <text x={cx} y={SLOT_H / 2 + 9} fontSize={26} fontWeight={700} textAnchor="middle" fill={INK} opacity={away ? 0.3 : 1} pointerEvents="none">{c}</text>;
        return lastOne && !disabled ? (
          <g key={i} role="button" tabIndex={0} aria-label={erase} style={{ cursor: "grab" }} onPointerDown={(e) => begin(e, { k: c, out: true })} onKeyDown={(e) => keyTap(e, back)}>
            <title>{erase}</title>
            <rect x={cx - cw / 2} y={6} width={cw} height={SLOT_H - 12} rx={4} fill="transparent" />
            {t}
          </g>
        ) : (
          <g key={i}>{t}</g>
        );
      })}
      {check && <Pill x={SLOT_W + 14} y={10} w={110} h={SLOT_H - 20} strong text={check.text} onTap={check.onTap} />}
      <g role="group" aria-label={label}>
        {keys.map((k, i) => {
          const on = can(k);
          return (
            <g key={k} role="button" tabIndex={on ? 0 : -1} aria-label={k} aria-disabled={!on || undefined} opacity={on ? 1 : 0.35} style={{ cursor: on ? "grab" : "default" }}
              onPointerDown={(e) => on && begin(e, { k, out: false })} onKeyDown={(e) => keyTap(e, () => add(k))}>
              <rect x={tileX(i)} y={ROW_Y} width={TILE} height={40} rx={7} fill="#f8f9fa" stroke="#adb5bd" strokeWidth={1.5} />
              <text x={tileX(i) + TILE / 2} y={ROW_Y + 27} fontSize={19} fontWeight={700} textAnchor="middle" fill={INK} pointerEvents="none">{k}</text>
            </g>
          );
        })}
      </g>
      {drag?.moved && (
        <g pointerEvents="none" opacity={0.85}>
          <rect x={drag.x - TILE / 2} y={drag.y - 20} width={TILE} height={40} rx={7} fill={taking ? "#ffc9c9" : "#fff"} stroke={taking ? RED : BLUE} strokeWidth={2} />
          <text x={drag.x} y={drag.y + 7} fontSize={19} fontWeight={700} textAnchor="middle" fill={INK}>{drag.k}</text>
        </g>
      )}
    </svg>
  );
}
