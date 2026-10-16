// The estimation game: a number, a line with nothing on it but its ends, and a pin to drag along it. Let go, and the
// number's real place shows with how far off the pin was. Nine rounds of five (easy, medium, hard) earn up to three
// stars for how close they come on average, showing the half-way mark caps them at two, and a round opens once the
// one before it has a star; the endless run keeps a streak of pins within 5 %, and the best streak is kept.
import { useState } from "react";
import {
  currentTask,
  ESTIMATE_LADDER,
  ESTIMATE_NOTICES,
  estimateNotice,
  judgePin,
  numText,
  offText,
  pinError,
  ROUND,
  roundStars,
  shareAlong,
  type EstimateLevel,
} from "../math/estimate";
import { withBest, withFound, withStars } from "../math/ladder";
import { play } from "./juice";
import { Cheer, Found, GameNav, newSeed, nextStage, Onward, RoundDots, SoundToggle, starText, useLadder } from "./ladderUi";
import { fill, FONT, INK, svgPoint, Toggle, type PieceProps } from "./ui";

const W = 700;
const H = 210;
const X0 = 50;
const X1 = W - 50;
const Y = 130;
const BLUE = "#1971c2";
const GREEN = "#2f9e44";
const ORANGE = "#e8590c";
const RED = "#e03131";

