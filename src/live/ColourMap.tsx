// Colour the graph: pick a colour, tap the vertices to give it to them (tap again to take it off), and check once
// every vertex has one; edges whose two ends match turn red. Easy and medium give the number of colours (two, then
// three); hard asks for the fewest, and a right colouring with more is told it can be done with fewer. Right at the
// first check earns three stars, at the second two. Nine puzzles open in turn, and the endless run keeps a streak
// right at the first check. Built on the game shell (useGame), which does the ladder, the sounds and the cheer.
import { COLOUR_LADDER, COLOUR_NOTICES, colourNotice, colourNow, colourStars, colourSvg, coloursUsed, type LiveColour } from "../math/colouring";
import { clashes, DOT_R, name, PALETTE } from "../math/graphPlay";
import { starText } from "./ladderUi";
import { fill, FONT, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";

const FRESH: Partial<LiveColour> = { colours: [], pen: 0, misses: 0, done: false, said: null };

export function ColourMap({ state: d, set, w: words, svgRef }: PieceProps<"colourMap">) {
  const [w, g] = [words.colourMap, words.game];
  const game = useGame({ key: "zeno.colourmap.v1", size: COLOUR_LADDER.length, notices: COLOUR_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const task = colourNow(d);
  const graph = task.g;
  const col = graph.pts.map((_, v) => d.colours[v] ?? -1);
  const pens = task.level === 3 ? 4 : task.k;
  const checked = d.said?.kind === "clash";
  const clash = checked ? clashes(graph, col) : [];
  const stars = colourStars(d.misses);

  const tap = (v: number) => !d.done && game.tap({ colours: col.map((c, u) => (u === v ? (c === d.pen ? -1 : d.pen) : c)), said: null });
  const check = () => {
    if (clashes(graph, col).length) return game.miss({ misses: d.misses + 1, said: { kind: "clash" } });
    if (coloursUsed(col) > task.k) return game.miss({ misses: d.misses + 1, said: { kind: "fewer" } });
    game.win({ stars, clean: d.misses === 0, notice: (streak) => colourNotice(task, d.misses, streak), patch: { done: true } });
  };

  const pic = colourSvg(graph, col, clash);
  const right = `${fill(w.right, { k: coloursUsed(col), stars: starText(stars) })}${d.mode === "puzzle" && stars === 1 ? ` ${g.oneStar}` : ""}`;
  const blank = col.filter((c) => c < 0).length;
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]} ${right}` }
    : d.done ? { tone: "ok", text: right }
    : d.said?.kind === "clash" ? { tone: "wrong", text: w.clash }
    : d.said?.kind === "fewer" ? { tone: "wrong", text: fill(w.fewer, { k: coloursUsed(col) }) }
    : { tone: "hint", text: blank < graph.pts.length ? fill(w.left, { n: blank }) : w.hint };
  return (
    <>
      <GameHead game={game} g={g}>
        <Stake stars={stars} tries={d.misses} g={g} />
      </GameHead>
      <Said line={{ tone: "prompt", text: task.level === 3 ? w.askFewest : fill(w.ask, { k: task.k }) }} />
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg ref={svgRef} width={pic.w} height={pic.h} viewBox={`0 0 ${pic.w} ${pic.h}`} fontFamily={FONT} role="group" aria-label={w.hint}>
          <rect width={pic.w} height={pic.h} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: pic.body }} />
          {graph.pts.map(([x, y], v) => (
            <circle key={v} cx={x} cy={y} r={DOT_R + 8} fill="transparent" role="button" aria-label={name(v)} style={{ cursor: d.done ? "default" : "pointer" }} onClick={() => tap(v)} />
          ))}
        </svg>
      </Stage>
      {!d.done && (
        <div className="live-bar" role="radiogroup" aria-label={w.pen}>
          {PALETTE.slice(0, pens).map((c, i) => (
            <button key={i} className={`live-btn colour-pen${d.pen === i ? " on" : ""}`} role="radio" aria-checked={d.pen === i} aria-label={fill(w.colour, { n: i + 1 })} style={{ background: c }} onClick={() => set({ ...d, pen: i })} />
          ))}
        </div>
      )}
      <GameActions game={game} g={g} done={d.done}>
        <button className="live-btn on" disabled={blank > 0} onClick={check}>{g.check}</button>
        <button className="live-btn" disabled={blank === graph.pts.length} onClick={() => set({ ...d, colours: [], said: null })}>{g.clear}</button>
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
