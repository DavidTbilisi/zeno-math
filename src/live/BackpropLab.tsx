// Backpropagation by hand: a computational graph with each node's value, and under each node a box for its gradient
// ∂L/∂node, filled in going back from L. Eight puzzles open in turn, each checked with Check, stars for doing one at
// the first try; tapping a box in the picture goes to its field. In free play any of the graphs is taken, its inputs
// changed by hand with every gradient shown, and a nudge of 0.01 to the chosen input shows what its gradient means.
// What is mid-way (a number being typed) stays here until the field is left, so each change is one step to undo. Built
// on the game shell (useGame): a check with every gradient right wins the puzzle, one with a slip is a miss.
import { useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
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
import { starText } from "./ladderUi";
import { fill, FONT, svgPoint, type PieceProps } from "./ui";
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
  const fields = useRef<Record<string, HTMLInputElement | null>>({});
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

  // Typing stays a draft until the field is left; Enter goes on to the next box. The last box typed in stays marked,
  // with its hint, so that nothing moves under the pointer on the way to Check.
  const type = (id: string, text: string) => setDraft(fresh({ answers: { ...d.answers, [id]: text } }));
  const leave = () => draft && commit();
  const onKey = (e: KeyboardEvent<HTMLInputElement>, i: number) => {
    if (e.key !== "Enter" || !p) return;
    const next = p.blanks[i + 1];
    if (next) fields.current[next]?.focus();
    else e.currentTarget.blur();
  };
  // A tap on a box goes to its field; in free play a tap on an input chooses it.
  const tap = (e: MouseEvent<SVGSVGElement>) => {
    const [x, y] = svgPoint(e.currentTarget, e);
    const id = bpHit(graph, x, y);
    if (!id) return;
    if (p) fields.current[id]?.focus();
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
  const uses = p && focus ? usesOf(graph, focus, w.reluRule) : [];
  const n = sel ? nudge(graph, values, sel) : null;

  return (
    <>
      <GameHead game={game} g={g} />
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg
          ref={svgRef}
          width={BP_PLOT.w}
          height={BP_PLOT.h}
          viewBox={`0 0 ${BP_PLOT.w} ${BP_PLOT.h}`}
          fontFamily={FONT}
          role="img"
          aria-label={w.picture}
          onClick={tap}
        >
          <rect width={BP_PLOT.w} height={BP_PLOT.h} fill="#fff" />
          <g
            dangerouslySetInnerHTML={{
              __html: bpSvg(graph, values, { blanks: p?.blanks ?? [], answers: d.answers, hide: p?.hide ?? [], focus, wrong: wrong?.node ?? null, done: d.done, sel, caption: `${graph.formula} · ${w.caption}` }),
            }}
          />
        </svg>
      </Stage>
      {p ? (
        <div className="live-bar">
          {p.blanks.map((id, i) => (
            <label key={id} className="live-field">
              ∂L/∂{id} =
              <input
                ref={(el) => {
                  fields.current[id] = el;
                }}
                className="live-num"
                inputMode="decimal"
                spellCheck={false}
                value={d.answers[id] ?? ""}
                disabled={d.done}
                aria-label={`∂L/∂${id}`}
                onFocus={() => setFocus(id)}
                onChange={(e) => type(id, e.target.value)}
                onBlur={leave}
                onKeyDown={(e) => onKey(e, i)}
              />
            </label>
          ))}
        </div>
      ) : (
        <div className="live-bar">
          <label className="live-select">
            <span>{w.graph}</span>
            <select value={graph.id} onChange={(e) => pickGraph(e.target.value as BpGraphId)}>
              {BP_GRAPHS.map((x) => <option key={x.id} value={x.id}>{x.formula}</option>)}
            </select>
          </label>
          {sel !== null && (
            <span className="live-field">
              <button className="live-btn" disabled={stepped(values[sel], -VALUE_STEP) === null} title={w.less} aria-label={w.less} onClick={() => step(-VALUE_STEP)}>−</button>
              <b>{sel} = {num(values[sel])}</b>
              <button className="live-btn" disabled={stepped(values[sel], VALUE_STEP) === null} title={w.more} aria-label={w.more} onClick={() => step(VALUE_STEP)}>+</button>
            </span>
          )}
        </div>
      )}
      <div className="descent-read">
        <span className="descent-rule">{w.rule}</span>
        {uses.length > 0 && focus && <span className="descent-next">{fill(w.feeds, { n: focus, uses: uses.map((u) => fill(w.use, { p: u.to, e: u.expr, r: u.slope })).join("; ") })}</span>}
        {n && sel && <span className="descent-next">{fill(w.nudge, { n: sel, a: num4(n.before), b: num4(n.after), d: num4(n.after - n.before), g: num4(grad[sel] * 0.01) })}</span>}
      </div>
      <GameActions game={game} g={g} done={d.done} always>
        {p && <button className="live-btn on" disabled={d.done} onClick={check}>✓ {g.check}</button>}
        <button className="live-btn" onClick={() => commit(fresh(p ? { answers: {} } : { values: { ...graph.values } }))}>↺ {g.reset}</button>
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
