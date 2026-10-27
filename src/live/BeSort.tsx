// Be the sort: the player is the algorithm. Bubble sort, insertion sort, selection sort, a merge and a partition run on
// the board one decision at a time, and the player makes each one: tap the gap of the next swap, the gap the key drops
// into, the smallest of the rest, the run head that goes out next, the next item smaller than the pivot. A tap that is
// not the algorithm's next move is not made: the stage shakes and the line names the rule it broke. No miss earns three
// stars, one two. Nine puzzles open in turn, from bubble sort on five items to a merge of two runs of four, and the
// endless run keeps a streak of sorts made without a miss. Built on the game shell (useGame), which does the ladder,
// the sounds and the cheer.
import { checkTap, SORT_LADDER, SORT_NOTICES, sortNotice, sortNow, sortRun, sortStars, sortSvg, type LiveBeSort, type Target } from "../math/beSort";
import { starText } from "./ladderUi";
import { fill, FONT, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";

const FRESH: Partial<LiveBeSort> = { step: 0, misses: 0, done: false, said: null };

export function BeSort({ state: d, set, w: words, svgRef }: PieceProps<"beSort">) {
  const [w, g] = [words.beSort, words.game];
  const game = useGame({ key: "zeno.besort.v1", size: SORT_LADDER.length, notices: SORT_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const run = sortRun(sortNow(d));
  const { algo } = run.task;
  const look = run.looks[Math.min(d.step, run.looks.length - 1)];
  const stars = sortStars(d.misses);

  const tap = (move: number) => {
    if (d.done) return;
    const c = checkTap(run, d.step, move);
    if (!c.ok) return game.miss({ misses: d.misses + 1, said: { kind: "wrong", why: c.why, vars: c.vars } });
    const step = d.step + 1;
    if (step < run.moves.length) return game.step({ step, said: null }, { counts: false });
    game.win({ stars, clean: d.misses === 0, notice: (streak) => sortNotice(run, d.misses, streak), patch: { step, done: true } });
  };

  const pic = sortSvg(run, d.done ? run.moves.length : d.step);
  const vars = {
    k: look.algo === "insertion" ? look.a[look.i] : 0,
    p: run.task.a[run.task.a.length - 1],
  };
  const right = `${fill(w.right[algo], { n: run.moves.length, p: vars.p, stars: starText(stars) })}${d.mode === "puzzle" && stars === 1 ? ` ${g.oneStar}` : ""}`;
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]} ${right}` }
    : d.done ? { tone: "ok", text: right }
    : d.said?.kind === "wrong" ? { tone: "wrong", text: fill(w.why[d.said.why], d.said.vars) }
    : { tone: "hint", text: fill(w.hint[algo], vars) };
  const label = (t: Target) =>
    t.kind === "gap" ? fill(w.gap, { i: t.move + 1 }) : t.kind === "head" ? fill(t.move === 0 ? w.leftHead : w.rightHead, { v: t.v! }) : fill(w.place, { i: t.move + 1, v: t.v! });
  return (
    <>
      <GameHead game={game} g={g}>
        <Stake stars={stars} tries={d.misses} g={g} />
      </GameHead>
      <Said line={{ tone: "prompt", text: `${w.names[algo]}: ${fill(w.ask[algo], vars)}` }} />
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg ref={svgRef} width={pic.w} height={pic.h} viewBox={`0 0 ${pic.w} ${pic.h}`} fontFamily={FONT} role="group" aria-label={w.names[algo]}>
          <rect width={pic.w} height={pic.h} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: pic.body }} />
          {pic.targets.map((t) => (
            <rect key={`${t.kind}${t.move}`} x={t.x} y={t.y} width={t.w} height={t.h} fill="transparent" role="button" aria-label={label(t)} style={{ cursor: d.done ? "default" : "pointer" }} onClick={() => tap(t.move)} />
          ))}
        </svg>
      </Stage>
      <p className="live-said info sort-moves" aria-live="polite">{fill(w.moves, { k: d.done ? run.moves.length : d.step, n: run.moves.length })}</p>
      <GameActions game={game} g={g} done={d.done} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
