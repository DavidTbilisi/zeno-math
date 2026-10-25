// The estimation game: a number, a line with nothing on it but its ends, and a pin to drag along it. Let go, and the
// number's real place shows with how far off the pin was. Nine rounds of five (easy, medium, hard) earn up to three
// stars for how close they come on average, showing the half-way mark caps them at two, and a round opens once the
// one before it has a star; the endless run keeps a streak of pins within 5 %, and the best streak is kept. Built on
// the game shell (useGame): a pin within 5 % is a step, one further off a miss, and the fifth of a round finishes it.
import { useState } from "react";
import { currentTask, ESTIMATE_LADDER, ESTIMATE_NOTICES, estimateNotice, judgePin, numText, offText, pinError, ROUND, roundStars, shareAlong, type LiveEstimate } from "../math/estimate";
import { newSeed, RoundDots, starText } from "./ladderUi";
import { fill, FONT, INK, svgPoint, Toggle, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const W = 700;
const H = 210;
const X0 = 50;
const X1 = W - 50;
const Y = 130;
const BLUE = "#1971c2";
const GREEN = "#2f9e44";
const FRESH: Partial<LiveEstimate> = { i: 0, errors: [], pin: null, peeked: false, said: null };

export function Estimate({ state: d, set, w: words, svgRef }: PieceProps<"estimate">) {
  const [w, g] = [words.estimate, words.game];
  const game = useGame({ key: "zeno.estimate.v1", size: ESTIMATE_LADDER.length, notices: ESTIMATE_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const [drag, setDrag] = useState<number | null>(null);
  const task = currentTask(d);
  const { from, to } = task.play;
  const X = (v: number) => X0 + shareAlong(task.play, v) * (X1 - X0);
  const valueAt = (e: { clientX: number; clientY: number }) => {
    const [x] = svgPoint(svgRef.current!, e);
    return from + Math.max(0, Math.min(1, (x - X0) / (X1 - X0))) * (to - from);
  };

  const placed = d.pin !== null;
  const last = d.mode === "puzzle" && d.i === ROUND - 1;
  const roundDone = last && placed;
  const stars = roundDone ? roundStars(d.errors, d.peeked) : 0;
  const drop = (x: number) => {
    const v = judgePin(task.play, task.v, String(x));
    const errors = [...d.errors, pinError(task.play, task.v, x)];
    const patch: Partial<LiveEstimate> = { pin: x, errors };
    const notice = (streak: number) => estimateNotice(task, x, last ? errors : null, streak);
    if (last) return game.win({ stars: roundStars(errors, d.peeked), right: v.ok, clean: v.ok, notice, patch });
    if (v.ok) return game.step(patch, { notice });
    game.miss(patch, { notice });
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

  // On: another number of the endless run, the next of the round, or (the round done) the shell's way on.
  const next = () => {
    if (d.mode === "endless") return set({ ...d, seed: newSeed(), pin: null, said: null });
    if (roundDone) return game.onward();
    set({ ...d, i: d.i + 1, pin: null, said: null });
  };
  const toggleHalf = () => set({ ...d, half: !d.half, peeked: d.peeked || (d.mode === "puzzle" && !d.half && !roundDone) });

  const pin = drag ?? d.pin;
  // How the pin did: within 5 % right, close in orange, far in red.
  const result = (() => {
    if (d.pin === null) return null;
    const v = judgePin(task.play, task.v, String(d.pin));
    const off = offText(task.play, task.v, d.pin);
    return v.ok ? { tone: "ok" as const, text: fill(w.right, { d: off }) } : "close" in v && v.close ? { tone: "near" as const, text: fill(w.close, { d: off }) } : { tone: "wrong" as const, text: fill(w.far, { d: off }) };
  })();
  const notice = d.said?.kind === "notice" ? w.notices[d.said.key] : null;
  const line: Line =
    roundDone ? { tone: notice ? "notice" : "ok", text: `${notice ? `${notice} ` : ""}${fill(w.roundDone, { stars: starText(stars) })}${stars === 1 ? ` ${g.oneStar}` : ""}` }
    : notice ? { tone: "notice", text: notice }
    : result ?? { tone: "hint", text: w.hint };

  return (
    <>
      <GameHead game={game} g={g} words={w}>
        <RoundDots results={d.errors.map((e) => e <= 0.05)} i={d.i} size={ROUND} />
      </GameHead>
      <Stage game={game} stars={stars} done={roundDone} g={g} notices={w.notices}>
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
              <line x1={X(d.pin!)} y1={Y + 22} x2={X(task.v)} y2={Y + 22} stroke={result.tone === "ok" ? GREEN : result.tone === "near" ? "#e8590c" : "#e03131"} strokeWidth={4} strokeLinecap="round" />
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
      </Stage>
      <GameActions game={game} g={g} done={placed} finished={roundDone} rounds onward={next} always>
        <Toggle on={d.half} onClick={toggleHalf} title={d.mode === "puzzle" ? w.peek : undefined}>½ {w.half}</Toggle>
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
