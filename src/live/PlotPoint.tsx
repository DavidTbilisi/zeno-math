// Plot the point: a coordinate grid, and a point to tap on it — (3, 5) in the first quadrant, then in all four, then
// the fourth corner of a rectangle whose other three are drawn. A tap lands on the nearest crossing; the point then
// shows with dashed lines leading to it from the axes, and a tap on (y, x) is told it has the numbers the wrong way
// round. Nine rounds of five earn up to three stars (every point found three, all but one two), and a round opens
// once the one before it has a star; the endless run keeps a streak of points found.
import { useState, type PointerEvent } from "react";
import { withBest, withFound, withStars } from "../math/ladder";
import { gridSnap, PLOT_CELL, PLOT_LADDER, PLOT_NOTICES, PLOT_ROUND, plotNotice, plotNow, plotRange, plotStars, plotSvg, ptText, samePt, swapped, type LivePlot, type PlotLevel } from "../math/plotPoint";
import { play } from "./juice";
import { Cheer, Found, GameNav, newSeed, nextStage, Onward, RoundDots, SoundToggle, starText, useLadder } from "./ladderUi";
import { fill, FONT, svgPoint, type PieceProps } from "./ui";

export function PlotPoint({ state: d, set, w: words, svgRef }: PieceProps<"plotPoint">) {
  const [w, g] = [words.plotPoint, words.game];
  const [ladder, keep] = useLadder("zeno.plotpoint.v1", PLOT_LADDER.length, PLOT_NOTICES);
  const [cheer, setCheer] = useState(0);
  const task = plotNow(d);
  const [lo, hi] = plotRange(task.level);
  const grid = { lo, hi, cell: PLOT_CELL };
  const shown = d.tap !== null;
  const roundDone = d.mode === "puzzle" && d.said?.kind === "done";

  const tap = (e: PointerEvent<SVGSVGElement>) => {
    if (shown) return;
    const at = gridSnap(grid, ...svgPoint(e.currentTarget, e));
    if (!at) return;
    const right = samePt(at, task.p);
    play(right ? "good" : "miss");
    const results = [...d.results, right];
    const streak = d.mode === "endless" ? (right ? d.streak + 1 : 0) : d.streak;
    const key = plotNotice(task, right, streak);
    let next = withBest(ladder, d.mode === "endless" ? streak : 0);
    if (key && !next.found.includes(key)) {
      next = withFound(next, key, PLOT_NOTICES);
      setTimeout(() => play("star"), 200);
    }
    let said: LivePlot["said"] = key ? { kind: "notice", key } : null;
    if (d.mode === "puzzle" && d.i === PLOT_ROUND - 1) {
      const stars = plotStars(results);
      next = withStars(next, d.stage, stars);
      said = { kind: "done", stars };
      setTimeout(() => play("star"), 300);
      setCheer((c) => c + 1);
    }
    if (next !== ladder) keep(next);
    set({ ...d, tap: at, results, streak, said });
  };
  const fresh: Pick<LivePlot, "i" | "results" | "tap" | "said"> = { i: 0, results: [], tap: null, said: null };
  const go = (stage: number) => set({ ...d, ...fresh, mode: "puzzle", stage });
  const endless = (level: PlotLevel) => set({ ...d, ...fresh, mode: "endless", level, seed: newSeed() });
  const onward = () => {
    if (d.mode === "endless") return set({ ...d, seed: newSeed(), tap: null, said: null });
    if (roundDone) return go(nextStage(d.stage, PLOT_LADDER.length));
    set({ ...d, i: d.i + 1, tap: null, said: null });
  };

  const ask = task.corners.length ? w.askCorner : fill(w.ask, { p: ptText(task.p) });
  const pic = plotSvg(task, { tap: d.tap, shown });
  const right = samePt(d.tap, task.p);
  const result = !d.tap ? null : right ? fill(w.right, { p: ptText(task.p) }) : fill(samePt(d.tap, swapped(task.p)) ? w.swapped : w.wrong, { t: ptText(d.tap), p: ptText(task.p) });
  const said = d.said?.kind === "notice" ? `${w.notices[d.said.key]} ${result}` : d.said?.kind === "done" ? `${result} ${fill(w.roundDone, { stars: starText(d.said.stars) })}` : result;
  return (
    <>
      <GameNav ladder={ladder} mode={d.mode} stage={d.stage} level={d.level} streak={d.streak} onPuzzle={go} onEndless={endless} words={w} g={g}>
        <RoundDots results={d.results} i={d.i} size={PLOT_ROUND} />
      </GameNav>
      <p className="live-said geo-prompt">{ask}</p>
      <div className="geo-stage-wrap">
        <svg ref={svgRef} className="plot-grid" width={pic.w} height={pic.h} viewBox={`0 0 ${pic.w} ${pic.h}`} fontFamily={FONT} role="img" aria-label={ask} style={{ cursor: shown ? "default" : "crosshair", touchAction: "none" }} onPointerDown={tap}>
          <rect width={pic.w} height={pic.h} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: pic.body }} />
        </svg>
        {cheer > 0 && roundDone && d.said?.kind === "done" && <Cheer key={cheer} text={starText(d.said.stars)} />}
      </div>
      <div className="live-bar">
        {shown && <Onward mode={d.mode} stage={d.stage} size={PLOT_LADDER.length} rounds finished={roundDone} onClick={onward} g={g} />}
        <SoundToggle title={g.sound} />
      </div>
      <p className={d.said?.kind === "notice" ? "live-said notice" : d.tap && right ? "live-said ok" : d.tap ? "live-said" : "live-hint"}>
        {said ?? w.hint} <Found ladder={ladder} of={PLOT_NOTICES.length} notices={w.notices} g={g} />
      </p>
    </>
  );
}
