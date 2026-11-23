// Walk the slope: a small walker on a slope of length 1. Under them, blue along the ground, is how far they have gone
// across (walked × cos θ); up to their feet, red, is how tall they have climbed (walked × sin θ). At the top the walk
// is the whole 1, so the blue is cos θ and the red is sin θ. The walker is dragged along the slope, or tapped to walk
// to the top (or back down from it); the flag at the top is dragged round to make the slope steeper or flatter.
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { clampAt, clampTheta, dec2, SLOPE_THETA, walkParts, type LiveSlopeWalk } from "../math/slopeWalk";
import { BLUE, GREEN, keyTap, MUTED, RED, useDrag, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 640;
/** The bottom of the slope, and the ground line. */
const OX = 60;
const GY = 500;
/** The slope's length on the picture: 1. */
const L = 380;
const SAY_Y = GY + 76;
const SAY = 27;
const H = SAY_Y + 4 * SAY + 6;
/** The walker's stride along the slope, for the swing of the legs. */
const STRIDE = 13;
/** How long a whole slope's walk takes, in ms. */
const WALK_MS = 2600;
const SHIRT = "#f08c00";
/** How much bigger the walker is drawn than their sketch (about 50 tall). */
const WALKER = 1.5;

type Hold = { part: "walk" | "top"; at0: number; theta0: number };
/** The flag: its pole stands this tall on the top of the slope, the cloth (where it is held) near its head. */
const POLE = 92;
const CLOTH: [number, number] = [12, -84];

const rad = (deg: number) => (deg * Math.PI) / 180;
/** The angle of a point of the picture about the bottom of the slope, in degrees up from the ground. */
const turnOf = (x: number, y: number) => (Math.atan2(GY - y, x - OX) * 180) / Math.PI;

/** Keys that move a value: by `step` on the arrows, `big` on Page Up and Down, to the ends on Home and End. */
function keyMove(e: KeyboardEvent, value: number, step: number, big: number, lo: number, hi: number, to: (v: number) => void) {
  const next = { ArrowRight: value + step, ArrowUp: value + step, ArrowLeft: value - step, ArrowDown: value - step, PageUp: value + big, PageDown: value - big, Home: lo, End: hi }[e.key];
  if (next === undefined) return;
  // Kept here: the board would move what is selected on the arrows.
  e.preventDefault();
  e.stopPropagation();
  to(Math.max(lo, Math.min(hi, next)));
}

/** The walker, feet at (x, y), drawn half as big again as their sketch: legs and arms swing with how far they have
 * walked, the nose and the cap's peak show which way they go. */
function Walker({ x, y, theta, at, facing }: { x: number; y: number; theta: number; at: number; facing: 1 | -1 }) {
  const s = Math.sin(((at / 100) * L) / STRIDE);
  const [ux, uy] = [Math.cos(rad(theta)), -Math.sin(rad(theta))];
  const foot = (k: number): [number, number] => [ux * 8 * k, uy * 8 * k];
  const [f1, f2] = [foot(s), foot(-s)];
  return (
    <g pointerEvents="none" strokeLinecap="round" transform={`translate(${x} ${y}) scale(${WALKER})`}>
      <line x1={0} y1={-18} x2={f1[0]} y2={f1[1]} stroke={INK} strokeWidth={3.5} />
      <line x1={0} y1={-18} x2={f2[0]} y2={f2[1]} stroke="#495057" strokeWidth={3.5} />
      <line x1={0} y1={-31} x2={-8 * s} y2={-19} stroke="#495057" strokeWidth={3} />
      <line x1={0} y1={-18} x2={0} y2={-33} stroke={SHIRT} strokeWidth={7} />
      <line x1={0} y1={-31} x2={8 * s} y2={-19} stroke={INK} strokeWidth={3} />
      <circle cx={0} cy={-41} r={7} fill="#ffe8cc" stroke={INK} strokeWidth={2} />
      <circle cx={3.5 * facing} cy={-42.5} r={1.4} fill={INK} />
      <path d={`M-7 -44 Q0 -53 7 -44 L${12 * facing} -44`} fill={SHIRT} stroke={INK} strokeWidth={1.5} />
    </g>
  );
}

export function SlopeWalk({ state, set, w: words, svgRef }: PieceProps<"slopeWalk">) {
  const w = words.slopeWalk;
  /** What is shown while the walker is held or walking, before it is kept as one step to undo. */
  const [draft, setDraft] = useState<LiveSlopeWalk | null>(null);
  const [facing, setFacing] = useState<1 | -1>(1);
  const frame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const shown = draft ?? state;
  const { theta, at } = shown;
  const parts = walkParts(shown);

  const turnTo = (next: number, from: number) => next !== from && setFacing(next > from ? 1 : -1);

  /** The walker walks on their own: to the top, or back down once they are there. */
  const walk = (from: LiveSlopeWalk) => {
    cancelAnimationFrame(frame.current);
    const goal = from.at < 100 ? 100 : 0;
    const ms = (Math.abs(goal - from.at) / 100) * WALK_MS;
    const start = performance.now();
    setFacing(goal > from.at ? 1 : -1);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      if (t < 1) {
        setDraft({ ...from, at: from.at + (goal - from.at) * t });
        frame.current = requestAnimationFrame(tick);
      } else {
        setDraft(null);
        set({ ...from, at: goal });
      }
    };
    frame.current = requestAnimationFrame(tick);
  };

  const { drag, begin, svgProps } = useDrag<Hold>(
    (d) => {
      if (!d.moved && d.part === "walk") return walk(shown);
      if (!draft) return;
      setDraft(null);
      set({ theta: shown.theta, at: clampAt(shown.at) });
    },
    (d) => {
      if (!d.moved) return;
      // Turned by as much as the pointer has turned about the bottom of the slope, wherever on the cloth it took hold.
      if (d.part === "top") return setDraft({ ...shown, theta: clampTheta(d.theta0 + turnOf(d.x, d.y) - turnOf(d.x0, d.y0)) });
      // Moved by how far the pointer has gone along the slope, wherever on the walker it took hold.
      const along = ((d.x - d.x0) * Math.cos(rad(theta)) + (d.y0 - d.y) * Math.sin(rad(theta))) / L;
      const next = clampAt(d.at0 + 100 * along);
      turnTo(next, shown.at);
      setDraft({ ...shown, at: next });
    },
  );

  const grab = (part: Hold["part"]) => (e: PointerEvent) => {
    cancelAnimationFrame(frame.current);
    begin(e, { part, at0: shown.at, theta0: shown.theta });
  };
  const keep = (patch: Partial<LiveSlopeWalk>) => {
    cancelAnimationFrame(frame.current);
    setDraft(null);
    if (patch.at !== undefined) turnTo(patch.at, shown.at);
    set({ ...shown, at: clampAt(shown.at), ...patch });
  };

  const [cos, sin] = [Math.cos(rad(theta)), Math.sin(rad(theta))];
  const top: [number, number] = [OX + L * cos, GY - L * sin];
  const px = OX + (at / 100) * L * cos;
  const py = GY - (at / 100) * L * sin;
  const t = String(theta);
  const v = { d: dec2(parts.walked), far: dec2(parts.far), tall: dec2(parts.tall), t, cos: dec2(parts.cos), sin: dec2(parts.sin) };
  const atTop = Math.round(at) === 100;
  const lines: { text: string; color: string }[] = Math.round(at) === 0
    ? [{ text: w.start, color: INK }]
    : [
      { text: fill(w.lineWalked, v), color: GREEN },
      { text: fill(w.lineFar, v), color: BLUE },
      { text: fill(w.lineTall, v), color: RED },
      ...(atTop ? wrapWords(fill(w.lineTop, v), 70).map((text) => ({ text, color: INK })) : []),
    ];
  const holdingTop = drag?.part === "top" && drag.moved;
  const [far, tall] = [px - OX, GY - py];
  const mid = (a: number, b: number) => (a + b) / 2;
  const labelTheta = Math.max(theta / 2, 14);
  const walkedAt = [mid(OX, px) - 12 * sin, mid(GY, py) - 12 * cos];

  const drawing = () => (
    <>
      {holdingTop && (
        <path d={`M${OX + L * Math.cos(rad(SLOPE_THETA[0]))} ${GY - L * Math.sin(rad(SLOPE_THETA[0]))} A${L} ${L} 0 0 0 ${OX + L * Math.cos(rad(SLOPE_THETA[1]))} ${GY - L * Math.sin(rad(SLOPE_THETA[1]))}`}
          fill="none" stroke="#dee2e6" strokeWidth={2} strokeDasharray="5 6" />
      )}
      <polygon points={`${OX},${GY} ${top[0]},${top[1]} ${top[0]},${GY}`} fill="#f1f3f5" />
      <line x1={OX - 40} y1={GY} x2={W - 24} y2={GY} stroke="#495057" strokeWidth={2} />
      {/* The whole run and rise, faint: where blue and red end up at the top. */}
      <line x1={top[0]} y1={GY} x2={top[0]} y2={top[1]} stroke={RED} strokeOpacity={0.3} strokeWidth={2} strokeDasharray="6 6" />
      <line x1={OX} y1={GY} x2={top[0]} y2={GY} stroke={BLUE} strokeOpacity={0.3} strokeWidth={2} strokeDasharray="6 6" />
      <line x1={OX} y1={GY} x2={top[0]} y2={top[1]} stroke="#495057" strokeWidth={4} strokeLinecap="round" />
      {at > 0.5 && <line x1={OX} y1={GY} x2={px} y2={py} stroke={GREEN} strokeWidth={7} strokeLinecap="round" />}
      <path d={`M${OX + 46} ${GY} A46 46 0 0 0 ${OX + 46 * cos} ${GY - 46 * sin}`} fill="none" stroke={MUTED} strokeWidth={2} />
      <text x={OX + 66 * Math.cos(rad(labelTheta)) + 4} y={GY - 66 * Math.sin(rad(labelTheta)) + 5} fontSize={15} fontWeight={700} fill="#495057"
        stroke="#fff" strokeWidth={4} paintOrder="stroke">θ = {theta}°</text>
      {far > 2 && <line x1={OX} y1={GY} x2={px} y2={GY} stroke={BLUE} strokeWidth={6} strokeLinecap="round" />}
      {tall > 2 && <line x1={px} y1={GY} x2={px} y2={py} stroke={RED} strokeWidth={6} strokeLinecap="round" />}
      {far > 16 && tall > 16 && <path d={`M${px - 11} ${GY} V${GY - 11} H${px}`} fill="none" stroke="#495057" strokeWidth={1.5} />}
      {/* Written along the slope, just above the part walked, so it fits however steep the slope is. */}
      {at >= 20 && (
        <text x={walkedAt[0]} y={walkedAt[1]} transform={`rotate(${-theta} ${walkedAt[0]} ${walkedAt[1]})`} fontSize={15} fontWeight={700}
          fill={GREEN} textAnchor="middle" stroke="#fff" strokeWidth={4} paintOrder="stroke">{w.walked} {v.d}</text>
      )}
      <text x={Math.max(OX, mid(OX, px))} y={GY + 26} fontSize={15} fontWeight={700} fill={BLUE} textAnchor="middle"
        stroke="#fff" strokeWidth={4} paintOrder="stroke">{w.far} {v.far}{atTop ? ` = cos ${t}°` : ""}</text>
      <text x={px + 12} y={mid(GY, py) + 5} fontSize={15} fontWeight={700} fill={RED}
        stroke="#fff" strokeWidth={4} paintOrder="stroke">{w.tall} {v.tall}{atTop ? ` = sin ${t}°` : ""}</text>
      {/* The flag at the top of the slope. */}
      <line x1={top[0]} y1={top[1]} x2={top[0]} y2={top[1] - POLE} stroke={INK} strokeWidth={2} />
      <path d={`M${top[0]} ${top[1] - POLE} L${top[0] + 26} ${top[1] - POLE + 8} L${top[0]} ${top[1] - POLE + 16} Z`} fill={RED} stroke={holdingTop ? INK : "none"} />
      <circle cx={top[0]} cy={top[1]} r={holdingTop ? 9 : 7} fill="#fff" stroke={INK} strokeWidth={2.5} />
      <Walker x={px} y={py} theta={theta} at={at} facing={facing} />
      {lines.map((l, i) => (
        <text key={i} x={24} y={SAY_Y + i * SAY} fontSize={17} fontWeight={i < 3 ? 700 : 400} fill={l.color}>{l.text}</text>
      ))}
    </>
  );

  const walkerName = w.walker;
  return (
    <>
      <svg className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} {...svgProps}
        style={{ touchAction: "none", userSelect: "none" }} role="group" aria-label={lines.map((l) => l.text).join(" ")}>
        <rect width={W} height={H} fill="#fff" />
        {drawing()}
        <g role="slider" tabIndex={0} aria-label={walkerName} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(at)}
          aria-valuetext={`${w.walked} ${v.d}`} style={{ cursor: drag?.part === "walk" ? "grabbing" : "grab" }} onPointerDown={grab("walk")}
          onKeyDown={(e) => {
            keyTap(e, () => walk(shown));
            keyMove(e, Math.round(at), 5, 25, 0, 100, (n) => keep({ at: n }));
          }}>
          <title>{walkerName}</title>
          <ellipse cx={px} cy={py - 36} rx={26} ry={42} fill="transparent" />
        </g>
        <g role="slider" tabIndex={0} aria-label={w.topName} aria-valuemin={SLOPE_THETA[0]} aria-valuemax={SLOPE_THETA[1]} aria-valuenow={theta}
          aria-valuetext={`θ = ${theta}°`} style={{ cursor: "grab" }} onPointerDown={grab("top")}
          onKeyDown={(e) => keyMove(e, theta, 1, 10, SLOPE_THETA[0], SLOPE_THETA[1], (n) => keep({ theta: clampTheta(n) }))}>
          <title>{w.topName}</title>
          <circle cx={top[0] + CLOTH[0]} cy={top[1] + CLOTH[1]} r={14} fill="transparent" />
        </g>
      </svg>
      <p className="live-hint">{w.hint}</p>
      <div hidden>
        <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT}>
          <rect width={W} height={H} fill="#fff" />
          {drawing()}
        </svg>
      </div>
    </>
  );
}
