// Make the bar chart: how many of each fruit, and a bar for each to raise to its number against the scale up the side
// — in ones, then twos or fives, then tens or twenties, a number between two lines ending half-way. Tap a column at a
// height (or use the arrow keys on a bar) and check; the bars that are wrong turn orange with a dashed mark where they
// should reach, and a bar raised to its number of lines is told that each line is worth more than 1. Right at the
// first check earns three stars, at the second two. Nine puzzles open in turn, and the endless run keeps a streak
// right at the first check.
import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { CHART_LADDER, CHART_NOTICES, chartGeom, chartNotice, chartNow, chartStars, chartSvg, chartTop, linesCounted, wrongBars, type ChartLevel, type LiveBarChart } from "../math/barChart";
import { withBest, withFound, withStars } from "../math/ladder";
import { play } from "./juice";
import { Cheer, Found, GameNav, newSeed, nextStage, Onward, SoundToggle, starText, useLadder } from "./ladderUi";
import { fill, FONT, svgPoint, type PieceProps } from "./ui";

const GAP = 28;

export function BarChart({ state: d, set, w: words, svgRef }: PieceProps<"barChart">) {
  const [w, g] = [words.barChart, words.game];
  const [ladder, keep] = useLadder("zeno.barchart.v1", CHART_LADDER.length, CHART_NOTICES);
  const [cheer, setCheer] = useState(0);
  const task = chartNow(d);
  const G = chartGeom(task, GAP);
  const bars = task.items.map((_, k) => d.bars[k] ?? 0);

  const raise = (k: number, v: number) => {
    if (d.done || v === bars[k]) return;
    play("snap");
    set({ ...d, bars: bars.map((b, j) => (j === k ? v : b)), wrong: d.wrong.filter((j) => j !== k), said: null });
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
    if (wrong.length) {
      play("miss");
      return set({ ...d, wrong, misses: d.misses + 1, streak: 0, said: { kind: "wrong", lines: linesCounted(task, bars) } });
    }
    const stars = chartStars(d.misses);
    const streak = d.mode === "endless" && d.misses === 0 ? d.streak + 1 : d.mode === "endless" ? 0 : d.streak;
    const found = chartNotice(task, d.misses, streak);
    let next = withBest(ladder, d.mode === "endless" ? streak : 0);
    if (d.mode === "puzzle") next = withStars(next, d.stage, stars);
    if (found && !next.found.includes(found)) next = withFound(next, found, CHART_NOTICES);
    if (next !== ladder) keep(next);
    play("good");
    setTimeout(() => play("star"), 260);
    setCheer((c) => c + 1);
    set({ ...d, done: true, wrong: [], streak, said: found ? { kind: "notice", key: found } : null });
  };
  const fresh: Pick<LiveBarChart, "bars" | "wrong" | "misses" | "done" | "said"> = { bars: [], wrong: [], misses: 0, done: false, said: null };
  const go = (stage: number) => set({ ...d, ...fresh, mode: "puzzle", stage });
  const endless = (l: ChartLevel) => set({ ...d, ...fresh, mode: "endless", level: l, seed: newSeed() });
  const onward = () => (d.mode === "endless" ? endless(d.level) : go(nextStage(d.stage, CHART_LADDER.length)));

  const pic = chartSvg(task, { bars, wrong: d.wrong, done: d.done, gap: GAP });
  const stars = chartStars(d.misses);
  const right = fill(w.right, { stars: starText(stars) });
  const slip = d.said?.kind === "wrong" && d.said.lines >= 0 ? task.items[d.said.lines] : null;
  const said =
    d.said?.kind === "notice" ? `${w.notices[d.said.key]} ${right}`
    : d.done ? right
    : slip ? fill(w.lines, { s: task.step, f: slip.icon, h: slip.v * task.step, v: slip.v })
    : d.said?.kind === "wrong" ? fill(w.wrong, { n: d.wrong.length })
    : w.hint;
  return (
    <>
      <GameNav ladder={ladder} mode={d.mode} stage={d.stage} level={d.level} streak={d.streak} onPuzzle={go} onEndless={endless} words={w} g={g} />
      <p className="live-said geo-prompt chart-data">
        {task.items.map((it, k) => (
          <span key={k} className={d.wrong.includes(k) ? "off" : undefined}>{it.icon} {it.v}</span>
        ))}
      </p>
      <div className="geo-stage-wrap">
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
        {cheer > 0 && d.done && <Cheer key={cheer} text={starText(stars)} />}
      </div>
      <div className="live-bar">
        {d.done ? (
          <Onward mode={d.mode} stage={d.stage} size={CHART_LADDER.length} onClick={onward} g={g} />
        ) : (
          <>
            <button className="live-btn on" onClick={check}>{g.check}</button>
            <button className="live-btn" disabled={bars.every((b) => !b)} onClick={() => set({ ...d, bars: [], wrong: [], said: null })}>{g.clear}</button>
          </>
        )}
        <SoundToggle title={g.sound} />
      </div>
      <p className={d.said?.kind === "notice" ? "live-said notice" : d.done ? "live-said ok" : d.said?.kind === "wrong" ? "live-said" : "live-hint"}>
        {said} <Found ladder={ladder} of={CHART_NOTICES.length} notices={w.notices} g={g} />
      </p>
    </>
  );
}
