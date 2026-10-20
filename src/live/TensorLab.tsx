// Tensors by hand: a tensor's entries as slices, rows and columns, and under them the one line of memory they live in.
// Eight puzzles open in turn, each checked with Check, stars for doing one at the first try: an entry tapped by its
// indices, its place in memory tapped, the entry at a place found, the strides typed, and the same for a reshape and a
// transpose. In free play any shape or view is taken, a tap on an entry or a place shows the other with the sum that
// links them, and a walk goes through the view in its own order. What is mid-way (a stride being typed) stays here
// until the field is left, so each change is one step to undo.
import { useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { withFound, withStars } from "../math/ladder";
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
  type TnSetupId,
} from "../math/tensorLab";
import { play } from "./juice";
import { Cheer, Found, GameNav, nextStage, Onward, SoundToggle, starText, useLadder } from "./ladderUi";
import { fill, FONT, svgPoint, type PieceProps } from "./ui";

const SUB = "₀₁₂₃";

export function TensorLab({ state, set, w: words, svgRef }: PieceProps<"tensorLab">) {
  const [w, g] = [words.tensorLab, words.game];
  const [ladder, keep] = useLadder("zeno.tensorlab.v1", TN_LADDER.length, TN_NOTICES);
  const [cheer, setCheer] = useState(0);
  const [draft, setDraft] = useState<Partial<LiveTensor> | null>(null);
  const fields = useRef<(HTMLInputElement | null)[]>([]);
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

  const go = (stage: number) => commit({ mode: "puzzle", stage, sel: null, answers: [], tries: 0, done: false, said: null });
  const free = () => commit({ mode: "free", setup: "t234", sel: null, answers: [], tries: 0, done: false, said: null });
  const onward = () => go(nextStage(d.stage, TN_LADDER.length));

  const check = () => {
    if (!p) return;
    const verdict = judgeTn(p, d.sel, d.answers);
    if (verdict.state === "won") {
      keep(withFound(withStars(ladder, d.stage, tnStars(d.tries)), p.notice, TN_NOTICES));
      play("good");
      setTimeout(() => play("star"), 260);
      setCheer((c) => c + 1);
      return commit({ done: true, said: { kind: "notice", key: p.notice } });
    }
    play("miss");
    commit({ tries: d.tries + 1, said: { kind: "wrong", why: verdict.why } });
  };

  // A tap on an entry or a place, where the puzzle takes one.
  const tap = (e: MouseEvent<SVGSVGElement>) => {
    if (d.done) return;
    const [x, y] = svgPoint(e.currentTarget, e);
    const hit = tnHit(v, x, y);
    if (hit && tapsOn(p).includes(hit.at)) commit(fresh({ sel: hit }));
  };
  // The strides are typed as a draft until the field is left; Enter goes on to the next one.
  const type = (k: number, text: string) => setDraft(fresh({ answers: v.shape.map((_, j) => (j === k ? text : (d.answers[j] ?? ""))) }));
  const leave = () => draft && commit();
  const onKey = (e: KeyboardEvent<HTMLInputElement>, k: number) => {
    if (e.key !== "Enter") return;
    const next = fields.current[k + 1];
    if (next && k + 1 < v.shape.length) next.focus();
    else e.currentTarget.blur();
  };

  const verdict = p && d.said?.kind === "wrong" ? judgeTn(p, d.sel, d.answers) : null;
  const wrong = verdict?.state === "lost" ? verdict : null;
  const why = wrong && fill(w.why[wrong.why], { have: wrong.have, k: wrong.k, s: `s${SUB[wrong.k]}`, v: v.name });
  const said =
    d.done && d.said?.kind === "notice" ? `${w.notices[d.said.key]} ${fill(w.right, { stars: starText(tnStars(d.tries)) })}`
    : why ? why
    : p ? (p.kind === "strides" ? w.typeHint : w.hint)
    : w.freeHint;
  const sayClass = d.done ? "live-said notice" : wrong ? "live-said" : "live-hint";
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

  return (
    <>
      <GameNav ladder={ladder} mode={d.mode} stage={d.stage} onPuzzle={go} onFree={free} words={w} g={g} />
      <p className="live-said geo-prompt">{ask}</p>
      <div className="geo-stage-wrap">
        <svg
          ref={svgRef}
          width={TN_PLOT.w}
          height={TN_PLOT.h}
          viewBox={`0 0 ${TN_PLOT.w} ${TN_PLOT.h}`}
          fontFamily={FONT}
          role="img"
          aria-label={w.picture}
          onClick={tap}
        >
          <rect width={TN_PLOT.w} height={TN_PLOT.h} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: tnSvg(setup, { sel: d.sel, reveal, wrong: !!wrong, memory: w.memory, caption: tnCaption(setup) }) }} />
        </svg>
        {cheer > 0 && d.done && <Cheer key={cheer} text={starText(tnStars(d.tries))} />}
      </div>
      {p?.kind === "strides" && (
        <div className="live-bar">
          {v.shape.map((_, k) => (
            <label key={k} className="live-field">
              s{SUB[k]} =
              <input
                ref={(el) => {
                  fields.current[k] = el;
                }}
                className="live-num"
                inputMode="numeric"
                spellCheck={false}
                value={d.answers[k] ?? ""}
                disabled={d.done}
                aria-label={fill(w.stride, { k })}
                onChange={(e) => type(k, e.target.value)}
                onBlur={leave}
                onKeyDown={(e) => onKey(e, k)}
              />
            </label>
          ))}
        </div>
      )}
      {!p && (
        <div className="live-bar">
          <label className="live-select">
            <span>{w.setup}</span>
            <select value={setup.id} onChange={(e) => commit(fresh({ setup: e.target.value as TnSetupId, sel: null }))}>
              {TN_SETUPS.map((s) => <option key={s.id} value={s.id}>{setupLabel(s)}</option>)}
            </select>
          </label>
          <button className="live-btn" onClick={() => commit({ sel: walk(v, d.sel) })}>{w.next} →</button>
        </div>
      )}
      <div className="descent-read">
        <span className="descent-rule">{w.rule}</span>
        {reading && <span className="descent-next">{reading}</span>}
        {reveal && <span className="descent-next">{layout}</span>}
      </div>
      <div className="live-bar">
        {p && <button className="live-btn on" disabled={d.done} onClick={check}>✓ {w.check}</button>}
        <button className="live-btn" onClick={() => commit(fresh({ sel: null, answers: [] }))}>↺ {w.reset}</button>
        {d.done && p && <Onward mode="puzzle" stage={d.stage} size={TN_LADDER.length} onClick={onward} g={g} />}
        <SoundToggle title={g.sound} />
      </div>
      <p className={sayClass}>
        {said} <Found ladder={ladder} of={TN_NOTICES.length} notices={w.notices} g={g} />
      </p>
    </>
  );
}
