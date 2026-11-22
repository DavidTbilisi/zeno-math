// Overfitting by hand: noisy points from a hidden curve and a polynomial fitted to them, its degree, the number of
// points or the penalty λ turned with a slider. The red sticks are the training error, the orange circles the test
// points it is judged on, the chart beside keeps a dot for every setting tried, and the bars show the coefficients.
// Eight puzzles open in turn, stars for doing one at the first try, and free play takes any points (click to add, drag,
// tap to take away) and any curve, size and noise. What is mid-way (a drag, a slider being moved) stays here until it
// is let go, so each change is one step to undo. Built on the game shell (useGame): a check that meets the puzzle's
// goal wins it, one that does not is a miss.
import { useState, type PointerEvent } from "react";
import {
  DEGREES,
  FIT_LADDER,
  FIT_NOTICES,
  FIT_PLOT,
  LAMBDAS,
  NOISES,
  SIZES,
  TRUTH_IDS,
  biggest,
  draw,
  fitPuzzle,
  fitStars,
  fitStart,
  fitSvg,
  fromPage,
  judgeFit,
  knobAt,
  knobValues,
  lambdaText,
  num,
  scores,
  setupOf,
  toPage,
  turned,
  VIEW_X,
  VIEW_Y,
  type Knob,
  type LiveFit,
  type Pt,
} from "../math/fitLab";
import { PillRows, pillRowsH, Track, type RowItem } from "./hand";
import { play } from "./juice";
import { starText } from "./ladderUi";
import { fill, FONT, svgPoint, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

/** The most points free play takes. */
const MAX_PTS = 80;
/** A dial's row under the plot, and the width of one of two side by side. */
const [DIAL_H, HALF] = [40, (FIT_PLOT.w - 24) / 2];
type Grab = { i: number; moved: boolean };

const keepIn = (v: number, lim: number) => Math.round(Math.min(lim - 0.05, Math.max(-(lim - 0.05), v)) * 1000) / 1000;
/** A new try starts from no tries; a puzzle of the ladder sets its points and knobs, free play its own. */
const FRESH: Partial<LiveFit> = { tries: 0, done: false, said: null };
const stagePatch = (stage: number): Partial<LiveFit> => fitStart(FIT_LADDER[stage]);
const freePatch = (): Partial<LiveFit> => ({ ...fitStart(null), showTest: true, showFresh: false, showTruth: false });

export function FitLab({ state, set, w: words, svgRef }: PieceProps<"fitLab">) {
  const [w, g] = [words.fitLab, words.game];
  const [draft, setDraft] = useState<Partial<LiveFit> | null>(null);
  const [grab, setGrab] = useState<Grab | null>(null);
  const d: LiveFit = { ...state, ...draft };
  const p = fitPuzzle(d);
  const knob: Knob = p?.knob ?? "degree";
  const show = p ? p.show : d.showTest ? "test" : "train";
  // Once a puzzle is done everything is shown: the test points, the hidden curve, every setting on the chart.
  const test = p ? show === "test" || d.done : d.showTest;
  const fresh = p ? show === "bv" : d.showFresh;
  const truth = p ? show === "bv" || d.done : d.showTruth;

  // A change starts the try afresh: what was said about the last check goes.
  const fresh0 = (change: Partial<LiveFit>): Partial<LiveFit> => ({ ...change, done: false, said: null });
  const commit = (change: Partial<LiveFit> = {}) => {
    setDraft(null);
    set({ ...d, ...change });
  };
  const game = useGame({ key: "zeno.fitlab.v1", size: FIT_LADDER.length, notices: FIT_NOTICES, modes: ["puzzle", "free"], state: d, set: commit, fresh: FRESH, stagePatch, freePatch: freePatch() });

  const check = () => {
    if (!p) return;
    const v = judgeFit(p, d);
    if (v.state === "won") return game.win({ stars: fitStars(d.tries), notice: () => p.notice, patch: { done: true } });
    game.miss({ tries: d.tries + 1, said: { kind: "wrong", why: v.why } });
  };

  // A knob turned to the setting at index i: while the slider moves only the draft changes; let go, it is kept and the
  // setting joins those tried.
  const turn = (k: Knob, i: number, done: boolean) => {
    const c: Partial<LiveFit> = { ...turned(setupOf(d), k, i) };
    if (!done) return setDraft({ ...draft, ...fresh0(c) });
    commit(fresh0(k === knob ? { ...c, seen: [...new Set([...d.seen, i])] } : c));
  };
  // Free play's own choices: a new curve, noise or sample draws the points again.
  const redraw = (c: Partial<LiveFit>) => {
    const s = { ...setupOf(d), ...c };
    commit({ ...c, pts: draw(s.truth, s.n, s.noise, s.seed) });
  };

  // Dragging a training point in free play; a click on empty paper adds one, a tap on one takes it away.
  const down = (e: PointerEvent<SVGSVGElement>) => {
    if (p) return;
    const [px, py] = svgPoint(e.currentTarget, e);
    if (px > FIT_PLOT.left + FIT_PLOT.size + 4 || py > FIT_PLOT.h) return;
    const q = fromPage([px, py]);
    const i = d.pts.findIndex((r) => Math.hypot(toPage(r)[0] - px, toPage(r)[1] - py) <= 11);
    let gr: Grab;
    if (i >= 0) gr = { i, moved: false };
    else if (d.pts.length < MAX_PTS) {
      setDraft(fresh0({ pts: [...d.pts, [keepIn(q[0], VIEW_X), keepIn(q[1], VIEW_Y)]] }));
      gr = { i: d.pts.length, moved: true };
    } else return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setGrab(gr);
  };
  const moveTo = (e: PointerEvent<SVGSVGElement>) => {
    if (!grab) return;
    if (!grab.moved) setGrab({ ...grab, moved: true });
    const q = fromPage(svgPoint(e.currentTarget, e));
    setDraft(fresh0({ pts: d.pts.map((r, k): Pt => (k === grab.i ? [keepIn(q[0], VIEW_X), keepIn(q[1], VIEW_Y)] : r)) }));
  };
  const up = () => {
    if (!grab) return;
    setGrab(null);
    play("snap");
    if (!grab.moved) return commit(fresh0({ pts: d.pts.filter((_, k) => k !== grab.i) }));
    commit({ n: d.pts.length });
  };

  const enough = d.pts.length >= 2;
  const sc = scores(setupOf(d), { cv: show === "cv", bv: show === "bv" });
  const ask = p
    ? fill(w.asks[`p${d.stage + 1}` as keyof typeof w.asks], {
        max: "max" in p.goal ? num(p.goal.max) : "",
        within: p.goal.kind === "simplest" ? num(p.goal.within) : "",
        train: p.goal.kind === "weights" ? num(p.goal.train) : "",
      })
    : w.freeAsk;
  const verdict = p && d.said?.kind === "wrong" ? judgeFit(p, d) : null;
  const wrong = verdict?.state === "lost" ? verdict : null;
  const stars = fitStars(d.tries);
  const notice = d.said?.kind === "notice" ? w.notices[d.said.key] : null;
  const said: Line =
    d.done ? { tone: notice ? "notice" : "ok", text: `${notice ? `${notice} ` : ""}${fill(w.right, { stars: starText(stars) })}${stars === 1 ? ` ${g.oneStar}` : ""}` }
    : wrong ? { tone: "wrong", text: fill(w.why[wrong.why], { have: num(wrong.have), want: num(wrong.want) }) }
    : { tone: "hint", text: p ? w.hints[knob] : w.freeHint };
  const read =
    !enough ? w.few
    : show === "bv" ? fill(w.read.bv, { b: num(sc.bias2), v: num(sc.variance), s: num(sc.bias2 + sc.variance) })
    : p?.goal.kind === "weights" ? fill(w.read.weights, { tr: num(sc.train), w: num(biggest(sc.w)) })
    : show === "cv" ? fill(w.read.cv, { tr: num(sc.train), cv: num(sc.cv) }) + (d.done ? ` · ${fill(w.read.testOnly, { te: num(sc.test) })}` : "")
    : test ? fill(w.read.test, { tr: num(sc.train), te: num(sc.test) })
    : fill(w.read.train, { tr: num(sc.train) });

  // A dial over a knob's settings, by index.
  const dial = (k: Knob, x: number, y: number, tw: number) => {
    const vals = knobValues(k);
    const shown = (at: number) => (k === "degree" ? `d = ${DEGREES[at]}` : k === "n" ? `n = ${p ? SIZES[at] : d.pts.length}` : `λ = ${lambdaText(LAMBDAS[at])}`);
    return <Track key={k} x={x} y={y} w={tw} value={knobAt(d, k)} min={0} max={vals.length - 1} label={w.knobs[k]} show={shown} onChange={(i, done) => turn(k, i, done)} />;
  };
  const noiseAt = Math.max(0, NOISES.indexOf(d.noise));
  const moves: RowItem[] = [
    ...(p ? [{ text: `✓ ${g.check}`, title: g.check, strong: true, disabled: d.done, onTap: check }] : []),
    ...(!p
      ? [
          { text: fill(w.curve, { c: w.truths[d.truth] }), onTap: () => redraw({ truth: TRUTH_IDS[(TRUTH_IDS.indexOf(d.truth) + 1) % TRUTH_IDS.length] }) },
          { text: w.newSample, onTap: () => redraw({ seed: d.seed + 1 }) },
          { text: w.showTest, on: d.showTest, onTap: () => commit({ showTest: !d.showTest }) },
          { text: w.showFresh, on: d.showFresh, onTap: () => commit({ showFresh: !d.showFresh }) },
          { text: w.showTruth, on: d.showTruth, onTap: () => commit({ showTruth: !d.showTruth }) },
        ]
      : []),
    { text: `↺ ${g.reset}`, title: g.reset, onTap: () => commit(fresh0(fitStart(p))) },
  ];
  const dials = p ? 1 : 2;
  const strip = dials * DIAL_H + pillRowsH(moves, FIT_PLOT.w) + 8;

  return (
    <>
      <GameHead game={game} g={g} />
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg
          ref={svgRef}
          className="hand-pic"
          width={FIT_PLOT.w}
          height={FIT_PLOT.h + strip}
          viewBox={`0 0 ${FIT_PLOT.w} ${FIT_PLOT.h + strip}`}
          fontFamily={FONT}
          aria-label={w.picture}
          style={{ cursor: p ? "default" : grab ? "grabbing" : "crosshair", touchAction: "none" }}
          onPointerDown={down}
          onPointerMove={moveTo}
          onPointerUp={up}
          onPointerCancel={up}
        >
          <rect width={FIT_PLOT.w} height={FIT_PLOT.h + strip} fill="#fff" />
          {enough && (
            <g
              dangerouslySetInnerHTML={{
                __html: fitSvg(setupOf(d), { knob, show: p && d.done && (show === "cv" || show === "train") ? "test" : show, seen: !p || d.done ? "all" : d.seen, test, fresh, truth, words: w.chart }),
              }}
            />
          )}
          {p ? (
            dial(knob, 8, FIT_PLOT.h + 4, FIT_PLOT.w - 16)
          ) : (
            <>
              {dial("degree", 8, FIT_PLOT.h + 4, HALF)}
              {dial("lambda", HALF + 16, FIT_PLOT.h + 4, HALF)}
              {dial("n", 8, FIT_PLOT.h + 4 + DIAL_H, HALF)}
              <Track x={HALF + 16} y={FIT_PLOT.h + 4 + DIAL_H} w={HALF} value={noiseAt} min={0} max={NOISES.length - 1} label={w.noise} show={(i) => `σ = ${NOISES[i]}`} color="#e8590c"
                onChange={(i, done) => (done ? redraw({ noise: NOISES[i] }) : setDraft({ ...draft, noise: NOISES[i] }))} />
            </>
          )}
          <PillRows w={FIT_PLOT.w} y={FIT_PLOT.h + dials * DIAL_H + 4} items={moves} />
        </svg>
      </Stage>
      <div className="descent-read">
        <span>{read}</span>
      </div>
      <GameActions game={game} g={g} done={d.done} />
      <Said line={said} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
