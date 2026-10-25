// One stroke: a graph to draw without lifting the pen or going over an edge twice. Tap a vertex to start, then the
// next vertex along an edge not drawn yet, and so on; the edges drawn turn blue and thick. Stuck with edges left is a
// miss, told whether the start was the trouble (with two odd vertices the stroke must start at one); undo or start
// again. On the hard level some graphs can't be done: say so with the button. No misses earns three stars, one two.
// Nine puzzles open in turn (every degree even, two odd vertices, bigger graphs and impossible ones), and the endless
// run keeps a streak with no misses. Built on the game shell (useGame), which does the ladder, the sounds and the cheer.
import { DOT_R, name, oddVertices } from "../math/graphPlay";
import { canStep, canTrace, isStuck, STROKE_LADDER, STROKE_NOTICES, strokeNotice, strokeNow, strokeStars, strokeSvg, trailEdges, type LiveStroke } from "../math/oneStroke";
import { fill, FONT, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";
import { starText } from "./ladderUi";

const FRESH: Partial<LiveStroke> = { trail: [], misses: 0, done: false, said: null };

export function OneStroke({ state: d, set, w: words, svgRef }: PieceProps<"oneStroke">) {
  const [w, g] = [words.oneStroke, words.game];
  const game = useGame({ key: "zeno.onestroke.v1", size: STROKE_LADDER.length, notices: STROKE_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const task = strokeNow(d);
  const graph = task.g;
  const traced = canTrace(graph);
  const stars = strokeStars(d.misses);

  const tap = (v: number) => {
    if (d.done || isStuck(graph, d.trail) || !canStep(graph, d.trail, v)) return;
    const trail = [...d.trail, v];
    if (trailEdges(graph, trail).length === graph.edges.length) {
      return game.win({ stars, clean: d.misses === 0, notice: (streak) => strokeNotice(graph, trail, d.misses, streak), patch: { trail, done: true } });
    }
    if (isStuck(graph, trail)) {
      const odd = oddVertices(graph);
      return game.miss({ trail, misses: d.misses + 1, said: { kind: "stuck", oddStart: odd.length === 2 && !odd.includes(trail[0]) } });
    }
    game.tap({ trail, said: null });
  };
  const claim = () => {
    if (traced) return game.miss({ misses: d.misses + 1, said: { kind: "can" } });
    game.win({ stars, clean: d.misses === 0, notice: (streak) => strokeNotice(graph, null, d.misses, streak), patch: { done: true } });
  };

  const pic = strokeSvg(graph, d.trail, { done: d.done && traced });
  const left = graph.edges.length - trailEdges(graph, d.trail).length;
  const right = fill(traced ? w.right : w.rightCant, { stars: starText(stars) });
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]} ${right}` }
    : d.done ? { tone: "ok", text: `${right}${d.mode === "puzzle" && stars === 1 ? ` ${g.oneStar}` : ""}` }
    : d.said?.kind === "stuck" ? { tone: "wrong", text: d.said.oddStart ? w.startOdd : w.stuck }
    : d.said?.kind === "can" ? { tone: "wrong", text: w.can }
    : { tone: "hint", text: d.trail.length ? fill(w.left, { n: left }) : w.hint };
  return (
    <>
      <GameHead game={game} g={g}>
        <Stake stars={stars} tries={d.misses} g={g} />
      </GameHead>
      <Said line={{ tone: "prompt", text: task.level === 3 ? w.askHard : w.ask }} />
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg ref={svgRef} width={pic.w} height={pic.h} viewBox={`0 0 ${pic.w} ${pic.h}`} fontFamily={FONT} role="group" aria-label={w.ask}>
          <rect width={pic.w} height={pic.h} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: pic.body }} />
          {graph.pts.map(([x, y], v) => (
            <circle key={v} cx={x} cy={y} r={DOT_R + 8} fill="transparent" role="button" aria-label={name(v)} style={{ cursor: d.done ? "default" : "pointer" }} onClick={() => tap(v)} />
          ))}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.done}>
        <button className="live-btn" disabled={!d.trail.length} onClick={() => set({ ...d, trail: d.trail.slice(0, -1), said: null })}>↶ {w.undo}</button>
        <button className="live-btn" disabled={!d.trail.length} onClick={() => set({ ...d, trail: [], said: null })}>{g.reset}</button>
        {task.level === 3 && <button className="live-btn" onClick={claim}>🚫 {w.cant}</button>}
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
