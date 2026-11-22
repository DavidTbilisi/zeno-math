// The attention lab: words as key arrows, a query dragged among them, and the scores, softmax weights and output it
// makes; the self-attention matrix, word order with and without positions, and the next word's chances. Five puzzles
// open in turn, each won with a Check, stars for doing one at the first try; free play takes every view. What is
// mid-way (a drag, a slider being moved) stays here until it is let go, so each change is one step to undo. Built on
// the game shell (useGame).
import { useState, type PointerEvent } from "react";
import {
  ATTN_LADDER,
  ATTN_NOTICES,
  ATTN_PLOT,
  attnPuzzle,
  attnStars,
  attnSvg,
  controlsOf,
  DIMS,
  fromPage,
  judgeAttn,
  matrixCellAt,
  num,
  orderOutputs,
  PLANE,
  placed,
  queryAttention,
  selfAttention,
  sentenceOf,
  viewOf,
  type AttnView,
  type LiveAttn,
} from "../math/attnLab";
import { play } from "./juice";
import { starText } from "./ladderUi";
import { fill, FONT, svgPoint, type PieceProps } from "./ui";
import { PillRows, pillRowsH, Track, type RowItem } from "./hand";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const FRESH: Partial<LiveAttn> = { tries: 0, done: false, said: null };
const stagePatch = (stage: number): Partial<LiveAttn> => ATTN_LADDER[stage].start;
const FREE_PATCH: Partial<LiveAttn> = { q: [1, 1], d: 2, scaled: true, pos: false, sel: null, view: "query" };
const VIEWS: AttnView[] = ["query", "matrix", "order", "next"];

export function AttnLab({ state, set, w: words, svgRef }: PieceProps<"attnLab">) {
  const [w, g] = [words.attnLab, words.game];
  const [draft, setDraft] = useState<Partial<LiveAttn> | null>(null);
  const [dragging, setDragging] = useState(false);
  const d: LiveAttn = { ...state, ...draft };
  const p = attnPuzzle(d);
  const can = controlsOf(d);
  const view = viewOf(d);
  const ts = sentenceOf(d);

  const fresh = (change: Partial<LiveAttn>): Partial<LiveAttn> => ({ ...change, done: false, said: null });
  const commit = (change: Partial<LiveAttn> = {}) => {
    setDraft(null);
    set({ ...d, ...change });
  };
  const game = useGame({ key: "zeno.attnlab.v1", size: ATTN_LADDER.length, notices: ATTN_NOTICES, modes: ["puzzle", "free"], state: d, set: commit, fresh: FRESH, stagePatch, freePatch: FREE_PATCH });

  const check = () => {
    if (!p) return;
    const v = judgeAttn(d, p.goal);
    if (v.state === "won") return game.win({ stars: attnStars(d.tries), notice: () => p.notice, patch: { done: true } });
    game.miss({ tries: d.tries + 1, said: { kind: "wrong", why: v.why } });
  };

  // Dragging the query: anywhere on the plane moves its tip there. Tapping the matrix picks a cell.
  const down = (e: PointerEvent<SVGSVGElement>) => {
    if (d.done) return;
    const [px, py] = svgPoint(e.currentTarget, e);
    if (view === "matrix" && can.includes("select")) {
      const cell = matrixCellAt(ts.length, px, py);
      if (cell) {
        play("snap");
        commit(fresh({ sel: cell }));
      }
      return;
    }
    const onPlane = px >= PLANE.left && px <= PLANE.left + PLANE.size && py >= PLANE.top && py <= PLANE.top + PLANE.size;
    if (!onPlane || !can.includes("drag")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    setDraft(fresh({ q: fromPage(px, py) }));
  };
  const move = (e: PointerEvent<SVGSVGElement>) => dragging && setDraft(fresh({ q: fromPage(...svgPoint(e.currentTarget, e)) }));
  const up = () => {
    if (!dragging) return;
    setDragging(false);
    play("snap");
    commit();
  };

  const ask = p ? w.asks[`p${d.stage + 1}` as keyof typeof w.asks] : w.freeAsk;
  const verdict = p && d.said?.kind === "wrong" ? judgeAttn(d, p.goal) : null;
  const wrong = verdict?.state === "lost" ? verdict : null;
  const stars = attnStars(d.tries);
  const notice = d.said?.kind === "notice" ? w.notices[d.said.key] : null;
  const line: Line =
    d.done ? { tone: notice ? "notice" : "ok", text: `${notice ? `${notice} ` : ""}${fill(w.right, { stars: starText(stars) })}${stars === 1 ? ` ${g.oneStar}` : ""}` }
    : wrong ? { tone: "wrong", text: fill(w.why[wrong.why], { have: num(wrong.have), want: num(wrong.want), word: wrong.word ? w.tokens[wrong.word] : "" }) }
    : { tone: "hint", text: p ? w.hint : w.freeHint };
  const weights = view === "matrix" ? selfAttention(placed(ts, d.pos), d.d, d.scaled)[d.sel ? d.sel[0] : 0].w : queryAttention(d).w;
  const top = weights.indexOf(Math.max(...weights));
  const read = view === "order" ? fill(w.readGap, { g: num(orderOutputs(d).gap) }) : fill(w.read, { w: num(weights[top]), word: w.tokens[ts[top].id] });

  const moves: RowItem[] = [
    ...(p ? [{ text: `✓ ${g.check}`, title: g.check, strong: true, disabled: d.done, onTap: check }] : []),
    ...(can.includes("scale") ? [{ text: w.scale, on: d.scaled, disabled: d.done, onTap: () => commit(fresh({ scaled: !d.scaled })) }] : []),
    ...(can.includes("positions") ? [{ text: w.positions, on: d.pos, disabled: d.done, onTap: () => commit(fresh({ pos: !d.pos })) }] : []),
    ...(!p ? VIEWS.map((v, i) => ({ text: w.views[v], brk: i === 0, on: d.view === v, onTap: () => commit({ view: v, sel: null }) })) : []),
  ];
  const dialH = can.includes("dims") ? 44 : 0;
  const strip = dialH + pillRowsH(moves, ATTN_PLOT.w) + 8;

  return (
    <>
      <GameHead game={game} g={g} />
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done && !!p} g={g} notices={w.notices}>
        <svg
          ref={svgRef} className="hand-pic"
          width={ATTN_PLOT.w}
          height={ATTN_PLOT.h + strip}
          viewBox={`0 0 ${ATTN_PLOT.w} ${ATTN_PLOT.h + strip}`}
          fontFamily={FONT}
          aria-label={w.picture}
          style={{ cursor: can.includes("drag") ? (dragging ? "grabbing" : "crosshair") : view === "matrix" ? "pointer" : "default", touchAction: "none" }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        >
          <rect width={ATTN_PLOT.w} height={ATTN_PLOT.h + strip} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: attnSvg(d, { ...w.chart, tokens: w.tokens }) }} />
          {can.includes("dims") && (
            <Track x={8} y={ATTN_PLOT.h + 4} w={ATTN_PLOT.w - 16} value={Math.max(0, DIMS.indexOf(d.d))} min={0} max={DIMS.length - 1} label={w.dims} disabled={d.done} show={(v) => `d = ${DIMS[v]}`}
              onChange={(v, done) => (done ? commit(fresh({ d: DIMS[v] })) : setDraft(fresh({ d: DIMS[v] })))} />
          )}
          <PillRows w={ATTN_PLOT.w} y={ATTN_PLOT.h + dialH} items={moves} />
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
