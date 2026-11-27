// Related rates seen on a sliding ladder (#747). A ladder leans on a wall; the learner drags its foot along the floor
// (or reaches it with Tab and moves it with the arrow keys). The foot always slides out at 1 m/s, drawn as an arrow;
// in the first rounds the top's speed is drawn and read out too, in the last ones only x and y are. Faint ladders at
// equal steps of the foot show the top's drops growing. The rounds are in src/math/ladderRates.ts.
import type { KeyboardEvent } from "react";
import { again, done, heightAt, LADDER_ROUNDS, missOf, moveFoot, next, round2, roundOf, topSpeed, type LadderRound } from "../math/ladderRates";
import { GREEN, MUTED, Pill, useDrag, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 720;
const H = 720;
const WALL = 110;
const FLOOR = 560;
const SPAN = 440;
const ASK = "#e8590c";
const BLUE = "#1971c2";
const UNIT = 60;
const num = (v: number) => String(round2(v)).replace("-", "−");

export function LadderRates({ state, set, w: words, svgRef }: PieceProps<"ladderRates">) {
  const w = words.ladderRates;
  const r = roundOf(state);
  const ok = done(state);
  const { x } = state;
  const s = r ? SPAN / r.L : 1;
  const toX = (px: number) => (px - WALL) / s;
  const { begin, svgProps } = useDrag<{ foot: true }>((d) => set(moveFoot(state, toX(d.x), true)), (d) => set(moveFoot(state, toX(d.x), false)));
  const onKey = (e: KeyboardEvent) => {
    if (!r) return;
    const step: Record<string, number> = { ArrowLeft: -r.step, ArrowDown: -r.step, ArrowRight: r.step, ArrowUp: r.step };
    const d = step[e.key];
    if (!d) return;
    e.preventDefault();
    e.stopPropagation();
    set(moveFoot(state, x + d, true));
  };

  const target = r ? `${r.top[0]}/${r.top[1]}` : "";
  let say = "";
  if (r && state.tried) {
    const miss = missOf(r, x);
    say = ok ? w[`done${state.round}` as "done0"] : fill(w[`${miss}${r.showSpeed ? "" : "Hidden"}` as "slow"], { s: num(topSpeed(r, x)), t: target });
  }
  const askLines = wrapWords(r ? fill(w[`ask${state.round}` as "ask0"], { L: r.L, t: target }) : w.done, 64);
  const sayLines = wrapWords(say, 74);
  const reading = (round: LadderRound) =>
    [`x = ${num(x)} m`, `y = ${num(heightAt(round, x))} m`, round.showSpeed ? fill(w.topIs, { s: num(topSpeed(round, x)) }) : fill(w.topIs, { s: "?" })].join("  ·  ");

  const scene = (live: boolean) => {
    if (!r) return null;
    const y = heightAt(r, x);
    const foot = WALL + x * s;
    const top = FLOOR - y * s;
    const ghosts = [1, 2, 3, 4].map((k) => (k * r.L) / 5);
    const drop = Math.min(220, UNIT * topSpeed(r, x));
    const col = ok ? GREEN : ASK;
    return (
      <>
        <line x1={WALL} y1={FLOOR - SPAN - 20} x2={WALL} y2={FLOOR} stroke={INK} strokeWidth={4} />
        <line x1={WALL} y1={FLOOR} x2={WALL + SPAN + 40} y2={FLOOR} stroke={INK} strokeWidth={4} />
        {ghosts.map((g) => (
          <g key={g} pointerEvents="none" opacity={0.35}>
            <line x1={WALL + g * s} y1={FLOOR} x2={WALL} y2={FLOOR - heightAt(r, g) * s} stroke={MUTED} strokeWidth={2} strokeDasharray="5 5" />
            <circle cx={WALL} cy={FLOOR - heightAt(r, g) * s} r={4} fill={MUTED} />
            <circle cx={WALL + g * s} cy={FLOOR} r={4} fill={MUTED} />
          </g>
        ))}
        <line x1={foot} y1={FLOOR} x2={WALL} y2={top} stroke="#8d5524" strokeWidth={9} strokeLinecap="round" pointerEvents="none" />
        <circle cx={WALL} cy={top} r={8} fill={col} stroke={INK} strokeWidth={1.2} pointerEvents="none" />
        <g pointerEvents="none">
          <line x1={foot} y1={FLOOR + 22} x2={foot + UNIT} y2={FLOOR + 22} stroke={BLUE} strokeWidth={4} />
          <path d={`M${foot + UNIT + 10} ${FLOOR + 22} l-12 -7 v14 z`} fill={BLUE} />
          <text x={foot + UNIT / 2} y={FLOOR + 48} fontSize={15} textAnchor="middle" fill={BLUE}>1 m/s</text>
        </g>
        {r.showSpeed && (
          <g pointerEvents="none" data-top-arrow="">
            <line x1={WALL - 24} y1={top} x2={WALL - 24} y2={top + drop} stroke={col} strokeWidth={4} />
            <path d={`M${WALL - 24} ${top + drop + 10} l-7 -12 h14 z`} fill={col} />
            <text x={WALL - 34} y={top + drop / 2 + 5} fontSize={15} textAnchor="end" fill={col}>{num(topSpeed(r, x))}</text>
          </g>
        )}
        <text x={WALL + x * s / 2} y={FLOOR - 10} fontSize={16} textAnchor="middle" fill={INK} pointerEvents="none">x</text>
        <text x={WALL + 12} y={(FLOOR + top) / 2} fontSize={16} fill={INK} pointerEvents="none">y</text>
        <circle cx={foot} cy={FLOOR} r={11} fill={col} stroke={INK} strokeWidth={1.5} pointerEvents="none" />
        {live && !ok && <rect x={WALL} y={FLOOR - 40} width={SPAN + 40} height={80} fill="transparent" style={{ cursor: "ew-resize" }} onPointerDown={(e) => begin(e, { foot: true })} />}
        {live && !ok && (
          <g role="slider" tabIndex={0} aria-label={fill(w.footLabel, { x: num(x) })} aria-valuenow={x} aria-valuemin={r.step} aria-valuemax={r.L - r.step}
            onKeyDown={onKey} onPointerDown={(e) => begin(e, { foot: true })} style={{ cursor: "ew-resize" }} data-foot={x}>
            <circle cx={foot} cy={FLOOR} r={24} fill="transparent" />
          </g>
        )}
      </>
    );
  };

  return (
    <>
      <svg className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} style={{ userSelect: "none", touchAction: "none" }} {...svgProps}>
        <g data-ask="">
          {askLines.map((l, i) => (
            <text key={i} x={30} y={36 + i * 25} fontSize={19} fontWeight={700} fill={r ? BLUE : MUTED}>{i ? ` ${l}` : l}</text>
          ))}
        </g>
        {r && <text x={W - 30} y={110} fontSize={14} textAnchor="end" fill={MUTED}>{fill(w.round, { k: state.round + 1, n: LADDER_ROUNDS.length })}</text>}
        {scene(true)}
        {r && <text x={W / 2} y={FLOOR + 84} fontSize={18} fontWeight={700} textAnchor="middle" fill={ok ? GREEN : BLUE} data-reading="">{reading(r)}</text>}
        {say && (
          <g data-say="">
            {sayLines.map((l, i) => (
              <text key={i} x={30} y={FLOOR + 114 + i * 22} fontSize={16} fontWeight={ok ? 700 : 400} fill={ok ? GREEN : ASK}>{i ? ` ${l}` : l}</text>
            ))}
          </g>
        )}
        {ok && <Pill x={W - 140} y={130} w={120} h={40} size={17} text={`${w.next} →`} title={w.next} strong onTap={() => set(next(state))} />}
        {!r && <Pill x={30} y={90} w={170} h={36} text={w.again} onTap={() => set(again())} />}
      </svg>
      <p className="live-hint">{w.hint}</p>
      <div hidden>
        <svg ref={svgRef} width={W} height={FLOOR + 100 - 90} viewBox={`0 90 ${W} ${FLOOR + 100 - 90}`} fontFamily={FONT}>
          <rect x={0} y={90} width={W} height={FLOOR + 10} fill="#fff" />
          {scene(false)}
          {r && <text x={W / 2} y={FLOOR + 84} fontSize={17} fontWeight={700} textAnchor="middle" fill={BLUE}>{reading(r)}</text>}
        </svg>
      </div>
    </>
  );
}
