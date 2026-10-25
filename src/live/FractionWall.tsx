// Make a whole: a bar with fraction tiles already in it and a gap to the target; tap tiles of the puzzle's family to
// put them in the gap (tap one in the bar to take it out). Exactly filling the gap earns two stars, and filling it with
// the fewest tiles there can be, three. Too much shows red past the end. Nine puzzles open in turn; the endless run keeps
// a streak of puzzles filled with the fewest tiles first time. Built on the game shell (useGame): a fill better than any
// before on this puzzle wins it (again), one no better is only noticed.
import { fillState, sumOf, TILE_COLORS, WALL_LADDER, WALL_NOTICES, wallNotice, wallNow, wallStars, type LiveWall } from "../math/fractionWall";
import { starText } from "./ladderUi";
import { fill, FONT, HtmlFrac, INK, SvgFrac, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const W = 620;
const [BX, BY, BH] = [20, 40, 70];
const FRESH: Partial<LiveWall> = { placed: [], best: 0, said: null };

export function FractionWall({ state: d, set, w: words, svgRef }: PieceProps<"fractionWall">) {
  const [w, g] = [words.fractionWall, words.game];
  const game = useGame({ key: "zeno.fractionwall.v1", size: WALL_LADDER.length, notices: WALL_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const task = wallNow(d);
  const span = Math.max(task.target.toNumber(), task.target.toNumber() + Math.max(0, sumOf(d.placed).sub(task.gap).toNumber()));
  const unit = (W - 2 * BX) / span;
  const state = fillState(task, d.placed);

  // The first exact fill of a puzzle is the one the endless streak counts; a better fill after it wins again.
  const put = (placed: number[]) => {
    if (fillState(task, placed) !== "exact") return set({ ...d, placed, said: null });
    const stars = wallStars(task, placed);
    if (stars > d.best) return game.win({ stars, clean: stars === 3, counts: d.best === 0, notice: (streak) => wallNotice(placed, streak), patch: { placed, best: stars } });
    game.spot({ placed }, wallNotice(placed, d.streak));
  };

  // The tiles in the bar, left to right: the fixed ones, then the ones put in.
  let x = BX;
  const tiles = [...task.fixed.map((den) => ({ den, fixed: true })), ...d.placed.map((den) => ({ den, fixed: false }))].map((tile, i) => {
    const rect = { ...tile, i: i - task.fixed.length, x, w: unit / tile.den };
    x += rect.w;
    return rect;
  });
  const end = BX + unit * task.target.toNumber();
  const status =
    state === "exact" ? (d.placed.length <= task.fewest.length ? fill(w.fewest, { stars: starText(3) }) : fill(w.exact, { stars: starText(2) }))
    : state === "over" ? w.over
    : d.placed.length ? fill(w.short, { n: d.placed.length })
    : w.hint;
  const line: Line = {
    tone: d.said?.kind === "notice" ? "notice" : state === "exact" ? "ok" : state === "over" ? "wrong" : "hint",
    text: `${d.said?.kind === "notice" ? `${w.notices[d.said.key]} ` : ""}${status}`,
  };
  return (
    <>
      <GameHead game={game} g={g} />
      <Stage game={game} stars={d.best} done={state === "exact"} g={g} notices={w.notices}>
        <svg ref={svgRef} width={W} height={140} viewBox={`0 0 ${W} 140`} fontFamily={FONT} role="img" aria-label={fill(w.make, { t: task.target.isInt() ? String(task.target.n) : `${task.target.n}/${task.target.d}` })}>
          <rect width={W} height={140} fill="#fff" />
          {/* The gap to fill, behind the tiles. */}
          <rect x={BX + unit * sumOf(task.fixed).toNumber()} y={BY} width={unit * task.gap.toNumber()} height={BH} fill="#f8f9fa" stroke="#868e96" strokeWidth={1.5} strokeDasharray="6 4" />
          {tiles.map((r, k) => {
            const over = !r.fixed && r.x + r.w > end + 0.5;
            return (
              <g key={k} style={{ cursor: r.fixed ? "default" : "pointer" }} onClick={() => !r.fixed && put(d.placed.filter((_, j) => j !== r.i))}>
                {/* The tiles the puzzle starts with are paler than the ones put in. */}
                <rect x={r.x} y={BY} width={r.w} height={BH} fill={over ? "#ffc9c9" : TILE_COLORS[r.den] ?? "#e9ecef"} fillOpacity={r.fixed ? 0.45 : 1} stroke={over ? "#e03131" : "#495057"} strokeWidth={r.fixed ? 1.5 : 2} />
                {r.w >= 24 && <SvgFrac n={1} d={r.den} x={r.x + r.w / 2} y={BY + BH / 2} />}
              </g>
            );
          })}
          <line x1={end} y1={BY - 14} x2={end} y2={BY + BH + 14} stroke={state === "exact" ? "#2f9e44" : INK} strokeWidth={4} />
          {task.target.isInt() ? (
            <text x={end} y={BY - 20} fontSize={20} fontWeight={700} textAnchor="middle" fill={INK}>{task.target.n}</text>
          ) : (
            <SvgFrac n={task.target.n} d={task.target.d} x={end} y={BY - 30} size={15} />
          )}
          {task.target.toNumber() > 1 && <line x1={BX + unit} y1={BY + BH} x2={BX + unit} y2={BY + BH + 14} stroke={INK} strokeWidth={2} />}
        </svg>
      </Stage>
      <div className="live-bar wall-tray">
        {task.sizes.map((den) => (
          <button key={den} className="live-btn wall-tile" style={{ background: TILE_COLORS[den] }} title={`1/${den}`} aria-label={`1/${den}`} onClick={() => put([...d.placed, den])}>
            <HtmlFrac n={1} d={den} />
          </button>
        ))}
      </div>
      <GameActions game={game} g={g} done={d.best > 0} always>
        <button className="live-btn" disabled={!d.placed.length} onClick={() => put([])}>{g.clear}</button>
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
