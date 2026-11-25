// Walk to the wall. A point on y = top ÷ bottom moves as x is dragged, with the top, the bottom and their quotient
// beside it. Near x = 1 the bottom shrinks towards 0 while the top does not, and y shoots off the picture: a vertical
// asymptote. Far out y settles towards a line, flat or slanted. The second graph, (x² − 4)/(x − 2), has both parts 0 at
// x = 2: no wall, only a hole in the line y = x + 2.
import { short, WALK_FNS, WALK_MAX } from "../math/rational";
import { BLUE, GREEN, MUTED, RED, Tabs, Track, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 700;
const PX = 30;
const U = 36;
const CY = 200;
const UY = 18;
const TOP = 8;
const SAY_Y = 410;
const H = SAY_Y + 3 * 25 + 8;
const ORANGE = "#e8590c";
const X = (x: number) => PX + (x + 6) * U;
const Y = (y: number) => CY - y * UY;

export function AsymptoteWalk({ state, set, w: words, svgRef }: PieceProps<"asymptoteWalk">) {
  const w = words.asymptoteWalk;
  const f = WALK_FNS[state.which];
  const x = state.v / 10;
  const [t, b] = [f.top(x), f.bottom(x)];
  const y = t / b;
  const at = x === f.wall;
  const near = !at && Math.abs(x - f.wall) <= 0.5;
  const far = Math.abs(x) >= 4;
  const farText = f.kind === "flat" ? w.farFlat : f.kind === "slant" ? w.farSlant : w.farHole;
  const say = wrapWords(
    at
      ? fill(f.kind === "hole" ? w.hole : w.wall, { x: short(x), t: short(t), y: short(f.line(x)) })
      : fill(near && f.kind !== "hole" ? w.near : far ? farText : w.mid, { x: short(x), t: short(t), b: short(b), y: short(y), a: short(f.wall), l: short(f.line(x)) }),
    80,
  );
  // The curve in pieces, split at the wall and cut at the top and bottom of the picture.
  const parts: string[] = [];
  let cur = "";
  for (let i = -600; i <= 600; i++) {
    const xx = i / 100;
    const yy = f.top(xx) / f.bottom(xx);
    const ok = Math.abs(xx - f.wall) > 1e-9 && Math.abs(yy) <= TOP;
    if (ok) cur += `${cur ? "L" : "M"}${X(xx).toFixed(1)} ${Y(yy).toFixed(1)}`;
    else if (cur) {
      parts.push(cur);
      cur = "";
    }
  }
  if (cur) parts.push(cur);
  const off = Math.abs(y) > TOP;
  return (
    <>
      <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT}
        style={{ userSelect: "none" }} role="group" aria-label={say.join(" ")}>
        <rect width={W} height={H} fill="#fff" />
        <Tabs x={20} y={10} keys={WALK_FNS.map((_, i) => String(i))} on={String(state.which)}
          names={Object.fromEntries(WALK_FNS.map((g, i) => [i, `(${g.topText}) ÷ (${g.bottomText})`]))} onPick={(k) => set({ ...state, which: Number(k) })} />
        <g pointerEvents="none">
          {Array.from({ length: 13 }, (_, i) => i - 6).map((v) => (
            <g key={v}>
              <line x1={X(v)} y1={Y(TOP)} x2={X(v)} y2={Y(-TOP)} stroke={v === 0 ? INK : "#f1f3f5"} strokeWidth={v === 0 ? 1.5 : 1} />
              {v !== 0 && v % 2 === 0 && <text x={X(v)} y={Y(0) + 15} fontSize={11} textAnchor="middle" fill={MUTED}>{short(v)}</text>}
            </g>
          ))}
          {[-8, -4, 4, 8].map((v) => <text key={v} x={X(0) - 5} y={Y(v) + 4} fontSize={11} textAnchor="end" fill={MUTED}>{short(v)}</text>)}
          <line x1={X(-6)} y1={Y(0)} x2={X(6)} y2={Y(0)} stroke={INK} strokeWidth={1.5} />
          {/* The asymptotes: the wall red, the line far out is approached green. */}
          {f.kind !== "hole" && <line x1={X(f.wall)} y1={Y(TOP)} x2={X(f.wall)} y2={Y(-TOP)} stroke={RED} strokeWidth={2} strokeDasharray="7 5" />}
          {f.kind !== "hole" && (
            <line x1={X(-6)} y1={Y(Math.max(-TOP, Math.min(TOP, f.line(-6))))} x2={X(6)} y2={Y(Math.max(-TOP, Math.min(TOP, f.line(6))))} stroke={GREEN} strokeWidth={2} strokeDasharray="7 5" />
          )}
          {parts.map((d, i) => <path key={i} d={d} fill="none" stroke={BLUE} strokeWidth={3} />)}
          {f.kind === "hole" && <circle cx={X(f.wall)} cy={Y(f.line(f.wall))} r={6} fill="#fff" stroke={BLUE} strokeWidth={2.5} />}
          {!at && !off && <circle cx={X(x)} cy={Y(y)} r={7} fill={ORANGE} />}
          {!at && off && (
            <>
              <path d={`M${X(x) - 8} ${Y(Math.sign(y) * (TOP - 0.8))} L${X(x)} ${Y(Math.sign(y) * TOP)} L${X(x) + 8} ${Y(Math.sign(y) * (TOP - 0.8))}`} fill="none" stroke={ORANGE} strokeWidth={3} />
              <text x={X(x) + 12} y={Y(Math.sign(y) * (TOP - 0.6)) + 5} fontSize={14} fontWeight={700} fill={ORANGE}>{fill(w.offY, { y: short(y) })}</text>
            </>
          )}
          {at && <line x1={X(x)} y1={Y(TOP)} x2={X(x)} y2={Y(-TOP)} stroke={ORANGE} strokeWidth={2} />}
          <text x={500} y={80} fontSize={15} fill={MUTED}>{w.topLabel}</text>
          <text x={500} y={102} fontSize={18} fontWeight={700} fill={INK}>{`${f.topText} = ${short(t)}`}</text>
          <text x={500} y={136} fontSize={15} fill={MUTED}>{w.bottomLabel}</text>
          <text x={500} y={158} fontSize={18} fontWeight={700} fill={b === 0 ? RED : INK}>{`${f.bottomText} = ${short(b)}`}</text>
          <text x={500} y={200} fontSize={18} fontWeight={700} fill={ORANGE}>{b === 0 ? w.noValue : `y = ${short(y)}`}</text>
        </g>
        <Track x={24} y={370} w={440} value={state.v} min={-WALK_MAX} max={WALK_MAX} label={w.xLabel} show={(v) => `x = ${short(v / 10)}`} color={ORANGE}
          onChange={(v) => v !== state.v && set({ ...state, v })} />
        {say.map((s, i) => <text key={i} x={24} y={SAY_Y + 14 + i * 25} fontSize={16} fill={INK} pointerEvents="none">{s}</text>)}
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}
