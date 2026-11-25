// Drop a point. A slope field, a short dash at every whole point with the slope y′ there. Tap the field to drop a
// point, or drag its start up and down: the curve it traces follows the dashes, and it is the solution through that
// point. On the logistic field every curve below 8 levels off at 8; on y′ = x − y every curve is pulled to y = x − 1.
import { DROP_BOX, fieldSlope, solution } from "../math/slopeFields";
import { n4 } from "../math/continuity";
import { BLUE, MUTED, RED, Tabs, Track, wrapWords } from "./hand";
import { fill, FONT, INK, svgPoint, type PieceProps } from "./ui";

const W = 700;
const UX = 45;
const UY = 25;
const L = 40;
const T = 60;
const X = (x: number) => L + (x - DROP_BOX.x0) * UX;
const Y = (y: number) => T + (DROP_BOX.y1 - y) * UY;
const SAY_Y = 440;
const H = SAY_Y + 4 * 25 + 8;
const ORANGE = "#e8590c";

export function DropPoint({ state, set, w: words, svgRef }: PieceProps<"dropPoint">) {
  const w = words.dropPoint;
  const { which, x0, y0 } = state;
  const s = fieldSlope(which, x0, y0);
  const still = s === 0 && which !== 2;
  const say = wrapWords(
    [fill(w.dropped, { x: n4(x0), y: n4(y0), s: n4(s) }), still ? fill(w.eqSay, { y: n4(y0) }) : [w.growthSay, w.logisticSay, w.lineSay][which]].join(" "),
    80,
  );
  const dashes: [number, number][] = [];
  for (let x = DROP_BOX.x0; x <= DROP_BOX.x1; x++) for (let y = DROP_BOX.y0; y <= DROP_BOX.y1; y++) dashes.push([x, y]);
  const path = solution(which, x0, y0)
    .map(([x, y], i) => `${i ? "L" : "M"}${X(x).toFixed(1)} ${Y(y).toFixed(1)}`)
    .join("");
  const drop = (e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const [px, py] = svgPoint(svgRef.current, e);
    const half = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(v * 2) / 2));
    set({ ...state, x0: half((px - L) / UX + DROP_BOX.x0, DROP_BOX.x0, DROP_BOX.x1), y0: half(DROP_BOX.y1 - (py - T) / UY, DROP_BOX.y0, DROP_BOX.y1) });
  };
  return (
    <>
      <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT}
        style={{ userSelect: "none" }} role="group" aria-label={say.join(" ")}>
        <rect width={W} height={H} fill="#fff" />
        <defs>
          <clipPath id="dropPoint-clip"><rect x={L} y={T} width={(DROP_BOX.x1 - DROP_BOX.x0) * UX} height={(DROP_BOX.y1 - DROP_BOX.y0) * UY} /></clipPath>
        </defs>
        <Tabs x={20} y={10} keys={["0", "1", "2"]} on={String(which)} names={{ 0: w.growth, 1: w.logistic, 2: w.line }} onPick={(k) => set({ ...state, which: Number(k) })} />
        <g pointerEvents="none">
          <line x1={L} y1={Y(0)} x2={X(DROP_BOX.x1)} y2={Y(0)} stroke="#adb5bd" />
          <line x1={L} y1={T} x2={L} y2={Y(DROP_BOX.y0)} stroke="#adb5bd" />
          {[0, 2, 4, 6, 8].map((v) => <text key={`x${v}`} x={X(v)} y={Y(0) + 16} fontSize={12} textAnchor="middle" fill={MUTED}>{v}</text>)}
          {[-2, 2, 4, 6, 8, 10].map((v) => <text key={`y${v}`} x={L - 6} y={Y(v) + 4} fontSize={12} textAnchor="end" fill={MUTED}>{String(v).replace("-", "−")}</text>)}
          {dashes.map(([x, y]) => {
            // The dash's direction in pixels, (UX, −UY·slope), scaled to 16 long.
            const [dx, dy] = [UX, -UY * fieldSlope(which, x, y)];
            const k = 8 / Math.hypot(dx, dy);
            return <line key={`${x},${y}`} x1={X(x) - dx * k} y1={Y(y) - dy * k} x2={X(x) + dx * k} y2={Y(y) + dy * k} stroke="#868e96" strokeWidth={1.5} />;
          })}
          {which === 1 && <line x1={L} y1={Y(8)} x2={X(DROP_BOX.x1)} y2={Y(8)} stroke={RED} strokeDasharray="6 4" />}
          {which === 2 && <line x1={X(0)} y1={Y(-1)} x2={X(8)} y2={Y(7)} stroke={RED} strokeDasharray="6 4" />}
          <g clipPath="url(#dropPoint-clip)">
            <path d={path} fill="none" stroke={BLUE} strokeWidth={3} />
          </g>
          <circle cx={X(x0)} cy={Y(y0)} r={7} fill={ORANGE} stroke={INK} />
          <text x={440} y={84} fontSize={16} fontWeight={700} fill={INK}>{[w.eqGrowth, w.eqLogistic, w.eqLine][which]}</text>
        </g>
        <rect x={L} y={T} width={(DROP_BOX.x1 - DROP_BOX.x0) * UX} height={(DROP_BOX.y1 - DROP_BOX.y0) * UY} fill="transparent" style={{ cursor: "crosshair" }}
          onPointerDown={(e) => e.stopPropagation()} onClick={drop} />
        <Track x={430} y={130} w={250} value={y0 * 2} min={DROP_BOX.y0 * 2} max={DROP_BOX.y1 * 2} label={w.yLabel} show={(v) => `y = ${n4(v / 2)}`} color={ORANGE}
          onChange={(v) => v !== y0 * 2 && set({ ...state, y0: v / 2 })} />
        {say.map((t, i) => <text key={i} x={24} y={SAY_Y + 10 + i * 25} fontSize={16} fill={INK} pointerEvents="none">{t}</text>)}
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}
