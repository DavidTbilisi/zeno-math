// The convolution lab: a kernel slid over a signal or a small picture, the sums it makes as a feature map; tap an
// output cell to see its window and sum, paint pixels, pick the kernel, the stride and the padding, and pool. Five
// puzzles open in turn, each won with a Check, stars for doing one at the first try; free play takes every control.
// What is mid-way (a stroke of painting) stays here until it is let go, so each change is one step to undo. Built on
// the game shell (useGame).
import { useState, type PointerEvent } from "react";
import {
  blank,
  CONV_LADDER,
  CONV_NOTICES,
  CONV_PLOT,
  controlsOf,
  convPuzzle,
  convStars,
  convSvg,
  judgeConv,
  outputCellAt,
  outputOf,
  PICKABLE,
  pixelAt,
  type Grid,
  type LiveConv,
} from "../math/convLab";
import { play } from "./juice";
import { starText } from "./ladderUi";
import { fill, FONT, svgPoint, Toggle, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const FRESH: Partial<LiveConv> = { tries: 0, done: false, said: null };
const stagePatch = (stage: number): Partial<LiveConv> => CONV_LADDER[stage].start;
const FREE_PATCH: Partial<LiveConv> = { img: blank(8, 8), kernel: "vertical", stride: 1, pad: 0, pool: false, sel: null };

export function ConvLab({ state, set, w: words, svgRef }: PieceProps<"convLab">) {
  const [w, g] = [words.convLab, words.game];
  const [draft, setDraft] = useState<Partial<LiveConv> | null>(null);
  const [brush, setBrush] = useState<number | null>(null);
  const d: LiveConv = { ...state, ...draft };
  const p = convPuzzle(d);
  const can = controlsOf(d);

  const fresh = (change: Partial<LiveConv>): Partial<LiveConv> => ({ ...change, done: false, said: null });
  const commit = (change: Partial<LiveConv> = {}) => {
    setDraft(null);
    set({ ...d, ...change });
  };
  const game = useGame({ key: "zeno.convlab.v1", size: CONV_LADDER.length, notices: CONV_NOTICES, modes: ["puzzle", "free"], state: d, set: commit, fresh: FRESH, stagePatch, freePatch: FREE_PATCH });

  const check = () => {
    if (!p) return;
    const v = judgeConv(d, p.goal);
    if (v.state === "won") return game.win({ stars: convStars(d.tries), notice: () => p.notice, patch: { done: true } });
    game.miss({ tries: d.tries + 1, said: { kind: "wrong", why: v.why } });
  };

  // Tapping an output cell picks it; painting pixels toggles them, a stroke painting what its first pixel became.
  const paintAt = (img: Grid, at: [number, number], v: number): Grid => img.map((row, i) => (i === at[0] ? row.map((x, j) => (j === at[1] ? v : x)) : row));
  const down = (e: PointerEvent<SVGSVGElement>) => {
    if (d.done) return;
    const [px, py] = svgPoint(e.currentTarget, e);
    const cell = can.includes("select") ? outputCellAt(outputOf(d), px, py) : null;
    if (cell) {
      play("snap");
      return commit(fresh({ sel: cell }));
    }
    const pixel = can.includes("paint") ? pixelAt(d, px, py) : null;
    if (!pixel) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const v = d.img[pixel[0]][pixel[1]] ? 0 : 1;
    setBrush(v);
    setDraft(fresh({ img: paintAt(d.img, pixel, v) }));
  };
  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (brush === null) return;
    const pixel = pixelAt(d, ...svgPoint(e.currentTarget, e));
    if (pixel && d.img[pixel[0]][pixel[1]] !== brush) setDraft(fresh({ img: paintAt(d.img, pixel, brush) }));
  };
  const up = () => {
    if (brush === null) return;
    setBrush(null);
    play("snap");
    commit();
  };

  const out = outputOf(d);
  const ask = p ? w.asks[`p${d.stage + 1}` as keyof typeof w.asks] : w.freeAsk;
  const verdict = p && d.said?.kind === "wrong" ? judgeConv(d, p.goal) : null;
  const wrong = verdict?.state === "lost" ? verdict : null;
  const stars = convStars(d.tries);
  const notice = d.said?.kind === "notice" ? w.notices[d.said.key] : null;
  const line: Line =
    d.done ? { tone: notice ? "notice" : "ok", text: `${notice ? `${notice} ` : ""}${fill(w.right, { stars: starText(stars) })}${stars === 1 ? ` ${g.oneStar}` : ""}` }
    : wrong ? { tone: "wrong", text: fill(w.why[wrong.why], { have: String(wrong.have).replace("-", "−"), want: String(wrong.want) }) }
    : { tone: "hint", text: p ? w.hint : w.freeHint };
  const read = fill(w.read, { h: out.length, w: out[0]?.length ?? 0, top: String(Math.round(Math.max(...out.flat()) * 100) / 100).replace("-", "−") });

  return (
    <>
      <GameHead game={game} g={g} />
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done && !!p} g={g} notices={w.notices}>
        <svg
          ref={svgRef}
          width={CONV_PLOT.w}
          height={CONV_PLOT.h}
          viewBox={`0 0 ${CONV_PLOT.w} ${CONV_PLOT.h}`}
          fontFamily={FONT}
          role="img"
          aria-label={w.picture}
          style={{ cursor: can.includes("paint") || can.includes("select") ? "pointer" : "default", touchAction: "none" }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        >
          <rect width={CONV_PLOT.w} height={CONV_PLOT.h} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: convSvg(d, w.chart) }} />
        </svg>
      </Stage>
      <div className="descent-read">
        <span>{read}</span>
      </div>
      <GameActions game={game} g={g} done={d.done && !!p} always>
        {p && <button className="live-btn on" disabled={d.done} onClick={check}>✓ {g.check}</button>}
        {can.includes("kernel") && PICKABLE.map((k) => <Toggle key={k} on={d.kernel === k} disabled={d.done} onClick={() => commit(fresh({ kernel: k, sel: null }))}>{w.kernels[k]}</Toggle>)}
        {can.includes("stride") && [1, 2, 3].map((s) => <Toggle key={`s${s}`} on={d.stride === s} disabled={d.done} onClick={() => commit(fresh({ stride: s, sel: null }))}>{fill(w.stride, { s })}</Toggle>)}
        {can.includes("pad") && [0, 1, 2].map((q) => <Toggle key={`p${q}`} on={d.pad === q} disabled={d.done} onClick={() => commit(fresh({ pad: q, sel: null }))}>{fill(w.pad, { p: q })}</Toggle>)}
        {can.includes("pool") && <Toggle on={d.pool} onClick={() => commit({ pool: !d.pool })}>{w.pool}</Toggle>}
        {can.includes("paint") && <button className="live-btn" disabled={d.done} onClick={() => commit(fresh({ img: blank(d.img.length, d.img[0].length), sel: null }))}>{w.clear}</button>}
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
