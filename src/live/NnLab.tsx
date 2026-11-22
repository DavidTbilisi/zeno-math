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
import { fill, FONT, type PieceProps } from "./ui";
import { PillRows, pillRowsH, Track, type RowItem } from "./hand";
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

  const moves: RowItem[] = [
    ...(p ? [{ text: `✓ ${g.check}`, title: g.check, strong: true, disabled: d.done, onTap: check }] : []),
    ...(perceptron && can.includes("update")
      ? [{ text: w.update, disabled: d.done || !nextUpdate, onTap: () => update(1) }, { text: w.updates10, disabled: d.done || !nextUpdate, onTap: () => update(10) }]
      : []),
    ...(!perceptron && can.includes("train") ? [{ text: fill(w.train, { n: TRAIN_STEPS }), disabled: d.done, onTap: trainSome }] : []),
    ...(can.includes("act") && !perceptron ? ACTS.map((a) => ({ text: w.acts[a], on: d.act === a, disabled: d.done, onTap: () => commit(fresh({ ...UNTRAINED, act: a })) })) : []),
    ...(can.includes("train") || can.includes("update") ? [{ text: w.newStart, disabled: d.done, onTap: () => commit(fresh({ ...UNTRAINED, start: d.start + 1 })) }] : []),
    ...(!p
      ? [
          ...FREE_DATA.map((id, i) => ({ text: w.datas[id], brk: i === 0, on: d.data === id, onTap: () => commit({ ...UNTRAINED, data: id }) })),
          { text: w.newSample, onTap: () => commit({ ...UNTRAINED, seed: d.seed + 1 }) },
        ]
      : []),
  ];
  const dials = [...(can.includes("hidden") ? ["hidden" as const] : []), ...(can.includes("eta") && !perceptron ? ["eta" as const] : [])];
  const DW = (NN_PLOT.w - 16 - (dials.length - 1) * 8) / Math.max(1, dials.length);
  const dialH = dials.length ? 44 : 0;
  const strip = dialH + pillRowsH(moves, NN_PLOT.w) + 8;

  return (
    <>
      <GameHead game={game} g={g} />
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done && !!p} g={g} notices={w.notices}>
        <svg ref={svgRef} className="hand-pic" width={NN_PLOT.w} height={NN_PLOT.h + strip} viewBox={`0 0 ${NN_PLOT.w} ${NN_PLOT.h + strip}`} fontFamily={FONT} aria-label={w.picture}>
          <rect width={NN_PLOT.w} height={NN_PLOT.h + strip} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: nnSvg(d, w.chart) }} />
          {dials.map((k, i) => {
            const x = 8 + i * (DW + 8);
            return k === "hidden" ? (
              <Track key={k} x={x} y={NN_PLOT.h + 4} w={DW} value={Math.max(0, HIDDEN.indexOf(d.hidden))} min={0} max={HIDDEN.length - 1} label={w.hidden} disabled={d.done} lead={110} show={(v) => `${w.hidden}: ${HIDDEN[v]}`}
                onChange={(v, done) => (done ? commit(fresh({ ...UNTRAINED, hidden: HIDDEN[v] })) : setDraft(fresh({ ...UNTRAINED, hidden: HIDDEN[v] })))} />
            ) : (
              <Track key={k} x={x} y={NN_PLOT.h + 4} w={DW} value={Math.max(0, ETAS.indexOf(d.eta))} min={0} max={ETAS.length - 1} label={w.eta} disabled={d.done} color="#e8590c" show={(v) => `η = ${ETAS[v]}`}
                onChange={(v, done) => (done ? commit(fresh({ eta: ETAS[v] })) : setDraft(fresh({ eta: ETAS[v] })))} />
            );
          })}
          <PillRows w={NN_PLOT.w} y={NN_PLOT.h + dialH} items={moves} />
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
