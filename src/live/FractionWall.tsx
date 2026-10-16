// Make a whole: a bar with fraction tiles already in it and a gap to the target; tap tiles of the puzzle's family to
// put them in the gap (tap one in the bar to take it out). Exactly filling the gap earns two stars, and filling it with
// the fewest tiles there can be, three. Too much shows red past the end. Nine puzzles open in turn; the endless run keeps
// a streak of puzzles filled with the fewest tiles first time.
import { useState } from "react";
import {
  fillState,
  sumOf,
  TILE_COLORS,
  WALL_LADDER,
  WALL_NOTICES,
  wallNotice,
  wallNow,
  wallStars,
  type LiveWall,
  type WallLevel,
} from "../math/fractionWall";
import { withBest, withFound, withStars } from "../math/ladder";
import { play } from "./juice";
import { Cheer, Found, GameNav, newSeed, nextStage, Onward, SoundToggle, starText, useLadder } from "./ladderUi";
import { fill, FONT, HtmlFrac, INK, SvgFrac, type PieceProps } from "./ui";

const W = 620;
const [BX, BY, BH] = [20, 40, 70];

export function FractionWall({ state: d, set, w: words, svgRef }: PieceProps<"fractionWall">) {
  const [w, g] = [words.fractionWall, words.game];
  const [ladder, keep] = useLadder("zeno.fractionwall.v1", WALL_LADDER.length, WALL_NOTICES);
  const [cheer, setCheer] = useState(0);
  const task = wallNow(d);
  const span = Math.max(task.target.toNumber(), task.target.toNumber() + Math.max(0, sumOf(d.placed).sub(task.gap).toNumber()));
  const unit = (W - 2 * BX) / span;
  const state = fillState(task, d.placed);

  const put = (placed: number[]) => {
    if (fillState(task, placed) !== "exact") return set({ ...d, placed, said: null });
    const stars = wallStars(task, placed);
    const first = d.best === 0;
    const streak = d.mode === "endless" && first ? (stars === 3 ? d.streak + 1 : 0) : d.streak;
    const key = wallNotice(placed, streak);
    let next = withBest(ladder, d.mode === "endless" ? streak : 0);
    if (d.mode === "puzzle") next = withStars(next, d.stage, stars);
    if (key && !next.found.includes(key)) next = withFound(next, key, WALL_NOTICES);
    if (next !== ladder) keep(next);
    if (stars > d.best) {
      play("good");
      setTimeout(() => play("star"), 260);
      setCheer((c) => c + 1);
    }
    set({ ...d, placed, best: Math.max(d.best, stars), streak, said: key ? { kind: "notice", key } : null });
  };
  const fresh: Pick<LiveWall, "placed" | "best" | "said"> = { placed: [], best: 0, said: null };
  const go = (stage: number) => set({ ...d, ...fresh, mode: "puzzle", stage });
  const endless = (level: WallLevel) => set({ ...d, ...fresh, mode: "endless", level, seed: newSeed() });
  const onward = () => (d.mode === "endless" ? endless(d.level) : go(nextStage(d.stage, WALL_LADDER.length)));

  // The tiles in the bar, left to right: the fixed ones, then the ones put in.
  let x = BX;
  const tiles = [...task.fixed.map((den) => ({ den, fixed: true })), ...d.placed.map((den) => ({ den, fixed: false }))].map((tile, i) => {
    const rect = { ...tile, i: i - task.fixed.length, x, w: unit / tile.den };
    x += rect.w;
    return rect;
  });
  const end = BX + unit * task.target.toNumber();
  const said =
    d.said?.kind === "notice" ? `${w.notices[d.said.key]} `
    : "";
  const status =
    state === "exact" ? (d.placed.length <= task.fewest.length ? fill(w.fewest, { stars: starText(3) }) : fill(w.exact, { stars: starText(2) }))
    : state === "over" ? w.over
    : d.placed.length ? fill(w.short, { n: d.placed.length })
    : w.hint;
  return (
    <>
      <GameNav ladder={ladder} mode={d.mode} stage={d.stage} level={d.level} streak={d.streak} onPuzzle={go} onEndless={endless} words={w} g={g} />
      <div className="geo-stage-wrap">
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
        {cheer > 0 && state === "exact" && <Cheer key={cheer} text={starText(d.best)} />}
      </div>
      <div className="live-bar wall-tray">
        {task.sizes.map((den) => (
          <button key={den} className="live-btn wall-tile" style={{ background: TILE_COLORS[den] }} title={`1/${den}`} aria-label={`1/${den}`} onClick={() => put([...d.placed, den])}>
            <HtmlFrac n={1} d={den} />
          </button>
        ))}
      </div>
      <div className="live-bar">
        <button className="live-btn" disabled={!d.placed.length} onClick={() => put([])}>{g.clear}</button>
        {d.best > 0 && <Onward mode={d.mode} stage={d.stage} size={WALL_LADDER.length} onClick={onward} g={g} />}
        <SoundToggle title={g.sound} />
      </div>
      <p className={d.said?.kind === "notice" ? "live-said notice" : state === "exact" ? "live-said ok" : state === "over" ? "live-said" : "live-hint"}>
        {said}
        {status} <Found ladder={ladder} of={WALL_NOTICES.length} notices={w.notices} g={g} />
      </p>
    </>
  );
}