export function Estimate({ state: d, set, w: words, svgRef }: PieceProps<"estimate">) {
  const [w, g] = [words.estimate, words.game];
  const [ladder, keep] = useLadder("zeno.estimate.v1", ESTIMATE_LADDER.length, ESTIMATE_NOTICES);
  const [drag, setDrag] = useState<number | null>(null);
  const [cheer, setCheer] = useState(0);
  const task = currentTask(d);
  const { from, to } = task.play;
  const X = (v: number) => X0 + shareAlong(task.play, v) * (X1 - X0);
  const valueAt = (e: { clientX: number; clientY: number }) => {
    const [x] = svgPoint(svgRef.current!, e);
    return from + Math.max(0, Math.min(1, (x - X0) / (X1 - X0))) * (to - from);
  };

  const placed = d.pin !== null;
  const roundDone = d.mode === "puzzle" && d.said?.kind === "done";
  const drop = (x: number) => {
    const e = pinError(task.play, task.v, x);
    const v = judgePin(task.play, task.v, String(x));
    play(v.ok ? "good" : "close" in v && v.close ? "snap" : "miss");
    const errors = [...d.errors, e];
    const streak = d.mode === "endless" ? (v.ok ? d.streak + 1 : 0) : d.streak;
    const last = d.mode === "puzzle" && d.i === ROUND - 1;
    const key = estimateNotice(task, x, last ? errors : null, streak);
    let next = withBest(ladder, d.mode === "endless" ? streak : 0);
    if (key && !next.found.includes(key)) {
      next = withFound(next, key, ESTIMATE_NOTICES);
      setTimeout(() => play("star"), 200);
    }
    let said: typeof d.said = key ? { kind: "notice", key } : null;
    if (last) {
      const stars = roundStars(errors, d.peeked);
      next = withStars(next, d.stage, stars);
      said = { kind: "done", stars };
      setTimeout(() => play("star"), 300);
      setCheer((c) => c + 1);
    }
    if (next !== ladder) keep(next);
    set({ ...d, pin: x, errors, streak, said });
  };
  const down = (e: React.PointerEvent<SVGSVGElement>) => {
    if (placed || !svgRef.current || e.button > 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag(valueAt(e));
  };
  const move = (e: React.PointerEvent) => drag !== null && setDrag(valueAt(e));
  const up = () => {
    if (drag === null) return;
    setDrag(null);
    drop(drag);
  };

  const go = (stage: number) => set({ ...d, mode: "puzzle", stage, i: 0, errors: [], pin: null, peeked: false, said: null });
  const endless = (level: EstimateLevel) => set({ ...d, mode: "endless", level, seed: newSeed(), i: 0, errors: [], pin: null, peeked: false, said: null });
  const next = () => {
    if (d.mode === "endless") return set({ ...d, seed: newSeed(), pin: null, said: null });
    if (roundDone) return go(nextStage(d.stage, ESTIMATE_LADDER.length));
    set({ ...d, i: d.i + 1, pin: null, said: null });
  };
  const toggleHalf = () => set({ ...d, half: !d.half, peeked: d.peeked || (d.mode === "puzzle" && !d.half && !roundDone) });

  const pin = drag ?? d.pin;
  const result = (() => {
    if (d.pin === null) return null;
    const v = judgePin(task.play, task.v, String(d.pin));
    const off = offText(task.play, task.v, d.pin);
    return v.ok ? { text: fill(w.right, { d: off }), color: GREEN } : "close" in v && v.close ? { text: fill(w.close, { d: off }), color: ORANGE } : { text: fill(w.far, { d: off }), color: RED };
  })();
  const said = d.said?.kind === "notice" ? w.notices[d.said.key] : d.said?.kind === "done" ? fill(w.roundDone, { stars: starText(d.said.stars) }) : null;

  return (
    <>
      <GameNav ladder={ladder} mode={d.mode} stage={d.stage} level={d.level} streak={d.streak} onPuzzle={go} onEndless={endless} words={w} g={g}>
        <RoundDots results={d.errors.map((e) => e <= 0.05)} i={d.i} size={ROUND} />
      </GameNav>
      <div className="geo-stage-wrap">
        <svg
          ref={svgRef}
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          fontFamily={FONT}
          role="img"
          aria-label={fill(w.place, { n: task.text })}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={() => setDrag(null)}
          style={{ cursor: placed ? "default" : "pointer", touchAction: "none" }}
        >
          <rect width={W} height={H} fill="#fff" />
          <text x={W / 2} y={44} fontSize={34} fontWeight={700} textAnchor="middle" fill={INK}>{task.text}</text>
          <line x1={X0} y1={Y} x2={X1} y2={Y} stroke={INK} strokeWidth={3} />
          {[from, to].map((v) => (
            <g key={v}>
              <line x1={X(v)} y1={Y - 14} x2={X(v)} y2={Y + 14} stroke={INK} strokeWidth={3} />
              <text x={X(v)} y={Y + 42} fontSize={22} fontWeight={700} textAnchor="middle" fill={INK}>{numText(v)}</text>
            </g>
          ))}
          {d.half && <line x1={(X0 + X1) / 2} y1={Y - 10} x2={(X0 + X1) / 2} y2={Y + 10} stroke="#868e96" strokeWidth={2} strokeDasharray="4 3" />}
          {placed && result && (
            <g className="est-reveal">
              <line x1={X(d.pin!)} y1={Y + 22} x2={X(task.v)} y2={Y + 22} stroke={result.color} strokeWidth={4} strokeLinecap="round" />
              <path d={`M${X(task.v)},${Y - 4} l-10,-20 h20 z`} fill={GREEN} />
              <text x={X(task.v)} y={Y - 30} fontSize={20} fontWeight={700} textAnchor="middle" fill={GREEN}>{task.text}</text>
            </g>
          )}
          {pin !== null && (
            <g>
              <line x1={X(pin)} y1={Y - 26} x2={X(pin)} y2={Y + 8} stroke={BLUE} strokeWidth={3} />
              <circle cx={X(pin)} cy={Y - 30} r={drag !== null ? 10 : 8} fill={BLUE} />
            </g>
          )}
        </svg>
        {cheer > 0 && roundDone && d.said?.kind === "done" && <Cheer key={cheer} text={starText(d.said.stars)} />}
      </div>
      <div className="live-bar">
        <Toggle on={d.half} onClick={toggleHalf} title={d.mode === "puzzle" ? w.peek : undefined}>½ {w.half}</Toggle>
        {placed && <Onward mode={d.mode} stage={d.stage} size={ESTIMATE_LADDER.length} rounds finished={roundDone} onClick={next} g={g} />}
        <SoundToggle title={g.sound} />
      </div>
      <p
        className={d.said?.kind === "notice" ? "live-said notice" : d.said?.kind === "done" ? "live-said ok" : result ? "live-said" : "live-hint"}
        style={result && !said ? { color: result.color } : undefined}
      >
        {said ?? result?.text ?? w.hint} <Found ladder={ladder} of={ESTIMATE_NOTICES.length} notices={w.notices} g={g} />
      </p>
    </>
  );
}
