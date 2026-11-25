// Both ways from a. A number line with a marked at the centre; drag the blue point x and an arc shows how far it is
// from a, which is |x − a|. Let go where the arc says b and that x is kept. There is always a second one, b on the
// other side (unless b is 0), and once both are found every number between them is shaded: closer than b,
// |x − a| < b.
import { useState, type KeyboardEvent } from "react";
import { ABS_HI, ABS_LO, ABS_TASKS, absAnswers, signed } from "../math/absValue";
import { BLUE, GREEN, Tabs, useDrag, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 680;
const X0 = 40;
const U = 30;
const LINE_Y = 210;
const SAY_Y = 320;
const H = SAY_Y + 4 * 25 + 8;
const ORANGE = "#e8590c";
const X = (v: number) => X0 + (v - ABS_LO) * U;

/** |x − a| written out: |x − 3|, |x + 2|, |x|. */
export const absText = (a: number) => (a === 0 ? "|x|" : a > 0 ? `|x − ${a}|` : `|x + ${-a}|`);

export function AbsLine({ state, set, w: words, svgRef }: PieceProps<"absLine">) {
  const w = words.absLine;
  const [draft, setDraft] = useState<number | null>(null);
  const x = draft ?? state.x;
  const { a, b } = ABS_TASKS[state.task];
  const answers = absAnswers(state.task);
  const put = (v: number) => {
    const nx = Math.max(ABS_LO, Math.min(ABS_HI, v));
    const keep = Math.abs(nx - a) === b && !state.found.includes(nx);
    set({ ...state, x: nx, found: keep ? [...state.found, nx].sort((p, q) => p - q) : state.found });
  };
  const { drag, begin, svgProps } = useDrag<object>(
    () => {
      if (draft !== null) put(draft);
      setDraft(null);
    },
    (h) => setDraft(Math.max(ABS_LO, Math.min(ABS_HI, Math.round((h.x - X0) / U + ABS_LO)))),
  );
  const keys = (e: KeyboardEvent) => {
    const v = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    if (v === undefined) return;
    e.preventDefault();
    e.stopPropagation();
    put(state.x + v);
  };

  const d = Math.abs(x - a);
  const done = state.found.length === answers.length;
  const v = { a: signed(a), b, x: signed(x), d, l: signed(a - b), r: signed(a + b), eq: absText(a) };
  const say = done
    ? wrapWords(fill(b === 0 ? w.one : w.both, v), 76)
    : state.found.length === 1
      ? wrapWords(fill(w.another, { ...v, f: signed(state.found[0]) }), 76)
      : wrapWords(fill(w.start, v), 76);
  const hit = d === b;
  const top = LINE_Y - 22 - Math.min(70, Math.abs(X(x) - X(a)) * 0.3);
  return (
    <>
      <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} {...svgProps}
        style={{ touchAction: "none", userSelect: "none" }} role="group" aria-label={[`${absText(a)} = ${b}`, fill(w.now, v), ...say].join(" ")}>
        <rect width={W} height={H} fill="#fff" />
        <Tabs x={20} y={14} keys={ABS_TASKS.map((_, i) => String(i))} on={String(state.task)}
          names={Object.fromEntries(ABS_TASKS.map((t, i) => [String(i), `${absText(t.a)} = ${t.b}`]))}
          onPick={(k) => set({ task: Number(k), x: 0, found: [] })} />
        <text x={W / 2} y={84} fontSize={30} fontWeight={700} textAnchor="middle" fill={done ? GREEN : INK}>
          {absText(a)} = {b}{state.found.length > 0 ? `:  x = ${state.found.map(signed).join(", ")}` : ""}
        </text>
        {/* Once both are found: every number closer to a than b. */}
        {done && b > 0 && <line x1={X(a - b)} y1={LINE_Y} x2={X(a + b)} y2={LINE_Y} stroke={GREEN} strokeWidth={10} strokeOpacity={0.35} />}
        <line x1={X(ABS_LO) - 12} y1={LINE_Y} x2={X(ABS_HI) + 12} y2={LINE_Y} stroke={INK} strokeWidth={2.5} />
        {Array.from({ length: ABS_HI - ABS_LO + 1 }, (_, i) => ABS_LO + i).map((t) => (
          <g key={t} pointerEvents="none">
            <line x1={X(t)} y1={LINE_Y - 6} x2={X(t)} y2={LINE_Y + 6} stroke={INK} strokeWidth={t === 0 ? 2.5 : 1.2} />
            <text x={X(t)} y={LINE_Y + 24} fontSize={13} textAnchor="middle" fill={t === 0 ? INK : "#868e96"} fontWeight={t === 0 ? 700 : 400}>{signed(t)}</text>
          </g>
        ))}
        {/* The distance from a to x, both ways the same arc. */}
        {d > 0 && (
          <g pointerEvents="none">
            <path d={`M${X(a)} ${LINE_Y - 8} Q ${(X(a) + X(x)) / 2} ${2 * top - LINE_Y + 8} ${X(x)} ${LINE_Y - 8}`} fill="none" stroke={hit ? GREEN : BLUE} strokeWidth={2.5} />
            <text x={(X(a) + X(x)) / 2} y={top - 6} fontSize={16} fontWeight={700} textAnchor="middle" fill={hit ? GREEN : BLUE}>{fill(w.far, v)}</text>
          </g>
        )}
        <g pointerEvents="none">
          <rect x={X(a) - 8} y={LINE_Y - 8} width={16} height={16} fill={ORANGE} />
          <text x={X(a)} y={LINE_Y + 46} fontSize={14} fontWeight={700} textAnchor="middle" fill={ORANGE}>a = {signed(a)}</text>
        </g>
        {state.found.map((f) => <circle key={f} cx={X(f)} cy={LINE_Y} r={9} fill={GREEN} pointerEvents="none" />)}
        <g role="slider" tabIndex={0} aria-label={w.pointName} aria-valuenow={x} aria-valuemin={ABS_LO} aria-valuemax={ABS_HI}
          onKeyDown={keys} onPointerDown={(e) => begin(e, {})} style={{ cursor: drag ? "grabbing" : "ew-resize" }}>
          <circle cx={X(x)} cy={LINE_Y} r={22} fill="transparent" />
          <circle cx={X(x)} cy={LINE_Y} r={10} fill="#fff" stroke={BLUE} strokeWidth={3.5} />
          <text x={X(x)} y={LINE_Y + 66} fontSize={14} fontWeight={700} textAnchor="middle" fill={BLUE}>x = {signed(x)}</text>
        </g>
        {say.map((s, i) => <text key={i} x={24} y={SAY_Y + i * 25} fontSize={17} fill={INK}>{s}</text>)}
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}
