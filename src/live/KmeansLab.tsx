// The k-means lab: points without labels and k centres; assign every point to its nearest centre, move every centre to
// its points' mean, step by step or run to the end, watching the error fall. Centres can be dragged, new starts drawn
// (random or k-means++) and k changed, with the lowest error for every k drawn beside. Five puzzles open in turn, each
// won with a Check, stars for doing one at the first try; free play takes any dataset and every control. What is
// mid-way (a drag, a slider being moved) stays here until it is let go, so each change is one step to undo. Built on
// the game shell (useGame).
import { useState, type PointerEvent } from "react";
import {
  assignStep,
  centreAt,
  controlsOf,
  FREE_DATA,
  fromPx,
  judgeKm,
  K_MAX,
  KM_LADDER,
  KM_NOTICES,
  KM_PLOT,
  kmPoints,
  kmPuzzle,
  kmStars,
  kmSvg,
  labelsOf,
  moveStep,
  num,
  plusStart,
  PUZZLE_SEED,
  randomStart,
  run,
  settled,
  sse,
  type LiveKmeans,
} from "../math/kmeansLab";
import { play } from "./juice";
import { starText } from "./ladderUi";
import { fill, FONT, svgPoint, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const FRESH: Partial<LiveKmeans> = { tries: 0, done: false, said: null };
/** A puzzle's start; one led by k shows k's clustering already run. */
function stagePatch(stage: number): Partial<LiveKmeans> {
  const p = KM_LADDER[stage];
  return p.controls.includes("k") ? settled(kmPoints({ mode: "puzzle", stage } as LiveKmeans), p.start.k ?? 2, PUZZLE_SEED) : p.start;
}
const FREE_PATCH: Partial<LiveKmeans> = { k: 3, centres: [[0.45, 0.5], [0.5, 0.55], [0.55, 0.5]], labels: null, errs: [], steps: 0, data: "three" };

export function KmeansLab({ state, set, w: words, svgRef }: PieceProps<"kmeansLab">) {
  const [w, g] = [words.kmeansLab, words.game];
  const [draft, setDraft] = useState<Partial<LiveKmeans> | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const d: LiveKmeans = { ...state, ...draft };
  const p = kmPuzzle(d);
  const can = controlsOf(d);
  const ps = kmPoints(d);

  const fresh = (change: Partial<LiveKmeans>): Partial<LiveKmeans> => ({ ...change, done: false, said: null });
  const commit = (change: Partial<LiveKmeans> = {}) => {
    setDraft(null);
    set({ ...d, ...change });
  };
  const game = useGame({ key: "zeno.kmeanslab.v1", size: KM_LADDER.length, notices: KM_NOTICES, modes: ["puzzle", "free"], state: d, set: commit, fresh: FRESH, stagePatch, freePatch: FREE_PATCH });

  const check = () => {
    if (!p) return;
    const v = judgeKm(d, p.goal);
    if (v.state === "won") return game.win({ stars: kmStars(d.tries), notice: () => p.notice, patch: { done: true } });
    game.miss({ tries: d.tries + 1, said: { kind: "wrong", why: v.why } });
  };

  // The steps: each appends the error it leaves.
  const errsSoFar = () => (d.errs.length || !d.labels ? d.errs : [sse(ps, d.labels, d.centres)]);
  const assign = () => {
    const labels = assignStep(ps, d.centres);
    play("snap");
    commit(fresh({ labels, steps: d.steps + 1, errs: [...errsSoFar(), sse(ps, labels, d.centres)] }));
  };
  const move = () => {
    if (!d.labels) return;
    const centres = moveStep(ps, d.labels, d.centres);
    play("snap");
    commit(fresh({ centres, steps: d.steps + 1, errs: [...errsSoFar(), sse(ps, d.labels, centres)] }));
  };
  const runAll = () => {
    const out = run(ps, d.centres, d.labels);
    const before = errsSoFar();
    play("good");
    commit(fresh({ centres: out.centres, labels: out.labels, steps: d.steps + out.errs.length - (d.labels ? 1 : 0), errs: before.length ? [...before, ...out.errs.slice(d.labels ? 1 : 0)] : out.errs }));
  };
  const restart = (how: "plus" | "random") => {
    const n = d.starts + 1;
    commit(fresh({ centres: how === "plus" ? plusStart(ps, d.k, n + 100) : randomStart(ps, d.k, n + 100), labels: null, errs: [], steps: 0, starts: n }));
  };
  const setK = (k: number) => (p ? settled(ps, k, PUZZLE_SEED) : { k, centres: plusStart(ps, k, d.starts + 1), labels: null, errs: [], steps: 0 });

  // Dragging a centre: from these centres k-means starts again (or, live, every point follows its nearest).
  const down = (e: PointerEvent<SVGSVGElement>) => {
    if (!can.includes("drag") || d.done) return;
    const j = centreAt(d.centres, ...svgPoint(e.currentTarget, e));
    if (j === null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag(j);
  };
  const moveDrag = (e: PointerEvent<SVGSVGElement>) => {
    if (drag === null) return;
    const centres = d.centres.map((c, j) => (j === drag ? fromPx(...svgPoint(e.currentTarget, e)) : c));
    setDraft(fresh({ centres, labels: null, errs: [], steps: 0 }));
  };
  const up = () => {
    if (drag === null) return;
    setDrag(null);
    play("snap");
    commit();
  };

  const labels = labelsOf(d, ps);
  const ask = p ? w.asks[`p${d.stage + 1}` as keyof typeof w.asks] : w.freeAsk;
  const verdict = p && d.said?.kind === "wrong" ? judgeKm(d, p.goal) : null;
  const wrong = verdict?.state === "lost" ? verdict : null;
  const stars = kmStars(d.tries);
  const notice = d.said?.kind === "notice" ? w.notices[d.said.key] : null;
  const shown = (why: string, v: number) => (why === "errorHigh" ? num(v) : String(v));
  const hint = !p ? w.freeHint : can.includes("k") ? w.kHint : can.length === 1 && can[0] === "drag" ? w.dragHint : w.hint;
  const line: Line =
    d.done ? { tone: notice ? "notice" : "ok", text: `${notice ? `${notice} ` : ""}${fill(w.right, { stars: starText(stars) })}${stars === 1 ? ` ${g.oneStar}` : ""}` }
    : wrong ? { tone: "wrong", text: fill(w.why[wrong.why], { have: shown(wrong.why, wrong.have), want: shown(wrong.why, wrong.want) }) }
    : { tone: "hint", text: hint };
  const read = fill(w.read, { k: d.k, n: d.steps, e: num(labels ? sse(ps, labels, d.centres) : NaN) });

  return (
    <>
      <GameHead game={game} g={g} />
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done && !!p} g={g} notices={w.notices}>
        <svg
          ref={svgRef}
          width={KM_PLOT.w}
          height={KM_PLOT.h}
          viewBox={`0 0 ${KM_PLOT.w} ${KM_PLOT.h}`}
          fontFamily={FONT}
          role="img"
          aria-label={w.picture}
          style={{ cursor: drag !== null ? "grabbing" : can.includes("drag") ? "grab" : "default", touchAction: "none" }}
          onPointerDown={down}
          onPointerMove={moveDrag}
          onPointerUp={up}
          onPointerCancel={up}
        >
          <rect width={KM_PLOT.w} height={KM_PLOT.h} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: kmSvg(d, w.chart) }} />
        </svg>
      </Stage>
      <div className="descent-read">
        <span>{read}</span>
      </div>
      {can.includes("k") && (
        <div className="live-bar descent-dials">
          <label className="live-slider">
            <b>k = {d.k}</b>
            <input
              type="range"
              min={1}
              max={K_MAX}
              value={d.k}
              disabled={d.done}
              aria-label={w.k}
              onChange={(e) => setDraft(fresh(setK(Number(e.target.value))))}
              onPointerUp={() => commit()}
              onKeyUp={() => commit()}
            />
          </label>
        </div>
      )}
      <GameActions game={game} g={g} done={d.done && !!p} always>
        {p && <button className="live-btn on" disabled={d.done} onClick={check}>✓ {g.check}</button>}
        {can.includes("step") && (
          <>
            <button className="live-btn" disabled={d.done} onClick={assign}>{w.assign}</button>
            <button className="live-btn" disabled={d.done || !d.labels} onClick={move}>{w.move}</button>
          </>
        )}
        {can.includes("run") && <button className="live-btn" disabled={d.done} onClick={runAll}>{w.runAll}</button>}
        {can.includes("starts") && (
          <>
            <button className="live-btn" disabled={d.done} onClick={() => restart("plus")}>{w.plus}</button>
            <button className="live-btn" disabled={d.done} onClick={() => restart("random")}>{w.random}</button>
          </>
        )}
        {!p && FREE_DATA.map((id) => <button key={id} className={`live-btn${d.data === id ? " on" : ""}`} aria-pressed={d.data === id} onClick={() => commit({ data: id, labels: null, errs: [], steps: 0 })}>{w.datas[id]}</button>)}
        {!p && <button className="live-btn" onClick={() => commit({ seed: d.seed + 1, labels: null, errs: [], steps: 0 })}>{w.newSample}</button>}
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
