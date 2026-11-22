// Backpropagation by hand: a computational graph with each node's value, and under each node a box for its gradient
// ∂L/∂node, filled in going back from L. Eight puzzles open in turn, each checked with Check, stars for doing one at
// the first try; a box tapped in the picture (or its pill) is the one the digit pad under it fills. In free play any of
// the graphs is taken as a pill, the chosen input stepped with − and +, every gradient shown, and a nudge of 0.01 to it
// shows what its gradient means. Each tile put in or taken out is one step to undo. Built
// on the game shell (useGame): a check with every gradient right wins the puzzle, one with a slip is a miss.
import { useState, type MouseEvent } from "react";
import {
  backward,
  BP_GRAPHS,
  BP_LADDER,
  BP_NOTICES,
  BP_PLOT,
  bpHit,
  bpPuzzle,
  bpStars,
  bpSvg,
  forward,
  graphOf,
  inputsOf,
  judgeBp,
  num,
  num4,
  nudge,
  stepped,
  usesOf,
  valuesOf,
  VALUE_STEP,
  type BpGraphId,
  type LiveBackprop,
} from "../math/backpropLab";
import { DigitPad, PAD_H } from "./DigitPad";
import { starText } from "./ladderUi";
import { fill, FONT, svgPoint, type PieceProps } from "./ui";
import { PillRows, pillRowsH, type RowItem } from "./hand";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

/** A new try starts from empty boxes; free play starts from the first graph with its first input chosen. */
const FRESH: Partial<LiveBackprop> = { answers: {}, tries: 0, done: false, said: null };
const freePatch = (): Partial<LiveBackprop> => {
  const first = BP_GRAPHS[0];
  return { graph: first.id, values: { ...first.values }, sel: inputsOf(first)[0] };
};

