// Growing patterns: figures 1, 2 and 3 of a pattern of squares, and what comes next. Build figure 4 by tapping squares
// on a grid, then check (anywhere on the grid will do, as long as it is the shape); or say how many squares figure 10,
// 20 or 50 has, or which figure has so many. Right first time earns three stars, after one miss two. Nine puzzles open
// in turn — figure 4 built, big figures counted, squares and rectangles and which figure — and the endless run keeps a
// streak right first time. Once it is right, the figures colour the part that stays and the part that grows.
import { useState } from "react";
import {
  buildGrid,
  figuresSvg,
  GROW_LADDER,
  GROW_NOTICES,
  growAnswer,
  growNotice,
  growNow,
  growStars,
  judgeBuilt,
  type GrowLevel,
  type LiveGrow,
} from "../math/growing";
import { withBest, withFound, withStars } from "../math/ladder";
import { readWhole } from "../math/machine";
import { play } from "./juice";
import { Keypad } from "./Keypad";
import { Cheer, Found, GameNav, newSeed, nextStage, Onward, SoundToggle, starText, useLadder } from "./ladderUi";
import { fill, FONT, type PieceProps } from "./ui";

const W = 520;
const CELL = 20;

export function Growing({ state: d, set, w: words, svgRef }: PieceProps<"growing">) {
  const [w, g] = [words.growing, words.game];
  const [ladder, keep] = useLadder("zeno.growing.v1", GROW_LADDER.length, GROW_NOTICES);
  const [cheer, setCheer] = useState(0);
  const task = growNow(d);
  const building = task.ask.dir === "build";
  const grid = buildGrid(task.kind);
  const figs = figuresSvg(task.kind, d.done, W - 20, (n) => fill(w.figure, { n }));
  const gridY = figs.h + 24;
  const H = building ? gridY + grid.rows * CELL + 8 : figs.h + 16;
  const gridX = (W - grid.cols * CELL) / 2;

  const tap = (i: number) => {
    if (d.done) return;
    play("snap");
    set({ ...d, built: d.built.includes(i) ? d.built.filter((k) => k !== i) : [...d.built, i], said: null });
  };
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
    if (!ok) {
      play("miss");
      return set({ ...d, typed: "", misses: d.misses + 1, streak: 0, said: { kind: "wrong", v } });
    }
    const stars = growStars(d.misses);
    const streak = d.mode === "endless" && d.misses === 0 ? d.streak + 1 : d.mode === "endless" ? 0 : d.streak;
    const key = growNotice(task, d.misses, streak);
    let next = withBest(ladder, d.mode === "endless" ? streak : 0);
    if (d.mode === "puzzle") next = withStars(next, d.stage, stars);
    if (key && !next.found.includes(key)) next = withFound(next, key, GROW_NOTICES);
    if (next !== ladder) keep(next);
    play("good");
    setTimeout(() => play("star"), 260);
    setCheer((c) => c + 1);
    set({ ...d, done: true, streak, said: key ? { kind: "notice", key } : null });
  };
  const fresh: Pick<LiveGrow, "built" | "typed" | "misses" | "done" | "said"> = { built: [], typed: "", misses: 0, done: false, said: null };
  const go = (stage: number) => set({ ...d, ...fresh, mode: "puzzle", stage });
  const endless = (l: GrowLevel) => set({ ...d, ...fresh, mode: "endless", level: l, seed: newSeed() });
  const onward = () => (d.mode === "endless" ? endless(d.level) : go(nextStage(d.stage, GROW_LADDER.length)));

  const ask = task.ask.dir === "build" ? w.askBuild : task.ask.dir === "count" ? fill(w.askCount, { k: task.ask.k }) : fill(w.askWhich, { n: task.ask.count });
  const stars = growStars(d.misses);
  const right = fill(w.right, { stars: starText(stars) });
  const wrong = building ? fill(w.wrongBuilt, { n: d.said?.kind === "wrong" ? d.said.v : 0 }) : fill(w.wrong, { v: d.said?.kind === "wrong" ? d.said.v : "" });
  const said =
    d.said?.kind === "notice" ? `${w.notices[d.said.key]} ${right}`
    : d.done ? right
    : d.said?.kind === "wrong" ? wrong
    : building ? fill(w.built, { n: d.built.length })
    : w.hint;
  const on = new Set(d.built);
  return (
    <>
      <GameNav ladder={ladder} mode={d.mode} stage={d.stage} level={d.level} streak={d.streak} onPuzzle={go} onEndless={endless} words={w} g={g} />
      <p className="live-said geo-prompt">{ask}</p>
      <div className="geo-stage-wrap">
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
        {cheer > 0 && d.done && <Cheer key={cheer} text={starText(stars)} />}
      </div>
      {!building && !d.done && <Keypad value={d.typed} onChange={(typed) => set({ ...d, typed, said: null })} erase={w.erase} />}
      <div className="live-bar">
        {building && <button className="live-btn" disabled={!d.built.length || d.done} onClick={() => set({ ...d, built: [], said: null })}>{g.clear}</button>}
        {d.done ? (
          <Onward mode={d.mode} stage={d.stage} size={GROW_LADDER.length} onClick={onward} g={g} />
        ) : (
          <button className="live-btn on" disabled={building ? !d.built.length : readWhole(d.typed) === null} onClick={check}>{g.check}</button>
        )}
        <SoundToggle title={g.sound} />
      </div>
      <p className={d.said?.kind === "notice" ? "live-said notice" : d.done ? "live-said ok" : d.said?.kind === "wrong" ? "live-said" : "live-hint"}>
        {said} <Found ladder={ladder} of={GROW_NOTICES.length} notices={w.notices} g={g} />
      </p>
    </>
  );
}
