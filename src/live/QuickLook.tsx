// The quick-look game: dots show for a moment and hide, and the player taps how many there were. Nine rounds of five
// flashes (up to 6, up to 10 as frames, dice and groups, then up to 20) earn stars for how many were right, a second
// look capping them at two; the endless run's flash gets an eighth shorter with every right answer in the streak.
// After each answer the dots come back coloured by group, so 7 can be seen as 4 and 3. Built on the game shell
// (useGame): a right answer is a step, a wrong one a miss, and the fifth of a round finishes it.
import { useEffect, useRef } from "react";
import { dotsHeight, dotsSvg, FLASH_MS, flashFor, LOOK_LADDER, LOOK_NOTICES, LOOK_W, lookNotice, lookNow, lookStars, padMax, ROUND, type LiveQuickLook } from "../math/quickLook";
import { newSeed, RoundDots, starText } from "./ladderUi";
import { fill, FONT, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const FRESH: Partial<LiveQuickLook> = { i: 0, results: [], phase: "ready", answer: null, relooked: false, said: null };

export function QuickLook({ state: d, set, w: words, svgRef }: PieceProps<"quickLook">) {
  const [w, g] = [words.quickLook, words.game];
  const game = useGame({ key: "zeno.quicklook.v1", size: LOOK_LADDER.length, notices: LOOK_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hiddenAt = useRef(0);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const task = lookNow(d);
  const level = d.mode === "puzzle" ? LOOK_LADDER[d.stage].level : d.level;
  const ms = d.mode === "endless" ? flashFor(level, d.streak) : FLASH_MS[level];
  const last = d.mode === "puzzle" && d.i === ROUND - 1;
  const roundDone = last && d.phase === "shown";
  const stars = roundDone ? lookStars(d.results.filter(Boolean).length, d.relooked) : 0;

  /** Shows the dots of `s` for the flash, then hides them and waits for a number. */
  const look = (s: LiveQuickLook) => {
    set({ ...s, phase: "look" });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      hiddenAt.current = performance.now();
      set({ ...s, phase: "answer" });
    }, s.mode === "endless" ? flashFor(s.level, s.streak) : FLASH_MS[LOOK_LADDER[s.stage].level]);
  };
  const answer = (k: number) => {
    if (d.phase !== "answer") return;
    const right = k === task.n;
    const results = [...d.results, right];
    const patch: Partial<LiveQuickLook> = { phase: "shown", answer: k, results };
    const notice = (streak: number) => lookNotice(task, right, performance.now() - hiddenAt.current, streak);
    if (last) return game.win({ stars: lookStars(results.filter(Boolean).length, d.relooked), right, clean: right, notice, patch });
    if (right) return game.step(patch, { notice });
    game.miss(patch, { notice });
  };
  // On: another flash of the endless run, the next of the round, or (the round done) the shell's way on.
  const onward = () => {
    if (d.mode === "endless") return look({ ...d, seed: newSeed(), answer: null, said: null });
    if (roundDone) return game.onward();
    look({ ...d, i: d.i + 1, answer: null, said: null });
  };

  const h = dotsHeight(task);
  const shown = d.phase === "look" || d.phase === "shown";
  const right = d.phase === "shown" && d.answer === task.n;
  const notice = d.said?.kind === "notice" ? w.notices[d.said.key] : null;
  const line: Line =
    roundDone ? { tone: notice ? "notice" : "ok", text: `${notice ? `${notice} ` : ""}${fill(w.roundDone, { stars: starText(stars) })}${stars === 1 ? ` ${g.oneStar}` : ""}` }
    : notice ? { tone: "notice", text: notice }
    : d.phase === "shown" ? { tone: right ? "ok" : "wrong", text: fill(right ? w.right : w.wrong, { n: task.n }) }
    : d.phase === "ready" ? { tone: "hint", text: w.ready }
    : d.phase === "answer" ? { tone: "hint", text: w.howMany }
    : { tone: "hint", text: "" };
  return (
    <>
      <GameHead game={game} g={g} words={w} pace={`⚡ ${(ms / 1000).toFixed(2)} s · `}>
        <RoundDots results={d.results} i={d.i} size={ROUND} />
      </GameHead>
      <Stage game={game} stars={stars} done={roundDone} g={g} notices={w.notices}>
        <svg ref={svgRef} width={480} height={360} viewBox={`0 0 ${LOOK_W} 240`} fontFamily={FONT} role="img" aria-label={w.howMany}>
          <rect x={1} y={1} width={LOOK_W - 2} height={238} rx={12} fill={shown ? "#fff" : "#f1f3f5"} stroke="#dee2e6" strokeWidth={2} />
          {shown ? (
            <g transform={`translate(0 ${(240 - h) / 2})`} dangerouslySetInnerHTML={{ __html: dotsSvg(task, d.phase === "shown") }} />
          ) : (
            <text x={LOOK_W / 2} y={140} fontSize={60} textAnchor="middle" fill="#adb5bd">{d.phase === "ready" ? "👀" : "?"}</text>
          )}
        </svg>
      </Stage>
      {d.phase === "answer" && (
        <div className="live-bar look-pad">
          {Array.from({ length: padMax(level) }, (_, k) => (
            <button key={k} className="live-btn" onClick={() => answer(k + 1)}>{k + 1}</button>
          ))}
        </div>
      )}
      <GameActions game={game} g={g} done={d.phase === "shown"} finished={roundDone} rounds onward={onward} always>
        {d.phase === "ready" && <button className="live-btn on look-go" onClick={() => look(d)}>👀 {w.look}</button>}
        {d.mode === "puzzle" && d.phase === "answer" && (
          <button className="live-btn" title={w.peek} onClick={() => look({ ...d, relooked: true })}>👀 {w.lookAgain}</button>
        )}
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
