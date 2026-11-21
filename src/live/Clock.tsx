// A geared clock worked by hand: drag either hand round (the other follows, as on a real clock), or tap a number for
// the minute hand to go there. Tap the time underneath to cover it (to guess first) and tap again to see it; the die
// sets a time at random. The pills turn the minutes ring on and off and pick whole 5 minutes or single minutes.
import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { clockTime, dragHand, handAngles, snapTo, wrapDay } from "../math/live";
import { BLUE, DieButton, keyTap, Pill, pointIn } from "./hand";
import { around } from "./sectors";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 300;
const C = { x: 150, y: 186 };
const R = 140;
const H = 384;
type HandName = "hour" | "minute";

export function Clock({ state, set, w: words, svgRef }: PieceProps<"clock">) {
  const w = words.clock;
  const [drag, setDrag] = useState<{ hand: HandName; minutes: number } | null>(null);
  const minutes = drag?.minutes ?? state.minutes;
  const { hour, minute } = handAngles(minutes);
  const step = state.snap ? 5 : 1;
  const settle = (m: number) => set({ ...state, minutes: wrapDay(state.snap ? snapTo(m, 5) : m) });
  const angleAt = (e: PointerEvent) => {
    const [x, y] = pointIn(e);
    return ((Math.atan2(x - C.x, C.y - y) * 180) / Math.PI + 360) % 360;
  };
  const grab = (hand: HandName) => (e: PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setDrag({ hand, minutes: state.minutes });
  };
  const keys = (hand: HandName) => (e: KeyboardEvent) => {
    const by = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
    if (!by) return;
    e.preventDefault();
    settle(state.minutes + by * (hand === "hour" ? 60 : step));
  };
  const hand = (which: HandName, angle: number, len: number, width: number) => {
    const [x, y] = around(C.x, C.y, len, angle);
    return (
      <g role="slider" tabIndex={0} aria-label={which === "hour" ? w.hourHand : w.minuteHand} aria-valuemin={0} aria-valuemax={1439}
        aria-valuenow={wrapDay(minutes)} aria-valuetext={clockTime(minutes)} style={{ cursor: drag ? "grabbing" : "grab" }}
        onPointerDown={grab(which)} onKeyDown={keys(which)}
        onPointerMove={(e) => drag && setDrag({ ...drag, minutes: dragHand(drag.minutes, drag.hand, angleAt(e)) })}
        onPointerUp={() => drag && (settle(drag.minutes), setDrag(null))} onPointerCancel={() => setDrag(null)}>
        <line x1={C.x} y1={C.y} x2={x} y2={y} stroke={which === "hour" ? INK : BLUE} strokeWidth={width} strokeLinecap="round" />
        <line x1={C.x} y1={C.y} x2={x} y2={y} stroke="transparent" strokeWidth={28} strokeLinecap="round" />
      </g>
    );
  };
  // A number tapped: the minute hand takes the shortest way round to it, the hour hand following.
  const toNumber = (n: number) => settle(dragHand(state.minutes, "minute", n * 30));
  const covered = !state.showTime;
  const random = () => set({ ...state, minutes: (state.snap ? 5 : 1) * Math.floor(Math.random() * (state.snap ? 144 : 720)) });
  const flip = () => set({ ...state, showTime: !state.showTime });
  return (
    <>
      <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} className="hand-pic"
        style={{ touchAction: "none", userSelect: "none" }}>
        <rect width={W} height={H} fill="#fff" />
        <Pill x={8} y={6} w={92} h={28} size={14} text={w.showMinutes} on={!!state.showMinutes}
          onTap={() => set({ ...state, showMinutes: !state.showMinutes })} />
        <Pill x={106} y={6} w={64} h={28} size={14} text={w.five} on={state.snap} title={w.snap}
          onTap={() => set({ ...state, snap: true, minutes: snapTo(state.minutes, 5) })} />
        <Pill x={176} y={6} w={64} h={28} size={14} text={w.one} on={!state.snap} title={w.noSnap} onTap={() => set({ ...state, snap: false })} />
        <circle cx={C.x} cy={C.y} r={R} fill="#fff" stroke={INK} strokeWidth={4} />
        {Array.from({ length: 60 }, (_, m) => {
          const [x0, y0] = around(C.x, C.y, R - 4, m * 6);
          const [x1, y1] = around(C.x, C.y, R - (m % 5 ? 12 : 22), m * 6);
          return <line key={m} x1={x0} y1={y0} x2={x1} y2={y1} stroke={INK} strokeWidth={m % 5 ? 1.5 : 3.5} />;
        })}
        {Array.from({ length: 12 }, (_, i) => {
          const n = i + 1;
          const [x, y] = around(C.x, C.y, R - (state.showMinutes ? 56 : 44), n * 30);
          const go = () => toNumber(n);
          return (
            <g key={n} role="button" tabIndex={0} aria-label={fill(w.toNumber, { n })} style={{ cursor: "pointer" }} onClick={go}
              onKeyDown={(e) => keyTap(e, go)}>
              <circle cx={x} cy={y} r={17} fill="transparent" />
              <text x={x} y={y + 9} fontSize={26} textAnchor="middle" fill={INK} pointerEvents="none">{n}</text>
            </g>
          );
        })}
        {state.showMinutes &&
          Array.from({ length: 12 }, (_, i) => {
            const [x, y] = around(C.x, C.y, R - 32, (i + 1) * 30);
            return <text key={i} x={x} y={y + 5} fontSize={14} textAnchor="middle" fill={BLUE} pointerEvents="none">{(i + 1) * 5}</text>;
          })}
        {hand("hour", hour, 74, 9)}
        {hand("minute", minute, 112, 5)}
        <circle cx={C.x} cy={C.y} r={8} fill={INK} pointerEvents="none" />
        <DieButton x={W - 46} y={2} s={36} title={w.random} onTap={random} />
        <g role="button" tabIndex={0} aria-label={covered ? w.uncover : fill(w.cover, { t: clockTime(minutes) })} aria-pressed={!covered}
          style={{ cursor: "pointer" }} onClick={flip} onKeyDown={(e) => keyTap(e, flip)}>
          <rect x={C.x - 56} y={H - 50} width={112} height={42} rx={8} fill={covered ? "#e7f5ff" : "#f1f3f5"} stroke={covered ? BLUE : "#ced4da"}
            strokeDasharray={covered ? "5 4" : undefined} />
          <text x={C.x} y={H - 20} fontSize={26} textAnchor="middle" fill={covered ? BLUE : INK} pointerEvents="none">
            {covered ? "?:??" : clockTime(minutes)}
          </text>
        </g>
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}
