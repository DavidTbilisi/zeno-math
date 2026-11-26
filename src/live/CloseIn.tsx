// Close in on the break. Two points walk towards x = 2, one from each side, on a function with a hole, one with a jump,
// one with an asymptote, and two pieces joined by k. The words give both values: when both sides head for the same
// number that is the limit, and f is continuous only if f(2) is that number too. On the last tab, drag k until the
// pieces meet.
import { BREAK_X, breakAt, CLOSE_GAPS, n4, sidesAt } from "../math/continuity";
import { BLUE, GREEN, MUTED, RED, Tabs, Track, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 700;
const UX = 60;
const UY = 30;
const L = 40;
const T = 60;
const X = (x: number) => L + (x + 1) * UX;
const Y = (y: number) => T + (7 - y) * UY;
const SAY_Y = 440;
const H = SAY_Y + 4 * 25 + 8;
const ORANGE = "#e8590c";

export function CloseIn({ state, set, w: words, svgRef }: PieceProps<"closeIn">) {
  const w = words.closeIn;
  const { which, step, k } = state;
  const h = CLOSE_GAPS[step];
  const [xl, xr] = [BREAK_X - h, BREAK_X + h];
  const [yl, yr] = [breakAt(which, k, xl) ?? 0, breakAt(which, k, xr) ?? 0];
  const s = sidesAt(which, k);
  const end =
    which === 0 ? w.holeSay : which === 1 ? w.jumpSay : which === 2 ? w.infSay : s.right === s.left ? w.joinMet : fill(w.joinGap, { r: n4(s.right), g: n4(Math.abs(s.right - s.left)) });
  const say = wrapWords(`${fill(w.near, { h, xl: n4(xl), yl: n4(yl), xr: n4(xr), yr: n4(yr) })} ${end}`, 80);
  // Each side of the break as a path, stopped short of an asymptote.
  const piece = (a: number, b: number) =>
    Array.from({ length: 61 }, (_, i) => a + ((b - a) * i) / 60)
      .map((x, i) => `${i ? "L" : "M"}${X(x).toFixed(1)} ${Y(breakAt(which, k, x) ?? 0).toFixed(1)}`)
      .join("");
  const gap = which === 2 ? 0.03 : 1e-6;
  const dot = (y: number | null, open: boolean, key: string) =>
    y !== null && Number.isFinite(y) && <circle key={key} cx={X(BREAK_X)} cy={Y(y)} r={6} fill={open ? "#fff" : BLUE} stroke={BLUE} strokeWidth={2.5} />;
  return (
    <>
      <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT}
        style={{ userSelect: "none" }} role="group" aria-label={say.join(" ")}>
        <rect width={W} height={H} fill="#fff" />
        <defs>
          <clipPath id="closeIn-clip"><rect x={L} y={T} width={6 * UX} height={10 * UY} /></clipPath>
        </defs>
        <Tabs x={20} y={10} keys={["0", "1", "2", "3"]} on={String(which)} names={{ 0: w.hole, 1: w.jump, 2: w.infinite, 3: w.join }}
          onPick={(kk) => set({ ...state, which: Number(kk) })} />
        <g pointerEvents="none">
          {Array.from({ length: 7 }, (_, i) => i - 1).map((v) => (
            <g key={`x${v}`}>
              <line x1={X(v)} y1={T} x2={X(v)} y2={T + 10 * UY} stroke={v === 0 ? "#adb5bd" : "#f1f3f5"} />
              <text x={X(v)} y={Y(0) + 16} fontSize={12} textAnchor="middle" fill={MUTED}>{String(v).replace("-", "−")}</text>
            </g>
          ))}
          {Array.from({ length: 11 }, (_, i) => i - 3).map((v) => (
            <line key={`y${v}`} x1={L} y1={Y(v)} x2={L + 6 * UX} y2={Y(v)} stroke={v === 0 ? "#adb5bd" : "#f1f3f5"} />
          ))}
          {which === 2 && <line x1={X(2)} y1={T} x2={X(2)} y2={T + 10 * UY} stroke={RED} strokeDasharray="6 4" />}
          <g clipPath="url(#closeIn-clip)">
            <path d={piece(-1, BREAK_X - gap)} fill="none" stroke={BLUE} strokeWidth={3} />
            <path d={piece(BREAK_X + gap, 5)} fill="none" stroke={BLUE} strokeWidth={3} />
            {which !== 2 && [dot(s.left, s.left !== s.value, "l"), s.right !== s.left && dot(s.right, s.right !== s.value, "r"), s.value !== null && s.value !== s.left && s.value !== s.right && dot(s.value, false, "v")]}
            {[[xl, yl, ORANGE], [xr, yr, GREEN]].map(([x, y, c]) => (
              <g key={String(c)}>
                <line x1={X(x as number)} y1={Y(0)} x2={X(x as number)} y2={Y(y as number)} stroke={c as string} strokeDasharray="3 3" />
                <circle cx={X(x as number)} cy={Y(y as number)} r={5} fill={c as string} />
              </g>
            ))}
          </g>
          <text x={430} y={84} fontSize={16} fontWeight={700} fill={INK}>{[w.holeEq, w.jumpEq, w.infEq, w.joinEq][which]}</text>
          <text x={430} y={116} fontSize={15} fill={ORANGE}>{fill(w.left, { x: n4(xl), y: n4(yl) })}</text>
          <text x={430} y={140} fontSize={15} fill={GREEN}>{fill(w.right, { x: n4(xr), y: n4(yr) })}</text>
        </g>
        <Track x={24} y={394} w={320} value={step} min={0} max={CLOSE_GAPS.length - 1} label={w.closerLabel} show={(v) => `h = ${CLOSE_GAPS[v]}`} color={INK}
          onChange={(v) => v !== step && set({ ...state, step: v })} />
        {which === 3 && (
          <Track x={360} y={394} w={320} value={k} min={-3} max={3} label={w.kLabel} show={(v) => `k = ${String(v).replace("-", "−")}`} color={RED}
            onChange={(v) => v !== k && set({ ...state, k: v })} />
        )}
        {say.map((t, i) => <text key={i} x={24} y={SAY_Y + 10 + i * 25} fontSize={16} fill={INK} pointerEvents="none">{t}</text>)}
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}
