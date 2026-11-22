// Colour the graph: pick a colour, tap the vertices to give it to them (tap again to take it off), and check once
// every vertex has one; edges whose two ends match turn red. Easy and medium give the number of colours (two, then
// three); hard asks for the fewest, and a right colouring with more is told it can be done with fewer. Right at the
// first check earns three stars, at the second two. Nine puzzles open in turn, and the endless run keeps a streak
// right at the first check. Built on the game shell (useGame), which does the ladder, the sounds and the cheer.
// Worked by hand: paint pots under the graph, tapped to pick or dragged onto a vertex to paint it; a vertex dragged
// into the bin loses its colour, the bin tapped clears them all, and the check is a pill once every vertex is painted.
import { COLOUR_LADDER, COLOUR_NOTICES, colourNotice, colourNow, colourStars, colourSvg, coloursUsed, type LiveColour } from "../math/colouring";
import { clashes, DOT_R, name, PALETTE } from "../math/graphPlay";
import { Bin, inBox, keyTap, Pill, useDrag } from "./hand";
import { starText } from "./ladderUi";
import { fill, FONT, INK, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";

/** The strip under the graph: the pots, the check and the bin. */
const STRIP = 88;
const POT = 24;
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
  // The strip is as wide as four pots, the check and the bin; a narrower graph sits in its middle.
  const W = Math.max(pic.w, 520);
  const ox = (W - pic.w) / 2;
  const H = pic.h + STRIP;
  const potAt = (i: number) => [32 + i * 64, pic.h + STRIP / 2] as const;
  const bin = { x: W - 112, y: pic.h + 8, w: 100, h: STRIP - 16 };
  const vertexAt = (x: number, y: number) => graph.pts.findIndex(([px, py]) => Math.hypot(px + ox - x, py - y) <= DOT_R + 10);
  const paint = (v: number, c: number) => game.tap({ colours: col.map((k, u) => (u === v ? c : k)), pen: c, said: null });
  const { drag, begin, svgProps } = useDrag<{ pot: number } | { v: number }>((e) => {
    if (d.done) return;
    if ("pot" in e) {
      const v = e.moved ? vertexAt(e.x, e.y) : -1;
      if (v >= 0) return paint(v, e.pot);
      if (!e.moved) set({ ...d, pen: e.pot });
      return;
    }
    if (!e.moved) return tap(e.v);
    if (inBox(bin, e.x, e.y) && col[e.v] >= 0) paint(e.v, -1);
  });
  const moving = drag?.moved ? drag : null;
  const binHot = !!moving && "v" in moving && inBox(bin, moving.x, moving.y);
  const target = moving && "pot" in moving ? vertexAt(moving.x, moving.y) : -1;
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
        <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} className="hand-pic" aria-label={w.hint}
          style={{ touchAction: "none" }} {...svgProps}>
          <rect width={W} height={H} fill="#fff" />
          <g transform={`translate(${ox} 0)`} dangerouslySetInnerHTML={{ __html: pic.body }} />
          {target >= 0 && moving && "pot" in moving && (
            <circle cx={graph.pts[target][0] + ox} cy={graph.pts[target][1]} r={DOT_R + 6} fill="none" stroke={INK} strokeWidth={3} strokeDasharray="5 3" />
          )}
          {graph.pts.map(([x, y], v) => (
            <circle key={v} cx={x + ox} cy={y} r={DOT_R + 8} fill="transparent" role="button" tabIndex={d.done ? -1 : 0} aria-label={name(v)}
              style={{ cursor: d.done ? "default" : "pointer" }} onPointerDown={(e) => !d.done && begin(e, { v })} onKeyDown={(e) => keyTap(e, () => tap(v))} />
          ))}
          <line x1={0} y1={pic.h} x2={W} y2={pic.h} stroke="#e9ecef" />
          {!d.done && (
            <g role="radiogroup" aria-label={w.pen}>
              {PALETTE.slice(0, pens).map((c, i) => {
                const [x, y] = potAt(i);
                return (
                  <g key={i} role="radio" tabIndex={0} aria-checked={d.pen === i} aria-label={fill(w.colour, { n: i + 1 })} style={{ cursor: "grab" }}
                    onPointerDown={(e) => begin(e, { pot: i })} onKeyDown={(e) => keyTap(e, () => set({ ...d, pen: i }))}>
                    {d.pen === i && <circle cx={x} cy={y} r={POT + 6} fill="none" stroke={INK} strokeWidth={3} />}
                    <circle cx={x} cy={y} r={POT} fill={c} stroke="#495057" strokeWidth={1.5} />
                  </g>
                );
              })}
            </g>
          )}
          {!d.done && blank === 0 && <Pill x={32 + pens * 64 - 2} y={pic.h + STRIP / 2 - 18} w={110} h={36} strong text={g.check} onTap={check} />}
          {!d.done && <Bin {...bin} hot={binHot} label={g.clear} title={w.clearTitle} onTap={() => blank < graph.pts.length && set({ ...d, colours: [], said: null })} />}
          {moving && "pot" in moving && <circle cx={moving.x} cy={moving.y} r={POT - 4} fill={PALETTE[moving.pot]} stroke="#495057" strokeWidth={1.5} opacity={0.85} pointerEvents="none" />}
          {moving && "v" in moving && col[moving.v] >= 0 && <circle cx={moving.x} cy={moving.y} r={DOT_R} fill={PALETTE[col[moving.v]]} stroke="#495057" opacity={0.85} pointerEvents="none" />}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.done} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
