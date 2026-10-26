// Missing angles: a figure drawn to size, its angles marked, and the one marked ? to find — on a straight line, in a
// right angle, around a point, in a triangle, an isosceles triangle or a quadrilateral. Type it in degrees and check;
// a wrong answer on arms from a point draws the arm it would make, dashed, so it can be seen to be too big or too
// small. Right first time earns three stars, after one miss two. Nine puzzles open in turn, and the endless run keeps
// a streak right first time. Built on the game shell (useGame), which does the ladder, the sounds and the cheer.
import { readWhole } from "../math/machine";
import { HUNT_LADDER, HUNT_NOTICES, huntNotice, huntNow, huntStars, huntSvg, type LiveAngleHunt } from "../math/missingAngle";
import { Keypad } from "./Keypad";
import { starText } from "./ladderUi";
import { fill, FONT, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";

const FRESH: Partial<LiveAngleHunt> = { typed: "", misses: 0, done: false, said: null };

export function AngleHunt({ state: d, set, w: words, svgRef }: PieceProps<"angleHunt">) {
  const [w, g] = [words.angleHunt, words.game];
  const game = useGame({ key: "zeno.anglehunt.v1", size: HUNT_LADDER.length, notices: HUNT_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const task = huntNow(d);
  const fromPoint = "parts" in task.fig;
  const typed = readWhole(d.typed);
  const stars = huntStars(d.misses);

  const check = () => {
    if (typed === null) return;
    if (typed !== task.v) return game.miss({ typed: "", misses: d.misses + 1, said: { kind: "wrong", v: typed } });
    game.win({ stars, clean: d.misses === 0, notice: (streak) => huntNotice(task, d.misses, streak), patch: { done: true } });
  };

  // A wrong size that fits on the figure is drawn; one past a whole turn isn't.
  const wrong = d.said?.kind === "wrong" ? d.said.v : null;
  const pic = huntSvg(task.fig, d.done ? { answer: task.v } : wrong !== null && fromPoint && wrong > 0 && wrong < 360 ? { ghost: wrong } : {});
  const right = `${fill(w.right, { v: task.v, stars: starText(stars) })}${d.mode === "puzzle" && stars === 1 ? ` ${g.oneStar}` : ""}`;
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]} ${right}` }
    : d.done ? { tone: "ok", text: right }
    : wrong !== null ? { tone: "wrong", text: fill(fromPoint ? w.wrongArm : w.wrong, { v: wrong }) }
    : { tone: "hint", text: w.hint };
  return (
    <>
      <GameHead game={game} g={g}>
        <Stake stars={stars} tries={d.misses} g={g} />
      </GameHead>
      <Said line={{ tone: "prompt", text: w.hint }} />
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg ref={svgRef} width={pic.w} height={pic.h} viewBox={`0 0 ${pic.w} ${pic.h}`} fontFamily={FONT} role="img" aria-label={w.hint}>
          <rect width={pic.w} height={pic.h} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: pic.body }} />
        </svg>
      </Stage>
      {!d.done && <Keypad value={d.typed} onChange={(typed) => set({ ...d, typed })} erase={w.erase} />}
      <GameActions game={game} g={g} done={d.done}>
        <button className="live-btn on" disabled={typed === null} onClick={check}>{g.check}</button>
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
