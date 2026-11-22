// The geoboard: a dot grid to make shapes on by tapping. In free play the area and perimeter follow the shape as it
// changes, and the board says when a shape shows something worth noticing (a square, a tilted square, the same area
// with a different perimeter). The puzzles are a ladder of nine: rectangles, triangles, then shapes with an area and
// a perimeter, each the practice question of its level, marked by the same checker. Up to three stars each — a miss
// or a peek at the numbers costs one — and a puzzle opens once the one before it has a star. Stars and discoveries
// are kept in this browser. Built on the game shell (useGame): a shape marked right wins the puzzle, one marked wrong
// is a miss, and what free play notices is a discovery with no judging. Worked by hand: a puzzle's shape is checked by
// closing the band (the first corner tapped again); pills over the grid show the area and the perimeter, a bin takes
// the whole shape off, and a corner tapped is taken off.
import { useI18n } from "../i18n";
import { areaText, encodePoly, GEO_COLS, GEO_LADDER, GEO_ROWS, judgePoly, ladderTask, measurePoly, notice, NOTICES, shapeProblem, starsFor, type GeoPt, type LiveGeoboard } from "../math/geoPlay";
import { ladderDone } from "../math/ladder";
import { GeoGrid } from "./GeoGrid";
import { starText } from "./ladderUi";
import { Bin, Pill } from "./hand";
import { fill, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

/** A puzzle starts with an empty grid and the numbers hidden; free play shows them and keeps the shape there is. */
const FRESH: Partial<LiveGeoboard> = { misses: 0, peeked: false, said: null };
const stagePatch = (): Partial<LiveGeoboard> => ({ pts: [], area: false, perim: false });
const FREE_PATCH: Partial<LiveGeoboard> = { area: true, perim: true };
/** The strip over the grid is as wide as the grid: 10 squares of 44 and a margin of 28 each side. */
const SW = 2 * 28 + 10 * 44;

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
    : { tone: "hint", text: d.mode === "puzzle" ? w.closeHint : ladderDone(game.ladder.stars) ? w.allDone : w.hint };
  const peek = d.mode === "puzzle" ? w.peek : undefined;
  const pillW = (t: string) => Math.max(80, t.length * 15 * 0.6 + 34);

  return (
    <>
      <GameHead game={game} g={g} />
      <Said line={{ tone: "prompt", text: prompt }} />
      <Stage game={game} stars={stars} done={done} g={g} notices={w.notices}>
        <svg width={SW} height={72} viewBox={`0 0 ${SW} 72`} className="hand-pic" fontFamily="inherit" style={{ display: "block", margin: "0 auto" }}>
          <Pill x={28} y={22} w={pillW(w.area)} h={32} text={`▦ ${w.area}`} on={d.area} title={peek} onTap={() => toggle("area")} />
          <Pill x={36 + pillW(w.area)} y={22} w={pillW(w.perimeter)} h={32} text={`⬚ ${w.perimeter}`} on={d.perim} title={peek} onTap={() => toggle("perim")} />
          {!done && (
            <Bin x={SW - 28 - 84} y={4} w={84} h={64} hot={false} label={w.clear} title={w.clearTitle} onTap={() => d.pts.length && change([])} />
          )}
        </svg>
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
          onClose={d.mode === "puzzle" ? { label: w.close, close: check } : undefined}
        />
      </Stage>
      <GameActions game={game} g={g} done={done} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
