// Pins and a string. Ellipse: two pins c either side of the centre and a loop of string 10 long round them and a
// pencil; drag the pencil round and the two lengths change but always add to 10. Push the pins together and the ellipse
// becomes a circle; spread them and it flattens, b² = 25 − c². Parabola: a focus and a line; the pencil keeps the same
// distance from each, and the curve it traces is y = x² ÷ 4p.
import { ellipsePoint, PIN_A, strings, two, type LivePinString } from "../math/conics";
import { BLUE, GREEN, MUTED, RED, Tabs, Track, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 700;
const U = 30;
const CX = 230;
const CY = 190;
const SAY_Y = 420;
const H = SAY_Y + 3 * 25 + 8;
const ORANGE = "#e8590c";
const X = (x: number) => CX + x * U;
const Y = (y: number) => CY - y * U;

export function PinString({ state, set, w: words, svgRef }: PieceProps<"pinString">) {
  const w = words.pinString;
  const ell = state.kind === "ellipse";
  const c = state.c;
  const b = Math.sqrt(PIN_A * PIN_A - c * c);
  const pen: [number, number] = ell ? ellipsePoint(state.t, c) : [state.x, (state.x * state.x) / (4 * state.p)];
  const [d1, d2] = ell ? strings(pen, c) : [Math.hypot(pen[0], pen[1] - state.p), pen[1] + state.p];
  const say = wrapWords(
    ell
      ? c === 0
        ? fill(w.circle, { d1: two(d1), d2: two(d2) })
        : fill(w.ellipse, { d1: two(d1), d2: two(d2), c, w: 2 * PIN_A, h: two(2 * b), b2: two(b * b), c2: c * c })
      : fill(w.parabola, { d1: two(d1), d2: two(d2), k: 4 * state.p, p: state.p }),
    80,
  );
  const curve = ell
    ? Array.from({ length: 73 }, (_, i) => ellipsePoint(i * 5, c))
    : Array.from({ length: 121 }, (_, i) => -6 + i * 0.1).map((x) => [x, (x * x) / (4 * state.p)] as [number, number]).filter(([, y]) => y <= 6);
  const d = curve.map(([x, y], i) => `${i ? "L" : "M"}${X(x).toFixed(1)} ${Y(y).toFixed(1)}`).join("");
  return (
    <>
      <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT}
        style={{ userSelect: "none" }} role="group" aria-label={say.join(" ")}>
        <rect width={W} height={H} fill="#fff" />
        <Tabs x={20} y={10} keys={["ellipse", "parabola"]} on={state.kind} names={{ ellipse: w.ellipseTab, parabola: w.parabolaTab }}
          onPick={(k) => set({ ...state, kind: k as LivePinString["kind"] })} />
        <g pointerEvents="none">
          {Array.from({ length: 13 }, (_, i) => i - 6).map((v) => (
            <g key={v}>
              <line x1={X(v)} y1={Y(6)} x2={X(v)} y2={Y(-6)} stroke={v === 0 ? "#adb5bd" : "#f1f3f5"} />
              <line x1={X(-6)} y1={Y(v)} x2={X(6)} y2={Y(v)} stroke={v === 0 ? "#adb5bd" : "#f1f3f5"} />
            </g>
          ))}
          <path d={d} fill="none" stroke={BLUE} strokeWidth={3} strokeOpacity={0.85} />
          {ell ? (
            <>
              <line x1={X(-c)} y1={Y(0)} x2={X(pen[0])} y2={Y(pen[1])} stroke={ORANGE} strokeWidth={3} />
              <line x1={X(c)} y1={Y(0)} x2={X(pen[0])} y2={Y(pen[1])} stroke={GREEN} strokeWidth={3} />
              {[-c, c].map((x, i) => <circle key={i} cx={X(x)} cy={Y(0)} r={6} fill={RED} />)}
            </>
          ) : (
            <>
              <line x1={X(-6)} y1={Y(-state.p)} x2={X(6)} y2={Y(-state.p)} stroke={RED} strokeWidth={2.5} />
              <line x1={X(0)} y1={Y(state.p)} x2={X(pen[0])} y2={Y(pen[1])} stroke={ORANGE} strokeWidth={3} />
              <line x1={X(pen[0])} y1={Y(pen[1])} x2={X(pen[0])} y2={Y(-state.p)} stroke={GREEN} strokeWidth={3} />
              <circle cx={X(0)} cy={Y(state.p)} r={6} fill={RED} />
            </>
          )}
          <circle cx={X(pen[0])} cy={Y(pen[1])} r={7} fill={INK} />
          <text x={460} y={90} fontSize={15} fill={ORANGE}>{fill(ell ? w.left : w.toFocus, { d: two(d1) })}</text>
          <text x={460} y={114} fontSize={15} fill={GREEN}>{fill(ell ? w.right : w.toLine, { d: two(d2) })}</text>
          <text x={460} y={144} fontSize={17} fontWeight={700} fill={INK}>{ell ? fill(w.sum, { s: two(d1 + d2) }) : fill(w.equal, { d: two(d1) })}</text>
          <text x={460} y={174} fontSize={15} fill={MUTED}>{ell ? (c === 0 ? w.isCircle : fill(w.eq, { b2: two(b * b) })) : fill(w.peq, { k: 4 * state.p })}</text>
        </g>
        {ell ? (
          <>
            <Track x={24} y={378} w={320} value={state.t} min={0} max={360} label={w.penLabel} show={(v) => `${v}°`} color={INK}
              onChange={(t) => t !== state.t && set({ ...state, t })} />
            <Track x={360} y={378} w={320} value={c} min={0} max={4} label={w.pinsLabel} show={(v) => fill(w.pinsShow, { c: v })} color={RED}
              onChange={(cc) => cc !== state.c && set({ ...state, c: cc })} />
          </>
        ) : (
          <>
            <Track x={24} y={378} w={320} value={state.x * 2} min={-10} max={10} label={w.penLabel} show={(v) => `x = ${two(v / 2)}`} color={INK}
              onChange={(v) => v / 2 !== state.x && set({ ...state, x: v / 2 })} />
            <Track x={360} y={378} w={320} value={state.p} min={1} max={3} label={w.focusLabel} show={(v) => fill(w.focusShow, { p: v })} color={RED}
              onChange={(p) => p !== state.p && set({ ...state, p })} />
          </>
        )}
        {say.map((t, i) => <text key={i} x={24} y={SAY_Y + 14 + i * 25} fontSize={16} fill={INK} pointerEvents="none">{t}</text>)}
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}
