// Connect the towns: roads that could be built, each with its cost; tap roads to build them (tap again to take one
// away) until every town is joined, as cheaply as can be, and check. A town left out, a loop (its roads turn red: one
// of them can go), or a network dearer than it need be is told so. Right at the first check earns three stars, at the
// second two. Nine puzzles open in turn (six, nine and twelve towns), and the endless run keeps a streak right at the
// first check. Built on the game shell (useGame), which does the ladder, the sounds and the cheer.
import { TOWN_LADDER, TOWN_NOTICES, townNotice, townNow, townProblem, townStars, townSvg, type LiveTowns } from "../math/connectTowns";
import { edgeName } from "../math/graphPlay";
import { fill, FONT, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";
import { starText } from "./ladderUi";

const FRESH: Partial<LiveTowns> = { chosen: [], misses: 0, done: false, said: null };

export function ConnectTowns({ state: d, set, w: words, svgRef }: PieceProps<"connectTowns">) {
  const [w, g] = [words.connectTowns, words.game];
  const game = useGame({ key: "zeno.connecttowns.v1", size: TOWN_LADDER.length, notices: TOWN_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const task = townNow(d);
  const total = d.chosen.reduce((s, e) => s + task.g.w[e], 0);
  const stars = townStars(d.misses);

  const tap = (e: number) => !d.done && game.tap({ chosen: d.chosen.includes(e) ? d.chosen.filter((x) => x !== e) : [...d.chosen, e], said: null });
  const check = () => {
    const problem = townProblem(task, d.chosen);
    if (problem) return game.miss({ misses: d.misses + 1, said: problem });
    game.win({ stars, clean: d.misses === 0, notice: (streak) => townNotice(task, d.misses, streak), patch: { done: true } });
  };

  const pic = townSvg(task.g, d.chosen, { loop: d.said?.kind === "loop" ? d.said.edges : [], done: d.done });
  const right = `${fill(w.right, { v: task.best.total, stars: starText(stars) })}${d.mode === "puzzle" && stars === 1 ? ` ${g.oneStar}` : ""}`;
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]} ${right}` }
    : d.done ? { tone: "ok", text: right }
    : d.said?.kind === "apart" ? { tone: "wrong", text: w.apart }
    : d.said?.kind === "loop" ? { tone: "wrong", text: w.loop }
    : d.said?.kind === "dearer" ? { tone: "wrong", text: fill(w.dearer, { d: d.said.by }) }
    : { tone: "hint", text: d.chosen.length ? fill(w.total, { n: d.chosen.length, v: total }) : w.hint };
  return (
    <>
      <GameHead game={game} g={g}>
        <Stake stars={stars} tries={d.misses} g={g} />
      </GameHead>
      <Said line={{ tone: "prompt", text: w.ask }} />
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg ref={svgRef} width={pic.w} height={pic.h} viewBox={`0 0 ${pic.w} ${pic.h}`} fontFamily={FONT} role="group" aria-label={w.hint}>
          <rect width={pic.w} height={pic.h} fill="#fff" />
          {task.g.edges.map(([a, b], e) => (
            <line
              key={e}
              x1={task.g.pts[a][0]}
              y1={task.g.pts[a][1]}
              x2={task.g.pts[b][0]}
              y2={task.g.pts[b][1]}
              stroke="transparent"
              strokeWidth={22}
              role="button"
              aria-label={edgeName(task.g, e)}
              aria-pressed={d.chosen.includes(e)}
              style={{ cursor: d.done ? "default" : "pointer" }}
              onClick={() => tap(e)}
            />
          ))}
          <g dangerouslySetInnerHTML={{ __html: pic.body }} style={{ pointerEvents: "none" }} />
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.done}>
        <button className="live-btn on" disabled={!d.chosen.length} onClick={check}>{g.check}</button>
        <button className="live-btn" disabled={!d.chosen.length} onClick={() => set({ ...d, chosen: [], said: null })}>{g.clear}</button>
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
