// Shortest route: places joined by roads of different lengths, and the shortest way from the green place to the orange
// one. Tap the places of a route in turn from the start (tap the last one again to take it back); the roads on it turn
// blue and their lengths add up beneath. Check at the end: a longer route is told by how much, and the route with the
// fewest roads is told that fewest isn't shortest. Right at the first check earns three stars, at the second two.
// Nine puzzles open in turn, and the endless run keeps a streak right at the first check.
import { useState } from "react";
import { DOT_R, edgeOf, name, routeLength } from "../math/graphPlay";
import { withBest, withFound, withStars } from "../math/ladder";
import { fewestRoads, PATH_LADDER, PATH_NOTICES, pathNotice, pathNow, pathStars, pathSvg, type LivePath, type PathLevel } from "../math/shortestPath";
import { play } from "./juice";
import { Cheer, Found, GameNav, newSeed, nextStage, Onward, SoundToggle, starText, useLadder } from "./ladderUi";
import { fill, FONT, type PieceProps } from "./ui";

export function ShortestPath({ state: d, set, w: words, svgRef }: PieceProps<"shortestPath">) {
  const [w, g] = [words.shortestPath, words.game];
  const [ladder, keep] = useLadder("zeno.shortestpath.v1", PATH_LADDER.length, PATH_NOTICES);
  const [cheer, setCheer] = useState(0);
  const task = pathNow(d);
  const route = [task.a, ...d.route];
  const last = route[route.length - 1];
  const arrived = last === task.b;
  const len = routeLength(task.g, route) ?? 0;

  const tap = (v: number) => {
    if (d.done) return;
    if (v === last && d.route.length) return set({ ...d, route: d.route.slice(0, -1), said: null });
    if (arrived || route.includes(v) || edgeOf(task.g, last, v) < 0) return;
    play("snap");
    set({ ...d, route: [...d.route, v], said: null });
  };
  const check = () => {
    if (len !== task.best) {
      play("miss");
      const few = fewestRoads(task.g, task.a, task.b);
      return set({ ...d, misses: d.misses + 1, streak: 0, said: { kind: "longer", len, fewest: route.length - 1 === few.roads } });
    }
    const stars = pathStars(d.misses);
    const streak = d.mode === "endless" && d.misses === 0 ? d.streak + 1 : d.mode === "endless" ? 0 : d.streak;
    const key = pathNotice(task, route, d.misses, streak);
    let next = withBest(ladder, d.mode === "endless" ? streak : 0);
    if (d.mode === "puzzle") next = withStars(next, d.stage, stars);
    if (key && !next.found.includes(key)) next = withFound(next, key, PATH_NOTICES);
    if (next !== ladder) keep(next);
    play("good");
    setTimeout(() => play("star"), 260);
    setCheer((c) => c + 1);
    set({ ...d, done: true, streak, said: key ? { kind: "notice", key } : null });
  };
  const fresh: Pick<LivePath, "route" | "misses" | "done" | "said"> = { route: [], misses: 0, done: false, said: null };
  const go = (stage: number) => set({ ...d, ...fresh, mode: "puzzle", stage });
  const endless = (l: PathLevel) => set({ ...d, ...fresh, mode: "endless", level: l, seed: newSeed() });
  const onward = () => (d.mode === "endless" ? endless(d.level) : go(nextStage(d.stage, PATH_LADDER.length)));

  const pic = pathSvg(task, route, { done: d.done });
  const stars = pathStars(d.misses);
  const right = fill(w.right, { v: task.best, stars: starText(stars) });
  const lens = route.slice(1).map((v, i) => task.g.w[edgeOf(task.g, route[i], v)]);
  const sum = lens.length ? `${route.map(name).join("→")}: ${lens.join(" + ")} = ${len}` : "";
  const said =
    d.said?.kind === "notice" ? `${w.notices[d.said.key]} ${right}`
    : d.done ? right
    : d.said?.kind === "longer" ? fill(d.said.fewest ? w.fewest : w.longer, { v: d.said.len, d: d.said.len - task.best })
    : arrived ? w.arrived
    : w.hint;
  return (
    <>
      <GameNav ladder={ladder} mode={d.mode} stage={d.stage} level={d.level} streak={d.streak} onPuzzle={go} onEndless={endless} words={w} g={g} />
      <p className="live-said geo-prompt">{fill(w.ask, { a: name(task.a), b: name(task.b) })}</p>
      <div className="geo-stage-wrap">
        <svg ref={svgRef} width={pic.w} height={pic.h} viewBox={`0 0 ${pic.w} ${pic.h}`} fontFamily={FONT} role="group" aria-label={w.hint}>
          <rect width={pic.w} height={pic.h} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: pic.body }} />
          {task.g.pts.map(([x, y], v) => (
            <circle key={v} cx={x} cy={y} r={DOT_R + 8} fill="transparent" role="button" aria-label={name(v)} style={{ cursor: d.done ? "default" : "pointer" }} onClick={() => tap(v)} />
          ))}
        </svg>
        {cheer > 0 && d.done && <Cheer key={cheer} text={starText(stars)} />}
      </div>
      <p className="live-said info route-sum" aria-live="polite">{sum || " "}</p>
      <div className="live-bar">
        {d.done ? (
          <Onward mode={d.mode} stage={d.stage} size={PATH_LADDER.length} onClick={onward} g={g} />
        ) : (
          <>
            <button className="live-btn on" disabled={!arrived} onClick={check}>{g.check}</button>
            <button className="live-btn" disabled={!d.route.length} onClick={() => set({ ...d, route: [], said: null })}>{g.clear}</button>
          </>
        )}
        <SoundToggle title={g.sound} />
      </div>
      <p className={d.said?.kind === "notice" ? "live-said notice" : d.done ? "live-said ok" : d.said ? "live-said" : "live-hint"}>
        {said} <Found ladder={ladder} of={PATH_NOTICES.length} notices={w.notices} g={g} />
      </p>
    </>
  );
}
