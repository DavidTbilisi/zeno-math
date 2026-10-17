// Guess the angle: an angle drawn, and its size to guess by eye, typed in degrees. Check, and the angle's real size
// shows with the guess drawn beside it as a dashed arm, so how far off it was can be seen. Nine rounds of five (an arm
// along the bottom, turned any way, reflex) earn up to three stars for how close the guesses come on average, and a
// round opens once the one before it has a star; the endless run keeps a streak of guesses within 10°.
import { useState } from "react";
import { angleSvg, GOOD, GUESS_LADDER, GUESS_NOTICES, guessNotice, guessNow, guessStars, ROUND, type AngleLevel, type LiveAngleGuess } from "../math/angleGuess";
import { withBest, withFound, withStars } from "../math/ladder";
import { readWhole } from "../math/machine";
import { play } from "./juice";
import { Keypad } from "./Keypad";
import { Cheer, Found, GameNav, newSeed, nextStage, Onward, RoundDots, SoundToggle, starText, useLadder } from "./ladderUi";
import { fill, FONT, type PieceProps } from "./ui";

const GREEN = "#2f9e44";
const ORANGE = "#e8590c";

export function AngleGuess({ state: d, set, w: words, svgRef }: PieceProps<"angleGuess">) {
  const [w, g] = [words.angleGuess, words.game];
  const [ladder, keep] = useLadder("zeno.angleguess.v1", GUESS_LADDER.length, GUESS_NOTICES);
  const [cheer, setCheer] = useState(0);
  const task = guessNow(d);
  const shown = d.guess !== null;
  const roundDone = d.mode === "puzzle" && d.said?.kind === "done";
  const typed = readWhole(d.typed);

  const check = () => {
    if (typed === null || typed > 360) return;
    const err = Math.abs(typed - task.size);
    play(err <= GOOD ? "good" : "miss");
    const errors = [...d.errors, err];
    const streak = d.mode === "endless" ? (err <= GOOD ? d.streak + 1 : 0) : d.streak;
    const key = guessNotice(task, typed, streak);
    let next = withBest(ladder, d.mode === "endless" ? streak : 0);
    if (key && !next.found.includes(key)) {
      next = withFound(next, key, GUESS_NOTICES);
      setTimeout(() => play("star"), 200);
    }
    let said: LiveAngleGuess["said"] = key ? { kind: "notice", key } : null;
    if (d.mode === "puzzle" && d.i === ROUND - 1) {
      const stars = guessStars(errors);
      next = withStars(next, d.stage, stars);
      said = { kind: "done", stars };
      setTimeout(() => play("star"), 300);
      setCheer((c) => c + 1);
    }
    if (next !== ladder) keep(next);
    set({ ...d, guess: typed, errors, streak, said });
  };
  const fresh: Pick<LiveAngleGuess, "i" | "errors" | "typed" | "guess" | "said"> = { i: 0, errors: [], typed: "", guess: null, said: null };
  const go = (stage: number) => set({ ...d, ...fresh, mode: "puzzle", stage });
  const endless = (level: AngleLevel) => set({ ...d, ...fresh, mode: "endless", level, seed: newSeed() });
  const onward = () => {
    if (d.mode === "endless") return set({ ...d, seed: newSeed(), typed: "", guess: null, said: null });
    if (roundDone) return go(nextStage(d.stage, GUESS_LADDER.length));
    set({ ...d, i: d.i + 1, typed: "", guess: null, said: null });
  };

  const pic = angleSvg(task, shown ? { shown: true, guess: d.guess! } : {});
  const off = shown ? Math.abs(d.guess! - task.size) : 0;
  const result = !shown ? null : off === 0 ? fill(w.spot, { v: task.size }) : fill(off <= GOOD ? w.close : w.far, { v: task.size, d: off });
  const said = d.said?.kind === "notice" ? w.notices[d.said.key] : d.said?.kind === "done" ? fill(w.roundDone, { stars: starText(d.said.stars) }) : null;
  return (
    <>
      <GameNav ladder={ladder} mode={d.mode} stage={d.stage} level={d.level} streak={d.streak} onPuzzle={go} onEndless={endless} words={w} g={g}>
        <RoundDots results={d.errors.map((e) => e <= GOOD)} i={d.i} size={ROUND} />
      </GameNav>
      <p className="live-said geo-prompt">{w.ask}</p>
      <div className="geo-stage-wrap">
        <svg ref={svgRef} width={pic.w} height={pic.h} viewBox={`0 0 ${pic.w} ${pic.h}`} fontFamily={FONT} role="img" aria-label={w.ask}>
          <rect width={pic.w} height={pic.h} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: pic.body }} />
        </svg>
        {cheer > 0 && roundDone && d.said?.kind === "done" && <Cheer key={cheer} text={starText(d.said.stars)} />}
      </div>
      {!shown && <Keypad value={d.typed} onChange={(t) => set({ ...d, typed: t })} erase={w.erase} />}
      <div className="live-bar">
        {shown ? (
          <Onward mode={d.mode} stage={d.stage} size={GUESS_LADDER.length} rounds finished={roundDone} onClick={onward} g={g} />
        ) : (
          <button className="live-btn on" disabled={typed === null || typed > 360} onClick={check}>{g.check}</button>
        )}
        <SoundToggle title={g.sound} />
      </div>
      <p
        className={d.said?.kind === "notice" ? "live-said notice" : d.said?.kind === "done" ? "live-said ok" : result ? "live-said" : "live-hint"}
        style={result && !said ? { color: off <= GOOD ? GREEN : ORANGE } : undefined}
      >
        {said ?? result ?? w.ask} <Found ladder={ladder} of={GUESS_NOTICES.length} notices={w.notices} g={g} />
      </p>
    </>
  );
}
