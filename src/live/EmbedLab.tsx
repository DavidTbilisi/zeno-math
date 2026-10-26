// Embeddings by hand: words as arrows from the origin of a plane, their tips dragged about, and beside them the
// numbers a puzzle is about (a cosine and the angle, a length, the words nearest a query, how far an analogy lands
// from its word, dot products). Eight puzzles open in turn, each checked with Check, stars for doing one at the first
// try, and in free play any word can be dragged and tapping words picks them: one shows its nearest words, two how
// alike they are, three where their analogy lands. What is mid-way (a drag) stays here until it is let go, so each
// change is one step to undo. Built on the game shell (useGame): a check that meets the puzzle's goal wins it, one that
// does not is a miss.
import { useState, type PointerEvent } from "react";
import {
  analogiesOf,
  EMBED_LADDER,
  EMBED_NOTICES,
  EMBED_PLOT,
  embedPuzzle,
  embedReadout,
  embedStars,
  embedStart,
  embedSvg,
  fromPage,
  judgeEmbed,
  num,
  pick,
  snapTip,
  toPage,
  type LiveEmbed,
} from "../math/embedLab";
import { play } from "./juice";
import { starText } from "./ladderUi";
import { fill, FONT, svgPoint, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

type Grab = { id: string; moved: boolean };

/** A new try of a puzzle starts from no tries; a puzzle of the ladder sets its words, free play its own. */
const FRESH: Partial<LiveEmbed> = { tries: 0, done: false, said: null };
const stagePatch = (stage: number): Partial<LiveEmbed> => ({ vecs: embedStart(EMBED_LADDER[stage]), sel: [] });
const freePatch = (): Partial<LiveEmbed> => ({ vecs: embedStart(null), sel: ["cat"] });

export function EmbedLab({ state, set, w: words, svgRef }: PieceProps<"embedLab">) {
  const [w, g] = [words.embedLab, words.game];
  const [draft, setDraft] = useState<Partial<LiveEmbed> | null>(null);
  const [grab, setGrab] = useState<Grab | null>(null);
  const d: LiveEmbed = { ...state, ...draft };
  const p = embedPuzzle(d);
  const drag: string[] = p ? p.drag : d.vecs.map((x) => x.id);
  const names = w.words as Record<string, string>;
  const n = (id: string) => names[id] ?? id;

  // A change starts the try afresh: what was said about the last check goes.
  const fresh = (change: Partial<LiveEmbed>): Partial<LiveEmbed> => ({ ...change, done: false, said: null });
  const commit = (change: Partial<LiveEmbed> = {}) => {
    setDraft(null);
    set({ ...d, ...change });
  };
  const game = useGame({ key: "zeno.embedlab.v1", size: EMBED_LADDER.length, notices: EMBED_NOTICES, modes: ["puzzle", "free"], state: d, set: commit, fresh: FRESH, stagePatch, freePatch: freePatch() });

  const check = () => {
    if (!p) return;
    const v = judgeEmbed(p, d.vecs);
    if (v.state === "won") return game.win({ stars: embedStars(d.tries), notice: () => p.notice, patch: { done: true } });
    game.miss({ tries: d.tries + 1, said: { kind: "wrong", why: v.why } });
  };

  // Dragging a tip moves it; in free play a tap on a tip (or a word's label) picks the word.
  const tipAt = (px: number, py: number) => {
    let best: string | null = null;
    let bd = 18;
    for (const x of d.vecs) {
      const [tx, ty] = toPage(x.v);
      const dd = Math.hypot(tx - px, ty - py);
      if (dd < bd && (drag.includes(x.id) || !p)) [best, bd] = [x.id, dd];
    }
    return best;
  };
  const moveTip = (id: string, e: PointerEvent<SVGSVGElement>) => {
    const t = snapTip(fromPage(svgPoint(e.currentTarget, e)));
    if (t) setDraft(fresh({ vecs: d.vecs.map((x) => (x.id === id ? { ...x, v: t } : x)) }));
  };
  const down = (e: PointerEvent<SVGSVGElement>) => {
    const [px, py] = svgPoint(e.currentTarget, e);
    const id = tipAt(px, py);
    if (!id) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setGrab({ id, moved: false });
  };
  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (!grab || !drag.includes(grab.id)) return;
    if (!grab.moved) setGrab({ ...grab, moved: true });
    moveTip(grab.id, e);
  };
  const up = () => {
    if (!grab) return;
    setGrab(null);
    if (!grab.moved && !p) {
      play("snap");
      return commit({ sel: pick(d.sel, grab.id) });
    }
    if (grab.moved) {
      play("snap");
      commit();
    }
  };

  const readout = embedReadout(p, d.vecs, d.sel, { names, ratio: w.ratio, off: w.off, picked: w.pickHint, nearestTo: w.nearestTo, lands: w.lands });
  const goal = p?.goal;
  const pair: [string, string] | undefined = goal && (goal.kind === "cos" || goal.kind === "long") ? [goal.a, goal.b] : !p && d.sel.length === 2 ? [d.sel[0], d.sel[1]] : undefined;
  const ask = p ? w.asks[`p${d.stage + 1}` as keyof typeof w.asks] : w.freeAsk;
  const verdict = p && d.said?.kind === "wrong" ? judgeEmbed(p, d.vecs) : null;
  const wrong = verdict?.state === "lost" ? verdict : null;
  const stars = embedStars(d.tries);
  const notice = d.said?.kind === "notice" ? w.notices[d.said.key] : null;
  const line: Line =
    d.done ? { tone: notice ? "notice" : "ok", text: `${notice ? `${notice} ` : ""}${fill(w.right, { stars: starText(stars) })}${stars === 1 ? ` ${g.oneStar}` : ""}` }
    : wrong ? { tone: "wrong", text: fill(w.why[wrong.why], { have: num(wrong.have), want: num(wrong.want), names: (wrong.names ?? []).map(n).join(", ") }) }
    : { tone: "hint", text: p ? w.hint : w.freeHint };

  return (
    <>
      <GameHead game={game} g={g} />
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg
          ref={svgRef}
          width={EMBED_PLOT.w}
          height={EMBED_PLOT.h}
          viewBox={`0 0 ${EMBED_PLOT.w} ${EMBED_PLOT.h}`}
          fontFamily={FONT}
          role="img"
          aria-label={w.picture}
          style={{ cursor: grab ? "grabbing" : "default", touchAction: "none" }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        >
          <rect width={EMBED_PLOT.w} height={EMBED_PLOT.h} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: embedSvg(d.vecs, { drag: p ? drag : [], sel: p ? [] : d.sel, pair, analogies: analogiesOf(p, d.sel), readout, names }) }} />
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.done} always>
        {p && <button className="live-btn on" disabled={d.done} onClick={check}>✓ {g.check}</button>}
        <button className="live-btn" onClick={() => commit(fresh({ vecs: embedStart(p) }))}>↺ {g.reset}</button>
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
