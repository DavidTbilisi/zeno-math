// Balance puzzles: scales that balance with shapes and weights on them, and what each shape weighs to find. Set each
// shape's weight, then weigh: the scales tip as those weights would make them, with each pan's total beneath, until
// they balance. Balanced at the first weighing earns three stars, the second two. Nine puzzles open in turn — one
// shape on one side, the same shape on both sides, two shapes and two scales — and the endless run keeps a streak of
// puzzles balanced at the first weighing. Built on the game shell (useGame), which does the ladder, the sounds and the
// cheer. Worked by hand: each shape's weight on a wheel beside it, and the scales themselves tapped to weigh.
import { BALANCE_LADDER, BALANCE_NOTICES, balanceNotice, balanceNow, balanceStars, balanceSvg, balanced, MAX_GUESS, SHAPE_COLORS, SHAPE_GLYPHS, type LiveBalance } from "../math/balance";
import { keyTap, NumBox } from "./hand";
import { starText } from "./ladderUi";
import { fill, FONT, INK, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";

const FRESH: Partial<LiveBalance> = { guess: [], weighed: false, misses: 0, done: false, said: null };

export function Balance({ state: d, set, w: words, svgRef }: PieceProps<"balance">) {
  const [w, g] = [words.balance, words.game];
  const game = useGame({ key: "zeno.balance.v1", size: BALANCE_LADDER.length, notices: BALANCE_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const task = balanceNow(d);
  const guess = task.values.map((_, i) => d.guess[i] ?? 1);
  const pic = balanceSvg(task, d.weighed || d.done ? guess : null);
  const [W, H] = [Math.max(pic.w, 300) + 20, balanceSvg(task, guess).h + 16];
  const stars = balanceStars(d.misses);

  const weigh = () => {
    if (!balanced(task, guess)) return game.miss({ guess, weighed: true, misses: d.misses + 1 });
    game.win({ stars, clean: d.misses === 0, notice: (streak) => balanceNotice(task, d.misses, streak), patch: { guess, weighed: true, done: true } });
  };

  const right = `${fill(w.right, { stars: starText(stars) })}${d.mode === "puzzle" && stars === 1 ? ` ${g.oneStar}` : ""}`;
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]} ${right}` }
    : d.done ? { tone: "ok", text: right }
    : d.weighed ? { tone: "wrong", text: w.notYet }
    : { tone: "hint", text: task.values.length > 1 ? w.hintTwo : w.hint };
  return (
    <>
      <GameHead game={game} g={g}>
        <Stake stars={stars} tries={d.misses} g={g} />
      </GameHead>
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT}>
          <rect width={W} height={H} fill="#fff" />
          <g role="button" tabIndex={d.done ? -1 : 0} aria-label={w.weigh} aria-disabled={d.done || undefined} className="hand-pic"
            style={{ cursor: d.done ? "default" : "pointer" }} onClick={() => !d.done && weigh()} onKeyDown={(e) => !d.done && keyTap(e, weigh)}>
            {!d.done && <title>{w.weigh}</title>}
            <rect width={W} height={H} fill="transparent" />
            <g transform={`translate(${(W - pic.w) / 2} 8)`} dangerouslySetInnerHTML={{ __html: pic.body }} />
          </g>
        </svg>
      </Stage>
      <svg width={W} height={64} viewBox={`0 0 ${W} 64`} className="hand-pic" fontFamily={FONT} style={{ display: "block", margin: "0 auto" }}>
        {task.values.map((_, i) => {
          const x = W / 2 - (task.values.length * 150) / 2 + i * 150 + 14;
          return (
            <g key={i} opacity={d.done ? 0.6 : 1}>
              {i === 0
                ? <rect x={x} y={20} width={26} height={26} rx={3} fill={SHAPE_COLORS[0]} />
                : <circle cx={x + 13} cy={33} r={14} fill={SHAPE_COLORS[1]} />}
              <text x={x + 46} y={41} fontSize={24} textAnchor="middle" fill={INK}>=</text>
              <NumBox x={x + 62} y={10} w={60} h={46} size={22} label={fill(w.weight, { s: SHAPE_GLYPHS[i] })} value={guess[i]} min={0} max={MAX_GUESS}
                onChange={(v) => !d.done && set({ ...d, guess: guess.map((x, j) => (j === i ? v : x)), weighed: false, said: null })} />
            </g>
          );
        })}
      </svg>
      <GameActions game={game} g={g} done={d.done} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
