// The geoboard: a dot grid to make shapes on by tapping. In free play the area and perimeter follow the shape as it
// changes, and the board says when a shape shows something worth noticing (a square, a tilted square, the same area
// with a different perimeter). The puzzles are a ladder of nine: rectangles, triangles, then shapes with an area and
// a perimeter, each the practice question of its level, marked by the same checker. Up to three stars each — a miss
// or a peek at the numbers costs one — and a puzzle opens once the one before it has a star. Stars and discoveries
// are kept in this browser. Built on the game shell (useGame): a shape marked right wins the puzzle, one marked wrong
// is a miss, and what free play notices is a discovery with no judging.
import { useI18n } from "../i18n";
import { areaText, encodePoly, GEO_COLS, GEO_LADDER, GEO_ROWS, judgePoly, ladderTask, measurePoly, notice, NOTICES, shapeProblem, starsFor, type GeoPt, type LiveGeoboard } from "../math/geoPlay";
import { ladderDone } from "../math/ladder";
import { GeoGrid } from "./GeoGrid";
import { starText } from "./ladderUi";
import { fill, Toggle, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

/** A puzzle starts with an empty grid and the numbers hidden; free play shows them and keeps the shape there is. */
const FRESH: Partial<LiveGeoboard> = { misses: 0, peeked: false, said: null };
const stagePatch = (): Partial<LiveGeoboard> => ({ pts: [], area: false, perim: false });
const FREE_PATCH: Partial<LiveGeoboard> = { area: true, perim: true };

export function Geoboard({ state: d, set, w: words, svgRef }: PieceProps<"geoboard">) {
  const [w, g] = [words.geoboard, words.game];
  const { t } = useI18n();
  const pw = t.pracWords;
  const game = useGame({ key: "zeno.geoplay.v1", size: GEO_LADDER.length, notices: NOTICES, modes: ["puzzle", "free"], state: d, set, fresh: FRESH, stagePatch, freePatch: FREE_PATCH });
  const task = d.mode === "puzzle" ? ladderTask(d.stage) : null;
  const goal = task?.play.goal;

  const prompt = !task || !goal
    ? w.freeHint
    : task.level === 1 ? fill(pw.prompts.shapeRect, { n: areaText(goal.area2!) })
    : task.level === 2 ? fill(pw.prompts.shapeTriangle, { n: areaText(goal.area2!) })
    : fill(pw.prompts.shapeAreaPerim, { a: areaText(goal.area2!), p: goal.perim! });

  const valid = (pts: GeoPt[]) => pts.length >= 3 && !shapeProblem(pts, GEO_COLS, GEO_ROWS);
  const change = (pts: GeoPt[]) => {
    if (d.mode === "puzzle") return set({ ...d, pts, said: d.said?.kind === "right" ? d.said : null });
    // Free play: what the new shape shows, next to the last whole shape made.
    const now = valid(pts) ? measurePoly(pts) : null;
    game.spot({ pts, last: now ? { area2: now.area2, perim: now.perim } : d.last ?? null }, now ? notice(d.last, now) : null);
  };
  const check = () => {
    if (!task) return;
    const v = judgePoly(task.play, encodePoly(d.pts));
    if (v.ok) {
      const got = starsFor(d.misses, d.peeked);
      return game.win({ stars: got, patch: { said: { kind: "right", stars: got } } });
    }
    if (v.problem) return set({ ...d, said: { kind: "problem", problem: v.problem } });
    game.miss({ misses: d.misses + 1, said: { kind: "wrong" } });
  };
  // In a puzzle, showing a number the puzzle asks for is a peek.
  const toggle = (key: "area" | "perim") => {
    const on = !d[key];
    const asked = key === "area" || goal?.perim !== undefined;
    set({ ...d, [key]: on, peeked: d.peeked || (d.mode === "puzzle" && on && asked && d.said?.kind !== "right") });
  };

  const m = valid(d.pts) ? measurePoly(d.pts) : null;
  const done = d.said?.kind === "right";
  const stars = d.said?.kind === "right" ? d.said.stars : starsFor(d.misses, d.peeked);
  const s = d.said;
  const line: Line =
    s?.kind === "right" ? { tone: "ok", text: `${fill(w.right, { stars: starText(s.stars) })}${s.stars === 1 ? ` ${g.oneStar}` : ""}` }
    : s?.kind === "problem" ? { tone: "wrong", text: pw.reasons.shape[s.problem] }
    : s?.kind === "notice" ? { tone: "notice", text: w.notices[s.key] }
    : s?.kind === "wrong" ? { tone: "wrong", text: !m ? w.wrongShape : goal?.perim !== undefined && m.perim !== null ? fill(w.wrongBoth, { a: areaText(m.area2), p: m.perim }) : fill(w.wrong, { a: areaText(m.area2) }) }
    : { tone: "hint", text: d.mode === "puzzle" ? w.hint : ladderDone(game.ladder.stars) ? w.allDone : w.hint };

  return (
    <>
      <GameHead game={game} g={g} />
      <Said line={{ tone: "prompt", text: prompt }} />
      <Stage game={game} stars={stars} done={done} g={g} notices={w.notices}>
        <GeoGrid
          cols={GEO_COLS}
          rows={GEO_ROWS}
          pts={d.pts}
          onChange={change}
          svgRef={svgRef}
          cell={44}
          readouts={{ area: d.area ? w.area : undefined, perim: d.perim ? w.perimeter : undefined }}
          tone={done ? "right" : d.said?.kind === "wrong" ? "wrong" : null}
          label={prompt}
          disabled={done}
        />
      </Stage>
      <GameActions game={game} g={g} done={done} always>
        <Toggle on={d.area} onClick={() => toggle("area")} title={d.mode === "puzzle" ? w.peek : undefined}>▦ {w.area}</Toggle>
        <Toggle on={d.perim} onClick={() => toggle("perim")} title={d.mode === "puzzle" ? w.peek : undefined}>⬚ {w.perimeter}</Toggle>
        <button className="live-btn" disabled={!d.pts.length || done} onClick={() => change(d.pts.slice(0, -1))}>↶ {w.undo}</button>
        <button className="live-btn" disabled={!d.pts.length || done} onClick={() => change([])}>{g.clear}</button>
        {d.mode === "puzzle" && !done && <button className="live-btn on" disabled={d.pts.length < 3} onClick={check}>{g.check}</button>}
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
