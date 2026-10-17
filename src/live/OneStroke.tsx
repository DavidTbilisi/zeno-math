// One stroke: a graph to draw without lifting the pen or going over an edge twice. Tap a vertex to start, then the
// next vertex along an edge not drawn yet, and so on; the edges drawn turn blue and thick. Stuck with edges left is a
// miss, told whether the start was the trouble (with two odd vertices the stroke must start at one); undo or start
// again. On the hard level some graphs can't be done: say so with the button. No misses earns three stars, one two.
// Nine puzzles open in turn (every degree even, two odd vertices, bigger graphs and impossible ones), and the endless
// run keeps a streak with no misses.
import { useState } from "react";
import { DOT_R, name, oddVertices } from "../math/graphPlay";
import { withBest, withFound, withStars } from "../math/ladder";
import { canStep, canTrace, isStuck, STROKE_LADDER, STROKE_NOTICES, strokeNotice, strokeNow, strokeStars, strokeSvg, trailEdges, type LiveStroke, type StrokeLevel } from "../math/oneStroke";
import { play } from "./juice";
import { Cheer, Found, GameNav, newSeed, nextStage, Onward, SoundToggle, starText, useLadder } from "./ladderUi";
import { fill, FONT, type PieceProps } from "./ui";

export function OneStroke({ state: d, set, w: words, svgRef }: PieceProps<"oneStroke">) {
  const [w, g] = [words.oneStroke, words.game];
  const [ladder, keep] = useLadder("zeno.onestroke.v1", STROKE_LADDER.length, STROKE_NOTICES);
  const [cheer, setCheer] = useState(0);
  const task = strokeNow(d);
  const graph = task.g;
  const traced = canTrace(graph);

  const finish = (trail: number[] | null, misses: number) => {
    const stars = strokeStars(misses);
    const streak = d.mode === "endless" && misses === 0 ? d.streak + 1 : d.mode === "endless" ? 0 : d.streak;
    const key = strokeNotice(graph, trail, misses, streak);
    let next = withBest(ladder, d.mode === "endless" ? streak : 0);
    if (d.mode === "puzzle") next = withStars(next, d.stage, stars);
    if (key && !next.found.includes(key)) next = withFound(next, key, STROKE_NOTICES);
    if (next !== ladder) keep(next);
    play("good");
    setTimeout(() => play("star"), 260);
    setCheer((c) => c + 1);
    return { done: true, streak, said: key ? ({ kind: "notice", key } as const) : null };
  };
  const tap = (v: number) => {
    if (d.done || isStuck(graph, d.trail) || !canStep(graph, d.trail, v)) return;
    const trail = [...d.trail, v];
    if (trailEdges(graph, trail).length === graph.edges.length) return set({ ...d, trail, ...finish(trail, d.misses) });
    if (isStuck(graph, trail)) {
      play("miss");
      const odd = oddVertices(graph);
      return set({ ...d, trail, misses: d.misses + 1, streak: 0, said: { kind: "stuck", oddStart: odd.length === 2 && !odd.includes(trail[0]) } });
    }
    play("snap");
    set({ ...d, trail, said: null });
  };
  const claim = () => {
    if (traced) {
      play("miss");
      return set({ ...d, misses: d.misses + 1, streak: 0, said: { kind: "can" } });
    }
    set({ ...d, ...finish(null, d.misses) });
  };
  const fresh: Pick<LiveStroke, "trail" | "misses" | "done" | "said"> = { trail: [], misses: 0, done: false, said: null };
  const go = (stage: number) => set({ ...d, ...fresh, mode: "puzzle", stage });
  const endless = (l: StrokeLevel) => set({ ...d, ...fresh, mode: "endless", level: l, seed: newSeed() });
  const onward = () => (d.mode === "endless" ? endless(d.level) : go(nextStage(d.stage, STROKE_LADDER.length)));

  const pic = strokeSvg(graph, d.trail, { done: d.done && traced });
  const stars = strokeStars(d.misses);
  const left = graph.edges.length - trailEdges(graph, d.trail).length;
  const right = fill(traced ? w.right : w.rightCant, { stars: starText(stars) });
  const said =
    d.said?.kind === "notice" ? `${w.notices[d.said.key]} ${right}`
    : d.done ? right
    : d.said?.kind === "stuck" ? (d.said.oddStart ? w.startOdd : w.stuck)
    : d.said?.kind === "can" ? w.can
    : d.trail.length ? fill(w.left, { n: left })
    : w.hint;
  return (
    <>
      <GameNav ladder={ladder} mode={d.mode} stage={d.stage} level={d.level} streak={d.streak} onPuzzle={go} onEndless={endless} words={w} g={g} />
      <p className="live-said geo-prompt">{task.level === 3 ? w.askHard : w.ask}</p>
      <div className="geo-stage-wrap">
        <svg ref={svgRef} width={pic.w} height={pic.h} viewBox={`0 0 ${pic.w} ${pic.h}`} fontFamily={FONT} role="group" aria-label={w.ask}>
          <rect width={pic.w} height={pic.h} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: pic.body }} />
          {graph.pts.map(([x, y], v) => (
            <circle key={v} cx={x} cy={y} r={DOT_R + 8} fill="transparent" role="button" aria-label={name(v)} style={{ cursor: d.done ? "default" : "pointer" }} onClick={() => tap(v)} />
          ))}
        </svg>
        {cheer > 0 && d.done && <Cheer key={cheer} text={starText(stars)} />}
      </div>
      <div className="live-bar">
        {d.done ? (
          <Onward mode={d.mode} stage={d.stage} size={STROKE_LADDER.length} onClick={onward} g={g} />
        ) : (
          <>
            <button className="live-btn" disabled={!d.trail.length} onClick={() => set({ ...d, trail: d.trail.slice(0, -1), said: null })}>↶ {w.undo}</button>
            <button className="live-btn" disabled={!d.trail.length} onClick={() => set({ ...d, trail: [], said: null })}>{w.again}</button>
            {task.level === 3 && <button className="live-btn" onClick={claim}>🚫 {w.cant}</button>}
          </>
        )}
        <SoundToggle title={g.sound} />
      </div>
      <p className={d.said?.kind === "notice" ? "live-said notice" : d.done ? "live-said ok" : d.said ? "live-said" : "live-hint"}>
        {said} <Found ladder={ladder} of={STROKE_NOTICES.length} notices={w.notices} g={g} />
      </p>
    </>
  );
}
