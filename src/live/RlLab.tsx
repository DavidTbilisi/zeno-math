// The reinforcement-learning lab: a weather Markov chain stepped day by day until its shares settle, then a grid world
// solved by sweeps of value iteration, with the discount γ, and learned by Q-learning episodes with exploration ε.
// Four puzzles open in turn, each won with a Check, stars for doing one at the first try; free play takes every view
// and both grids. What is mid-way (a slider being moved) stays here until it is let go, so each change is one step to
// undo. Built on the game shell (useGame).
import { useState } from "react";
import {
  CHAIN,
  controlsOf,
  emptyQ,
  EPISODES,
  EPSILONS,
  GAMMAS,
  judgeRl,
  num,
  qEpisodes,
  RL_LADDER,
  RL_NOTICES,
  RL_PLOT,
  rlPuzzle,
  rlStars,
  rlSvg,
  stepChain,
  viewOf,
  walkOf,
  worldOf,
  WORLDS,
  type LiveRl,
  type RlView,
  type WorldId,
} from "../math/rlLab";
import { play } from "./juice";
import { starText } from "./ladderUi";
import { fill, FONT, Toggle, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const FRESH: Partial<LiveRl> = { tries: 0, done: false, said: null };
const stagePatch = (stage: number): Partial<LiveRl> => RL_LADDER[stage].start;
const FREE_PATCH: Partial<LiveRl> = { pi: [1, 0, 0], chainSteps: 0, history: [[1, 0, 0]], sweeps: 0, gamma: 0.9, Q: null, episodes: 0, eps: 0.2, view: "values", world: "maze" };
const VIEWS: RlView[] = ["chain", "values", "q"];
const one = (i: number) => CHAIN.map((_, j) => (i === j ? 1 : 0));

export function RlLab({ state, set, w: words, svgRef }: PieceProps<"rlLab">) {
  const [w, g] = [words.rlLab, words.game];
  const [draft, setDraft] = useState<Partial<LiveRl> | null>(null);
  const d: LiveRl = { ...state, ...draft };
  const p = rlPuzzle(d);
  const can = controlsOf(d);
  const view = viewOf(d);
  const states = w.chart.states;

  const fresh = (change: Partial<LiveRl>): Partial<LiveRl> => ({ ...change, done: false, said: null });
  const commit = (change: Partial<LiveRl> = {}) => {
    setDraft(null);
    set({ ...d, ...change });
  };
  const game = useGame({ key: "zeno.rllab.v1", size: RL_LADDER.length, notices: RL_NOTICES, modes: ["puzzle", "free"], state: d, set: commit, fresh: FRESH, stagePatch, freePatch: FREE_PATCH });

  const check = () => {
    if (!p) return;
    const v = judgeRl(d, p.goal);
    if (v.state === "won") return game.win({ stars: rlStars(d.tries), notice: () => p.notice, patch: { done: true } });
    game.miss({ tries: d.tries + 1, said: { kind: "wrong", why: v.why } });
  };

  const nextDay = () => {
    const pi = stepChain(d.pi);
    play("snap");
    commit(fresh({ pi, chainSteps: d.chainSteps + 1, history: [...d.history, pi] }));
  };
  const runEpisodes = () => {
    play("snap");
    commit(fresh({ Q: qEpisodes(worldOf(d), d.Q ?? emptyQ(worldOf(d)), d.eps, EPISODES, d.episodes / EPISODES + 1), episodes: d.episodes + EPISODES }));
  };

  const ask = p ? w.asks[`p${d.stage + 1}` as keyof typeof w.asks] : w.freeAsk;
  const verdict = p && d.said?.kind === "wrong" ? judgeRl(d, p.goal) : null;
  const wrong = verdict?.state === "lost" ? verdict : null;
  const stars = rlStars(d.tries);
  const notice = d.said?.kind === "notice" ? w.notices[d.said.key] : null;
  const line: Line =
    d.done ? { tone: notice ? "notice" : "ok", text: `${notice ? `${notice} ` : ""}${fill(w.right, { stars: starText(stars) })}${stars === 1 ? ` ${g.oneStar}` : ""}` }
    : wrong ? { tone: "wrong", text: fill(w.why[wrong.why], { have: wrong.why === "wrongEnd" ? (wrong.have > 0 ? `+${wrong.have}` : `−${-wrong.have}`) : num(wrong.have), want: wrong.why === "wrongEnd" ? `+${wrong.want}` : num(wrong.want) }) }
    : { tone: "hint", text: p ? w.hint : w.freeHint };
  const end = walkOf(d).reward;
  const read = view === "chain" ? fill(w.read, { state: states[0], share: num(d.pi[0]), n: d.chainSteps }) : fill(w.readWalk, { end: end ? (end > 0 ? `+${end}` : `−${-end}`) : w.nowhere });
  const slider = (name: string, list: number[], value: number, on: (v: number) => void, label: string) => (
    <label className="live-slider">
      <b>{name} = {value}</b>
      <input type="range" min={0} max={list.length - 1} value={Math.max(0, list.indexOf(value))} disabled={d.done} aria-label={label} onChange={(e) => on(list[Number(e.target.value)])} onPointerUp={() => commit()} onKeyUp={() => commit()} />
    </label>
  );

  return (
    <>
      <GameHead game={game} g={g} />
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done && !!p} g={g} notices={w.notices}>
        <svg ref={svgRef} width={RL_PLOT.w} height={RL_PLOT.h} viewBox={`0 0 ${RL_PLOT.w} ${RL_PLOT.h}`} fontFamily={FONT} role="img" aria-label={w.picture}>
          <rect width={RL_PLOT.w} height={RL_PLOT.h} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: rlSvg(d, w.chart) }} />
        </svg>
      </Stage>
      <div className="descent-read">
        <span>{read}</span>
      </div>
      {(can.includes("gamma") || can.includes("eps")) && (
        <div className="live-bar descent-dials">
          {can.includes("gamma") && slider("γ", GAMMAS, d.gamma, (v) => setDraft(fresh({ gamma: v })), w.gamma)}
          {can.includes("eps") && slider("ε", EPSILONS, d.eps, (v) => setDraft(fresh({ eps: v })), w.eps)}
        </div>
      )}
      <GameActions game={game} g={g} done={d.done && !!p} always>
        {p && <button className="live-btn on" disabled={d.done} onClick={check}>✓ {g.check}</button>}
        {can.includes("step") && <button className="live-btn" disabled={d.done} onClick={nextDay}>{w.step}</button>}
        {can.includes("start") && states.map((s, i) => <Toggle key={s} on={d.chainSteps === 0 && d.pi[i] === 1} disabled={d.done} onClick={() => commit(fresh({ pi: one(i), chainSteps: 0, history: [one(i)] }))}>{fill(w.start, { s })}</Toggle>)}
        {can.includes("sweep") && <button className="live-btn" disabled={d.done} onClick={() => commit(fresh({ sweeps: d.sweeps + 1 }))}>{w.sweep}</button>}
        {can.includes("episodes") && <button className="live-btn" disabled={d.done} onClick={runEpisodes}>{fill(w.run, { n: EPISODES })}</button>}
        {(can.includes("sweep") || can.includes("episodes")) && <button className="live-btn" disabled={d.done} onClick={() => commit(fresh({ sweeps: 0, Q: null, episodes: 0 }))}>{w.reset}</button>}
        {!p && VIEWS.map((v) => <Toggle key={v} on={d.view === v} onClick={() => commit({ view: v })}>{w.views[v]}</Toggle>)}
        {!p && view !== "chain" && (Object.keys(WORLDS) as WorldId[]).map((id) => <Toggle key={id} on={d.world === id} onClick={() => commit({ world: id, sweeps: 0, Q: null, episodes: 0 })}>{w.worlds[id]}</Toggle>)}
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
