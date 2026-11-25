// Fish in a pond. A hundred fish, some red; tap ten to take a sample, and its share of red estimates how many red are
// in the whole pond. Each estimate is stacked on a line under the pond, orange for picks by hand and blue for samples
// drawn at random with the die. After five samples the true number shows: the random ones scatter around it, and the
// hand-picked ones tend to lean high, since the red fish are bigger and catch the eye.
import { drawRandom, estimate, FISH, REVEAL, SAMPLE, tapFish, TRUE_RED } from "../math/sampling";
import { BLUE, DieButton, GREEN, keyTap, MUTED, RED, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 700;
const PX = 20;
const PY = 20;
const PW = 400;
const PH = 250;
const LINE_Y = 360;
const SAY_Y = 400;
const H = SAY_Y + 3 * 25 + 8;
const ORANGE = "#e8590c";
const LX = (v: number) => 40 + v * 6.2;

export function SampleField({ state, set, w: words, svgRef }: PieceProps<"sampleField">) {
  const w = words.sampleField;
  const picked = new Set(state.picked);
  const reds = state.picked.filter((i) => FISH[i].red).length;
  const full = state.picked.length === SAMPLE;
  const shown = state.samples.length >= REVEAL;
  const say = wrapWords(
    [
      full ? fill(w.estimate, { r: reds, e: estimate(state.picked) }) : state.picked.length ? fill(w.counting, { k: state.picked.length, r: reds }) : w.start,
      shown ? fill(w.reveal, { t: TRUE_RED }) : state.samples.length ? w.more : "",
    ].filter(Boolean).join(" "),
    76,
  );
  // The estimates, stacked where they fall on the line from 0 to 100.
  const stack = new Map<number, number>();
  const dots = state.samples.map((s) => {
    const k = stack.get(s.v) ?? 0;
    stack.set(s.v, k + 1);
    return { ...s, k };
  });

  return (
    <>
      <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT}
        style={{ userSelect: "none" }} role="group" aria-label={say.join(" ")}>
        <rect width={W} height={H} fill="#fff" />
        <rect x={PX} y={PY} width={PW} height={PH} rx={18} fill="#e7f5ff" stroke="#a5d8ff" strokeWidth={2} pointerEvents="none" />
        {FISH.map((f, i) => {
          const on = picked.has(i);
          const r = f.red ? 9 : 6;
          return (
            <g key={i} role="button" tabIndex={0} aria-label={fill(w.fishName, { i: i + 1 })} aria-pressed={on} onKeyDown={(e) => keyTap(e, () => set(tapFish(state, i)))}
              onPointerDown={(e) => e.stopPropagation()} onClick={() => set(tapFish(state, i))} style={{ cursor: "pointer" }}
              transform={`translate(${PX + f.x} ${PY + f.y})`}>
              <circle r={14} fill="transparent" />
              {/* A fish: a body and a tail. */}
              <ellipse rx={r * 1.4} ry={r * 0.8} fill={f.red ? RED : "#4dabf7"} fillOpacity={f.red ? 0.85 : 0.75} pointerEvents="none" />
              <path d={`M${r * 1.2} 0 l${r * 0.9} ${-r * 0.7} v${r * 1.4} z`} fill={f.red ? RED : "#4dabf7"} fillOpacity={0.7} pointerEvents="none" />
              {on && <circle r={r * 1.7} fill="none" stroke={ORANGE} strokeWidth={3} pointerEvents="none" />}
            </g>
          );
        })}
        {/* The die: ten fish at random. */}
        <DieButton x={PX + PW + 40} y={PY + 10} s={52} title={w.die} onTap={() => set(drawRandom(state))} />
        <text x={PX + PW + 104} y={PY + 42} fontSize={15} fill={INK} pointerEvents="none">{w.die}</text>
        <g pointerEvents="none">
          <text x={PX + PW + 40} y={PY + 104} fontSize={18} fontWeight={700} fill={ORANGE}>{fill(w.picked, { k: state.picked.length, n: SAMPLE })}</text>
          <text x={PX + PW + 40} y={PY + 132} fontSize={16} fill={INK}>{fill(w.reds, { r: reds })}</text>
          <circle cx={PX + PW + 48} cy={PY + 176} r={6} fill={ORANGE} />
          <text x={PX + PW + 62} y={PY + 181} fontSize={14} fill={INK}>{w.byHand}</text>
          <circle cx={PX + PW + 48} cy={PY + 202} r={6} fill={BLUE} />
          <text x={PX + PW + 62} y={PY + 207} fontSize={14} fill={INK}>{w.atRandom}</text>
          {/* The line of estimates. */}
          <text x={40} y={LINE_Y - 60} fontSize={14} fontWeight={700} fill={INK}>{w.estimates}</text>
          <line x1={LX(0)} y1={LINE_Y} x2={LX(100)} y2={LINE_Y} stroke={INK} strokeWidth={1.5} />
          {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((v) => (
            <g key={v}>
              <line x1={LX(v)} y1={LINE_Y} x2={LX(v)} y2={LINE_Y + 5} stroke={INK} />
              <text x={LX(v)} y={LINE_Y + 19} fontSize={12} textAnchor="middle" fill={MUTED}>{v}</text>
            </g>
          ))}
          {dots.map((d, i) => <circle key={i} cx={LX(d.v)} cy={LINE_Y - 8 - d.k * 11} r={5} fill={d.hand ? ORANGE : BLUE} />)}
          {shown && (
            <>
              <line x1={LX(TRUE_RED)} y1={LINE_Y - 64} x2={LX(TRUE_RED)} y2={LINE_Y + 4} stroke={GREEN} strokeWidth={3} strokeDasharray="5 3" />
              <text x={LX(TRUE_RED) + 6} y={LINE_Y - 52} fontSize={14} fontWeight={700} fill={GREEN}>{fill(w.truth, { t: TRUE_RED })}</text>
            </>
          )}
        </g>
        {say.map((t, i) => <text key={i} x={24} y={SAY_Y + i * 25} fontSize={16} fill={INK} pointerEvents="none">{t}</text>)}
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}
