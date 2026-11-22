// Make a whole: a bar with fraction tiles already in it and a gap to the target; tap tiles of the puzzle's family to
// put them in the gap (tap one in the bar to take it out). Exactly filling the gap earns two stars, and filling it with
// the fewest tiles there can be, three. Too much shows red past the end. Nine puzzles open in turn; the endless run keeps
// a streak of puzzles filled with the fewest tiles first time. Built on the game shell (useGame): a fill better than any
// before on this puzzle wins it (again), one no better is only noticed. Worked by hand: a tile is dragged from the tray
// under the bar into the gap (or tapped), one in the bar dragged out or into the bin (or tapped) is taken out, and the
// bin tapped empties the bar.
import { fillState, sumOf, TILE_COLORS, WALL_LADDER, WALL_NOTICES, wallNotice, wallNow, wallStars, type LiveWall } from "../math/fractionWall";
import { starText } from "./ladderUi";
import { Bin, BLUE, inBox, keyTap, RED, useDrag } from "./hand";
import { fill, FONT, INK, SvgFrac, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const W = 620;
const [BX, BY, BH] = [20, 40, 70];
/** The tray of tiles under the bar, and the bin at its right end. */
const [TY, TW, TH] = [136, 64, 52];
const H = TY + TH + 16;
const BIN = { x: W - 120, y: TY - 6, w: 100, h: TH + 12 };
/** Where a tile is let go to go in: the bar and a little round it. */
const BAR = { x: 0, y: BY - 24, w: W, h: BH + 48 };
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

  // A tray tile dragged into the bar (or tapped) goes in; a tile of the bar dragged out of it or into the bin (or tapped)
  // comes out.
  const { drag, begin, svgProps } = useDrag<{ den: number; at: number | null }>((p) => {
    const inBar = inBox(BAR, p.x, p.y) && !inBox(BIN, p.x, p.y);
    if (p.at === null) {
      if (!p.moved || inBar) put([...d.placed, p.den]);
    } else if (!p.moved || !inBar) put(d.placed.filter((_, j) => j !== p.at));
  });
  const taking = drag?.moved && drag.at !== null && !inBox(BAR, drag.x, drag.y);
  const into = drag?.moved && drag.at === null && inBox(BAR, drag.x, drag.y) && !inBox(BIN, drag.x, drag.y);

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
        <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} className="hand-pic" style={{ touchAction: "none" }} {...svgProps} aria-label={fill(w.make, { t: task.target.isInt() ? String(task.target.n) : `${task.target.n}/${task.target.d}` })}>
          <rect width={W} height={H} fill="#fff" />
          {/* The gap to fill, behind the tiles. */}
          <rect x={BX + unit * sumOf(task.fixed).toNumber()} y={BY} width={unit * task.gap.toNumber()} height={BH} fill={into ? "#e7f5ff" : "#f8f9fa"} stroke={into ? BLUE : "#868e96"} strokeWidth={into ? 2.5 : 1.5} strokeDasharray="6 4" />
          {tiles.map((r, k) => {
            const over = !r.fixed && r.x + r.w > end + 0.5;
            const away = drag?.moved && drag.at === r.i && !r.fixed;
            const out = () => put(d.placed.filter((_, j) => j !== r.i));
            return (
              <g key={k} role={r.fixed ? undefined : "button"} tabIndex={r.fixed ? undefined : 0} aria-label={r.fixed ? undefined : fill(w.takeOut, { f: `1/${r.den}` })}
                opacity={away ? 0.35 : 1} style={{ cursor: r.fixed ? "default" : "grab" }}
                onPointerDown={r.fixed ? undefined : (e) => begin(e, { den: r.den, at: r.i })} onKeyDown={r.fixed ? undefined : (e) => keyTap(e, out)}>
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
          {/* The tray: one tile of each size the puzzle has, to drag up into the gap. */}
          {task.sizes.map((den, i) => {
            const x = BX + i * (TW + 12);
            return (
              <g key={den} role="button" tabIndex={0} aria-label={`1/${den}`} style={{ cursor: "grab" }}
                onPointerDown={(e) => begin(e, { den, at: null })} onKeyDown={(e) => keyTap(e, () => put([...d.placed, den]))}>
                <rect x={x} y={TY} width={TW} height={TH} rx={6} fill={TILE_COLORS[den] ?? "#e9ecef"} stroke="#495057" strokeWidth={2} />
                <SvgFrac n={1} d={den} x={x + TW / 2} y={TY + TH / 2} />
              </g>
            );
          })}
          <Bin {...BIN} hot={!!taking && inBox(BIN, drag.x, drag.y)} label={g.clear} title={w.clearTitle} onTap={() => d.placed.length && put([])} />
          {drag?.moved && (
            <g pointerEvents="none" opacity={0.85}>
              <rect x={drag.x - TW / 2} y={drag.y - TH / 2} width={TW} height={TH} rx={6} fill={taking ? "#ffc9c9" : TILE_COLORS[drag.den] ?? "#e9ecef"} stroke={taking ? RED : "#495057"} strokeWidth={2} />
              <SvgFrac n={1} d={drag.den} x={drag.x} y={drag.y} />
            </g>
          )}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.best > 0} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
