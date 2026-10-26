// Softmax by hand: a score bar for each class, dragged up and down, and the probabilities softmax makes of them beside,
// with a strip showing they add up to 1. A temperature slider, buttons that shift every score at once, and with a
// target the cross-entropy loss and its gradient as arrows on the scores. Eight puzzles open in turn, each checked
// with Check, stars for doing one at the first try, and free play takes two to five classes. What is mid-way (a drag,
// the slider being moved) stays here until it is let go, so each change is one step to undo. Built on the game shell
// (useGame): a check that meets the puzzle's goal wins it, one that does not is a miss.
import { useState, type PointerEvent } from "react";
import {
  columnAt,
  crossEntropy,
  FREE_Z,
  judgeSoftmax,
  num,
  prob,
  SHIFT_STEP,
  shifted,
  SM_PLOT,
  snapZ,
  softmax,
  SOFTMAX_LADDER,
  SOFTMAX_NOTICES,
  softmaxPuzzle,
  softmaxStars,
  softmaxSvg,
  targetOf,
  TEMPS,
  tempIndex,
  yToZ,
  type LiveSoftmax,
} from "../math/softmaxLab";
import { play } from "./juice";
import { starText } from "./ladderUi";
import { fill, FONT, Stepper, svgPoint, Toggle, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

/** e^x for the readout: two decimals, or a power of ten once it is large. */
const big = (v: number) => (v < 1e4 ? v.toFixed(2) : v.toExponential(1).replace("e+", "e"));
/** A new try starts from no tries; a puzzle of the ladder sets its scores and temperature, free play its own. */
const FRESH: Partial<LiveSoftmax> = { tries: 0, done: false, said: null };
const stagePatch = (stage: number): Partial<LiveSoftmax> => ({ z: [...SOFTMAX_LADDER[stage].z], T: SOFTMAX_LADDER[stage].T });
const freePatch = (): Partial<LiveSoftmax> => ({ z: [...FREE_Z], T: 1, target: 0 });

export function SoftmaxLab({ state, set, w: words, svgRef }: PieceProps<"softmaxLab">) {
  const [w, g] = [words.softmaxLab, words.game];
  const [draft, setDraft] = useState<Partial<LiveSoftmax> | null>(null);
  const [grab, setGrab] = useState<number | null>(null);
  const d: LiveSoftmax = { ...state, ...draft };
  const q = softmaxPuzzle(d);
  const target = targetOf(q, d);
  const lockZ = !!q?.lockZ;
  const lockT = !!q?.lockT;
  const canShift = !q || !!q.shift;
  const p = softmax(d.z, d.T);

  // A change starts the try afresh: what was said about the last check goes.
  const fresh = (change: Partial<LiveSoftmax>): Partial<LiveSoftmax> => ({ ...change, done: false, said: null });
  const commit = (change: Partial<LiveSoftmax> = {}) => {
    setDraft(null);
    set({ ...d, ...change });
  };
  const game = useGame({ key: "zeno.softmaxlab.v1", size: SOFTMAX_LADDER.length, notices: SOFTMAX_NOTICES, modes: ["puzzle", "free"], state: d, set: commit, fresh: FRESH, stagePatch, freePatch: freePatch() });

  const check = () => {
    if (!q) return;
    const v = judgeSoftmax(q, d.z, d.T);
    if (v.state === "won") return game.win({ stars: softmaxStars(d.tries), notice: () => q.notice, patch: { done: true } });
    game.miss({ tries: d.tries + 1, said: { kind: "wrong", why: v.why } });
  };

  // Dragging in a column of the score panel sets that class's score.
  const scoreAt = (e: PointerEvent<SVGSVGElement>, i: number) => {
    const [, y] = svgPoint(e.currentTarget, e);
    return d.z.map((v, k) => (k === i ? snapZ(yToZ(y)) : v));
  };
  const down = (e: PointerEvent<SVGSVGElement>) => {
    if (lockZ) return;
    const [x, y] = svgPoint(e.currentTarget, e);
    if (y < SM_PLOT.top - 6 || y > SM_PLOT.top + SM_PLOT.panelH + 6) return;
    const i = columnAt(x, d.z.length);
    if (i === null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setGrab(i);
    setDraft(fresh({ z: scoreAt(e, i) }));
  };
  const move = (e: PointerEvent<SVGSVGElement>) => grab !== null && setDraft(fresh({ z: scoreAt(e, grab) }));
  const up = () => {
    if (grab === null) return;
    setGrab(null);
    play("snap");
    commit();
  };

  const setT = (i: number, done: boolean) => {
    const change = fresh({ T: TEMPS[Math.max(0, Math.min(TEMPS.length - 1, i))] });
    if (done) commit(change);
    else setDraft({ ...draft, ...change });
  };
  const shift = (dz: number) => {
    const z = shifted(d.z, dz);
    if (z) commit(fresh({ z }));
  };
  const setCount = (n: number) => {
    const z = n > d.z.length ? [...d.z, 0] : d.z.slice(0, n);
    commit(fresh({ z, target: d.target !== null && d.target >= n ? null : d.target }));
  };

  const name = (i: number) => w.classes[i] ?? String(i + 1);
  const goal = q?.goal;
  const ask = q
    ? fill(w.asks[`p${d.stage + 1}` as keyof typeof w.asks], {
        a: goal && "i" in goal ? name(goal.i) : "",
        b: goal && "j" in goal ? name(goal.j) : "",
        t: target !== null ? name(target) : "",
        p: goal?.kind === "atLeast" ? goal.p : goal?.kind === "pair" ? goal.each : "",
        to: goal?.kind === "shift" ? num(goal.to) : "",
      })
    : w.freeAsk;
  const verdict = q && d.said?.kind === "wrong" ? judgeSoftmax(q, d.z, d.T) : null;
  const wrong = verdict?.state === "lost" ? verdict : null;
  const stars = softmaxStars(d.tries);
  const notice = d.said?.kind === "notice" ? w.notices[d.said.key] : null;
  const line: Line =
    d.done ? { tone: notice ? "notice" : "ok", text: `${notice ? `${notice} ` : ""}${fill(w.right, { stars: starText(stars) })}${stars === 1 ? ` ${g.oneStar}` : ""}` }
    : wrong ? { tone: "wrong", text: fill(w.why[lockZ && (wrong.why === "low" || wrong.why === "uneven") ? (wrong.why === "low" ? "lowT" : "unevenT") : wrong.why], { have: wrong.why === "notYet" ? num(wrong.have) : prob(wrong.have), want: wrong.why === "notYet" ? num(wrong.want) : String(wrong.want), a: goal && "i" in goal ? name(goal.i) : "", b: goal && "j" in goal ? name(goal.j) : "", t: target !== null ? name(target) : "" }) }
    : { tone: "hint", text: lockZ ? w.tempHint : w.hint };
  const exps = d.z.map((v) => Math.exp(v / d.T));
  const sum = exps.reduce((a, b) => a + b, 0);
  const ti = tempIndex(d.T);

  return (
    <>
      <GameHead game={game} g={g} />
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg
          ref={svgRef}
          width={SM_PLOT.w}
          height={SM_PLOT.h}
          viewBox={`0 0 ${SM_PLOT.w} ${SM_PLOT.h}`}
          fontFamily={FONT}
          role="img"
          aria-label={w.picture}
          style={{ cursor: lockZ ? "default" : grab !== null ? "grabbing" : "ns-resize", touchAction: "none" }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        >
          <rect width={SM_PLOT.w} height={SM_PLOT.h} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: softmaxSvg(d.z, d.T, { target, locked: lockZ, words: { scores: w.scores, probs: w.probs, classes: w.classes } }) }} />
        </svg>
      </Stage>
      <div className="descent-read">
        <span className="descent-rule">{d.T === 1 ? w.rule : w.ruleT}</span>
        <span>{fill(w.sum, { e: exps.map(big).join(" + "), s: big(sum) })}</span>
        {target !== null && <span className="descent-next">{fill(w.loss, { t: name(target), p: prob(p[target]), l: num(crossEntropy(p, target)) })}</span>}
      </div>
      <div className="live-bar descent-dials">
        <label className="live-slider">
          <b>T = {num(d.T)}</b>
          <button className="live-btn" disabled={lockT || ti === 0} title={w.colder} aria-label={w.colder} onClick={() => setT(ti - 1, true)}>−</button>
          <input type="range" min={0} max={TEMPS.length - 1} value={ti} disabled={lockT} aria-label={w.temp} onChange={(e) => setT(Number(e.target.value), false)} onPointerUp={() => commit()} onKeyUp={() => commit()} />
          <button className="live-btn" disabled={lockT || ti === TEMPS.length - 1} title={w.hotter} aria-label={w.hotter} onClick={() => setT(ti + 1, true)}>+</button>
        </label>
        {canShift && (
          <span className="live-field">
            {w.shift}
            <button className="live-btn" disabled={!shifted(d.z, -SHIFT_STEP)} onClick={() => shift(-SHIFT_STEP)}>−{SHIFT_STEP}</button>
            <button className="live-btn" disabled={!shifted(d.z, SHIFT_STEP)} onClick={() => shift(SHIFT_STEP)}>+{SHIFT_STEP}</button>
          </span>
        )}
      </div>
      {!q && (
        <div className="live-bar">
          <span className="live-field">
            {w.classCount} <Stepper value={d.z.length} min={2} max={5} onChange={setCount} less={w.fewer} more={w.more} />
          </span>
          <span className="live-field">{w.target}</span>
          <Toggle on={d.target === null} onClick={() => commit({ target: null })}>{w.noTarget}</Toggle>
          {d.z.map((_, i) => (
            <Toggle key={i} on={d.target === i} onClick={() => commit({ target: i })}>★ {name(i)}</Toggle>
          ))}
        </div>
      )}
      <GameActions game={game} g={g} done={d.done} always>
        {q && <button className="live-btn on" disabled={d.done} onClick={check}>✓ {g.check}</button>}
        <button className="live-btn" onClick={() => commit(fresh(q ? { z: [...q.z], T: q.T } : { z: [...FREE_Z, 0, 0].slice(0, d.z.length), T: 1 }))}>↺ {g.reset}</button>
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
