// Connect the towns: roads that could be built, each with its cost; tap roads to build them (tap again to take one
// away) until every town is joined, as cheaply as can be, and check. A town left out, a loop (its roads turn red: one
// of them can go), or a network dearer than it need be is told so. Right at the first check earns three stars, at the
// second two. Nine puzzles open in turn (six, nine and twelve towns), and the endless run keeps a streak right at the
// first check.
import { useState } from "react";
import { TOWN_LADDER, TOWN_NOTICES, townNotice, townNow, townProblem, townStars, townSvg, type LiveTowns, type TownLevel } from "../math/connectTowns";
import { edgeName } from "../math/graphPlay";
import { withBest, withFound, withStars } from "../math/ladder";
import { play } from "./juice";
import { Cheer, Found, GameNav, newSeed, nextStage, Onward, SoundToggle, starText, useLadder } from "./ladderUi";
import { fill, FONT, type PieceProps } from "./ui";

export function ConnectTowns({ state: d, set, w: words, svgRef }: PieceProps<"connectTowns">) {
  const [w, g] = [words.connectTowns, words.game];
  const [ladder, keep] = useLadder("zeno.connecttowns.v1", TOWN_LADDER.length, TOWN_NOTICES);
  const [cheer, setCheer] = useState(0);
  const task = townNow(d);
  const total = d.chosen.reduce((s, e) => s + task.g.w[e], 0);

  const tap = (e: number) => {
    if (d.done) return;
    play("snap");
    set({ ...d, chosen: d.chosen.includes(e) ? d.chosen.filter((x) => x !== e) : [...d.chosen, e], said: null });
  };
  const check = () => {
    const problem = townProblem(task, d.chosen);
    if (problem) {
      play("miss");
      return set({ ...d, misses: d.misses + 1, streak: 0, said: problem });
    }
    const stars = townStars(d.misses);
    const streak = d.mode === "endless" && d.misses === 0 ? d.streak + 1 : d.mode === "endless" ? 0 : d.streak;
    const key = townNotice(task, d.misses, streak);
    let next = withBest(ladder, d.mode === "endless" ? streak : 0);
    if (d.mode === "puzzle") next = withStars(next, d.stage, stars);
    if (key && !next.found.includes(key)) next = withFound(next, key, TOWN_NOTICES);
    if (next !== ladder) keep(next);
    play("good");
    setTimeout(() => play("star"), 260);
    setCheer((c) => c + 1);
    set({ ...d, done: true, streak, said: key ? { kind: "notice", key } : null });
  };
  const fresh: Pick<LiveTowns, "chosen" | "misses" | "done" | "said"> = { chosen: [], misses: 0, done: false, said: null };
  const go = (stage: number) => set({ ...d, ...fresh, mode: "puzzle", stage });
  const endless = (l: TownLevel) => set({ ...d, ...fresh, mode: "endless", level: l, seed: newSeed() });
  const onward = () => (d.mode === "endless" ? endless(d.level) : go(nextStage(d.stage, TOWN_LADDER.length)));

  const pic = townSvg(task.g, d.chosen, { loop: d.said?.kind === "loop" ? d.said.edges : [], done: d.done });
  const stars = townStars(d.misses);
  const right = fill(w.right, { v: task.best.total, stars: starText(stars) });
  const said =
    d.said?.kind === "notice" ? `${w.notices[d.said.key]} ${right}`
    : d.done ? right
    : d.said?.kind === "apart" ? w.apart
    : d.said?.kind === "loop" ? w.loop
    : d.said?.kind === "dearer" ? fill(w.dearer, { d: d.said.by })
    : d.chosen.length ? fill(w.total, { n: d.chosen.length, v: total })
    : w.hint;
  return (
    <>
      <GameNav ladder={ladder} mode={d.mode} stage={d.stage} level={d.level} streak={d.streak} onPuzzle={go} onEndless={endless} words={w} g={g} />
      <p className="live-said geo-prompt">{w.ask}</p>
      <div className="geo-stage-wrap">
        <svg ref={svgRef} width={pic.w} height={pic.h} viewBox={`0 0 ${pic.w} ${pic.h}`} fontFamily={FONT} role="group" aria-label={w.hint}>
          <rect width={pic.w} height={pic.h} fill="#fff" />
          {task.g.edges.map(([a, b], e) => (
            <line
              key={e}
              x1={task.g.pts[a][0]}
              y1={task.g.pts[a][1]}
              x2={task.g.pts[b][0]}
              y2={task.g.pts[b][1]}
              stroke="transparent"
              strokeWidth={22}
              role="button"
              aria-label={edgeName(task.g, e)}
              aria-pressed={d.chosen.includes(e)}
              style={{ cursor: d.done ? "default" : "pointer" }}
              onClick={() => tap(e)}
            />
          ))}
          <g dangerouslySetInnerHTML={{ __html: pic.body }} style={{ pointerEvents: "none" }} />
        </svg>
        {cheer > 0 && d.done && <Cheer key={cheer} text={starText(stars)} />}
      </div>
      <div className="live-bar">
        {d.done ? (
          <Onward mode={d.mode} stage={d.stage} size={TOWN_LADDER.length} onClick={onward} g={g} />
        ) : (
          <>
            <button className="live-btn on" disabled={!d.chosen.length} onClick={check}>{g.check}</button>
            <button className="live-btn" disabled={!d.chosen.length} onClick={() => set({ ...d, chosen: [], said: null })}>{g.clear}</button>
          </>
        )}
        <SoundToggle title={g.sound} />
      </div>
      <p className={d.said?.kind === "notice" ? "live-said notice" : d.done ? "live-said ok" : d.said ? "live-said" : "live-hint"}>
        {said} <Found ladder={ladder} of={TOWN_NOTICES.length} notices={w.notices} g={g} />
      </p>
    </>
  );
}
