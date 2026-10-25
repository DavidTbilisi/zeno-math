// Shade the fraction: a shape cut into equal pieces — a bar, a grid, a circle, or counters — and a fraction of it to
// shade. Tap pieces to shade them (again to unshade), then check: any pieces will do, as long as there are the right
// number. Right first time earns three stars, after one miss two. Nine puzzles open in turn — as many pieces as the
// bottom, then more, then counters too — and the endless run keeps a streak of shapes shaded right first time. Built
// on the game shell (useGame), which does the ladder, the sounds and the cheer.
import { encodeShade, judgeShade, piecesOf, SHADE_LADDER, SHADE_NOTICES, shadeNotice, shadeNow, shadeStars, shapeBox, type LiveShade } from "../math/shadeFrac";
import { starText } from "./ladderUi";
import { ShadePieces } from "./ShadePieces";
import { fill, FONT, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";

const SIZE = 300;

const FRESH: Partial<LiveShade> = { shaded: [], misses: 0, done: false, said: null };

export function ShadeGame({ state: d, set, w: words, svgRef }: PieceProps<"shadeFrac">) {
  const [w, g] = [words.shadeFrac, words.game];
  const game = useGame({ key: "zeno.shadefrac.v1", size: SHADE_LADDER.length, notices: SHADE_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const task = shadeNow(d);
  const box = shapeBox(task.play, SIZE);
  const stars = shadeStars(d.misses);

  const tap = (k: number) => {
    if (d.done) return;
    game.tap({ shaded: d.shaded.includes(k) ? d.shaded.filter((i) => i !== k) : [...d.shaded, k], said: null });
  };
  const check = () => {
    const v = judgeShade(task.play, task.count, encodeShade(d.shaded));
    if (!v.ok) return game.miss({ misses: d.misses + 1, said: { kind: "wrong", shaded: d.shaded.length } });
    game.win({ stars, clean: d.misses === 0, notice: (streak) => shadeNotice(task, d.shaded, streak), patch: { done: true } });
  };

  const ask = fill(task.play.shape === "set" ? w.shadeSet : w.shadeShape, { f: `${task.n}/${task.d}` });
  const done = d.done ? `${fill(w.right, { stars: starText(stars), k: task.count, p: task.play.pieces })}${d.mode === "puzzle" && stars === 1 ? ` ${g.oneStar}` : ""}` : "";
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]} ${done}` }
    : d.done ? { tone: "ok", text: done }
    : d.said?.kind === "wrong" ? { tone: "wrong", text: fill(w.wrong, { k: d.said.shaded }) }
    : { tone: "hint", text: fill(w.count, { k: d.shaded.length, p: task.play.pieces }) };
  return (
    <>
      <GameHead game={game} g={g}>
        <Stake stars={stars} tries={d.misses} g={g} />
      </GameHead>
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg ref={svgRef} width={box.w + 8} height={box.h + 8} viewBox={`-4 -4 ${box.w + 8} ${box.h + 8}`} fontFamily={FONT} role="group" aria-label={ask}>
          <rect x={-4} y={-4} width={box.w + 8} height={box.h + 8} fill="#fff" />
          <ShadePieces pieces={piecesOf(task.play, SIZE)} shaded={d.shaded} onTap={tap} disabled={d.done} tone={d.done ? "right" : null} />
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.done}>
        <button className="live-btn" disabled={!d.shaded.length} onClick={() => set({ ...d, shaded: [], said: null })}>{g.clear}</button>
        <button className="live-btn on" disabled={!d.shaded.length} onClick={check}>{g.check}</button>
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
