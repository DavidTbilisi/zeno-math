// The recurrent-network lab: one unit unrolled over the steps, its state carried along and the gradient flowing back;
// move the recurrent weight, the input weight or a gated cell's forget gate. Five puzzles open in turn, each won with
// a Check, stars for doing one at the first try; free play takes any cell and input. What is mid-way (a slider being
// moved) stays here until it is let go, so each change is one step to undo. Built on the game shell (useGame).
import { useState } from "react";
import {
  CELLS,
  controlsOf,
  F_RANGE,
  gradients,
  judgeRnn,
  num,
  RNN_LADDER,
  RNN_NOTICES,
  RNN_PLOT,
  rnnPuzzle,
  rnnStars,
  rnnSvg,
  SEQ_IDS,
  seqOf,
  U_RANGE,
  unroll,
  W_RANGE,
  type LiveRnn,
  type RnnControl,
} from "../math/rnnLab";
import { starText } from "./ladderUi";
import { fill, FONT, type PieceProps } from "./ui";
import { PillRows, pillRowsH, Track, type RowItem } from "./hand";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const FRESH: Partial<LiveRnn> = { tries: 0, done: false, said: null };
const stagePatch = (stage: number): Partial<LiveRnn> => RNN_LADDER[stage].start;
const FREE_PATCH: Partial<LiveRnn> = { cell: "tanh", w: 1, u: 1, f: 0.9, seq: "flip" };
const RANGES: Record<RnnControl, { min: number; max: number; step: number }> = { w: W_RANGE, u: U_RANGE, f: F_RANGE };

export function RnnLab({ state, set, w: words, svgRef }: PieceProps<"rnnLab">) {
  const [w, g] = [words.rnnLab, words.game];
  const [draft, setDraft] = useState<Partial<LiveRnn> | null>(null);
  const d: LiveRnn = { ...state, ...draft };
  const p = rnnPuzzle(d);
  const can = controlsOf(d);

  const fresh = (change: Partial<LiveRnn>): Partial<LiveRnn> => ({ ...change, done: false, said: null });
  const commit = (change: Partial<LiveRnn> = {}) => {
    setDraft(null);
    set({ ...d, ...change });
  };
  const game = useGame({ key: "zeno.rnnlab.v1", size: RNN_LADDER.length, notices: RNN_NOTICES, modes: ["puzzle", "free"], state: d, set: commit, fresh: FRESH, stagePatch, freePatch: FREE_PATCH });

  const check = () => {
    if (!p) return;
    const v = judgeRnn(d, p.goal);
    if (v.state === "won") return game.win({ stars: rnnStars(d.tries), notice: () => p.notice, patch: { done: true } });
    game.miss({ tries: d.tries + 1, said: { kind: "wrong", why: v.why } });
  };

  const xs = seqOf(d);
  const hs = unroll(xs, d);
  const ask = p ? w.asks[`p${d.stage + 1}` as keyof typeof w.asks] : w.freeAsk;
  const verdict = p && d.said?.kind === "wrong" ? judgeRnn(d, p.goal) : null;
  const wrong = verdict?.state === "lost" ? verdict : null;
  const stars = rnnStars(d.tries);
  const notice = d.said?.kind === "notice" ? w.notices[d.said.key] : null;
  const line: Line =
    d.done ? { tone: notice ? "notice" : "ok", text: `${notice ? `${notice} ` : ""}${fill(w.right, { stars: starText(stars) })}${stars === 1 ? ` ${g.oneStar}` : ""}` }
    : wrong ? { tone: "wrong", text: fill(w.why[wrong.why], { have: num(wrong.have), want: num(wrong.want) }) }
    : { tone: "hint", text: p ? w.hint : w.freeHint };
  const read = fill(w.read, { h: num(hs[hs.length - 1]), g: num(Math.abs(gradients(xs, d)[0])) });
  const decimals = (c: RnnControl) => (c === "f" ? 2 : 1);

  const moves: RowItem[] = [
    ...(p ? [{ text: `✓ ${g.check}`, title: g.check, strong: true, disabled: d.done, onTap: check }] : []),
    ...(!p ? CELLS.map((c) => ({ text: w.cells[c], on: d.cell === c, onTap: () => commit({ cell: c }) })) : []),
    ...(!p ? SEQ_IDS.map((s, i) => ({ text: w.seqs[s], brk: i === 0, on: d.seq === s, onTap: () => commit({ seq: s }) })) : []),
  ];
  const DW = (RNN_PLOT.w - 16 - (can.length - 1) * 8) / Math.max(1, can.length);
  const dialH = can.length ? 44 : 0;
  const strip = dialH + pillRowsH(moves, RNN_PLOT.w) + 8;

  return (
    <>
      <GameHead game={game} g={g} />
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done && !!p} g={g} notices={w.notices}>
        <svg ref={svgRef} className="hand-pic" width={RNN_PLOT.w} height={RNN_PLOT.h + strip} viewBox={`0 0 ${RNN_PLOT.w} ${RNN_PLOT.h + strip}`} fontFamily={FONT} aria-label={w.picture}>
          <rect width={RNN_PLOT.w} height={RNN_PLOT.h + strip} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: rnnSvg(d, w.chart) }} />
          {can.map((c, i) => {
            const r = RANGES[c];
            return (
              <Track key={c} x={8 + i * (DW + 8)} y={RNN_PLOT.h + 4} w={DW} value={Math.round(d[c] / r.step)} min={Math.round(r.min / r.step)} max={Math.round(r.max / r.step)} label={w[c]} disabled={d.done}
                color={["#1971c2", "#e8590c", "#2f9e44"][i % 3]} show={(v) => `${c} = ${(v * r.step).toFixed(decimals(c))}`}
                onChange={(v, done) => (done ? commit(fresh({ [c]: Math.round(v * r.step * 100) / 100 })) : setDraft(fresh({ [c]: Math.round(v * r.step * 100) / 100 })))} />
            );
          })}
          <PillRows w={RNN_PLOT.w} y={RNN_PLOT.h + dialH} items={moves} />
        </svg>
      </Stage>
      <div className="descent-read">
        <span>{read}</span>
      </div>
      <GameActions game={game} g={g} done={d.done && !!p} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
