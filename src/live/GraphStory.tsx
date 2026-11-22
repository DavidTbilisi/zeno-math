// Graph stories: a walk from home told part by part, and its graph to build — the distance from home against the time.
// Tap a piece for each part in turn (walking away climbs gently, running away steeply, a stop is flat, coming back
// goes down), then check; the parts drawn wrong turn red, and the board says why the first one is: a stop is flat,
// steeper is faster, or away climbs and back goes down. Right at the first check earns three stars, at the second two.
// Nine puzzles open in turn (walking only, then walking and running, then four parts), and the endless run keeps a
// streak right at the first check. Built on the game shell (useGame), which does the ladder, the sounds and the cheer.
// Worked by hand: the pieces wait in a tray under the graph and are dragged onto it (or tapped), the last part drawn
// is dragged into the bin to take it off, the bin tapped clears the graph, and the check is a pill once all are drawn.
import { useI18n } from "../i18n";
import { heights, PARTS, partIcon, partSlip, RISE, SLOW_PARTS, STORY_LADDER, STORY_NOTICES, storyNotice, storyNow, storyStars, storySvg, storyWords, wrongParts, type LiveGraphStory, type Part, type StoryLevel } from "../math/graphStory";
import { BLUE, Bin, inBox, keyTap, Pill, useDrag } from "./hand";
import { starText } from "./ladderUi";
import { fill, FONT, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";

/** How many squares high the graph is at each level: room for the highest walk of the level. */
const HIGH: Record<StoryLevel, number> = { 1: 3, 2: 5, 3: 7 };

/** The graph's squares (as storySvg draws them at cell 40): where a part's slot starts and how wide it is. */
const [CELL, LEFT, TOP, SLOT] = [40, 22, 26, 80];
/** The tray under the graph. */
const [STRIP, TILE] = [84, 52];
const FRESH: Partial<LiveGraphStory> = { drawn: [], wrong: [], misses: 0, done: false, said: null };

export function GraphStory({ state: d, set, w: words, svgRef }: PieceProps<"graphStory">) {
  const [w, g] = [words.graphStory, words.game];
  const story = useI18n().t.pracWords.story;
  const game = useGame({ key: "zeno.graphstory.v1", size: STORY_LADDER.length, notices: STORY_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const task = storyNow(d);
  const high = HIGH[task.level];
  const full = d.drawn.length === task.parts.length;
  const at = heights(d.drawn)?.at(-1) ?? 0;
  const stars = storyStars(d.misses);

  const change = (drawn: Part[]) => game.tap({ drawn, wrong: d.wrong.filter((k) => k < drawn.length && drawn[k] === d.drawn[k]), said: null });
  const check = () => {
    const wrong = wrongParts(task, d.drawn);
    if (wrong.length) return game.miss({ wrong, misses: d.misses + 1, said: { kind: "wrong", why: partSlip(task.parts[wrong[0]], d.drawn[wrong[0]]) } });
    game.win({ stars, clean: d.misses === 0, notice: (streak) => storyNotice(task, d.misses, streak), patch: { done: true, wrong: [] } });
  };

  const pic = storySvg(d.drawn, { cell: 40, slots: task.parts.length, high, wrong: d.wrong, color: d.done ? "#2f9e44" : undefined, numbered: true });
  const W = Math.max(pic.w, 560);
  const ox = (W - pic.w) / 2;
  const H = pic.h + STRIP;
  const kinds = task.level === 1 ? SLOW_PARTS : PARTS;
  const fits = (p: Part) => !full && at + RISE[p] >= 0 && at + RISE[p] <= high;
  const tileAt = (i: number) => ({ x: 16 + i * (TILE + 10), y: pic.h + (STRIP - TILE) / 2, w: TILE, h: TILE });
  const bin = { x: W - 112, y: pic.h + 8, w: 100, h: STRIP - 16 };
  const onGraph = (x: number, y: number) => x >= ox && x <= ox + pic.w && y <= pic.h;
  const put = (p: Part) => fits(p) && change([...d.drawn, p]);
  const { drag, begin, svgProps } = useDrag<{ p: Part } | { last: true }>((e) => {
    if (d.done) return;
    if ("p" in e) return (!e.moved || onGraph(e.x, e.y)) && put(e.p);
    if (e.moved && inBox(bin, e.x, e.y)) change(d.drawn.slice(0, -1));
  });
  const moving = drag?.moved ? drag : null;
  const pY = (h: number) => TOP + high * CELL - h * CELL;
  const n = d.drawn.length;
  const preview = moving && "p" in moving && onGraph(moving.x, moving.y) && fits(moving.p) ? moving.p : null;
  const right = `${fill(w.right, { stars: starText(stars) })}${d.mode === "puzzle" && stars === 1 ? ` ${g.oneStar}` : ""}`;
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]} ${right}` }
    : d.done ? { tone: "ok", text: right }
    : d.said?.kind === "wrong" ? { tone: "wrong", text: w.why[d.said.why] }
    : { tone: "hint", text: full ? w.ready : w.hint };
  const told = storyWords(task.parts);
  return (
    <>
      <GameHead game={game} g={g}>
        <Stake stars={stars} tries={d.misses} g={g} />
      </GameHead>
      <ol className="story-parts">
        {told.map((p, k) => (
          <li key={k} className={d.wrong.includes(k) ? "off" : k === d.drawn.length && !d.done ? "now" : undefined}>
            🚶 {story.parts[p]}
          </li>
        ))}
      </ol>
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} className="hand-pic" aria-label={w.hint}
          style={{ touchAction: "none" }} {...svgProps}>
          <rect width={W} height={H} fill="#fff" />
          <g transform={`translate(${ox} 0)`}>
            <g dangerouslySetInnerHTML={{ __html: pic.body }} />
            {preview && (
              <line x1={LEFT + n * SLOT} y1={pY(at)} x2={LEFT + (n + 1) * SLOT} y2={pY(at + RISE[preview])} stroke={BLUE} strokeWidth={4} strokeDasharray="6 4" strokeLinecap="round" opacity={0.7} />
            )}
            {/* The last part drawn, to drag into the bin. */}
            {n > 0 && !d.done && (
              <rect x={LEFT + (n - 1) * SLOT} y={TOP - 6} width={SLOT} height={high * CELL + 6} fill={moving && "last" in moving ? "#e7f5ff" : "transparent"} opacity={0.6}
                role="button" tabIndex={0} aria-label={fill(w.last, { p: w.pieces[d.drawn[n - 1]] })} style={{ cursor: "grab" }}
                onPointerDown={(e) => begin(e, { last: true })} onKeyDown={(e) => (e.key === "Delete" || e.key === "Backspace") && change(d.drawn.slice(0, -1))} />
            )}
          </g>
          <line x1={0} y1={pic.h} x2={W} y2={pic.h} stroke="#e9ecef" />
          {!d.done && kinds.map((p, i) => {
            const b = tileAt(i);
            const ok = fits(p);
            return (
              <g key={p} role="button" tabIndex={ok ? 0 : -1} aria-label={w.pieces[p]} aria-disabled={!ok || undefined} opacity={ok ? 1 : 0.35}
                style={{ cursor: ok ? "grab" : "default" }} onPointerDown={(e) => ok && begin(e, { p })} onKeyDown={(e) => keyTap(e, () => put(p))}>
                <title>{w.pieces[p]}</title>
                <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={8} fill="#f8f9fa" stroke="#adb5bd" strokeWidth={1.5} />
                <g transform={`translate(${b.x + (TILE - 40) / 2} ${b.y + (TILE - 40) / 2})`} dangerouslySetInnerHTML={{ __html: partIcon(p, 40) }} />
              </g>
            );
          })}
          {!d.done && full && <Pill x={tileAt(kinds.length).x + 8} y={pic.h + STRIP / 2 - 18} w={110} h={36} strong text={g.check} onTap={check} />}
          {!d.done && (
            <Bin {...bin} hot={!!moving && "last" in moving && inBox(bin, moving.x, moving.y)} label={g.clear} title={w.clearTitle}
              onTap={() => d.drawn.length > 0 && change([])} />
          )}
          {moving && "p" in moving && (
            <g transform={`translate(${moving.x - 20} ${moving.y - 20})`} opacity={0.85} pointerEvents="none" dangerouslySetInnerHTML={{ __html: partIcon(moving.p, 40) }} />
          )}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.done} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
