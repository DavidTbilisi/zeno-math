// Graph stories: a walk from home told part by part, and its graph to build — the distance from home against the time.
// Tap a piece for each part in turn (walking away climbs gently, running away steeply, a stop is flat, coming back
// goes down), then check; the parts drawn wrong turn red, and the board says why the first one is: a stop is flat,
// steeper is faster, or away climbs and back goes down. Right at the first check earns three stars, at the second two.
// Nine puzzles open in turn (walking only, then walking and running, then four parts), and the endless run keeps a
// streak right at the first check. Built on the game shell (useGame), which does the ladder, the sounds and the cheer.
import { useI18n } from "../i18n";
import { heights, PARTS, partIcon, partSlip, RISE, SLOW_PARTS, STORY_LADDER, STORY_NOTICES, storyNotice, storyNow, storyStars, storySvg, storyWords, wrongParts, type LiveGraphStory, type Part, type StoryLevel } from "../math/graphStory";
import { starText } from "./ladderUi";
import { fill, FONT, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";

/** How many squares high the graph is at each level: room for the highest walk of the level. */
const HIGH: Record<StoryLevel, number> = { 1: 3, 2: 5, 3: 7 };

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
        <svg ref={svgRef} width={pic.w} height={pic.h} viewBox={`0 0 ${pic.w} ${pic.h}`} fontFamily={FONT} role="img" aria-label={w.hint}>
          <rect width={pic.w} height={pic.h} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: pic.body }} />
        </svg>
      </Stage>
      {!d.done && (
        <div className="live-bar">
          {(task.level === 1 ? SLOW_PARTS : PARTS).map((p) => {
            // A piece that would go past home, or off the top of the graph, can't be put.
            const to = at + RISE[p];
            return (
              <button key={p} className="live-btn story-piece" disabled={full || to < 0 || to > high} title={w.pieces[p]} aria-label={w.pieces[p]} onClick={() => change([...d.drawn, p])}>
                <svg width={34} height={34} viewBox="0 0 34 34" aria-hidden="true" dangerouslySetInnerHTML={{ __html: partIcon(p) }} />
              </button>
            );
          })}
        </div>
      )}
      <GameActions game={game} g={g} done={d.done}>
        <button className="live-btn on" disabled={!full} onClick={check}>{g.check}</button>
        <button className="live-btn" disabled={!d.drawn.length} onClick={() => change(d.drawn.slice(0, -1))}>↶ {w.undo}</button>
        <button className="live-btn" disabled={!d.drawn.length} onClick={() => change([])}>{g.clear}</button>
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
