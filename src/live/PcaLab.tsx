// PCA by hand: a cloud of points and a line through it, turned by dragging an end (or the slider) and, in one puzzle,
// moved by its middle. The squares on the points' distances from the line are the error, the purple shadows on it are
// what is kept, and the bars beside show the two adding up to the cloud's whole spread. In later puzzles the line is
// PC1 itself and the points are dragged instead, or a mark is put where a point's shadow falls. Eight puzzles open in
// turn, stars for doing one at the first try, and free play takes any points. What is mid-way (a drag, the slider
// being moved) stays here until it is let go, so each change is one step to undo. Built on the game shell (useGame): a
// check that meets the puzzle's goal wins it, one that does not is a miss.
import { useState, type PointerEvent } from "react";
import {
  KEEP_IN,
  PCA_LADDER,
  PCA_NOTICES,
  PCA_PLOT,
  fromPage,
  handles,
  judgePca,
  lineAngle,
  lineError,
  mainLine,
  moments,
  num,
  ownLine,
  pcaPuzzle,
  pcaStars,
  pcaStart,
  pcaSvg,
  principal,
  shadowSpread,
  toPage,
  totalSpread,
  type LivePca,
  type Pt,
} from "../math/pcaLab";
import { play } from "./juice";
import { starText } from "./ladderUi";
import { fill, FONT, svgPoint, Toggle, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

/** The most points free play takes. */
const MAX_PTS = 30;
type Grab = { what: "point"; i: number; moved: boolean } | { what: "pivot" } | { what: "turn" } | { what: "mark" };

const keepIn = (v: number) => Math.round(Math.min(KEEP_IN, Math.max(-KEEP_IN, v)) * 100) / 100;
/** A new try starts from no tries; a puzzle of the ladder sets its points and line, free play its own. */
const FRESH: Partial<LivePca> = { tries: 0, done: false, said: null };
const stagePatch = (stage: number): Partial<LivePca> => pcaStart(PCA_LADDER[stage]);
const freePatch = (): Partial<LivePca> => ({ ...pcaStart(null), errors: "perp", showBest: false });

export function PcaLab({ state, set, w: words, svgRef }: PieceProps<"pcaLab">) {
  const [w, g] = [words.pcaLab, words.game];
  const [draft, setDraft] = useState<Partial<LivePca> | null>(null);
  const [grab, setGrab] = useState<Grab | null>(null);
  const d: LivePca = { ...state, ...draft };
  const p = pcaPuzzle(d);
  const own = ownLine(p);
  const score = p?.goal.kind === "score";
  const drag: number[] | "all" = p ? (p.drag ?? []) : "all";
  const move = !p || !!p.c;
  const errors = p ? (p.errors ?? "perp") : d.errors;
  const line = mainLine(p, d);
  const best = p ? d.done : d.showBest;

  // A change starts the try afresh: what was said about the last check goes.
  const fresh = (change: Partial<LivePca>): Partial<LivePca> => ({ ...change, done: false, said: null });
  const commit = (change: Partial<LivePca> = {}) => {
    setDraft(null);
    set({ ...d, ...change });
  };
  const change = (c: Partial<LivePca>, done: boolean) => (done ? commit(fresh(c)) : setDraft({ ...draft, ...fresh(c) }));
  const game = useGame({ key: "zeno.pcalab.v1", size: PCA_LADDER.length, notices: PCA_NOTICES, modes: ["puzzle", "free"], state: d, set: commit, fresh: FRESH, stagePatch, freePatch: freePatch() });

  const check = () => {
    if (!p) return;
    const v = judgePca(p, d);
    if (v.state === "won") return game.win({ stars: pcaStars(d.tries), notice: () => p.notice, patch: { done: true } });
    game.miss({ tries: d.tries + 1, said: { kind: "wrong", why: v.why } });
  };

  // Dragging: a point that can be moved, the line's middle, a handle (or, in a puzzle, anywhere else) to turn it, the
  // mark along PC1; in free play a click on empty paper adds a point, and a tap on one takes it away.
  const near = (a: Pt, px: number, py: number, r: number) => Math.hypot(toPage(a)[0] - px, toPage(a)[1] - py) <= r;
  const turnTo = (q: Pt) => (Math.hypot(q[0] - line.c[0], q[1] - line.c[1]) < 0.2 ? null : Math.round(lineAngle((Math.atan2(q[1] - line.c[1], q[0] - line.c[0]) * 180) / Math.PI) * 10) / 10);
  const markAt = (q: Pt) => {
    const a = (line.angle * Math.PI) / 180;
    return Math.round(Math.min(4.5, Math.max(-4.5, (q[0] - line.c[0]) * Math.cos(a) + (q[1] - line.c[1]) * Math.sin(a))) * 20) / 20;
  };
  const apply = (gr: Grab, q: Pt) => {
    if (gr.what === "point") setDraft(fresh({ pts: d.pts.map((r, i): Pt => (i === gr.i ? [keepIn(q[0]), keepIn(q[1])] : r)) }));
    else if (gr.what === "pivot") setDraft(fresh({ c: [keepIn(q[0]), keepIn(q[1])] }));
    else if (gr.what === "mark") setDraft(fresh({ mark: markAt(q) }));
    else {
      const a = turnTo(q);
      if (a !== null) setDraft(fresh({ angle: a }));
    }
  };
  const down = (e: PointerEvent<SVGSVGElement>) => {
    const [px, py] = svgPoint(e.currentTarget, e);
    if (px > PCA_PLOT.left + PCA_PLOT.size + 4) return;
    const q = fromPage([px, py]);
    const i = d.pts.findIndex((r, k) => (drag === "all" || drag.includes(k)) && near(r, px, py, 13));
    let gr: Grab | null = null;
    if (i >= 0) gr = { what: "point", i, moved: false };
    else if (own && move && near(line.c, px, py, 14)) gr = { what: "pivot" };
    else if (own && handles(line.c, line.angle).some((h) => near(h, px, py, 16))) gr = { what: "turn" };
    else if (score) gr = { what: "mark" };
    else if (!p && d.pts.length < MAX_PTS) {
      setDraft(fresh({ pts: [...d.pts, [keepIn(q[0]), keepIn(q[1])]] }));
      gr = { what: "point", i: d.pts.length, moved: true };
    } else if (p && own) gr = { what: "turn" };
    if (!gr) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setGrab(gr);
    if (gr.what !== "point") apply(gr, q);
  };
  const moveTo = (e: PointerEvent<SVGSVGElement>) => {
    if (!grab) return;
    if (grab.what === "point" && !grab.moved) setGrab({ ...grab, moved: true });
    apply(grab, fromPage(svgPoint(e.currentTarget, e)));
  };
  const up = () => {
    if (!grab) return;
    setGrab(null);
    play("snap");
    if (grab.what === "point" && !grab.moved && !p) return commit(fresh({ pts: d.pts.filter((_, k) => k !== grab.i) }));
    commit();
  };

  const enough = d.pts.length >= 2;
  const mo = enough ? moments(d.pts) : null;
  const total = mo ? totalSpread(mo) : 0;
  const lost = enough ? lineError(d.pts, line.c, line.angle, errors) : 0;
  const kept = mo ? shadowSpread(mo, line.angle) : 0;
  const pr = mo ? principal(mo) : null;
  const pct = (v: number) => Math.round(100 * v);

  const ask = p ? fill(w.asks[`p${d.stage + 1}` as keyof typeof w.asks], { tol: p.goal.kind === "upright" ? p.goal.tol : 0, share: p.goal.kind === "keep" ? pct(p.goal.share) : 0 }) : w.freeAsk;
  const verdict = p && d.said?.kind === "wrong" ? judgePca(p, d) : null;
  const wrong = verdict?.state === "lost" ? verdict : null;
  const stars = pcaStars(d.tries);
  const notice = d.said?.kind === "notice" ? w.notices[d.said.key] : null;
  const said: Line =
    d.done ? { tone: notice ? "notice" : "ok", text: `${notice ? `${notice} ` : ""}${fill(w.right, { stars: starText(stars) })}${stars === 1 ? ` ${g.oneStar}` : ""}` }
    : wrong ? { tone: "wrong", text: fill(w.why[wrong.why], { have: wrong.why === "keep" ? `${pct(wrong.have)} %` : wrong.why === "upright" ? `${Math.round(wrong.have)}` : num(wrong.have), want: num(wrong.want) }) }
    : { tone: "hint", text: !p ? w.freeHint : score ? w.markHint : !own ? w.pointHint : move ? w.moveHint : w.turnHint };
  const read =
    !enough ? w.few
    : own ? (errors === "perp" ? fill(w.sum, { k: num(kept), l: num(lost), s: num(kept + lost) }) : fill(w.lostV, { l: num(lost) }))
    : score ? fill(w.markAt, { t: num(d.mark) })
    : fill(w.pc1At, { a: Math.round(pr!.angle), p: pct(pr!.l1 / (total || 1)) });

  return (
    <>
      <GameHead game={game} g={g} />
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg
          ref={svgRef}
          width={PCA_PLOT.w}
          height={PCA_PLOT.h}
          viewBox={`0 0 ${PCA_PLOT.w} ${PCA_PLOT.h}`}
          fontFamily={FONT}
          role="img"
          aria-label={w.picture}
          style={{ cursor: grab ? "grabbing" : "crosshair", touchAction: "none" }}
          onPointerDown={down}
          onPointerMove={moveTo}
          onPointerUp={up}
          onPointerCancel={up}
        >
          <rect width={PCA_PLOT.w} height={PCA_PLOT.h} fill="#fff" />
          <g
            dangerouslySetInnerHTML={{
              __html: pcaSvg(d, line, { errors, best, drag, special: p?.special, hideMean: !!p?.hideMean && !d.done, score, move, own, words: w.bars }),
            }}
          />
        </svg>
      </Stage>
      <div className="descent-read">
        <span>{read}</span>
      </div>
      {(own || score) && (
        <div className="live-bar descent-dials">
          {own ? (
            <label className="live-slider">
              <b>θ = {Math.round(line.angle)}°</b>
              <input
                type="range"
                min={0}
                max={179}
                value={Math.round(d.angle) % 180}
                aria-label={w.angle}
                onChange={(e) => change({ angle: Number(e.target.value) }, false)}
                onPointerUp={() => commit()}
                onKeyUp={() => commit()}
              />
            </label>
          ) : (
            <label className="live-slider">
              <b>t = {num(d.mark)}</b>
              <input
                type="range"
                min={-90}
                max={90}
                value={Math.round(d.mark * 20)}
                aria-label={w.mark}
                onChange={(e) => change({ mark: Number(e.target.value) / 20 }, false)}
                onPointerUp={() => commit()}
                onKeyUp={() => commit()}
              />
            </label>
          )}
        </div>
      )}
      <GameActions game={game} g={g} done={d.done} always>
        {p && <button className="live-btn on" disabled={d.done} onClick={check}>✓ {g.check}</button>}
        {!p && (
          <>
            <Toggle on={d.showBest} onClick={() => commit({ showBest: !d.showBest })}>{w.showBest}</Toggle>
            <Toggle on={d.errors === "vertical"} onClick={() => commit({ errors: d.errors === "vertical" ? "perp" : "vertical" })}>{w.vertical}</Toggle>
            <button className="live-btn" disabled={d.pts.length === 0} onClick={() => commit({ pts: [] })}>{w.clear}</button>
          </>
        )}
        <button className="live-btn" onClick={() => commit(fresh(pcaStart(p)))}>↺ {g.reset}</button>
      </GameActions>
      <Said line={said} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
