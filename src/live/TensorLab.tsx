// Tensors by hand: a tensor's entries as slices, rows and columns, and under them the one line of memory they live in.
// Eight puzzles open in turn, each checked with Check, stars for doing one at the first try: an entry tapped by its
// indices, its place in memory tapped, the entry at a place found, the strides set on wheels, and the same for a reshape and a
// transpose. In free play any shape or view is taken, a tap on an entry or a place shows the other with the sum that
// links them, and a walk goes through the view in its own order. Each turn of a stride wheel is one step to undo. Built on the game shell (useGame): a check that meets
// the puzzle's goal wins it, one that does not is a miss.
import { useState, type MouseEvent } from "react";
import {
  entryText,
  isContiguous,
  judgeTn,
  placeSum,
  readSel,
  setupLabel,
  setupOf,
  tapsOn,
  tnCaption,
  tnHit,
  TN_LADDER,
  TN_NOTICES,
  TN_PLOT,
  TN_SETUPS,
  tnPuzzle,
  tnStars,
  tnSvg,
  viewOf,
  walk,
  type LiveTensor,
} from "../math/tensorLab";
import { starText } from "./ladderUi";
import { fill, FONT, INK, svgPoint, type PieceProps } from "./ui";
import { PillRows, pillRowsH, NumBox, type RowItem } from "./hand";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const SUB = "₀₁₂₃";
/** A new try starts from nothing tapped or typed; free play starts from a 2×3×4 tensor. */
const FRESH: Partial<LiveTensor> = { sel: null, answers: [], tries: 0, done: false, said: null };
const FREE_PATCH: Partial<LiveTensor> = { setup: "t234" };

