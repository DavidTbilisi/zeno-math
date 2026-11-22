// Gradient descent by hand: a ball on a curve, dragged to where it starts, and a learning rate η set with a slider
// (momentum β too in the last puzzle and in free play). The dashed hop shows where the next step would land, so moving
// the slider shows what the rate does before a step is taken; Step takes one, Run plays the steps until the try is
// done or has failed, and a failed try says why. Nine puzzles open in turn, stars for doing one at the first try, and
// free play takes any f(x). What is mid-way (a drag, a slider being moved, a run being played) stays here until it is
// let go, so each change is one step to undo. Built on the game shell (useGame): a try that reaches the bottom is the
// puzzle won, one that fails is a miss (and may still show something worth noticing).
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import {
  BETAS,
  budgetOf,
  DESCENT_FNS,
  DESCENT_LADDER,
  DESCENT_NOTICES,
  descentNotice,
  descentPath,
  descentPuzzle,
  descentStars,
  descentSvg,
  ETAS,
  etaIndex,
  FREE_STEPS,
  freeFn,
  judge,
  num,
  PLOT,
  plotScale,
  type DescentVerdict,
  type LiveDescent,
} from "../math/descentLab";
import { Pill, Track } from "./hand";
import { play } from "./juice";
import { starText } from "./ladderUi";
import { fill, FONT, svgPoint, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

/** The dials and the moves, drawn under the plot. */
const STRIP = 96;
/** How many steps Run plays at a time in free play. */
const FREE_RUN = 25;
/** A new try of a puzzle starts from no steps; a puzzle of the ladder sets the ball and the dials, free play its own. */
const FRESH: Partial<LiveDescent> = { steps: 0, tries: 0, done: false, said: null };
const stagePatch = (stage: number): Partial<LiveDescent> => ({ start: DESCENT_LADDER[stage].start, eta: DESCENT_LADDER[stage].eta, beta: 0 });
const FREE_PATCH: Partial<LiveDescent> = { start: 2, eta: 0.05, beta: 0 };

export function DescentLab({ state, set, w: words, svgRef }: PieceProps<"descentLab">) {
  const [w, g] = [words.descentLab, words.game];
  const [draft, setDraft] = useState<Partial<LiveDescent> | null>(null);
  const [typed, setTyped] = useState<string | null>(null);
  const [run, setRun] = useState<{ at: number; to: number } | null>(null);
  const [dragging, setDragging] = useState<"ball" | "hop" | false>(false);
  const d: LiveDescent = { ...state, ...draft };
  const p = descentPuzzle(d);
  const fn = useMemo(() => (p ? DESCENT_FNS[p.fn] : freeFn(d.expr)), [p, d.expr]);
  const k = run ? run.at : d.steps;
  const momentum = p ? !!p.momentum : true;
  const draggable = p ? !!p.drag : true;

  const verdictAt = (s: LiveDescent, n: number): DescentVerdict => {
    if (p) return judge(p, s.start, s.eta, s.beta, n);
    if (!fn) return { state: "going" };
    const { xs, away } = descentPath(fn.df, s.start, s.eta, s.beta, n);
    if (away) return { state: "lost", why: "blowUp", x: xs[xs.length - 1], target: 0 };
    return { state: "going" };
  };

  // A fresh try: what changed, from the start again.
  const fresh = (change: Partial<LiveDescent>): Partial<LiveDescent> => ({ ...change, steps: 0, done: false, said: null });
  const commit = (change: Partial<LiveDescent> = {}) => {
    setDraft(null);
    set({ ...d, ...change });
  };
  // The shell's moves (a puzzle picked, free play, a try judged) stop a run being played.
  const game = useGame({
    key: "zeno.descentlab.v1",
    size: DESCENT_LADDER.length,
    notices: DESCENT_NOTICES,
    modes: ["puzzle", "free"],
    state: d,
    set: (s) => (setRun(null), commit(s)),
    fresh: FRESH,
    stagePatch,
    freePatch: FREE_PATCH,
  });

  const finish = (n: number) => {
    const v = verdictAt(d, n);
    if (v.state === "going") return commit({ steps: n });
    const notice = descentNotice(p, v);
    if (v.state === "won") return game.win({ stars: p ? descentStars(d.tries) : undefined, notice: () => notice, patch: { steps: n, done: true } });
    game.miss({ steps: n, tries: d.tries + (p ? 1 : 0), said: { kind: "wrong", why: v.why, notice: notice ?? undefined } }, { notice: () => notice });
  };

  // Run: the steps one after another, faster when there are many, until the try is judged.
  const latest = useRef(finish);
  latest.current = finish;
  useEffect(() => {
    if (!run) return;
    if (run.at >= run.to) {
      setRun(null);
      latest.current(run.to);
      return;
    }
    const id = setTimeout(() => setRun({ ...run, at: run.at + 1 }), Math.max(25, Math.min(160, 1600 / (run.to - d.steps || 1))));
    return () => clearTimeout(id);
  }, [run, d.steps]);

  if (!fn) {
    return (
      <>
        <GameHead game={game} g={g} />
        <FnField value={typed ?? d.expr} bad onType={setTyped} onDone={(expr) => (setTyped(null), commit(fresh({ expr })))} label={w.fn} />
        <Said line={{ tone: "wrong", text: w.badFn }} />
      </>
    );
  }

  const { xs, away } = descentPath(fn.df, d.start, d.eta, d.beta, k);
  const after = descentPath(fn.df, d.start, d.eta, d.beta, k + 1);
  const next = after.away || after.xs.length < k + 2 ? null : after.xs[k + 1];
  const x = xs[xs.length - 1];
  const verdict = run ? ({ state: "going" } as DescentVerdict) : verdictAt(d, k);
  const budget = p ? budgetOf(p.goal) : FREE_STEPS;
  const canStep = !run && !d.done && verdict.state === "going" && k < budget;

  const runTo = () => {
    if (p) {
      let n = k + 1;
      while (n < budget && verdictAt(d, n).state === "going") n++;
      setRun({ at: k, to: n });
    } else {
      let n = k + 1;
      const end = Math.min(budget, k + FREE_RUN);
      while (n < end && !descentPath(fn.df, d.start, d.eta, d.beta, n).away) n++;
      setRun({ at: k, to: n });
    }
  };

  // Dragging the ball picks where it starts.
  const scale = plotScale(fn);
  const ballAt = (at = x): [number, number] => {
    const cx = Math.min(scale.x1, Math.max(scale.x0, at));
    return [scale.X(cx), Math.min(PLOT.h - PLOT.bottom, Math.max(PLOT.top, scale.Y(fn.f(cx))))];
  };
  const startAt = (e: PointerEvent<SVGSVGElement>) => {
    const [px] = svgPoint(e.currentTarget, e);
    const v = Math.min(scale.x1, Math.max(scale.x0, scale.toX(px)));
    return Math.round(v * 100) / 100;
  };
  // Dragging the dashed hop's landing picks the rate: the stop whose first step from the start lands nearest.
  const hopFree = !p?.fixedEta && k === 0 && !run && !d.done && next !== null;
  const etaFor = (e: PointerEvent<SVGSVGElement>) => {
    const want = scale.toX(svgPoint(e.currentTarget, e)[0]);
    let [best, bd] = [ei, Infinity];
    ETAS.forEach((eta, i) => {
      const n = descentPath(fn.df, d.start, eta, d.beta, 1);
      const dd = n.away ? Infinity : Math.abs(n.xs[1] - want);
      if (dd < bd) [best, bd] = [i, dd];
    });
    return ETAS[best];
  };
  const down = (e: PointerEvent<SVGSVGElement>) => {
    if (run) return;
    const [px, py] = svgPoint(e.currentTarget, e);
    if (py > PLOT.h) return;
    if (hopFree) {
      const [hx, hy] = ballAt(next!);
      if (Math.hypot(px - hx, py - hy) <= 18) {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging("hop");
        return;
      }
    }
    if (!draggable) return;
    const [bx, by] = ballAt();
    if (Math.hypot(px - bx, py - by) > 24 && k > 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging("ball");
    setDraft(fresh({ start: startAt(e) }));
  };
  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (dragging === "ball") setDraft(fresh({ start: startAt(e) }));
    else if (dragging === "hop") setDraft(fresh({ eta: etaFor(e) }));
  };
  const up = () => {
    if (!dragging) return;
    setDragging(false);
    play("snap");
    commit();
  };

  const setEta = (i: number, done: boolean) => {
    const change = fresh({ eta: ETAS[Math.max(0, Math.min(ETAS.length - 1, i))] });
    if (done) commit(change);
    else setDraft({ ...draft, ...change });
  };
  const setBeta = (i: number, done: boolean) => {
    const change = fresh({ beta: BETAS[i] });
    if (done) commit(change);
    else setDraft({ ...draft, ...change });
  };

  const ei = etaIndex(d.eta);
  const step = xs.length > 1 ? x - xs[xs.length - 2] : 0;
  const ask = p ? fill(w.asks[`p${d.stage + 1}` as keyof typeof w.asks], { max: budget }) : w.freeAsk;
  const why = d.said?.kind === "wrong" ? d.said : null;
  const lostAt = verdict.state === "lost" ? verdict : null;
  const stars = descentStars(d.tries);
  const line: Line =
    d.done ? { tone: d.said?.kind === "notice" ? "notice" : "ok", text: `${d.said?.kind === "notice" ? `${w.notices[d.said.key]} ` : ""}${fill(w.right, { k, stars: starText(stars) })}${p && stars === 1 ? ` ${g.oneStar}` : ""}` }
    : why ? { tone: "wrong", text: `${fill(p ? w.why[why.why] : w.flewOff, { x: num(lostAt?.x ?? x), t: num(lostAt?.target ?? 0) })}${why.notice ? ` ${w.notices[why.notice]}` : ""}` }
    : { tone: "hint", text: draggable && k === 0 ? w.dragHint : w.hint };
  const nextText = next === null ? "" : momentum && d.beta > 0 ? fill(w.nextMomentum, { s: num(next - x) }) : fill(w.next, { eta: num(d.eta), d: num(fn.df(x)), s: num(next - x) });

  return (
    <>
      <GameHead game={game} g={g} />
      <Said line={{ tone: "prompt", text: ask }} />
      {!p && <FnField value={typed ?? d.expr} onType={setTyped} onDone={(expr) => (setTyped(null), commit(fresh({ expr })))} label={w.fn} />}
      <Stage game={game} stars={stars} done={d.done && !!p} g={g} notices={w.notices}>
        <svg
          ref={svgRef}
          className="hand-pic"
          width={PLOT.w}
          height={PLOT.h + STRIP}
          viewBox={`0 0 ${PLOT.w} ${PLOT.h + STRIP}`}
          fontFamily={FONT}
          aria-label={`f(x) = ${fn.text}`}
          style={{ cursor: dragging ? "grabbing" : draggable ? "grab" : "default", touchAction: "none" }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        >
          <rect width={PLOT.w} height={PLOT.h + STRIP} fill="#fff" />
          <text x={PLOT.left} y={18} fontSize={14} fontWeight={700} fill="#1971c2">f(x) = {fn.text}</text>
          <g dangerouslySetInnerHTML={{ __html: descentSvg(fn, xs, { next: run || d.done || verdict.state === "lost" ? null : next, targets: p?.targets, away, drag: draggable && k === 0 && !run }) }} />
          {hopFree && (() => {
            const [hx, hy] = ballAt(next!);
            return (
              <g pointerEvents="none">
                <circle cx={hx} cy={hy} r={dragging === "hop" ? 12 : 9} fill="#9c36b5" opacity={0.15} />
                <text x={hx} y={hy - 14} fontSize={12} fontWeight={700} textAnchor="middle" fill="#9c36b5">↔ η</text>
              </g>
            );
          })()}
          <Track x={8} y={PLOT.h + 6} w={momentum ? 300 : PLOT.w - 16} value={ei} min={0} max={ETAS.length - 1} label={w.eta} show={(i) => `η = ${num(ETAS[i])}`}
            disabled={!!p?.fixedEta || !!run} onChange={(i, done) => setEta(i, done)} />
          {momentum && (
            <Track x={316} y={PLOT.h + 6} w={PLOT.w - 324} value={Math.round(d.beta * 20)} min={0} max={BETAS.length - 1} label={w.momentum} show={(i) => `β = ${num(BETAS[i])}`}
              disabled={!!run} color="#e8590c" onChange={(i, done) => setBeta(i, done)} />
          )}
          {(() => {
            const items = [
              { text: w.step, disabled: !canStep, onTap: () => finish(k + 1) },
              { text: `▶ ${w.run}`, title: w.run, strong: true, disabled: !canStep, onTap: runTo },
              { text: `↺ ${g.reset}`, title: g.reset, disabled: !!run || k === 0, onTap: () => commit(fresh({})) },
            ];
            const pw = (t: string) => 34 + [...t].length * 8.4;
            let px = (PLOT.w - items.reduce((a, it) => a + pw(it.text) + 10, -10)) / 2;
            return items.map((it) => {
              const x0 = px;
              px += pw(it.text) + 10;
              return <Pill key={it.text} x={x0} y={PLOT.h + 52} w={pw(it.text)} text={it.text} title={it.title} strong={it.strong} disabled={it.disabled} onTap={it.onTap} />;
            });
          })()}
        </svg>
      </Stage>
      <div className="descent-read">
        <span className="descent-rule">{momentum ? w.ruleMomentum : w.rule}</span>
        <span>
          {p ? fill(w.count, { k, max: budget }) : fill(w.countFree, { k })} · x = {num(x)} · f′(x) = {num(fn.df(x))}
          {k > 0 && ` · ${fill(w.last, { s: num(step) })}`}
        </span>
        {nextText && !d.done && verdict.state === "going" && <span className="descent-next">{nextText}</span>}
      </div>
      <GameActions game={game} g={g} done={d.done && !!p} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}

/** Free play's function, read when it is let go (Enter, or leaving the box). */
function FnField({ value, bad, onType, onDone, label }: { value: string; bad?: boolean; onType: (s: string) => void; onDone: (s: string) => void; label: string }) {
  return (
    <label className="live-field">
      {label}
      <input
        className={`descent-fn${bad ? " invalid" : ""}`}
        value={value}
        spellCheck={false}
        onChange={(e) => onType(e.target.value)}
        onBlur={(e) => onDone(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      />
    </label>
  );
}
