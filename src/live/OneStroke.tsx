// One stroke: a graph to draw without lifting the pen or going over an edge twice. Tap a vertex to start, then the
// next vertex along an edge not drawn yet, and so on, or draw through them without lifting; the edges drawn turn blue
// and thick. Undo, start again and (on hard) "can't be done" are pills along the bottom of the picture. Stuck with edges left is a
// miss, told whether the start was the trouble (with two odd vertices the stroke must start at one); undo or start
// again. On the hard level some graphs can't be done: say so with the button. No misses earns three stars, one two.
// Nine puzzles open in turn (every degree even, two odd vertices, bigger graphs and impossible ones), and the endless
// run keeps a streak with no misses. Built on the game shell (useGame), which does the ladder, the sounds and the cheer.
import { DOT_R, name, oddVertices } from "../math/graphPlay";
import { canStep, canTrace, isStuck, STROKE_LADDER, STROKE_NOTICES, strokeNotice, strokeNow, strokeStars, strokeSvg, trailEdges, type LiveStroke } from "../math/oneStroke";
import { useRef, useState, type PointerEvent } from "react";
import { BLUE, CHECK_H, keyTap, Pill } from "./hand";
import { fill, FONT, svgPoint, type PieceProps } from "./ui";
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

  /** One step from `base` to `v`; the trail after it, or null when the stroke can't go on (finished, stuck or refused). */
  const step = (base: number[], v: number): number[] | null => {
    if (d.done || isStuck(graph, base) || !canStep(graph, base, v)) return null;
    const trail = [...base, v];
    if (trailEdges(graph, trail).length === graph.edges.length) {
      game.win({ stars, clean: d.misses === 0, notice: (streak) => strokeNotice(graph, trail, d.misses, streak), patch: { trail, done: true } });
      return null;
    }
    if (isStuck(graph, trail)) {
      const odd = oddVertices(graph);
      game.miss({ trail, misses: d.misses + 1, said: { kind: "stuck", oddStart: odd.length === 2 && !odd.includes(trail[0]) } });
      return null;
    }
    game.tap({ trail, said: null });
    return trail;
  };
  const tap = (v: number) => step(d.trail, v);

  // The pen: pressed on a vertex, it draws through every vertex it passes over along an edge not drawn yet. The trail
  // so far is kept here, as the moves can come faster than the state.
  const pen = useRef<number[] | null>(null);
  const [tip, setTip] = useState<[number, number] | null>(null);
  const press = (v: number) => (e: PointerEvent) => {
    if (d.done || e.button > 0) return;
    const after = d.trail.at(-1) === v ? d.trail : step(d.trail, v);
    if (!after) return;
    pen.current = after;
    svgRef.current?.setPointerCapture?.(e.pointerId);
  };
  const near = (x: number, y: number) => graph.pts.findIndex(([px, py]) => Math.hypot(px - x, py - y) < DOT_R + 10);
  const draw = (e: PointerEvent<SVGSVGElement>) => {
    if (!pen.current) return;
    const [x, y] = svgPoint(e.currentTarget, e);
    setTip([x, y]);
    const v = near(x, y);
    if (v < 0 || v === pen.current.at(-1)) return;
    const after = step(pen.current, v);
    if (after) pen.current = after;
    else if (!canStep(graph, pen.current, v)) return;
    else lift();
  };
  const lift = () => {
    pen.current = null;
    setTip(null);
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
        <svg ref={svgRef} className="hand-pic" width={pic.w} height={pic.h + CHECK_H} viewBox={`0 0 ${pic.w} ${pic.h + CHECK_H}`} fontFamily={FONT} role="group" aria-label={w.ask}
          style={{ touchAction: "none" }} onPointerMove={draw} onPointerUp={lift} onPointerCancel={lift}>
          <rect width={pic.w} height={pic.h + CHECK_H} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: pic.body }} />
          {tip && pen.current && (() => {
            const [x, y] = graph.pts[pen.current.at(-1)!];
            return <line x1={x} y1={y} x2={tip[0]} y2={tip[1]} stroke={BLUE} strokeWidth={4} strokeDasharray="6 5" strokeLinecap="round" pointerEvents="none" />;
          })()}
          {graph.pts.map(([x, y], v) => (
            // A real press starts the pen; a click with no pointer behind it (a key, a test) is a tap.
            <circle key={v} cx={x} cy={y} r={DOT_R + 8} fill="transparent" role="button" tabIndex={d.done ? -1 : 0} aria-label={name(v)} style={{ cursor: d.done ? "default" : "pointer" }}
              onPointerDown={press(v)} onClick={(e) => e.detail === 0 && tap(v)} onKeyDown={(e) => keyTap(e, () => tap(v))} />
          ))}
          {(() => {
            const pills = [
              { text: `↶ ${w.undo}`, title: w.undo, off: !d.trail.length || d.done, go: () => set({ ...d, trail: d.trail.slice(0, -1), said: null }) },
              { text: `↺ ${g.reset}`, title: g.reset, off: !d.trail.length || d.done, go: () => set({ ...d, trail: [], said: null }) },
              ...(task.level === 3 ? [{ text: `🚫 ${w.cant}`, title: w.cant, off: d.done, go: claim }] : []),
            ];
            const pw = (t: string) => 34 + [...t].length * 8.6;
            let x = (pic.w - pills.reduce((a, p) => a + pw(p.text) + 10, -10)) / 2;
            return pills.map((p) => {
              const at = x;
              x += pw(p.text) + 10;
              return <Pill key={p.title} x={at} y={pic.h + 10} w={pw(p.text)} text={p.text} title={p.title} disabled={p.off} onTap={p.go} />;
            });
          })()}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.done} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
