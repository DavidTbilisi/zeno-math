// Make the bar chart: how many of each fruit, and a bar for each to raise to its number against the scale up the side
// — in ones, then twos or fives, then tens or twenties, a number between two lines ending half-way. Tap a column at a
// height (or use the arrow keys on a bar) and check; the bars that are wrong turn orange with a dashed mark where they
// should reach, and a bar raised to its number of lines is told that each line is worth more than 1. Right at the
// first check earns three stars, at the second two. Nine puzzles open in turn, and the endless run keeps a streak
// right at the first check. Built on the game shell (useGame), which does the ladder, the sounds and the cheer.
import type { KeyboardEvent, PointerEvent } from "react";
import { CHART_LADDER, CHART_NOTICES, chartGeom, chartNotice, chartNow, chartStars, chartSvg, chartTop, linesCounted, wrongBars, type LiveBarChart } from "../math/barChart";
import { starText } from "./ladderUi";
import { fill, FONT, svgPoint, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";

const GAP = 28;

const FRESH: Partial<LiveBarChart> = { bars: [], wrong: [], misses: 0, done: false, said: null };

export function BarChart({ state: d, set, w: words, svgRef }: PieceProps<"barChart">) {
  const [w, g] = [words.barChart, words.game];
  const game = useGame({ key: "zeno.barchart.v1", size: CHART_LADDER.length, notices: CHART_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const task = chartNow(d);
  const G = chartGeom(task, GAP);
  const bars = task.items.map((_, k) => d.bars[k] ?? 0);
  const stars = chartStars(d.misses);

  const raise = (k: number, v: number) => {
    if (d.done || v === bars[k]) return;
    game.tap({ bars: bars.map((b, j) => (j === k ? v : b)), wrong: d.wrong.filter((j) => j !== k), said: null });
  };
  const tap = (e: PointerEvent<SVGSVGElement>) => {
    const [x, y] = svgPoint(e.currentTarget, e);
    const k = G.colAt(x);
    if (k >= 0 && y <= G.foot + 4) raise(k, G.valueAt(y));
  };
  const key = (k: number) => (e: KeyboardEvent) => {
    const by = e.key === "ArrowUp" ? task.grain : e.key === "ArrowDown" ? -task.grain : 0;
    if (!by) return;
    e.preventDefault();
    raise(k, Math.max(0, Math.min(chartTop(task), bars[k] + by)));
  };
  const check = () => {
    const wrong = wrongBars(task, bars);
    if (wrong.length) return game.miss({ wrong, misses: d.misses + 1, said: { kind: "wrong", lines: linesCounted(task, bars) } });
    game.win({ stars, clean: d.misses === 0, notice: (streak) => chartNotice(task, d.misses, streak), patch: { done: true, wrong: [] } });
  };

  const pic = chartSvg(task, { bars, wrong: d.wrong, done: d.done, gap: GAP });
  const right = `${fill(w.right, { stars: starText(stars) })}${d.mode === "puzzle" && stars === 1 ? ` ${g.oneStar}` : ""}`;
  const slip = d.said?.kind === "wrong" && d.said.lines >= 0 ? task.items[d.said.lines] : null;
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]} ${right}` }
    : d.done ? { tone: "ok", text: right }
    : slip ? { tone: "wrong", text: fill(w.lines, { s: task.step, f: slip.icon, h: slip.v * task.step, v: slip.v }) }
    : d.said?.kind === "wrong" ? { tone: "wrong", text: fill(w.wrong, { n: d.wrong.length }) }
    : { tone: "hint", text: w.hint };
  return (
    <>
      <GameHead game={game} g={g}>
        <Stake stars={stars} tries={d.misses} g={g} />
      </GameHead>
      <p className="live-said geo-prompt chart-data">
        {task.items.map((it, k) => (
          <span key={k} className={d.wrong.includes(k) ? "off" : undefined}>{it.icon} {it.v}</span>
        ))}
      </p>
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg ref={svgRef} width={pic.w} height={pic.h} viewBox={`0 0 ${pic.w} ${pic.h}`} fontFamily={FONT} role="group" aria-label={w.hint} style={{ touchAction: "none" }} onPointerDown={tap}>
          <rect width={pic.w} height={pic.h} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: pic.body }} />
          {task.items.map((it, k) => (
            <rect
              key={k}
              x={G.mid(k) - 34}
              y={G.y(chartTop(task)) - 6}
              width={68}
              height={G.foot - G.y(chartTop(task)) + 40}
              fill="transparent"
              role="slider"
              tabIndex={d.done ? -1 : 0}
              aria-label={it.icon}
              aria-valuemin={0}
              aria-valuemax={chartTop(task)}
              aria-valuenow={bars[k]}
              style={{ cursor: d.done ? "default" : "ns-resize", outline: "none" }}
              onKeyDown={key(k)}
            />
          ))}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.done}>
        <button className="live-btn on" onClick={check}>{g.check}</button>
        <button className="live-btn" disabled={bars.every((b) => !b)} onClick={() => set({ ...d, bars: [], wrong: [], said: null })}>{g.clear}</button>
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
