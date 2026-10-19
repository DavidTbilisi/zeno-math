// Embeddings by hand: words as arrows from the origin of a plane, their tips dragged about, and beside them the
// numbers a puzzle is about (a cosine and the angle, a length, the words nearest a query, how far an analogy lands
// from its word, dot products). Eight puzzles open in turn, each checked with Check, stars for doing one at the first
// try, and in free play any word can be dragged and tapping words picks them: one shows its nearest words, two how
// alike they are, three where their analogy lands. What is mid-way (a drag) stays here until it is let go, so each
// change is one step to undo.
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
import { withFound, withStars } from "../math/ladder";
import { play } from "./juice";
import { Cheer, Found, GameNav, nextStage, Onward, SoundToggle, starText, useLadder } from "./ladderUi";
import { fill, FONT, svgPoint, type PieceProps } from "./ui";

type Grab = { id: string; moved: boolean };

export function EmbedLab({ state, set, w: words, svgRef }: PieceProps<"embedLab">) {
  const [w, g] = [words.embedLab, words.game];
  const [ladder, keep] = useLadder("zeno.embedlab.v1", EMBED_LADDER.length, EMBED_NOTICES);
  const [cheer, setCheer] = useState(0);
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

  function go(stage: number) {
    commit({ mode: "puzzle", stage, vecs: embedStart(EMBED_LADDER[stage]), sel: [], tries: 0, done: false, said: null });
  }
  function free() {
    commit({ mode: "free", vecs: embedStart(null), sel: ["cat"], tries: 0, done: false, said: null });
  }
  const onward = () => go(nextStage(d.stage, EMBED_LADDER.length));

  const check = () => {
    if (!p) return;
    const v = judgeEmbed(p, d.vecs);
    if (v.state === "won") {
      keep(withFound(withStars(ladder, d.stage, embedStars(d.tries)), p.notice, EMBED_NOTICES));
      play("good");
      setTimeout(() => play("star"), 260);
      setCheer((c) => c + 1);
      return commit({ done: true, said: { kind: "notice", key: p.notice } });
    }
    play("miss");
    commit({ tries: d.tries + 1, said: { kind: "wrong", why: v.why } });
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
  const said =
    d.done && d.said?.kind === "notice" ? `${w.notices[d.said.key]} ${fill(w.right, { stars: starText(embedStars(d.tries)) })}`
    : wrong ? fill(w.why[wrong.why], { have: num(wrong.have), want: num(wrong.want), names: (wrong.names ?? []).map(n).join(", ") })
    : p ? w.hint
    : w.freeHint;
  const sayClass = d.done ? "live-said notice" : wrong ? "live-said" : "live-hint";

  return (
    <>
      <GameNav ladder={ladder} mode={d.mode} stage={d.stage} onPuzzle={go} onFree={free} words={w} g={g} />
      <p className="live-said geo-prompt">{ask}</p>
      <div className="geo-stage-wrap">
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
        {cheer > 0 && d.done && <Cheer key={cheer} text={starText(embedStars(d.tries))} />}
      </div>
      <div className="live-bar">
        {p && <button className="live-btn on" disabled={d.done} onClick={check}>✓ {w.check}</button>}
        <button className="live-btn" onClick={() => commit(fresh({ vecs: embedStart(p) }))}>↺ {w.reset}</button>
        {d.done && p && <Onward mode="puzzle" stage={d.stage} size={EMBED_LADDER.length} onClick={onward} g={g} />}
        <SoundToggle title={g.sound} />
      </div>
      <p className={sayClass}>
        {said} <Found ladder={ladder} of={EMBED_NOTICES.length} notices={w.notices} g={g} />
      </p>
    </>
  );
}
