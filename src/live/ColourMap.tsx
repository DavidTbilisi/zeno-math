// Colour the graph: pick a colour, tap the vertices to give it to them (tap again to take it off), and check once
// every vertex has one; edges whose two ends match turn red. Easy and medium give the number of colours (two, then
// three); hard asks for the fewest, and a right colouring with more is told it can be done with fewer. Right at the
// first check earns three stars, at the second two. Nine puzzles open in turn, and the endless run keeps a streak
// right at the first check.
import { useState } from "react";
import { COLOUR_LADDER, COLOUR_NOTICES, colourNotice, colourNow, colourStars, colourSvg, coloursUsed, type ColourLevel, type LiveColour } from "../math/colouring";
import { clashes, DOT_R, name, PALETTE } from "../math/graphPlay";
import { withBest, withFound, withStars } from "../math/ladder";
import { play } from "./juice";
import { Cheer, Found, GameNav, newSeed, nextStage, Onward, SoundToggle, starText, useLadder } from "./ladderUi";
import { fill, FONT, type PieceProps } from "./ui";

export function ColourMap({ state: d, set, w: words, svgRef }: PieceProps<"colourMap">) {
  const [w, g] = [words.colourMap, words.game];
  const [ladder, keep] = useLadder("zeno.colourmap.v1", COLOUR_LADDER.length, COLOUR_NOTICES);
  const [cheer, setCheer] = useState(0);
  const task = colourNow(d);
  const graph = task.g;
  const col = graph.pts.map((_, v) => d.colours[v] ?? -1);
  const pens = task.level === 3 ? 4 : task.k;
  const checked = d.said?.kind === "clash";
  const clash = checked ? clashes(graph, col) : [];

  const tap = (v: number) => {
    if (d.done) return;
    play("snap");
    set({ ...d, colours: col.map((c, u) => (u === v ? (c === d.pen ? -1 : d.pen) : c)), said: null });
  };
  const check = () => {
    if (clashes(graph, col).length) {
      play("miss");
      return set({ ...d, misses: d.misses + 1, streak: 0, said: { kind: "clash" } });
    }
    if (coloursUsed(col) > task.k) {
      play("miss");
      return set({ ...d, misses: d.misses + 1, streak: 0, said: { kind: "fewer" } });
    }
    const stars = colourStars(d.misses);
    const streak = d.mode === "endless" && d.misses === 0 ? d.streak + 1 : d.mode === "endless" ? 0 : d.streak;
    const key = colourNotice(task, d.misses, streak);
    let next = withBest(ladder, d.mode === "endless" ? streak : 0);
    if (d.mode === "puzzle") next = withStars(next, d.stage, stars);
    if (key && !next.found.includes(key)) next = withFound(next, key, COLOUR_NOTICES);
    if (next !== ladder) keep(next);
    play("good");
    setTimeout(() => play("star"), 260);
    setCheer((c) => c + 1);
    set({ ...d, done: true, streak, said: key ? { kind: "notice", key } : null });
  };
  const fresh: Pick<LiveColour, "colours" | "pen" | "misses" | "done" | "said"> = { colours: [], pen: 0, misses: 0, done: false, said: null };
  const go = (stage: number) => set({ ...d, ...fresh, mode: "puzzle", stage });
  const endless = (l: ColourLevel) => set({ ...d, ...fresh, mode: "endless", level: l, seed: newSeed() });
  const onward = () => (d.mode === "endless" ? endless(d.level) : go(nextStage(d.stage, COLOUR_LADDER.length)));

  const pic = colourSvg(graph, col, clash);
  const stars = colourStars(d.misses);
  const right = fill(w.right, { k: coloursUsed(col), stars: starText(stars) });
  const blank = col.filter((c) => c < 0).length;
  const said =
    d.said?.kind === "notice" ? `${w.notices[d.said.key]} ${right}`
    : d.done ? right
    : d.said?.kind === "clash" ? w.clash
    : d.said?.kind === "fewer" ? fill(w.fewer, { k: coloursUsed(col) })
    : blank < graph.pts.length ? fill(w.left, { n: blank })
    : w.hint;
  return (
    <>
      <GameNav ladder={ladder} mode={d.mode} stage={d.stage} level={d.level} streak={d.streak} onPuzzle={go} onEndless={endless} words={w} g={g} />
      <p className="live-said geo-prompt">{task.level === 3 ? w.askFewest : fill(w.ask, { k: task.k })}</p>
      <div className="geo-stage-wrap">
        <svg ref={svgRef} width={pic.w} height={pic.h} viewBox={`0 0 ${pic.w} ${pic.h}`} fontFamily={FONT} role="group" aria-label={w.hint}>
          <rect width={pic.w} height={pic.h} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: pic.body }} />
          {graph.pts.map(([x, y], v) => (
            <circle key={v} cx={x} cy={y} r={DOT_R + 8} fill="transparent" role="button" aria-label={name(v)} style={{ cursor: d.done ? "default" : "pointer" }} onClick={() => tap(v)} />
          ))}
        </svg>
        {cheer > 0 && d.done && <Cheer key={cheer} text={starText(stars)} />}
      </div>
      {!d.done && (
        <div className="live-bar" role="radiogroup" aria-label={w.pen}>
          {PALETTE.slice(0, pens).map((c, i) => (
            <button key={i} className={`live-btn colour-pen${d.pen === i ? " on" : ""}`} role="radio" aria-checked={d.pen === i} aria-label={fill(w.colour, { n: i + 1 })} style={{ background: c }} onClick={() => set({ ...d, pen: i })} />
          ))}
        </div>
      )}
      <div className="live-bar">
        {d.done ? (
          <Onward mode={d.mode} stage={d.stage} size={COLOUR_LADDER.length} onClick={onward} g={g} />
        ) : (
          <>
            <button className="live-btn on" disabled={blank > 0} onClick={check}>{g.check}</button>
            <button className="live-btn" disabled={blank === graph.pts.length} onClick={() => set({ ...d, colours: [], said: null })}>{g.clear}</button>
          </>
        )}
        <SoundToggle title={g.sound} />
      </div>
      <p className={d.said?.kind === "notice" ? "live-said notice" : d.done ? "live-said ok" : d.said ? "live-said" : "live-hint"}>
        {said} <Found ladder={ladder} of={COLOUR_NOTICES.length} notices={w.notices} g={g} />
      </p>
    </>
  );
}
