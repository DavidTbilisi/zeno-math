// Growing patterns: figures 1, 2 and 3 of a pattern of squares, and what comes next. Build figure 4 by tapping squares
// on a grid, then check (anywhere on the grid will do, as long as it is the shape); or say how many squares figure 10,
// 20 or 50 has, or which figure has so many. Right first time earns three stars, after one miss two. Nine puzzles open
// in turn — figure 4 built, big figures counted, squares and rectangles and which figure — and the endless run keeps a
// streak right first time. Once it is right, the figures colour the part that stays and the part that grows. Built on
// the game shell (useGame), which does the ladder, the sounds and the cheer.
import { buildGrid, figuresSvg, GROW_LADDER, GROW_NOTICES, growAnswer, growNotice, growNow, growStars, judgeBuilt, type LiveGrow } from "../math/growing";
import { readWhole } from "../math/machine";
import { Keypad } from "./Keypad";
import { starText } from "./ladderUi";
import { fill, FONT, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";

const W = 520;
const CELL = 20;

const FRESH: Partial<LiveGrow> = { built: [], typed: "", misses: 0, done: false, said: null };

export function Growing({ state: d, set, w: words, svgRef }: PieceProps<"growing">) {
  const [w, g] = [words.growing, words.game];
  const game = useGame({ key: "zeno.growing.v1", size: GROW_LADDER.length, notices: GROW_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const task = growNow(d);
  const building = task.ask.dir === "build";
  const grid = buildGrid(task.kind);
  const figs = figuresSvg(task.kind, d.done, W - 20, (n) => fill(w.figure, { n }));
  const gridY = figs.h + 24;
  const H = building ? gridY + grid.rows * CELL + 8 : figs.h + 16;
  const gridX = (W - grid.cols * CELL) / 2;
  const stars = growStars(d.misses);

  const tap = (i: number) => !d.done && game.tap({ built: d.built.includes(i) ? d.built.filter((k) => k !== i) : [...d.built, i], said: null });
  const check = () => {
    let ok: boolean;
    let v: number;
    if (building) {
      const r = judgeBuilt(task.kind, 4, d.built, grid.cols, grid.rows);
      [ok, v] = [r.ok, r.count];
    } else {
      const typed = readWhole(d.typed);
      if (typed === null) return;
      [ok, v] = [typed === growAnswer(task), typed];
    }
    if (!ok) return game.miss({ typed: "", misses: d.misses + 1, said: { kind: "wrong", v } });
    game.win({ stars, clean: d.misses === 0, notice: (streak) => growNotice(task, d.misses, streak), patch: { done: true } });
  };

  const ask = task.ask.dir === "build" ? w.askBuild : task.ask.dir === "count" ? fill(w.askCount, { k: task.ask.k }) : fill(w.askWhich, { n: task.ask.count });
  const right = `${fill(w.right, { stars: starText(stars) })}${d.mode === "puzzle" && stars === 1 ? ` ${g.oneStar}` : ""}`;
  const wrong = building ? fill(w.wrongBuilt, { n: d.said?.kind === "wrong" ? d.said.v : 0 }) : fill(w.wrong, { v: d.said?.kind === "wrong" ? d.said.v : "" });
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]} ${right}` }
    : d.done ? { tone: "ok", text: right }
    : d.said?.kind === "wrong" ? { tone: "wrong", text: wrong }
    : { tone: "hint", text: building ? fill(w.built, { n: d.built.length }) : w.hint };
  const on = new Set(d.built);
  return (
    <>
      <GameHead game={game} g={g}>
        <Stake stars={stars} tries={d.misses} g={g} />
      </GameHead>
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} role="group" aria-label={ask}>
          <rect width={W} height={H} fill="#fff" />
          <g transform="translate(10 8)" dangerouslySetInnerHTML={{ __html: figs.body }} />
          {building &&
            Array.from({ length: grid.cols * grid.rows }, (_, i) => (
              <rect
                key={i}
                className="grow-cell"
                x={gridX + (i % grid.cols) * CELL}
                y={gridY + Math.floor(i / grid.cols) * CELL}
                width={CELL}
                height={CELL}
                fill={on.has(i) ? (d.done ? "#69db7c" : "#74c0fc") : "#f8f9fa"}
                stroke={on.has(i) ? "#1e1e1e" : "#dee2e6"}
                strokeWidth={on.has(i) ? 1.5 : 1}
                role="button"
                aria-pressed={on.has(i)}
                aria-label={fill(w.square, { x: (i % grid.cols) + 1, y: Math.floor(i / grid.cols) + 1 })}
                style={{ cursor: d.done ? "default" : "pointer" }}
                onClick={() => tap(i)}
              />
            ))}
        </svg>
      </Stage>
      {!building && !d.done && <Keypad value={d.typed} onChange={(typed) => set({ ...d, typed, said: null })} erase={w.erase} />}
      <GameActions game={game} g={g} done={d.done}>
        {building && <button className="live-btn" disabled={!d.built.length} onClick={() => set({ ...d, built: [], said: null })}>{g.clear}</button>}
        <button className="live-btn on" disabled={building ? !d.built.length : readWhole(d.typed) === null} onClick={check}>{g.check}</button>
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
