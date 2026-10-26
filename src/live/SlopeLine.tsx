// Draw the gradient: a point A on a grid, and a line through it with a given gradient to draw by tapping a second
// point B — 1, 2 or 3 at first, then up or down, then fractions. The line runs across the whole grid as soon as B is
// put, and B can be moved until it is checked; then the step from A to B shows as a triangle, along and up, and a line
// along over up, the wrong way, or straight up is told so. Any point of the line will do. Right at the first check
// earns three stars, at the second two. Nine puzzles open in turn, and the endless run keeps a streak right at the
// first check. Built on the game shell (useGame), which does the ladder, the sounds and the cheer.
import type { PointerEvent } from "react";
import { gridSnap, samePt } from "../math/plotPoint";
import { gradText, onLine, SLOPE_CELL, SLOPE_LADDER, SLOPE_NOTICES, slopeNotice, slopeNow, slopeRange, slopeSlip, slopeStars, slopeSvg, type LiveSlope } from "../math/slope";
import { starText } from "./ladderUi";
import { fill, FONT, svgPoint, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";

const FRESH: Partial<LiveSlope> = { b: null, misses: 0, done: false, said: null };

export function SlopeLine({ state: d, set, w: words, svgRef }: PieceProps<"slopeLine">) {
  const [w, g] = [words.slopeLine, words.game];
  const game = useGame({ key: "zeno.slopeline.v1", size: SLOPE_LADDER.length, notices: SLOPE_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const task = slopeNow(d);
  const [lo, hi] = slopeRange(task.level);
  const m = gradText(task.rise, task.run);
  const stars = slopeStars(d.misses);

  const tap = (e: PointerEvent<SVGSVGElement>) => {
    if (d.done) return;
    const b = gridSnap({ lo, hi, cell: SLOPE_CELL }, ...svgPoint(e.currentTarget, e));
    if (!b || samePt(b, task.a) || samePt(b, d.b)) return;
    game.tap({ b, said: null });
  };
  const check = () => {
    const b = d.b;
    if (!b) return;
    if (!onLine(task, b)) return game.miss({ misses: d.misses + 1, said: { kind: "wrong", why: slopeSlip(task, b) } });
    game.win({ stars, clean: d.misses === 0, notice: (streak) => slopeNotice(task, b, d.misses, streak), patch: { done: true } });
  };

  const wrong = d.said?.kind === "wrong";
  const pic = slopeSvg(task, { b: d.b, color: d.done ? "#2f9e44" : wrong ? "#e8590c" : undefined, step: d.done || wrong });
  const right = `${fill(w.right, { m, stars: starText(stars) })}${d.mode === "puzzle" && stars === 1 ? ` ${g.oneStar}` : ""}`;
  const drawn = d.b && d.b[0] !== task.a[0] ? gradText(d.b[1] - task.a[1], d.b[0] - task.a[0]) : "";
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]} ${right}` }
    : d.done ? { tone: "ok", text: right }
    : d.said?.kind === "wrong" ? { tone: "wrong", text: fill(w.why[d.said.why], { g: drawn, m }) }
    : { tone: "hint", text: d.b ? w.moved : w.hint };
  const ask = fill(task.level === 1 ? w.askUp : w.ask, { m, n: task.rise });
  return (
    <>
      <GameHead game={game} g={g}>
        <Stake stars={stars} tries={d.misses} g={g} />
      </GameHead>
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg ref={svgRef} className="plot-grid" width={pic.w} height={pic.h} viewBox={`0 0 ${pic.w} ${pic.h}`} fontFamily={FONT} role="img" aria-label={ask} style={{ cursor: d.done ? "default" : "crosshair", touchAction: "none" }} onPointerDown={tap}>
          <rect width={pic.w} height={pic.h} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: pic.body }} />
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.done}>
        <button className="live-btn on" disabled={!d.b || wrong} onClick={check}>{g.check}</button>
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
