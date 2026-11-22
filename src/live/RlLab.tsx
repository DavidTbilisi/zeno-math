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
import { fill, FONT, type PieceProps } from "./ui";
import { PillRows, pillRowsH, Track, type RowItem } from "./hand";
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
  const clean = { sweeps: 0, Q: null, episodes: 0 };
  const moves: RowItem[] = [
    ...(p ? [{ text: `✓ ${g.check}`, title: g.check, strong: true, disabled: d.done, onTap: check }] : []),
    ...(can.includes("step") ? [{ text: w.step, disabled: d.done, onTap: nextDay }] : []),
    ...(can.includes("start") ? states.map((s, i) => ({ text: fill(w.start, { s }), on: d.chainSteps === 0 && d.pi[i] === 1, disabled: d.done, onTap: () => commit(fresh({ pi: one(i), chainSteps: 0, history: [one(i)] })) })) : []),
    ...(can.includes("sweep") ? [{ text: w.sweep, disabled: d.done, onTap: () => commit(fresh({ sweeps: d.sweeps + 1 })) }] : []),
    ...(can.includes("episodes") ? [{ text: fill(w.run, { n: EPISODES }), disabled: d.done, onTap: runEpisodes }] : []),
    ...(can.includes("sweep") || can.includes("episodes") ? [{ text: w.reset, disabled: d.done, onTap: () => commit(fresh(clean)) }] : []),
    ...(!p ? VIEWS.map((v, i) => ({ text: w.views[v], brk: i === 0, on: d.view === v, onTap: () => commit({ view: v }) })) : []),
    ...(!p && view !== "chain" ? (Object.keys(WORLDS) as WorldId[]).map((id, i) => ({ text: w.worlds[id], brk: i === 0, on: d.world === id, onTap: () => commit({ world: id, ...clean }) })) : []),
  ];
  const dials = [...(can.includes("gamma") ? ["gamma" as const] : []), ...(can.includes("eps") ? ["eps" as const] : [])];
  const DW = (RL_PLOT.w - 16 - (dials.length - 1) * 8) / Math.max(1, dials.length);
  const dialH = dials.length ? 44 : 0;
  const strip = dialH + pillRowsH(moves, RL_PLOT.w) + 8;

  return (
    <>
      <GameHead game={game} g={g} />
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done && !!p} g={g} notices={w.notices}>
        <svg ref={svgRef} className="hand-pic" width={RL_PLOT.w} height={RL_PLOT.h + strip} viewBox={`0 0 ${RL_PLOT.w} ${RL_PLOT.h + strip}`} fontFamily={FONT} aria-label={w.picture}>
          <rect width={RL_PLOT.w} height={RL_PLOT.h + strip} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: rlSvg(d, w.chart) }} />
          {dials.map((k, i) => {
            const [name, list, value, key, label] = k === "gamma" ? (["γ", GAMMAS, d.gamma, "gamma", w.gamma] as const) : (["ε", EPSILONS, d.eps, "eps", w.eps] as const);
            return (
              <Track key={k} x={8 + i * (DW + 8)} y={RL_PLOT.h + 4} w={DW} value={Math.max(0, list.indexOf(value))} min={0} max={list.length - 1} label={label} disabled={d.done} color={i ? "#e8590c" : undefined}
                show={(v) => `${name} = ${list[v]}`} onChange={(v, done) => (done ? commit(fresh({ [key]: list[v] })) : setDraft(fresh({ [key]: list[v] })))} />
            );
          })}
          <PillRows w={RL_PLOT.w} y={RL_PLOT.h + dialH} items={moves} />
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
