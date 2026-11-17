// Training in batches by hand: a line fitted to points by gradient descent, a batch of them at a time. The dials set
// the batch size, the learning rate η, its schedule from epoch to epoch and the step (plain, momentum or Adam); Step
// takes one batch's step, Epoch a whole pass over the points, Run plays the rest. The path of (w, b) is drawn on the
// loss's contours, the line on the points and the loss after every step on a chart. Six puzzles open in turn, each with
// one dial to turn, stars for doing one at the first try; free play turns every dial on either dataset. What is mid-way
// (a slider being moved, a run being played) stays here until it is let go, so each change is one step to undo. Built
// on the game shell (useGame): a run that ends meeting the goal wins the puzzle, one that does not is a miss.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BATCH_LADDER,
  BATCH_NOTICES,
  BATCH_PLOT,
  BATCHES,
  batchPuzzle,
  batchStars,
  batchSvg,
  bestOf,
  DATA_IDS,
  dataOf,
  ETAS,
  FREE_TOL,
  judgeRun,
  num,
  OPTIMISERS,
  puzzlePatch,
  rateAt,
  SCHEDULES,
  setupOf,
  train,
  type Knob,
  type LiveBatch,
} from "../math/batchLab";
import { starText } from "./ladderUi";
import { fill, FONT, Toggle, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

/** A new try of a puzzle starts from no steps; a puzzle of the ladder sets its dials, free play its own. */
const FRESH: Partial<LiveBatch> = { steps: 0, tries: 0, done: false, said: null };
const stagePatch = (stage: number): Partial<LiveBatch> => puzzlePatch(BATCH_LADDER[stage]);
const FREE_PATCH: Partial<LiveBatch> = { data: "line", batch: 4, eta: 0.05, schedule: "constant", opt: "sgd" };
/** About how many frames a run is played in. */
const FRAMES = 60;
const etaIndex = (eta: number) => ETAS.reduce((best, v, i) => (Math.abs(Math.log(v / eta)) < Math.abs(Math.log(ETAS[best] / eta)) ? i : best), 0);

export function BatchLab({ state, set, w: words, svgRef }: PieceProps<"batchLab">) {
  const [w, g] = [words.batchLab, words.game];
  const [draft, setDraft] = useState<Partial<LiveBatch> | null>(null);
  const [run, setRun] = useState<{ at: number; to: number } | null>(null);
  const d: LiveBatch = { ...state, ...draft };
  const p = batchPuzzle(d);
  const s = setupOf(d);
  const pts = useMemo(() => dataOf(s.data, s.seed), [s.data, s.seed]);
  const best = useMemo(() => bestOf(pts), [pts]);
  // The whole run, worked out again each time: at most 50 epochs of 24 points, a moment's work.
  const full = train(pts, s);
  const total = full.path.length - 1;
  const k = Math.min(run ? run.at : d.steps, total);
  const tol = p ? p.goal.tol : FREE_TOL;

  const fresh = (change: Partial<LiveBatch>): Partial<LiveBatch> => ({ ...change, steps: 0, done: false, said: null });
  const commit = (change: Partial<LiveBatch> = {}) => {
    setDraft(null);
    set({ ...d, ...change });
  };
  const game = useGame({
    key: "zeno.batchlab.v1",
    size: BATCH_LADDER.length,
    notices: BATCH_NOTICES,
    modes: ["puzzle", "free"],
    state: d,
    set: (st) => (setRun(null), commit(st)),
    fresh: FRESH,
    stagePatch,
    freePatch: FREE_PATCH,
  });

  // Steps taken up to n; at the end of a puzzle's run it is judged.
  const finish = (n: number) => {
    if (!p || n < total) return commit({ steps: n });
    const v = judgeRun(full, best.loss, p.goal);
    if (v.state === "won") return game.win({ stars: batchStars(d.tries), notice: () => p.notice, patch: { steps: n, done: true } });
    game.miss({ steps: n, tries: d.tries + 1, said: { kind: "wrong", why: v.why } }, { notice: () => (v.why === "blowUp" ? "blewUp" : null) });
  };
  const latest = useRef(finish);
  latest.current = finish;
  useEffect(() => {
    if (!run) return;
    if (run.at >= run.to) {
      setRun(null);
      latest.current(run.to);
      return;
    }
    const id = setTimeout(() => setRun({ ...run, at: Math.min(run.to, run.at + Math.max(1, Math.ceil((run.to - d.steps) / FRAMES))) }), 30);
    return () => clearTimeout(id);
  }, [run, d.steps]);

  const busy = !!run;
  const over = k >= total;
  const canStep = !busy && !d.done && !over;
  const perEpoch = Math.ceil(pts.length / s.batch);
  const epochNow = Math.min(s.epochs, Math.floor(k / perEpoch));
  const toEpochEnd = Math.min(total, (Math.floor(k / perEpoch) + 1) * perEpoch);

  // A dial: the puzzle's own one turns, the others show what it is set to.
  const may = (knob: Knob) => !busy && (!p || p.knob === knob);
  const turn = (change: Partial<LiveBatch>, done = true) => (done ? commit(fresh(change)) : setDraft({ ...draft, ...fresh(change) }));
  const ei = etaIndex(s.eta);

  const [pw, pb] = full.path[k];
  const gap = full.losses[k] - best.loss;
  const ask = p ? fill(w.asks[`p${d.stage + 1}` as keyof typeof w.asks], { epochs: p.epochs, tol: num(p.goal.tol) }) : w.freeAsk;
  const why = d.said?.kind === "wrong" ? d.said.why : null;
  const stars = batchStars(d.tries);
  const notice = d.said?.kind === "notice" ? w.notices[d.said.key] : null;
  const freeEnd = !p && over ? (full.away ? w.freeAway : gap <= FREE_TOL ? fill(w.freeReached, { e: s.epochs }) : w.freeNot) : null;
  const line: Line =
    d.done ? { tone: notice ? "notice" : "ok", text: `${notice ? `${notice} ` : ""}${fill(w.right, { stars: starText(stars) })}${stars === 1 ? ` ${g.oneStar}` : ""}` }
    : why ? { tone: "wrong", text: `${fill(w.why[why], { g: num(gap), tol: num(tol) })}${why === "blowUp" ? ` ${w.notices.blewUp}` : ""}` }
    : freeEnd ? { tone: full.away ? "wrong" : "hint", text: freeEnd }
    : { tone: "hint", text: p ? w.hints[p.knob] : w.freeHint };

  return (
    <>
      <GameHead game={game} g={g} />
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done && !!p} g={g} notices={w.notices}>
        <svg ref={svgRef} width={BATCH_PLOT.w} height={BATCH_PLOT.h} viewBox={`0 0 ${BATCH_PLOT.w} ${BATCH_PLOT.h}`} fontFamily={FONT} role="img" aria-label={w.picture}>
          <rect width={BATCH_PLOT.w} height={BATCH_PLOT.h} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: batchSvg(pts, s, full, k, { tol, words: w.chart }) }} />
        </svg>
      </Stage>
      <div className="descent-read">
        <span className="descent-rule">{w.rules[s.opt]}</span>
        <span>
          {fill(w.count, { e: epochNow, E: s.epochs, k, n: total })} · η = {num(rateAt(s.eta, s.schedule, Math.min(s.epochs - 1, epochNow)))} · {fill(w.read, { g: num(gap), w: num(pw), b: num(pb) })}
        </span>
      </div>
      <div className="live-bar descent-dials">
        <label className="live-slider">
          <b>η₀ = {num(s.eta)}</b>
          <input
            type="range"
            min={0}
            max={ETAS.length - 1}
            value={ei}
            disabled={!may("eta")}
            aria-label={w.eta}
            onChange={(e) => turn({ eta: ETAS[Number(e.target.value)] }, false)}
            onPointerUp={() => commit()}
            onKeyUp={() => commit()}
          />
        </label>
      </div>
      <div className="live-bar batch-dials">
        <span>{w.batch}</span>
        {BATCHES.map((b) => (
          <Toggle key={b} on={s.batch === b} disabled={!may("batch")} onClick={() => turn({ batch: b })}>{b === pts.length ? fill(w.all, { n: b }) : b}</Toggle>
        ))}
      </div>
      <div className="live-bar batch-dials">
        <span>{w.schedule}</span>
        {SCHEDULES.map((sc) => (
          <Toggle key={sc} on={s.schedule === sc} disabled={!may("schedule")} onClick={() => turn({ schedule: sc })}>{w.schedules[sc]}</Toggle>
        ))}
        <span>{w.opt}</span>
        {OPTIMISERS.map((o) => (
          <Toggle key={o} on={s.opt === o} disabled={!may("opt")} onClick={() => turn({ opt: o })}>{w.opts[o]}</Toggle>
        ))}
      </div>
      {!p && (
        <div className="live-bar batch-dials">
          {DATA_IDS.map((id) => (
            <Toggle key={id} on={d.data === id} disabled={busy} onClick={() => turn({ data: id })}>{w.datas[id]}</Toggle>
          ))}
          <button className="live-btn" disabled={busy} onClick={() => turn({ seed: d.seed + 1 })}>{w.newSample}</button>
        </div>
      )}
      <GameActions game={game} g={g} done={d.done && !!p} always>
        <button className="live-btn" disabled={!canStep} onClick={() => finish(k + 1)}>{w.step}</button>
        <button className="live-btn" disabled={!canStep} onClick={() => setRun({ at: k, to: toEpochEnd })}>{w.epoch}</button>
        <button className="live-btn on" disabled={!canStep} onClick={() => setRun({ at: k, to: total })}>▶ {w.run}</button>
        <button className="live-btn" disabled={busy || k === 0} onClick={() => commit(fresh({}))}>↺ {g.reset}</button>
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
