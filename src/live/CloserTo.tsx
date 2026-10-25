// Closer to? A number (or a calculation) and two or three benchmarks: tap the nearest. After each pick a little line
// shows where the number really is between them. Nine rounds of eight earn stars for how many were right; in the
// endless run a bar runs down for every question, four seconds at first and a tenth less with every right answer in a
// row, and when it runs out the question counts as missed. Built on the game shell (useGame): a right pick is a step,
// a wrong one (or the time running out) a miss, and the last of a round finishes it.
import { useEffect, useRef } from "react";
import { NEAR_LADDER, NEAR_NOTICES, nearLimit, nearNotice, nearNow, nearStars, placeOn, ROUND, type LiveNear } from "../math/benchmark";
import { newSeed, RoundDots, starText } from "./ladderUi";
import { fill, FONT, INK, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const W = 600;
const [X0, X1, Y] = [80, 520, 150];
const GREEN = "#2f9e44";
const RED = "#e03131";
const FRESH: Partial<LiveNear> = { i: 0, results: [], picked: null, said: null };

export function CloserTo({ state: d, set, w: words, svgRef }: PieceProps<"closerTo">) {
  const [w, g] = [words.closerTo, words.game];
  const game = useGame({ key: "zeno.closerto.v1", size: NEAR_LADDER.length, notices: NEAR_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const shownAt = useRef(performance.now());
  const task = nearNow(d);
  const limit = nearLimit(d.streak);
  const last = d.mode === "puzzle" && d.i === ROUND - 1;
  const answered = d.picked !== null;
  const roundDone = last && answered;
  const stars = roundDone ? nearStars(d.results.filter(Boolean).length) : 0;

  // Picks for the question shown; the timer's pick is the render's own, so it is for the question it was set for.
  const pick = (k: number) => {
    if (answered) return;
    const right = k === task.right;
    const results = [...d.results, right];
    const patch: Partial<LiveNear> = { picked: k, results };
    const notice = (streak: number) => nearNotice(task, right, performance.now() - shownAt.current, last ? results : null, streak);
    if (last) return game.win({ stars: nearStars(results.filter(Boolean).length), right, clean: right, notice, patch });
    if (right) return game.step(patch, { notice });
    game.miss(patch, { notice });
  };

  // A new question: its clock starts now, and in the endless run its time runs out.
  useEffect(() => {
    shownAt.current = performance.now();
    if (d.mode !== "endless" || d.picked !== null) return;
    const timer = setTimeout(() => pick(-1), limit);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.mode, d.stage, d.seed, d.i, d.picked]);

  // On: another question of the endless run, the next of the round, or (the round done) the shell's way on.
  const onward = () => {
    if (d.mode === "endless") return set({ ...d, seed: newSeed(), picked: null, said: null });
    if (roundDone) return game.onward();
    set({ ...d, i: d.i + 1, picked: null, said: null });
  };

  const X = (f: number) => X0 + f * (X1 - X0);
  const right = d.picked === task.right;
  const notice = d.said?.kind === "notice" ? w.notices[d.said.key] : null;
  const line: Line =
    roundDone ? { tone: notice ? "notice" : "ok", text: `${notice ? `${notice} ` : ""}${fill(w.roundDone, { stars: starText(stars) })}${stars === 1 ? ` ${g.oneStar}` : ""}` }
    : notice ? { tone: "notice", text: notice }
    : d.picked === -1 ? { tone: "wrong", text: fill(w.timeUp, { b: task.options[task.right].text }) }
    : answered ? { tone: right ? "ok" : "wrong", text: right ? w.right : fill(w.wrong, { b: task.options[task.right].text }) }
    : { tone: "hint", text: w.ask };
  return (
    <>
      <GameHead game={game} g={g} words={w}>
        <RoundDots results={d.results} i={d.i} size={ROUND} />
      </GameHead>
      {d.mode === "endless" && (
        <div className="near-clock" aria-hidden="true">
          {!answered && <i key={`${d.seed}`} style={{ animationDuration: `${limit}ms` }} />}
        </div>
      )}
      <Stage game={game} stars={stars} done={roundDone} g={g} notices={w.notices}>
        <svg ref={svgRef} width={W} height={200} viewBox={`0 0 ${W} 200`} fontFamily={FONT} role="img" aria-label={fill(w.which, { x: task.text })}>
          <rect width={W} height={200} fill="#fff" />
          <text x={W / 2} y={70} fontSize={48} fontWeight={700} textAnchor="middle" fill={INK}>{task.text}</text>
          {answered && (
            <g className="est-reveal">
              <line x1={X(0)} y1={Y} x2={X(1)} y2={Y} stroke={INK} strokeWidth={2} />
              {task.options.map((o, k) => {
                const f = placeOn(task, o.v);
                const color = k === task.right ? GREEN : k === d.picked ? RED : INK;
                return (
                  <g key={k}>
                    <line x1={X(f)} y1={Y - 10} x2={X(f)} y2={Y + 10} stroke={color} strokeWidth={k === task.right || k === d.picked ? 4 : 2} />
                    <text x={X(f)} y={Y + 34} fontSize={20} fontWeight={700} textAnchor="middle" fill={color}>{o.text}</text>
                  </g>
                );
              })}
              <path d={`M${X(placeOn(task, task.v))},${Y - 6} l-9,-18 h18 z`} fill={GREEN} />
            </g>
          )}
        </svg>
      </Stage>
      <div className="live-bar near-options">
        {task.options.map((o, k) => (
          <button
            key={k}
            className={`live-btn${answered && k === task.right ? " right" : answered && k === d.picked ? " wrong" : ""}`}
            disabled={answered}
            onClick={() => pick(k)}
          >
            {o.text}
          </button>
        ))}
      </div>
      <GameActions game={game} g={g} done={answered} finished={roundDone} rounds onward={onward} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
