// Plot the point: a coordinate grid, and a point to tap on it — (3, 5) in the first quadrant, then in all four, then
// the fourth corner of a rectangle whose other three are drawn. A tap lands on the nearest crossing; the point then
// shows with dashed lines leading to it from the axes, and a tap on (y, x) is told it has the numbers the wrong way
// round. Nine rounds of five earn up to three stars (every point found three, all but one two), and a round opens
// once the one before it has a star; the endless run keeps a streak of points found. Built on the game shell
// (useGame): a point found is a step, one missed a miss, and the fifth of a round finishes it.
import type { PointerEvent } from "react";
import { gridSnap, PLOT_CELL, PLOT_LADDER, PLOT_NOTICES, PLOT_ROUND, plotNotice, plotNow, plotRange, plotStars, plotSvg, ptText, samePt, swapped, type LivePlot } from "../math/plotPoint";
import { RoundDots, starText } from "./ladderUi";
import { fill, FONT, svgPoint, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const FRESH: Partial<LivePlot> = { i: 0, results: [], tap: null, said: null };

export function PlotPoint({ state: d, set, w: words, svgRef }: PieceProps<"plotPoint">) {
  const [w, g] = [words.plotPoint, words.game];
  const game = useGame({ key: "zeno.plotpoint.v1", size: PLOT_LADDER.length, notices: PLOT_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const task = plotNow(d);
  const [lo, hi] = plotRange(task.level);
  const grid = { lo, hi, cell: PLOT_CELL };
  const shown = d.tap !== null;
  const last = d.mode === "puzzle" && d.i === PLOT_ROUND - 1;
  const roundDone = last && shown;
  const stars = roundDone ? plotStars(d.results) : 0;

  const tap = (e: PointerEvent<SVGSVGElement>) => {
    if (shown) return;
    const at = gridSnap(grid, ...svgPoint(e.currentTarget, e));
    if (!at) return;
    const right = samePt(at, task.p);
    const results = [...d.results, right];
    const patch = { tap: at, results };
    const notice = (streak: number) => plotNotice(task, right, streak);
    if (last) return game.win({ stars: plotStars(results), right, clean: right, notice, patch });
    if (right) return game.step(patch, { notice });
    game.miss(patch, { notice });
  };
  // On, within a round: the next point (the shell moves on from a round done or in the endless run).
  const onward = () => (roundDone || d.mode === "endless" ? game.onward() : set({ ...d, i: d.i + 1, tap: null, said: null }));

  const ask = task.corners.length ? w.askCorner : fill(w.ask, { p: ptText(task.p) });
  const pic = plotSvg(task, { tap: d.tap, shown });
  const right = samePt(d.tap, task.p);
  const result = !d.tap ? null : right ? fill(w.right, { p: ptText(task.p) }) : fill(samePt(d.tap, swapped(task.p)) ? w.swapped : w.wrong, { t: ptText(d.tap), p: ptText(task.p) });
  const notice = d.said?.kind === "notice" ? w.notices[d.said.key] : null;
  const line: Line =
    roundDone ? { tone: notice ? "notice" : right ? "ok" : "wrong", text: `${notice ? `${notice} ` : ""}${result} ${fill(w.roundDone, { stars: starText(stars) })}${stars === 1 ? ` ${g.oneStar}` : ""}` }
    : notice ? { tone: "notice", text: `${notice} ${result}` }
    : result ? { tone: right ? "ok" : "wrong", text: result }
    : { tone: "hint", text: w.hint };
  return (
    <>
      <GameHead game={game} g={g} words={w}>
        <RoundDots results={d.results} i={d.i} size={PLOT_ROUND} />
      </GameHead>
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={roundDone} g={g} notices={w.notices}>
        <svg ref={svgRef} className="plot-grid" width={pic.w} height={pic.h} viewBox={`0 0 ${pic.w} ${pic.h}`} fontFamily={FONT} role="img" aria-label={ask} style={{ cursor: shown ? "default" : "crosshair", touchAction: "none" }} onPointerDown={tap}>
          <rect width={pic.w} height={pic.h} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: pic.body }} />
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={shown} finished={roundDone} rounds onward={onward} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