export function TensorLab({ state, set, w: words, svgRef }: PieceProps<"tensorLab">) {
  const [w, g] = [words.tensorLab, words.game];
  const [draft, setDraft] = useState<Partial<LiveTensor> | null>(null);
  const d: LiveTensor = { ...state, ...draft };
  const p = tnPuzzle(d);
  const setup = setupOf(d);
  const v = viewOf(setup);

  // A change starts the try afresh: what was said about the last check goes.
  const fresh = (change: Partial<LiveTensor>): Partial<LiveTensor> => ({ ...change, done: false, said: null });
  const commit = (change: Partial<LiveTensor> = {}) => {
    setDraft(null);
    set({ ...d, ...change });
  };
  const game = useGame({ key: "zeno.tensorlab.v1", size: TN_LADDER.length, notices: TN_NOTICES, modes: ["puzzle", "free"], state: d, set: commit, fresh: FRESH, freePatch: FREE_PATCH });

  const check = () => {
    if (!p) return;
    const verdict = judgeTn(p, d.sel, d.answers);
    if (verdict.state === "won") return game.win({ stars: tnStars(d.tries), notice: () => p.notice, patch: { done: true } });
    game.miss({ tries: d.tries + 1, said: { kind: "wrong", why: verdict.why } });
  };

  // A tap on an entry or a place, where the puzzle takes one.
  const tap = (e: MouseEvent<SVGSVGElement>) => {
    if (d.done) return;
    const [x, y] = svgPoint(e.currentTarget, e);
    const hit = tnHit(v, x, y);
    if (hit && tapsOn(p).includes(hit.at)) commit(fresh({ sel: hit }));
  };
  // A stride wheel turned sets that axis's stride; below 0 it is not chosen yet (shown as ?).
  const setStride = (k: number, n: number) => commit(fresh({ answers: v.shape.map((_, j) => (j === k ? (n < 0 ? "" : String(n)) : (d.answers[j] ?? ""))) }));
  const verdict = p && d.said?.kind === "wrong" ? judgeTn(p, d.sel, d.answers) : null;
  const wrong = verdict?.state === "lost" ? verdict : null;
  const why = wrong && fill(w.why[wrong.why], { have: wrong.have, k: wrong.k, s: `s${SUB[wrong.k]}`, v: v.name });
  const stars = tnStars(d.tries);
  const notice = d.said?.kind === "notice" ? w.notices[d.said.key] : null;
  const line: Line =
    d.done ? { tone: notice ? "notice" : "ok", text: `${notice ? `${notice} ` : ""}${fill(w.right, { stars: starText(stars) })}${stars === 1 ? ` ${g.oneStar}` : ""}` }
    : why ? { tone: "wrong", text: why }
    : { tone: "hint", text: p ? (p.kind === "strides" ? w.typeHint : w.hint) : w.freeHint };
  const ask = p ? w.asks[`p${d.stage + 1}` as keyof typeof w.asks] : w.freeAsk;
  const reveal = !p || d.done;
  const at = d.sel && readSel(v, d.sel);
  // What a tap points at: in a puzzle only what was tapped, in free play (or once done) how the two are linked.
  const reading =
    !at ? null
    : reveal ? fill(w.read, { e: entryText(v.name, at.idx), x: at.value, sum: v.shape.length > 1 ? `${placeSum(v, at.idx)} = ${at.place}` : String(at.place) })
    : d.sel!.at === "view" ? fill(w.tapEntry, { e: entryText(v.name, at.idx), x: at.value })
    : fill(w.tapPlace, { p: at.place });
  const layout = fill(isContiguous(v) ? w.contiguous : w.jumps, { shape: v.shape.join(", "), s: v.strides.join(", "), j: v.strides[v.strides.length - 1] });

  const strides = p?.kind === "strides";
  const moves: RowItem[] = [
    ...(p ? [{ text: `✓ ${g.check}`, title: g.check, strong: true, disabled: d.done, onTap: check }] : []),
    ...(!p
      ? [
          { text: w.setup },
          ...TN_SETUPS.map((s) => ({ text: setupLabel(s), on: s.id === setup.id, onTap: () => commit(fresh({ setup: s.id, sel: null })) })),
          { text: `${w.next} →`, title: w.next, brk: true, onTap: () => commit({ sel: walk(v, d.sel) }) },
        ]
      : []),
    { text: `↺ ${g.reset}`, title: g.reset, onTap: () => commit(fresh({ sel: null, answers: [] })) },
  ];
  const dialH = strides ? 56 : 0;
  const total = v.shape.reduce((a, b) => a * b, 1);
  const strip = dialH + pillRowsH(moves, TN_PLOT.w) + 8;

  return (
    <>
      <GameHead game={game} g={g} />
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg
          ref={svgRef} className="hand-pic"
          width={TN_PLOT.w}
          height={TN_PLOT.h + strip}
          viewBox={`0 0 ${TN_PLOT.w} ${TN_PLOT.h + strip}`}
          fontFamily={FONT}
          aria-label={w.picture}
          onClick={tap}
        >
          <rect width={TN_PLOT.w} height={TN_PLOT.h + strip} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: tnSvg(setup, { sel: d.sel, reveal, wrong: !!wrong, memory: w.memory, caption: tnCaption(setup) }) }} />
          {strides &&
            v.shape.map((_, k) => {
              const x = (TN_PLOT.w - v.shape.length * 150 + 30) / 2 + k * 150;
              const typed = d.answers[k] ?? "";
              return (
                <g key={k}>
                  <text x={x + 44} y={TN_PLOT.h + 33} fontSize={18} fontWeight={700} textAnchor="end" fill={INK}>s{SUB[k]} =</text>
                  <NumBox x={x + 50} y={TN_PLOT.h + 8} w={70} value={typed === "" ? -1 : Number(typed)} min={-1} max={total} label={fill(w.stride, { k })}
                    show={(n) => (n < 0 ? "?" : String(n))} onChange={(n) => !d.done && setStride(k, n)} />
                </g>
              );
            })}
          <PillRows w={TN_PLOT.w} y={TN_PLOT.h + dialH} items={moves} />
        </svg>
      </Stage>
      <div className="descent-read">
        <span className="descent-rule">{w.rule}</span>
        {reading && <span className="descent-next">{reading}</span>}
        {reveal && <span className="descent-next">{layout}</span>}
      </div>
      <GameActions game={game} g={g} done={d.done} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
