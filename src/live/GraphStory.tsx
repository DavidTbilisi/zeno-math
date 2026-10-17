// Graph stories: a walk from home told part by part, and its graph to build — the distance from home against the time.
// Tap a piece for each part in turn (walking away climbs gently, running away steeply, a stop is flat, coming back
// goes down), then check; the parts drawn wrong turn red, and the board says why the first one is: a stop is flat,
// steeper is faster, or away climbs and back goes down. Right at the first check earns three stars, at the second two.
// Nine puzzles open in turn (walking only, then walking and running, then four parts), and the endless run keeps a
// streak right at the first check.
import { useState } from "react";
import { useI18n } from "../i18n";
import { heights, PARTS, partIcon, partSlip, RISE, SLOW_PARTS, STORY_LADDER, STORY_NOTICES, storyNotice, storyNow, storyStars, storySvg, storyWords, wrongParts, type LiveGraphStory, type Part, type StoryLevel } from "../math/graphStory";
import { withBest, withFound, withStars } from "../math/ladder";
import { play } from "./juice";
import { Cheer, Found, GameNav, newSeed, nextStage, Onward, SoundToggle, starText, useLadder } from "./ladderUi";
import { fill, FONT, type PieceProps } from "./ui";

/** How many squares high the graph is at each level: room for the highest walk of the level. */
const HIGH: Record<StoryLevel, number> = { 1: 3, 2: 5, 3: 7 };

export function GraphStory({ state: d, set, w: words, svgRef }: PieceProps<"graphStory">) {
  const [w, g] = [words.graphStory, words.game];
  const story = useI18n().t.pracWords.story;
  const [ladder, keep] = useLadder("zeno.graphstory.v1", STORY_LADDER.length, STORY_NOTICES);
  const [cheer, setCheer] = useState(0);
  const task = storyNow(d);
  const high = HIGH[task.level];
  const full = d.drawn.length === task.parts.length;
  const at = heights(d.drawn)?.at(-1) ?? 0;

  const change = (drawn: Part[]) => {
    play("snap");
    set({ ...d, drawn, wrong: d.wrong.filter((k) => k < drawn.length && drawn[k] === d.drawn[k]), said: null });
  };
  const check = () => {
    const wrong = wrongParts(task, d.drawn);
    if (wrong.length) {
      play("miss");
      return set({ ...d, wrong, misses: d.misses + 1, streak: 0, said: { kind: "wrong", why: partSlip(task.parts[wrong[0]], d.drawn[wrong[0]]) } });
    }
    const stars = storyStars(d.misses);
    const streak = d.mode === "endless" && d.misses === 0 ? d.streak + 1 : d.mode === "endless" ? 0 : d.streak;
    const key = storyNotice(task, d.misses, streak);
    let next = withBest(ladder, d.mode === "endless" ? streak : 0);
    if (d.mode === "puzzle") next = withStars(next, d.stage, stars);
    if (key && !next.found.includes(key)) next = withFound(next, key, STORY_NOTICES);
    if (next !== ladder) keep(next);
    play("good");
    setTimeout(() => play("star"), 260);
    setCheer((c) => c + 1);
    set({ ...d, done: true, wrong: [], streak, said: key ? { kind: "notice", key } : null });
  };
  const fresh: Pick<LiveGraphStory, "drawn" | "wrong" | "misses" | "done" | "said"> = { drawn: [], wrong: [], misses: 0, done: false, said: null };
  const go = (stage: number) => set({ ...d, ...fresh, mode: "puzzle", stage });
  const endless = (l: StoryLevel) => set({ ...d, ...fresh, mode: "endless", level: l, seed: newSeed() });
  const onward = () => (d.mode === "endless" ? endless(d.level) : go(nextStage(d.stage, STORY_LADDER.length)));

  const pic = storySvg(d.drawn, { cell: 40, slots: task.parts.length, high, wrong: d.wrong, color: d.done ? "#2f9e44" : undefined, numbered: true });
  const stars = storyStars(d.misses);
  const right = fill(w.right, { stars: starText(stars) });
  const said =
    d.said?.kind === "notice" ? `${w.notices[d.said.key]} ${right}`
    : d.done ? right
    : d.said?.kind === "wrong" ? w.why[d.said.why]
    : full ? w.ready
    : w.hint;
  const told = storyWords(task.parts);
  return (
    <>
      <GameNav ladder={ladder} mode={d.mode} stage={d.stage} level={d.level} streak={d.streak} onPuzzle={go} onEndless={endless} words={w} g={g} />
      <ol className="story-parts">
        {told.map((p, k) => (
          <li key={k} className={d.wrong.includes(k) ? "off" : k === d.drawn.length && !d.done ? "now" : undefined}>
            🚶 {story.parts[p]}
          </li>
        ))}
      </ol>
      <div className="geo-stage-wrap">
        <svg ref={svgRef} width={pic.w} height={pic.h} viewBox={`0 0 ${pic.w} ${pic.h}`} fontFamily={FONT} role="img" aria-label={w.hint}>
          <rect width={pic.w} height={pic.h} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: pic.body }} />
        </svg>
        {cheer > 0 && d.done && <Cheer key={cheer} text={starText(stars)} />}
      </div>
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
      <div className="live-bar">
        {d.done ? (
          <Onward mode={d.mode} stage={d.stage} size={STORY_LADDER.length} onClick={onward} g={g} />
        ) : (
          <>
            <button className="live-btn on" disabled={!full} onClick={check}>{g.check}</button>
            <button className="live-btn" disabled={!d.drawn.length} onClick={() => change(d.drawn.slice(0, -1))}>↶ {w.undo}</button>
            <button className="live-btn" disabled={!d.drawn.length} onClick={() => change([])}>{g.clear}</button>
          </>
        )}
        <SoundToggle title={g.sound} />
      </div>
      <p className={d.said?.kind === "notice" ? "live-said notice" : d.done ? "live-said ok" : d.said?.kind === "wrong" ? "live-said" : "live-hint"}>
        {said} <Found ladder={ladder} of={STORY_NOTICES.length} notices={w.notices} g={g} />
      </p>
    </>
  );
}
