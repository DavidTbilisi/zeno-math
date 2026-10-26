// Shortest route: places joined by roads of different lengths, and the shortest way from the green place to the orange
// one. Tap the places of a route in turn from the start (tap the last one again to take it back); the roads on it turn
// blue and their lengths add up beneath. Check at the end: a longer route is told by how much, and the route with the
// fewest roads is told that fewest isn't shortest. Right at the first check earns three stars, at the second two.
// Nine puzzles open in turn, and the endless run keeps a streak right at the first check. Built on the game shell
// (useGame), which does the ladder, the sounds and the cheer.
import { DOT_R, edgeOf, name, routeLength } from "../math/graphPlay";
import { fewestRoads, PATH_LADDER, PATH_NOTICES, pathNotice, pathNow, pathStars, pathSvg, type LivePath } from "../math/shortestPath";
import { starText } from "./ladderUi";
import { fill, FONT, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";

const FRESH: Partial<LivePath> = { route: [], misses: 0, done: false, said: null };

export function ShortestPath({ state: d, set, w: words, svgRef }: PieceProps<"shortestPath">) {
  const [w, g] = [words.shortestPath, words.game];
  const game = useGame({ key: "zeno.shortestpath.v1", size: PATH_LADDER.length, notices: PATH_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const task = pathNow(d);
  const route = [task.a, ...d.route];
  const last = route[route.length - 1];
  const arrived = last === task.b;
  const len = routeLength(task.g, route) ?? 0;
  const stars = pathStars(d.misses);

  const tap = (v: number) => {
    if (d.done) return;
    if (v === last && d.route.length) return set({ ...d, route: d.route.slice(0, -1), said: null });
    if (arrived || route.includes(v) || edgeOf(task.g, last, v) < 0) return;
    game.tap({ route: [...d.route, v], said: null });
  };
  const check = () => {
    if (len !== task.best) {
      const few = fewestRoads(task.g, task.a, task.b);
      return game.miss({ misses: d.misses + 1, said: { kind: "longer", len, fewest: route.length - 1 === few.roads } });
    }
    game.win({ stars, clean: d.misses === 0, notice: (streak) => pathNotice(task, route, d.misses, streak), patch: { done: true } });
  };

  const pic = pathSvg(task, route, { done: d.done });
  const right = `${fill(w.right, { v: task.best, stars: starText(stars) })}${d.mode === "puzzle" && stars === 1 ? ` ${g.oneStar}` : ""}`;
  const lens = route.slice(1).map((v, i) => task.g.w[edgeOf(task.g, route[i], v)]);
  const sum = lens.length ? `${route.map(name).join("→")}: ${lens.join(" + ")} = ${len}` : "";
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]} ${right}` }
    : d.done ? { tone: "ok", text: right }
    : d.said?.kind === "longer" ? { tone: "wrong", text: fill(d.said.fewest ? w.fewest : w.longer, { v: d.said.len, d: d.said.len - task.best }) }
    : { tone: "hint", text: arrived ? w.arrived : w.hint };
  return (
    <>
      <GameHead game={game} g={g}>
        <Stake stars={stars} tries={d.misses} g={g} />
      </GameHead>
      <Said line={{ tone: "prompt", text: fill(w.ask, { a: name(task.a), b: name(task.b) }) }} />
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg ref={svgRef} width={pic.w} height={pic.h} viewBox={`0 0 ${pic.w} ${pic.h}`} fontFamily={FONT} role="group" aria-label={w.hint}>
          <rect width={pic.w} height={pic.h} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: pic.body }} />
          {task.g.pts.map(([x, y], v) => (
            <circle key={v} cx={x} cy={y} r={DOT_R + 8} fill="transparent" role="button" aria-label={name(v)} style={{ cursor: d.done ? "default" : "pointer" }} onClick={() => tap(v)} />
          ))}
        </svg>
      </Stage>
      <p className="live-said info route-sum" aria-live="polite">{sum || " "}</p>
      <GameActions game={game} g={g} done={d.done}>
        <button className="live-btn on" disabled={!arrived} onClick={check}>{g.check}</button>
        <button className="live-btn" disabled={!d.route.length} onClick={() => set({ ...d, route: [], said: null })}>{g.clear}</button>
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
