// The nearest-neighbours lab: drag a new point among two classes and watch its k nearest neighbours vote; change k,
// the distance and the scaling, shade the regions every point of the plane would be called, and measure distances in
// more dimensions. Six puzzles open in turn, each won with a Check, stars for doing one at the first try; free play
// takes any dataset and every control. What is mid-way (a drag, a slider being moved) stays here until it is let go, so
// each change is one step to undo. Built on the game shell (useGame).
import { useState, type PointerEvent } from "react";
import {
  accuracy,
  controlsOf,
  DIMS,
  FREE_DATA,
  fromPx,
  judgeKnn,
  K_MAX,
  KNN_LADDER,
  KNN_NOTICES,
  KNN_PLOT,
  knnPoints,
  knnPuzzle,
  knnStars,
  knnSvg,
  METRICS,
  num,
  PLANE,
  settingOf,
  testOf,
  trainOf,
  vote,
  type LiveKnn,
} from "../math/knnLab";
import { play } from "./juice";
import { starText } from "./ladderUi";
import { fill, FONT, svgPoint, Toggle, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const FRESH: Partial<LiveKnn> = { tries: 0, done: false, said: null };
const stagePatch = (stage: number): Partial<LiveKnn> => KNN_LADDER[stage].start;
const FREE_PATCH: Partial<LiveKnn> = { q: [0.5, 0.5], k: 3, metric: "euclid", scaled: true, regions: true, dims: 2, data: "blobs" };

export function KnnLab({ state, set, w: words, svgRef }: PieceProps<"knnLab">) {
  const [w, g] = [words.knnLab, words.game];
  const [draft, setDraft] = useState<Partial<LiveKnn> | null>(null);
  const [dragging, setDragging] = useState(false);
  const d: LiveKnn = { ...state, ...draft };
  const p = knnPuzzle(d);
  const can = controlsOf(d);

  const fresh = (change: Partial<LiveKnn>): Partial<LiveKnn> => ({ ...change, done: false, said: null });
  const commit = (change: Partial<LiveKnn> = {}) => {
    setDraft(null);
    set({ ...d, ...change });
  };
  const game = useGame({ key: "zeno.knnlab.v1", size: KNN_LADDER.length, notices: KNN_NOTICES, modes: ["puzzle", "free"], state: d, set: commit, fresh: FRESH, stagePatch, freePatch: FREE_PATCH });

  const check = () => {
    if (!p) return;
    const v = judgeKnn(d, p.goal);
    if (v.state === "won") return game.win({ stars: knnStars(d.tries), notice: () => p.notice, patch: { done: true } });
    game.miss({ tries: d.tries + 1, said: { kind: "wrong", why: v.why } });
  };

  // Dragging the new point: anywhere on the plane picks it up.
  const at = (e: PointerEvent<SVGSVGElement>) => fromPx(...svgPoint(e.currentTarget, e));
  const down = (e: PointerEvent<SVGSVGElement>) => {
    const [px, py] = svgPoint(e.currentTarget, e);
    const inside = px >= PLANE.left - 8 && px <= PLANE.left + PLANE.size + 8 && py >= PLANE.top - 8 && py <= PLANE.top + PLANE.size + 8;
    if (!inside || d.done || !can.includes("drag")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    setDraft(fresh({ q: at(e) }));
  };
  const move = (e: PointerEvent<SVGSVGElement>) => dragging && setDraft(fresh({ q: at(e) }));
  const up = () => {
    if (!dragging) return;
    setDragging(false);
    play("snap");
    commit();
  };

  const ps = knnPoints(d);
  const s = settingOf(d);
  const v = vote({ x: d.q[0], y: d.q[1] }, trainOf(ps), s);
  const tests = testOf(ps);
  const classes = w.chart.classes;
  const ask = p ? w.asks[`p${d.stage + 1}` as keyof typeof w.asks] : w.freeAsk;
  const verdict = p && d.said?.kind === "wrong" ? judgeKnn(d, p.goal) : null;
  const wrong = verdict?.state === "lost" ? verdict : null;
  const stars = knnStars(d.tries);
  const notice = d.said?.kind === "notice" ? w.notices[d.said.key] : null;
  const shown = (why: string, x: number) => (why === "wrongClass" ? classes[x] : num(x));
  const line: Line =
    d.done ? { tone: notice ? "notice" : "ok", text: `${notice ? `${notice} ` : ""}${fill(w.right, { stars: starText(stars) })}${stars === 1 ? ` ${g.oneStar}` : ""}` }
    : wrong ? { tone: "wrong", text: fill(w.why[wrong.why], { have: shown(wrong.why, wrong.have), want: shown(wrong.why, wrong.want) }) }
    : { tone: "hint", text: !p ? w.freeHint : can.includes("drag") && can.length === 1 ? w.dragHint : w.hint };
  const read = fill(w.read, { k: d.k, o: v.votes[1], b: v.votes[0], c: classes[v.c] }) + (tests.length ? fill(w.readTest, { t: num(accuracy(tests, trainOf(ps), s)) }) : "");

  return (
    <>
      <GameHead game={game} g={g} />
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done && !!p} g={g} notices={w.notices}>
        <svg
          ref={svgRef}
          width={KNN_PLOT.w}
          height={KNN_PLOT.h}
          viewBox={`0 0 ${KNN_PLOT.w} ${KNN_PLOT.h}`}
          fontFamily={FONT}
          role="img"
          aria-label={w.picture}
          style={{ cursor: !can.includes("drag") ? "default" : dragging ? "grabbing" : "crosshair", touchAction: "none" }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        >
          <rect width={KNN_PLOT.w} height={KNN_PLOT.h} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: knnSvg(d, w.chart) }} />
        </svg>
      </Stage>
      <div className="descent-read">
        <span>{read}</span>
      </div>
      <div className="live-bar descent-dials">
        {can.includes("k") && (
          <label className="live-slider">
            <b>k = {d.k}</b>
            <input
              type="range"
              min={1}
              max={K_MAX}
              value={d.k}
              disabled={d.done}
              aria-label={w.k}
              onChange={(e) => setDraft(fresh({ k: Number(e.target.value) }))}
              onPointerUp={() => commit()}
              onKeyUp={() => commit()}
            />
          </label>
        )}
        {can.includes("dims") && (
          <label className="live-slider">
            <b>d = {d.dims}</b>
            <input
              type="range"
              min={0}
              max={DIMS.length - 1}
              value={Math.max(0, DIMS.indexOf(d.dims))}
              disabled={d.done}
              aria-label={w.dims}
              onChange={(e) => setDraft(fresh({ dims: DIMS[Number(e.target.value)] }))}
              onPointerUp={() => commit()}
              onKeyUp={() => commit()}
            />
          </label>
        )}
      </div>
      <GameActions game={game} g={g} done={d.done && !!p} always>
        {p && <button className="live-btn on" disabled={d.done} onClick={check}>✓ {g.check}</button>}
        {can.includes("metric") && METRICS.map((m) => <Toggle key={m} on={d.metric === m} disabled={d.done} onClick={() => commit(fresh({ metric: m }))}>{w.metrics[m]}</Toggle>)}
        {can.includes("scale") && <Toggle on={d.scaled} disabled={d.done} onClick={() => commit(fresh({ scaled: !d.scaled }))}>{w.scaled}</Toggle>}
        <Toggle on={d.regions} onClick={() => commit({ regions: !d.regions })}>{w.regions}</Toggle>
        {!p && FREE_DATA.map((id) => <Toggle key={id} on={d.data === id} onClick={() => commit({ data: id })}>{w.datas[id]}</Toggle>)}
        {!p && <button className="live-btn" onClick={() => commit({ seed: d.seed + 1 })}>{w.newSample}</button>}
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
