// Draw the gradient: a point A on a grid, and a line through it with a given gradient to draw by tapping a second
// point B — 1, 2 or 3 at first, then up or down, then fractions. The line runs across the whole grid as soon as B is
// put, and B can be moved until it is checked; then the step from A to B shows as a triangle, along and up, and a line
// along over up, the wrong way, or straight up is told so. Any point of the line will do. Right at the first check
// earns three stars, at the second two. Nine puzzles open in turn, and the endless run keeps a streak right at the
// first check.
import { useState, type PointerEvent } from "react";
import { withBest, withFound, withStars } from "../math/ladder";
import { gridSnap, samePt } from "../math/plotPoint";
import { gradText, onLine, SLOPE_CELL, SLOPE_LADDER, SLOPE_NOTICES, slopeNotice, slopeNow, slopeRange, slopeSlip, slopeStars, slopeSvg, type LiveSlope, type SlopeLevel } from "../math/slope";
import { play } from "./juice";
import { Cheer, Found, GameNav, newSeed, nextStage, Onward, SoundToggle, starText, useLadder } from "./ladderUi";
import { fill, FONT, svgPoint, type PieceProps } from "./ui";

export function SlopeLine({ state: d, set, w: words, svgRef }: PieceProps<"slopeLine">) {
  const [w, g] = [words.slopeLine, words.game];
  const [ladder, keep] = useLadder("zeno.slopeline.v1", SLOPE_LADDER.length, SLOPE_NOTICES);
  const [cheer, setCheer] = useState(0);
  const task = slopeNow(d);
  const [lo, hi] = slopeRange(task.level);
  const m = gradText(task.rise, task.run);

  const tap = (e: PointerEvent<SVGSVGElement>) => {
    if (d.done) return;
    const b = gridSnap({ lo, hi, cell: SLOPE_CELL }, ...svgPoint(e.currentTarget, e));
    if (!b || samePt(b, task.a) || samePt(b, d.b)) return;
    play("snap");
    set({ ...d, b, said: null });
  };
  const check = () => {
    if (!d.b) return;
    if (!onLine(task, d.b)) {
      play("miss");
      return set({ ...d, misses: d.misses + 1, streak: 0, said: { kind: "wrong", why: slopeSlip(task, d.b) } });
    }
    const stars = slopeStars(d.misses);
    const streak = d.mode === "endless" && d.misses === 0 ? d.streak + 1 : d.mode === "endless" ? 0 : d.streak;
    const key = slopeNotice(task, d.b, d.misses, streak);
    let next = withBest(ladder, d.mode === "endless" ? streak : 0);
    if (d.mode === "puzzle") next = withStars(next, d.stage, stars);
    if (key && !next.found.includes(key)) next = withFound(next, key, SLOPE_NOTICES);
    if (next !== ladder) keep(next);
    play("good");
    setTimeout(() => play("star"), 260);
    setCheer((c) => c + 1);
    set({ ...d, done: true, streak, said: key ? { kind: "notice", key } : null });
  };
  const fresh: Pick<LiveSlope, "b" | "misses" | "done" | "said"> = { b: null, misses: 0, done: false, said: null };
  const go = (stage: number) => set({ ...d, ...fresh, mode: "puzzle", stage });
  const endless = (l: SlopeLevel) => set({ ...d, ...fresh, mode: "endless", level: l, seed: newSeed() });
  const onward = () => (d.mode === "endless" ? endless(d.level) : go(nextStage(d.stage, SLOPE_LADDER.length)));

  const wrong = d.said?.kind === "wrong";
  const pic = slopeSvg(task, { b: d.b, color: d.done ? "#2f9e44" : wrong ? "#e8590c" : undefined, step: d.done || wrong });
  const stars = slopeStars(d.misses);
  const right = fill(w.right, { m, stars: starText(stars) });
  const drawn = d.b && d.b[0] !== task.a[0] ? gradText(d.b[1] - task.a[1], d.b[0] - task.a[0]) : "";
  const said =
    d.said?.kind === "notice" ? `${w.notices[d.said.key]} ${right}`
    : d.done ? right
    : d.said?.kind === "wrong" ? fill(w.why[d.said.why], { g: drawn, m })
    : d.b ? w.moved
    : w.hint;
  const ask = fill(task.level === 1 ? w.askUp : w.ask, { m, n: task.rise });
  return (
    <>
      <GameNav ladder={ladder} mode={d.mode} stage={d.stage} level={d.level} streak={d.streak} onPuzzle={go} onEndless={endless} words={w} g={g} />
      <p className="live-said geo-prompt">{ask}</p>
      <div className="geo-stage-wrap">
        <svg ref={svgRef} className="plot-grid" width={pic.w} height={pic.h} viewBox={`0 0 ${pic.w} ${pic.h}`} fontFamily={FONT} role="img" aria-label={ask} style={{ cursor: d.done ? "default" : "crosshair", touchAction: "none" }} onPointerDown={tap}>
          <rect width={pic.w} height={pic.h} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: pic.body }} />
        </svg>
        {cheer > 0 && d.done && <Cheer key={cheer} text={starText(stars)} />}
      </div>
      <div className="live-bar">
        {d.done ? (
          <Onward mode={d.mode} stage={d.stage} size={SLOPE_LADDER.length} onClick={onward} g={g} />
        ) : (
          <button className="live-btn on" disabled={!d.b || wrong} onClick={check}>{g.check}</button>
        )}
        <SoundToggle title={g.sound} />
      </div>
      <p className={d.said?.kind === "notice" ? "live-said notice" : d.done ? "live-said ok" : wrong ? "live-said" : "live-hint"}>
        {said} <Found ladder={ladder} of={SLOPE_NOTICES.length} notices={w.notices} g={g} />
      </p>
    </>
  );
}