export function BackpropLab({ state, set, w: words, svgRef }: PieceProps<"backpropLab">) {
  const [w, g] = [words.backpropLab, words.game];
  const [draft, setDraft] = useState<Partial<LiveBackprop> | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const d: LiveBackprop = { ...state, ...draft };
  const p = bpPuzzle(d);
  const graph = graphOf(d);
  const values = valuesOf(d);
  const v = forward(graph, values);
  const grad = backward(graph, v);

  // A change starts the try afresh: what was said about the last check goes.
  const fresh = (change: Partial<LiveBackprop>): Partial<LiveBackprop> => ({ ...change, done: false, said: null });
  const commit = (change: Partial<LiveBackprop> = {}) => {
    setDraft(null);
    set({ ...d, ...change });
  };
  // Another puzzle (or free play) forgets which box was being typed in.
  const game = useGame({
    key: "zeno.backproplab.v1",
    size: BP_LADDER.length,
    notices: BP_NOTICES,
    modes: ["puzzle", "free"],
    state: d,
    set: (s) => {
      if (s.mode !== d.mode || s.stage !== d.stage) setFocus(null);
      commit(s);
    },
    fresh: FRESH,
    freePatch: freePatch(),
  });

  const check = () => {
    if (!p) return;
    const verdict = judgeBp(p, d.answers);
    if (verdict.state === "won") return game.win({ stars: bpStars(d.tries), notice: () => p.notice, patch: { done: true } });
    game.miss({ tries: d.tries + 1, said: { kind: "wrong", why: verdict.why } });
  };

  // The pad fills the box being filled in: a tap on another box (in the picture or its pill) moves to it.
  const at = p ? (focus && p.blanks.includes(focus) ? focus : p.blanks[0]) : null;
  const type = (id: string, text: string) => commit(fresh({ answers: { ...d.answers, [id]: text } }));
  // A tap on a box goes to its field; in free play a tap on an input chooses it.
  const tap = (e: MouseEvent<SVGSVGElement>) => {
    const [x, y] = svgPoint(e.currentTarget, e);
    const id = bpHit(graph, x, y);
    if (!id) return;
    if (p) {
      if (p.blanks.includes(id)) setFocus(id);
    }
    else if (inputsOf(graph).includes(id)) commit({ sel: id });
  };

  const pickGraph = (id: BpGraphId) => {
    const next = BP_GRAPHS.find((x) => x.id === id)!;
    commit(fresh({ graph: id, values: { ...next.values }, sel: inputsOf(next)[0] }));
  };
  const sel = !p && d.sel && inputsOf(graph).includes(d.sel) ? d.sel : null;
  const step = (by: number) => {
    const to = sel === null ? null : stepped(values[sel], by);
    if (sel !== null && to !== null) commit(fresh({ values: { ...values, [sel]: to } }));
  };

  const verdict = p && d.said?.kind === "wrong" ? judgeBp(p, d.answers) : null;
  const wrong = verdict?.state === "lost" ? verdict : null;
  const stars = bpStars(d.tries);
  const notice = d.said?.kind === "notice" ? w.notices[d.said.key] : null;
  const line: Line =
    d.done ? { tone: notice ? "notice" : "ok", text: `${notice ? `${notice} ` : ""}${fill(w.right, { stars: starText(stars) })}${stars === 1 ? ` ${g.oneStar}` : ""}` }
    : wrong ? { tone: "wrong", text: fill(w.why[wrong.why], { n: wrong.node, have: wrong.have }) }
    : { tone: "hint", text: p ? w.hint : w.freeHint };
  const ask = p ? w.asks[`p${d.stage + 1}` as keyof typeof w.asks] : w.freeAsk;
  // The hint for the box being typed in: the arrows out of its node, each with its local slope.
  const uses = p && at ? usesOf(graph, at, w.reluRule) : [];
  const n = sel ? nudge(graph, values, sel) : null;

  const reset = { text: `↺ ${g.reset}`, title: g.reset, onTap: () => commit(fresh(p ? { answers: {} } : { values: { ...graph.values } })) };
  const moves: RowItem[] = p
    ? [...p.blanks.map((id) => ({ text: `∂L/∂${id} = ${d.answers[id] || "?"}`, title: `∂L/∂${id}`, on: id === at, onTap: () => setFocus(id) })), reset]
    : [
        { text: w.graph },
        ...BP_GRAPHS.map((x) => ({ text: x.formula, on: x.id === graph.id, onTap: () => pickGraph(x.id) })),
        ...(sel !== null
          ? [
              { text: "−", title: w.less, brk: true, disabled: stepped(values[sel], -VALUE_STEP) === null, onTap: () => step(-VALUE_STEP) },
              { text: `${sel} = ${num(values[sel])}` },
              { text: "+", title: w.more, disabled: stepped(values[sel], VALUE_STEP) === null, onTap: () => step(VALUE_STEP) },
            ]
          : []),
        { ...reset, brk: sel === null },
      ];
  const dialH = 0;
  const rowsH = pillRowsH(moves, BP_PLOT.w);
  const strip = rowsH + (p ? PAD_H + 8 : 0) + 8;

  return (
    <>
      <GameHead game={game} g={g} />
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg
          ref={svgRef} className="hand-pic"
          width={BP_PLOT.w}
          height={BP_PLOT.h + strip}
          viewBox={`0 0 ${BP_PLOT.w} ${BP_PLOT.h + strip}`}
          fontFamily={FONT}
          aria-label={w.picture}
          onClick={tap}
        >
          <rect width={BP_PLOT.w} height={BP_PLOT.h + strip} fill="#fff" />
          <g
            dangerouslySetInnerHTML={{
              __html: bpSvg(graph, values, { blanks: p?.blanks ?? [], answers: d.answers, hide: p?.hide ?? [], focus: at, wrong: wrong?.node ?? null, done: d.done, sel, caption: `${graph.formula} · ${w.caption}` }),
            }}
          />
          {p && at && (
            <DigitPad x={8} y={BP_PLOT.h + rowsH + 4} w={BP_PLOT.w - 16} value={d.answers[at] ?? ""} onChange={(t) => type(at, t)} label={`∂L/∂${at}`} erase={words.machine.erase}
              minus dot disabled={d.done} check={d.done ? undefined : { text: `✓ ${g.check}`, onTap: check }} />
          )}
          <PillRows w={BP_PLOT.w} y={BP_PLOT.h + dialH} items={moves} />
        </svg>
      </Stage>
      <div className="descent-read">
        <span className="descent-rule">{w.rule}</span>
        {uses.length > 0 && at && <span className="descent-next">{fill(w.feeds, { n: at, uses: uses.map((u) => fill(w.use, { p: u.to, e: u.expr, r: u.slope })).join("; ") })}</span>}
        {n && sel && <span className="descent-next">{fill(w.nudge, { n: sel, a: num4(n.before), b: num4(n.after), d: num4(n.after - n.before), g: num4(grad[sel] * 0.01) })}</span>}
      </div>
      <GameActions game={game} g={g} done={d.done} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
