// Judging a classifier by hand: the examples' scores on a strip, a threshold dragged across it (or set with the
// slider), and what it makes: the confusion matrix, accuracy, precision, recall and F1, and the threshold's point on the
// ROC and precision–recall curves. Six puzzles open in turn, each won with a Check, stars for doing one at the first
// try; free play takes either dataset, new samples and how far apart the classes' scores are. What is mid-way (a drag,
// a slider being moved) stays here until it is let go, so each change is one step to undo. Built on the game shell
// (useGame).
import { useState, type PointerEvent } from "react";
import {
  DATA_IDS,
  examplesOf,
  GAPS,
  judgeRoc,
  metricsOf,
  confusion,
  num,
  ROC_LADDER,
  ROC_NOTICES,
  ROC_PLOT,
  rocPuzzle,
  rocStars,
  rocSvg,
  snap,
  STRIP,
  xToT,
  type LiveRoc,
} from "../math/rocLab";
import { PillRows, pillRowsH, Track, type RowItem } from "./hand";
import { play } from "./juice";
import { starText } from "./ladderUi";
import { fill, FONT, svgPoint, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const FRESH: Partial<LiveRoc> = { tries: 0, done: false, said: null };
const stagePatch = (stage: number): Partial<LiveRoc> => ({ t: ROC_LADDER[stage].start });
const FREE_PATCH: Partial<LiveRoc> = { t: 0.5, data: "balanced", gap: 0.3 };

export function RocLab({ state, set, w: words, svgRef }: PieceProps<"rocLab">) {
  const [w, g] = [words.rocLab, words.game];
  const [draft, setDraft] = useState<Partial<LiveRoc> | null>(null);
  const [dragging, setDragging] = useState(false);
  const d: LiveRoc = { ...state, ...draft };
  const p = rocPuzzle(d);
  const xs = examplesOf(d);

  const fresh = (change: Partial<LiveRoc>): Partial<LiveRoc> => ({ ...change, done: false, said: null });
  const commit = (change: Partial<LiveRoc> = {}) => {
    setDraft(null);
    set({ ...d, ...change });
  };
  const game = useGame({ key: "zeno.roclab.v1", size: ROC_LADDER.length, notices: ROC_NOTICES, modes: ["puzzle", "free"], state: d, set: commit, fresh: FRESH, stagePatch, freePatch: FREE_PATCH });

  const check = () => {
    if (!p) return;
    const v = judgeRoc(xs, d.t, p.goal);
    if (v.state === "won") return game.win({ stars: rocStars(d.tries), notice: () => p.notice, patch: { done: true } });
    game.miss({ tries: d.tries + 1, said: { kind: "wrong", why: v.why } });
  };

  // Dragging the threshold: anywhere on the strip picks it up.
  const down = (e: PointerEvent<SVGSVGElement>) => {
    const [, py] = svgPoint(e.currentTarget, e);
    if (py < STRIP.top - 12 || py > STRIP.top + STRIP.h + 6 || py > ROC_PLOT.h || d.done) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    setDraft(fresh({ t: xToT(svgPoint(e.currentTarget, e)[0]) }));
  };
  const move = (e: PointerEvent<SVGSVGElement>) => dragging && setDraft(fresh({ t: xToT(svgPoint(e.currentTarget, e)[0]) }));
  const up = () => {
    if (!dragging) return;
    setDragging(false);
    play("snap");
    commit();
  };

  const c = confusion(xs, d.t);
  const m = metricsOf(c);
  const ask = p ? w.asks[`p${d.stage + 1}` as keyof typeof w.asks] : w.freeAsk;
  const verdict = p && d.said?.kind === "wrong" ? judgeRoc(xs, d.t, p.goal) : null;
  const wrong = verdict?.state === "lost" ? verdict : null;
  const stars = rocStars(d.tries);
  const notice = d.said?.kind === "notice" ? w.notices[d.said.key] : null;
  const line: Line =
    d.done ? { tone: notice ? "notice" : "ok", text: `${notice ? `${notice} ` : ""}${fill(w.right, { stars: starText(stars) })}${stars === 1 ? ` ${g.oneStar}` : ""}` }
    : wrong ? { tone: "wrong", text: fill(w.why[wrong.why], { have: num(wrong.have), want: num(wrong.want) }) }
    : { tone: "hint", text: p ? w.hint : w.freeHint };

  const moves: RowItem[] = p
    ? [{ text: `✓ ${g.check}`, title: g.check, strong: true, disabled: d.done, onTap: check }]
    : [...DATA_IDS.map((id) => ({ text: w.datas[id], on: d.data === id, onTap: () => commit({ data: id }) })), { text: w.newSample, onTap: () => commit({ seed: d.seed + 1 }) }];
  const strip = 44 + pillRowsH(moves, ROC_PLOT.w) + 8;
  const HALF = (ROC_PLOT.w - 24) / 2;

  return (
    <>
      <GameHead game={game} g={g} />
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done && !!p} g={g} notices={w.notices}>
        <svg
          ref={svgRef}
          className="hand-pic"
          width={ROC_PLOT.w}
          height={ROC_PLOT.h + strip}
          viewBox={`0 0 ${ROC_PLOT.w} ${ROC_PLOT.h + strip}`}
          fontFamily={FONT}
          aria-label={w.picture}
          style={{ cursor: dragging ? "grabbing" : "ew-resize", touchAction: "none" }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        >
          <rect width={ROC_PLOT.w} height={ROC_PLOT.h + strip} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: rocSvg(xs, d.t, w.chart) }} />
          <Track x={8} y={ROC_PLOT.h + 4} w={p ? ROC_PLOT.w - 16 : HALF} value={Math.round(d.t * 100)} min={0} max={101} label={w.threshold} disabled={d.done}
            show={(v) => `t = ${v > 100 ? "> 1" : (v / 100).toFixed(2)}`} onChange={(v, done) => (done ? commit(fresh({ t: snap(v / 100) })) : setDraft(fresh({ t: snap(v / 100) })))} />
          {!p && (
            <Track x={HALF + 16} y={ROC_PLOT.h + 4} w={HALF} value={Math.max(0, GAPS.indexOf(d.gap))} min={0} max={GAPS.length - 1} label={w.gapName} color="#e8590c" lead={110}
              show={(i) => fill(w.gap, { g: GAPS[i] })} onChange={(i, done) => (done ? commit({ gap: GAPS[i] }) : setDraft({ ...draft, gap: GAPS[i] }))} />
          )}
          <PillRows w={ROC_PLOT.w} y={ROC_PLOT.h + 44} items={moves} />
        </svg>
      </Stage>
      <div className="descent-read">
        <span>{fill(w.read, { tp: c.tp, fp: c.fp, fn: c.fn, tn: c.tn, a: num(m.accuracy), p: num(m.precision), r: num(m.recall) })}</span>
      </div>
      <GameActions game={game} g={g} done={d.done && !!p} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
