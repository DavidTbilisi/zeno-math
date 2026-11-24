// Join up: number tiles on a grid of four by four, slid all together by a swipe across the grid or an arrow key. Two
// tiles pushed together join when they belong together (math/joinUp.ts): into their sum while it is no more than the
// target, or into their product while it divides the target; a pair that makes the target is cleared and counted on
// the row of dots under the grid, which also marks how many pass the round. The line under it says what the last
// slide joined and what that tile still needs. The round ends when the dots are full (three stars) or no slide moves
// anything. Two games share this piece, sums and products, each with its own ladder. The board keeps the slides made,
// so one step back on the board takes one slide back. Built on the game shell (useGame): a target made is a step, the
// end of the round the win, clean when the dots were filled.
import { useMemo, type KeyboardEvent } from "react";
import {
  canSlide,
  finishNotice,
  JOIN_LADDERS,
  JOIN_N,
  JOIN_NOTICES,
  joinNow,
  joinStars,
  joinText,
  needs,
  play,
  type Dir,
  type JoinDeck,
  type LiveJoin,
} from "../math/joinUp";
import { GREEN, MUTED, useDrag } from "./hand";
import { starText } from "./ladderUi";
import { fill, FONT, INK, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const [W, CELL, GAP, TOP] = [440, 84, 8, 14];
const SIDE = JOIN_N * CELL + (JOIN_N + 1) * GAP;
const LEFT = (W - SIDE) / 2;
const DOTS_Y = TOP + SIDE + 26;
const H = DOTS_Y + 26;
/** A swipe shorter than this is not one. */
const SWIPE = 18;
const FRESH: Partial<LiveJoin> = { slides: "", done: false, said: null };
/** Where each game keeps its ladder in this browser (model/gameKeys.ts says the same). */
const LADDER: Record<JoinDeck, { key: string }> = { sum: { key: "zeno.joinsum.v1" }, product: { key: "zeno.joinproduct.v1" } };
const KEYS: Record<string, Dir> = { ArrowLeft: "L", ArrowRight: "R", ArrowUp: "U", ArrowDown: "D" };
type JoinProps = PieceProps<"joinSum"> | PieceProps<"joinProduct">;

/** A tile's colours: the nearer it is to the target, the deeper the blue. */
function tint(v: number, target: number, product: boolean): { paper: string; ink: string } {
  const k = product ? Math.log(v) / Math.log(target) : v / target;
  const shades = ["#e7f5ff", "#d0ebff", "#a5d8ff", "#74c0fc", "#4dabf7", "#339af0", "#1c7ed6"];
  const i = Math.max(0, Math.min(shades.length - 1, Math.floor(k * shades.length)));
  return { paper: shades[i], ink: i >= 4 ? "#fff" : INK };
}

export function JoinUp({ state: d, set, w: words, svgRef }: JoinProps) {
  const [w, g] = [words.join, words.game];
  const deck = d.deck;
  const game = useGame({ ...LADDER[deck], size: JOIN_LADDERS[deck].length, notices: JOIN_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const { mode, stage, level, seed: runSeed } = d;
  const { spec, seed } = useMemo(() => joinNow({ deck, mode, stage, level, seed: runSeed }), [deck, mode, stage, level, runSeed]);
  const r = useMemo(() => play(spec, seed, d.slides), [spec, seed, d.slides]);
  const product = spec.kind === "product";
  const stars = joinStars(spec, r.made);

  const move = (dir: Dir) => {
    if (d.done || !canSlide(spec, r, dir)) return;
    const slides = d.slides + dir;
    const after = play(spec, seed, slides);
    const made = after.made - r.made;
    if (after.full || after.stuck)
      return game.win({
        stars: joinStars(spec, after.made),
        clean: after.full,
        right: after.made >= spec.pass,
        notice: (streak) => (made >= 2 ? "double" : finishNotice(spec, after, streak)),
        patch: { slides, done: true, said: null },
      });
    if (made) return game.step({ slides, said: null }, { counts: false, notice: () => (made >= 2 ? "double" : null) });
    game.tap({ slides, said: null });
  };
  const keys = (e: KeyboardEvent) => {
    const dir = KEYS[e.key];
    if (!dir) return;
    // The board around would scroll or move its own selection.
    e.preventDefault();
    e.stopPropagation();
    move(dir);
  };
  // A swipe anywhere on the picture slides the tiles the way it went.
  const { begin, svgProps } = useDrag<object>((at) => {
    const [dx, dy] = [at.x - at.x0, at.y - at.y0];
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "R" : "L") : dy > 0 ? "D" : "U");
  });

  const madeNow = r.last.filter((j) => j.made);
  const grown = r.last.filter((j) => !j.made);
  const said = d.said;
  const doneText = r.full
    ? d.mode === "endless" ? fill(w.clean, { target: spec.target, made: r.made }) : fill(w.full, { target: spec.target, made: r.made, moves: r.moves, stars: starText(stars) })
    : d.mode === "endless" ? fill(w.slipped, { made: r.made, full: spec.full }) : `${fill(w.stuck, { target: spec.target, made: r.made, full: spec.full, stars: starText(stars) })}${stars === 1 ? ` ${g.oneStar}` : ""}`;
  const line: Line =
    said?.kind === "notice" ? { tone: "notice", text: d.done ? `${w.notices[said.key]} ${doneText}` : w.notices[said.key] }
    : d.done ? { tone: r.full ? "ok" : "near", text: doneText }
    : madeNow.length ? { tone: "ok", text: fill(w.made, { pairs: madeNow.map((j) => joinText(spec, j)).join(",  ") }) }
    : grown.length ? { tone: "prompt", text: fill(w.joined, { eq: joinText(spec, grown[grown.length - 1]), need: needs(spec, grown[grown.length - 1].v), target: spec.target }) }
    : { tone: "hint", text: fill(product ? w.hintProduct : w.hintSum, { target: spec.target }) };
  const cellAt = (c: number) => ({ x: LEFT + GAP + (c % JOIN_N) * (CELL + GAP), y: TOP + GAP + Math.floor(c / JOIN_N) * (CELL + GAP) });
  const dotGap = Math.min(26, (W - 60) / spec.full);
  const dotX = (i: number) => W / 2 + (i - (spec.full - 1) / 2) * dotGap;

  return (
    <>
      <GameHead game={game} g={g}>
        <span className="live-stake">
          <b aria-label={`${stars} ★`}>{starText(stars)}</b>
          {fill(w.goal, { target: spec.target, made: r.made, full: spec.full })}
        </span>
      </GameHead>
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} className="hand-pic" role="application" tabIndex={0}
          aria-label={fill(product ? w.labelProduct : w.labelSum, { target: spec.target })} onKeyDown={keys} onPointerDown={(e) => begin(e, {})} style={{ touchAction: "none", cursor: d.done ? "default" : "grab" }} {...svgProps}>
          <rect x={LEFT} y={TOP} width={SIDE} height={SIDE} rx={12} fill="#f1f3f5" stroke="#ced4da" strokeWidth={1.5} />
          {r.grid.map((v, c) => {
            const { x, y } = cellAt(c);
            if (v === null) return <rect key={c} x={x} y={y} width={CELL} height={CELL} rx={8} fill="#fff" opacity={0.7} />;
            const { paper, ink } = tint(v, spec.target, product);
            return (
              <g key={c} data-tile={v} data-cell={c}>
                <rect x={x} y={y} width={CELL} height={CELL} rx={8} fill={paper} stroke={c === r.fresh && !d.done ? INK : "#74c0fc"} strokeWidth={c === r.fresh && !d.done ? 2.5 : 1} strokeDasharray={c === r.fresh && !d.done ? "5 4" : undefined} />
                <text x={x + CELL / 2} y={y + CELL / 2 + (v > 99 ? 10 : 12)} fontSize={v > 99 ? 28 : 34} fontWeight={700} textAnchor="middle" fill={ink}>{v}</text>
              </g>
            );
          })}
          {/* The target made so far, a dot each; the ring marks how many pass the round. */}
          <g role="img" aria-label={fill(w.dots, { made: r.made, full: spec.full, pass: spec.pass })}>
            {Array.from({ length: spec.full }, (_, i) => (
              <g key={i}>
                {i === spec.pass - 1 && <circle cx={dotX(i)} cy={DOTS_Y} r={12.5} fill="none" stroke={MUTED} strokeWidth={1.5} strokeDasharray="3 3" />}
                <circle cx={dotX(i)} cy={DOTS_Y} r={8} fill={i < r.made ? GREEN : "#fff"} stroke={i < r.made ? GREEN : "#adb5bd"} strokeWidth={2} />
              </g>
            ))}
          </g>
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.done} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
