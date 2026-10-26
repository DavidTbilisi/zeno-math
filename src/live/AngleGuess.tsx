// Guess the angle: an angle drawn, and its size to guess by eye, typed in degrees. Check, and the angle's real size
// shows with the guess drawn beside it as a dashed arm, so how far off it was can be seen. Nine rounds of five (an arm
// along the bottom, turned any way, reflex) earn up to three stars for how close the guesses come on average, and a
// round opens once the one before it has a star; the endless run keeps a streak of guesses within 10°. Built on the
// game shell (useGame): a guess within 10° is a step, one further off a miss, and the fifth of a round finishes it.
import { angleSvg, GOOD, GUESS_LADDER, GUESS_NOTICES, guessNotice, guessNow, guessStars, ROUND, type LiveAngleGuess } from "../math/angleGuess";
import { readWhole } from "../math/machine";
import { Keypad } from "./Keypad";
import { RoundDots, starText } from "./ladderUi";
import { fill, FONT, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const FRESH: Partial<LiveAngleGuess> = { i: 0, errors: [], typed: "", guess: null, said: null };

export function AngleGuess({ state: d, set, w: words, svgRef }: PieceProps<"angleGuess">) {
  const [w, g] = [words.angleGuess, words.game];
  const game = useGame({ key: "zeno.angleguess.v1", size: GUESS_LADDER.length, notices: GUESS_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const task = guessNow(d);
  const shown = d.guess !== null;
  const last = d.mode === "puzzle" && d.i === ROUND - 1;
  const roundDone = last && shown;
  const typed = readWhole(d.typed);
  const stars = roundDone ? guessStars(d.errors) : 0;

  const check = () => {
    if (typed === null || typed > 360) return;
    const err = Math.abs(typed - task.size);
    const good = err <= GOOD;
    const errors = [...d.errors, err];
    const patch = { guess: typed, errors };
    const notice = (streak: number) => guessNotice(task, typed, streak);
    if (last) return game.win({ stars: guessStars(errors), right: good, clean: good, notice, patch });
    if (good) return game.step(patch, { notice });
    game.miss(patch, { notice });
  };
  // On, within a round: the next angle (the shell moves on from a round done or in the endless run).
  const onward = () => (roundDone || d.mode === "endless" ? game.onward() : set({ ...d, i: d.i + 1, typed: "", guess: null, said: null }));

  const pic = angleSvg(task, shown ? { shown: true, guess: d.guess! } : {});
  const off = shown ? Math.abs(d.guess! - task.size) : 0;
  const result = !shown ? null : off === 0 ? fill(w.spot, { v: task.size }) : fill(off <= GOOD ? w.close : w.far, { v: task.size, d: off });
  const notice = d.said?.kind === "notice" ? w.notices[d.said.key] : null;
  const line: Line =
    roundDone ? { tone: notice ? "notice" : "ok", text: `${notice ? `${notice} ` : ""}${fill(w.roundDone, { stars: starText(stars) })}${stars === 1 ? ` ${g.oneStar}` : ""}` }
    : notice ? { tone: "notice", text: notice }
    : result ? { tone: off <= GOOD ? "ok" : "wrong", text: result }
    : { tone: "hint", text: w.ask };
  return (
    <>
      <GameHead game={game} g={g} words={w}>
        <RoundDots results={d.errors.map((e) => e <= GOOD)} i={d.i} size={ROUND} />
      </GameHead>
      <Said line={{ tone: "prompt", text: w.ask }} />
      <Stage game={game} stars={stars} done={roundDone} g={g} notices={w.notices}>
        <svg ref={svgRef} width={pic.w} height={pic.h} viewBox={`0 0 ${pic.w} ${pic.h}`} fontFamily={FONT} role="img" aria-label={w.ask}>
          <rect width={pic.w} height={pic.h} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: pic.body }} />
        </svg>
      </Stage>
      {!shown && <Keypad value={d.typed} onChange={(t) => set({ ...d, typed: t })} erase={w.erase} />}
      <GameActions game={game} g={g} done={shown} finished={roundDone} rounds onward={onward}>
        <button className="live-btn on" disabled={typed === null || typed > 360} onClick={check}>{g.check}</button>
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
