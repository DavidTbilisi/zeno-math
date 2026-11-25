// Fill under the curve. n rectangles under f(x) = x²/4 + 1 on [0, 4], their heights taken at the left ends, the right
// ends or the middles of their strips. The words give the sum against the true area: left ends fall short on a rising
// curve, right ends overshoot, middles come closest, and more rectangles bring every sum nearer.
import { n2 } from "../math/parametric";
import { FILL_AREA, FILL_MAX, fillF, riemann } from "../math/accumulation";
import { BLUE, GREEN, RED, Tabs, Track, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 700;
const UX = 85;
const UY = 50;
const X0 = 50;
const Y0 = 330;
const X = (x: number) => X0 + x * UX;
const Y = (y: number) => Y0 - y * UY;
const SAY_Y = 420;
const H = SAY_Y + 4 * 25 + 8;

export function FillUnder({ state, set, w: words, svgRef }: PieceProps<"fillUnder">) {
  const w = words.fillUnder;
  const { which, n } = state;
  const width = 4 / n;
  const s = riemann(which, n);
  const e = s - FILL_AREA;
  const say = wrapWords(
    [fill(w.say, { n, w: n2(width), s: n2(s), a: n2(FILL_AREA) }), fill(e > 0 ? w.over : w.under, { e: n2(Math.abs(e)) }), [w.leftWhy, w.rightWhy, w.midWhy][which], w.more].join(" "),
    80,
  );
  const curve = Array.from({ length: 81 }, (_, i) => i / 20)
    .map((x, i) => `${i ? "L" : "M"}${X(x).toFixed(1)} ${Y(fillF(x)).toFixed(1)}`)
    .join("");
  const c = e > 0 ? RED : GREEN;
  return (
    <>
      <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT}
        style={{ userSelect: "none" }} role="group" aria-label={say.join(" ")}>
        <rect width={W} height={H} fill="#fff" />
        <Tabs x={20} y={10} keys={["0", "1", "2"]} on={String(which)} names={{ 0: w.left, 1: w.right, 2: w.mid }} onPick={(k) => set({ ...state, which: Number(k) })} />
        <g pointerEvents="none">
          {Array.from({ length: n }, (_, i) => {
            const at = width * (i + [0, 1, 0.5][which]);
            const h = fillF(at);
            return (
              <g key={i}>
                <rect x={X(i * width)} y={Y(h)} width={width * UX} height={h * UY} fill={c} fillOpacity={0.18} stroke={c} />
                <circle cx={X(at)} cy={Y(h)} r={n > 8 ? 2.5 : 4} fill={c} />
              </g>
            );
          })}
          <line x1={X(0)} y1={Y0} x2={X(4) + 10} y2={Y0} stroke="#adb5bd" />
          <line x1={X(0)} y1={Y0} x2={X(0)} y2={Y(5)} stroke="#adb5bd" />
          {[0, 1, 2, 3, 4].map((v) => <text key={v} x={X(v)} y={Y0 + 18} fontSize={12} textAnchor="middle" fill="#868e96">{v}</text>)}
          <path d={curve} fill="none" stroke={BLUE} strokeWidth={3} />
          <text x={440} y={84} fontSize={16} fontWeight={700} fill={INK}>{w.eq}</text>
          <text x={440} y={116} fontSize={15} fill={c}>{fill(w.sumShow, { s: n2(s) })}</text>
          <text x={440} y={140} fontSize={15} fill={BLUE}>{fill(w.areaShow, { a: n2(FILL_AREA) })}</text>
        </g>
        <Track x={24} y={380} w={340} value={n} min={1} max={FILL_MAX} label={w.nLabel} show={(v) => `n = ${v}`} color={INK}
          onChange={(v) => v !== n && set({ ...state, n: v })} />
        {say.map((t, i) => <text key={i} x={24} y={SAY_Y + 10 + i * 25} fontSize={16} fill={INK} pointerEvents="none">{t}</text>)}
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}
