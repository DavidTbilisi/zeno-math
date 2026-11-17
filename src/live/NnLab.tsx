// The network lab: one neuron (the perceptron) updated point by point until its line splits the classes, then a
// network with a hidden layer trained step by step on the log loss, with the boundary shaded and the loss curve
// drawn; XOR, a circle and noisy points with test points show what a hidden layer, the activations and overfitting do.
// Four puzzles open in turn, each won with a Check, stars for doing one at the first try; free play takes any dataset
// and every control. Built on the game shell (useGame).
import { useState } from "react";
import {
  accuracy,
  ACTS,
  caller,
  controlsOf,
  ETAS,
  FREE_DATA,
  HIDDEN,
  judgeNn,
  NN_LADDER,
  NN_NOTICES,
  NN_PLOT,
  nnPoints,
  nnPuzzle,
  nnStars,
  nnSvg,
  num,
  perceptronUpdate,
  testOf,
  TRAIN_STEPS,
  trainMore,
  trainOf,
  type LiveNn,
} from "../math/nnLab";
import { play } from "./juice";
import { starText } from "./ladderUi";
import { fill, FONT, Toggle, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const FRESH: Partial<LiveNn> = { tries: 0, done: false, said: null };
const stagePatch = (stage: number): Partial<LiveNn> => NN_LADDER[stage].start;
/** Back to untrained: no network, no curves, and the perceptron at its starting line. */
const UNTRAINED: Partial<LiveNn> = { net: null, steps: 0, losses: [], testLosses: [], perceptron: [1, 1, 0], next: 0, used: null, updates: 0 };
const FREE_PATCH: Partial<LiveNn> = { ...UNTRAINED, hidden: 4, act: "tanh", eta: 1, data: "circle" };

export function NnLab({ state, set, w: words, svgRef }: PieceProps<"nnLab">) {
  const [w, g] = [words.nnLab, words.game];
  const [draft, setDraft] = useState<Partial<LiveNn> | null>(null);
  const d: LiveNn = { ...state, ...draft };
  const p = nnPuzzle(d);
  const can = controlsOf(d);
  const ps = nnPoints(d);
  const [train, test] = [trainOf(ps), testOf(ps)];

  const fresh = (change: Partial<LiveNn>): Partial<LiveNn> => ({ ...change, done: false, said: null });
  const commit = (change: Partial<LiveNn> = {}) => {
    setDraft(null);
    set({ ...d, ...change });
  };
  const game = useGame({ key: "zeno.nnlab.v1", size: NN_LADDER.length, notices: NN_NOTICES, modes: ["puzzle", "free"], state: d, set: commit, fresh: FRESH, stagePatch, freePatch: FREE_PATCH });

  const check = () => {
    if (!p) return;
    const v = judgeNn(d, p.goal);
    if (v.state === "won") return game.win({ stars: nnStars(d.tries), notice: () => p.notice, patch: { done: true } });
    game.miss({ tries: d.tries + 1, said: { kind: "wrong", why: v.why } });
  };

  // The perceptron's updates, one or ten at a time.
  const nextUpdate = perceptronUpdate(d.perceptron, train, d.next);
  const update = (times: number) => {
    let s = { perceptron: d.perceptron, next: d.next, used: d.used, updates: d.updates };
    for (let i = 0; i < times; i++) {
      const u = perceptronUpdate(s.perceptron, train, s.next);
      if (!u) break;
      s = { perceptron: u.w, next: u.next, used: u.used, updates: s.updates + 1 };
    }
    play("snap");
    commit(fresh(s));
  };
  const trainSome = () => {
    play("snap");
    commit(fresh(trainMore(d, TRAIN_STEPS)));
  };

  const call = caller(d);
  const ask = p ? w.asks[`p${d.stage + 1}` as keyof typeof w.asks] : w.freeAsk;
  const verdict = p && d.said?.kind === "wrong" ? judgeNn(d, p.goal) : null;
  const wrong = verdict?.state === "lost" ? verdict : null;
  const stars = nnStars(d.tries);
  const notice = d.said?.kind === "notice" ? w.notices[d.said.key] : null;
  const shown = (why: string, v: number) => (why === "wrongPoints" ? String(v) : num(v));
  const line: Line =
    d.done ? { tone: notice ? "notice" : "ok", text: `${notice ? `${notice} ` : ""}${fill(w.right, { stars: starText(stars) })}${stars === 1 ? ` ${g.oneStar}` : ""}` }
    : wrong ? { tone: "wrong", text: fill(w.why[wrong.why], { have: shown(wrong.why, wrong.have), want: shown(wrong.why, wrong.want) }) }
    : { tone: "hint", text: p ? w.hint : w.freeHint };
  const read = fill(w.read, { a: num(accuracy(call, train)) }) + (test.length ? fill(w.readTest, { t: num(accuracy(call, test)) }) : "");
  const perceptron = d.hidden === 0;

  return (
    <>
      <GameHead game={game} g={g} />
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done && !!p} g={g} notices={w.notices}>
        <svg ref={svgRef} width={NN_PLOT.w} height={NN_PLOT.h} viewBox={`0 0 ${NN_PLOT.w} ${NN_PLOT.h}`} fontFamily={FONT} role="img" aria-label={w.picture}>
          <rect width={NN_PLOT.w} height={NN_PLOT.h} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: nnSvg(d, w.chart) }} />
        </svg>
      </Stage>
      <div className="descent-read">
        <span>{read}</span>
      </div>
      <div className="live-bar descent-dials">
        {can.includes("hidden") && (
          <label className="live-slider">
            <b>{w.hidden}: {d.hidden}</b>
            <input
              type="range"
              min={0}
              max={HIDDEN.length - 1}
              value={Math.max(0, HIDDEN.indexOf(d.hidden))}
              disabled={d.done}
              aria-label={w.hidden}
              onChange={(e) => setDraft(fresh({ ...UNTRAINED, hidden: HIDDEN[Number(e.target.value)] }))}
              onPointerUp={() => commit()}
              onKeyUp={() => commit()}
            />
          </label>
        )}
        {can.includes("eta") && !perceptron && (
          <label className="live-slider">
            <b>η = {d.eta}</b>
            <input
              type="range"
              min={0}
              max={ETAS.length - 1}
              value={Math.max(0, ETAS.indexOf(d.eta))}
              disabled={d.done}
              aria-label={w.eta}
              onChange={(e) => setDraft(fresh({ eta: ETAS[Number(e.target.value)] }))}
              onPointerUp={() => commit()}
              onKeyUp={() => commit()}
            />
          </label>
        )}
      </div>
      <GameActions game={game} g={g} done={d.done && !!p} always>
        {p && <button className="live-btn on" disabled={d.done} onClick={check}>✓ {g.check}</button>}
        {perceptron && can.includes("update") && (
          <>
            <button className="live-btn" disabled={d.done || !nextUpdate} onClick={() => update(1)}>{w.update}</button>
            <button className="live-btn" disabled={d.done || !nextUpdate} onClick={() => update(10)}>{w.updates10}</button>
          </>
        )}
        {!perceptron && can.includes("train") && <button className="live-btn" disabled={d.done} onClick={trainSome}>{fill(w.train, { n: TRAIN_STEPS })}</button>}
        {can.includes("act") && !perceptron && ACTS.map((a) => <Toggle key={a} on={d.act === a} disabled={d.done} onClick={() => commit(fresh({ ...UNTRAINED, act: a }))}>{w.acts[a]}</Toggle>)}
        {(can.includes("train") || can.includes("update")) && <button className="live-btn" disabled={d.done} onClick={() => commit(fresh({ ...UNTRAINED, start: d.start + 1 }))}>{w.newStart}</button>}
        {!p && FREE_DATA.map((id) => <Toggle key={id} on={d.data === id} onClick={() => commit({ ...UNTRAINED, data: id })}>{w.datas[id]}</Toggle>)}
        {!p && <button className="live-btn" onClick={() => commit({ ...UNTRAINED, seed: d.seed + 1 })}>{w.newSample}</button>}
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
