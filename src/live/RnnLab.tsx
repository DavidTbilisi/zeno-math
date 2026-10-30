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
import { fill, FONT, Toggle, type PieceProps } from "./ui";
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

  return (
    <>
      <GameHead game={game} g={g} />
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done && !!p} g={g} notices={w.notices}>
        <svg ref={svgRef} width={RNN_PLOT.w} height={RNN_PLOT.h} viewBox={`0 0 ${RNN_PLOT.w} ${RNN_PLOT.h}`} fontFamily={FONT} role="img" aria-label={w.picture}>
          <rect width={RNN_PLOT.w} height={RNN_PLOT.h} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: rnnSvg(d, w.chart) }} />
        </svg>
      </Stage>
      <div className="descent-read">
        <span>{read}</span>
      </div>
      <div className="live-bar descent-dials">
        {can.map((c) => {
          const r = RANGES[c];
          return (
            <label key={c} className="live-slider">
              <b>{c} = {d[c].toFixed(decimals(c))}</b>
              <input
                type="range"
                min={Math.round(r.min / r.step)}
                max={Math.round(r.max / r.step)}
                value={Math.round(d[c] / r.step)}
                disabled={d.done}
                aria-label={w[c]}
                onChange={(e) => setDraft(fresh({ [c]: Math.round(Number(e.target.value) * r.step * 100) / 100 }))}
                onPointerUp={() => commit()}
                onKeyUp={() => commit()}
              />
            </label>
          );
        })}
      </div>
      <GameActions game={game} g={g} done={d.done && !!p} always>
        {p && <button className="live-btn on" disabled={d.done} onClick={check}>✓ {g.check}</button>}
        {!p && CELLS.map((c) => <Toggle key={c} on={d.cell === c} onClick={() => commit({ cell: c })}>{w.cells[c]}</Toggle>)}
        {!p && SEQ_IDS.map((s) => <Toggle key={s} on={d.seq === s} onClick={() => commit({ seq: s })}>{w.seqs[s]}</Toggle>)}
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
