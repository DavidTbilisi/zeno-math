// Missing angles: a figure drawn to size, its angles marked, and the one marked ? to find — on a straight line, in a
// right angle, around a point, in a triangle, an isosceles triangle or a quadrilateral. Type it in degrees and check;
// a wrong answer on arms from a point draws the arm it would make, dashed, so it can be seen to be too big or too
// small. Right first time earns three stars, after one miss two. Nine puzzles open in turn, and the endless run keeps
// a streak right first time.
import { useState } from "react";
import { withBest, withFound, withStars } from "../math/ladder";
import { readWhole } from "../math/machine";
import { HUNT_LADDER, HUNT_NOTICES, huntNotice, huntNow, huntStars, huntSvg, type HuntLevel, type LiveAngleHunt } from "../math/missingAngle";
import { play } from "./juice";
import { Keypad } from "./Keypad";
import { Cheer, Found, GameNav, newSeed, nextStage, Onward, SoundToggle, starText, useLadder } from "./ladderUi";
import { fill, FONT, type PieceProps } from "./ui";

export function AngleHunt({ state: d, set, w: words, svgRef }: PieceProps<"angleHunt">) {
  const [w, g] = [words.angleHunt, words.game];
  const [ladder, keep] = useLadder("zeno.anglehunt.v1", HUNT_LADDER.length, HUNT_NOTICES);
  const [cheer, setCheer] = useState(0);
  const task = huntNow(d);
  const fromPoint = "parts" in task.fig;
  const typed = readWhole(d.typed);

  const check = () => {
    if (typed === null) return;
    if (typed !== task.v) {
      play("miss");
      return set({ ...d, typed: "", misses: d.misses + 1, streak: 0, said: { kind: "wrong", v: typed } });
    }
    const stars = huntStars(d.misses);
    const streak = d.mode === "endless" && d.misses === 0 ? d.streak + 1 : d.mode === "endless" ? 0 : d.streak;
    const key = huntNotice(task, d.misses, streak);
    let next = withBest(ladder, d.mode === "endless" ? streak : 0);
    if (d.mode === "puzzle") next = withStars(next, d.stage, stars);
    if (key && !next.found.includes(key)) next = withFound(next, key, HUNT_NOTICES);
    if (next !== ladder) keep(next);
    play("good");
    setTimeout(() => play("star"), 260);
    setCheer((c) => c + 1);
    set({ ...d, done: true, streak, said: key ? { kind: "notice", key } : null });
  };
  const fresh: Pick<LiveAngleHunt, "typed" | "misses" | "done" | "said"> = { typed: "", misses: 0, done: false, said: null };
  const go = (stage: number) => set({ ...d, ...fresh, mode: "puzzle", stage });
  const endless = (l: HuntLevel) => set({ ...d, ...fresh, mode: "endless", level: l, seed: newSeed() });
  const onward = () => (d.mode === "endless" ? endless(d.level) : go(nextStage(d.stage, HUNT_LADDER.length)));

  // A wrong size that fits on the figure is drawn; one past a whole turn isn't.
  const wrong = d.said?.kind === "wrong" ? d.said.v : null;
  const pic = huntSvg(task.fig, d.done ? { answer: task.v } : wrong !== null && fromPoint && wrong > 0 && wrong < 360 ? { ghost: wrong } : {});
  const stars = huntStars(d.misses);
  const right = fill(w.right, { v: task.v, stars: starText(stars) });
  const said =
    d.said?.kind === "notice" ? `${w.notices[d.said.key]} ${right}`
    : d.done ? right
    : wrong !== null ? fill(fromPoint ? w.wrongArm : w.wrong, { v: wrong })
    : w.hint;
  return (
    <>
      <GameNav ladder={ladder} mode={d.mode} stage={d.stage} level={d.level} streak={d.streak} onPuzzle={go} onEndless={endless} words={w} g={g} />
      <p className="live-said geo-prompt">{w.hint}</p>
      <div className="geo-stage-wrap">
        <svg ref={svgRef} width={pic.w} height={pic.h} viewBox={`0 0 ${pic.w} ${pic.h}`} fontFamily={FONT} role="img" aria-label={w.hint}>
          <rect width={pic.w} height={pic.h} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: pic.body }} />
        </svg>
        {cheer > 0 && d.done && <Cheer key={cheer} text={starText(stars)} />}
      </div>
      {!d.done && <Keypad value={d.typed} onChange={(typed) => set({ ...d, typed })} erase={w.erase} />}
      <div className="live-bar">
        {d.done ? (
          <Onward mode={d.mode} stage={d.stage} size={HUNT_LADDER.length} onClick={onward} g={g} />
        ) : (
          <button className="live-btn on" disabled={typed === null} onClick={check}>{g.check}</button>
        )}
        <SoundToggle title={g.sound} />
      </div>
      <p className={d.said?.kind === "notice" ? "live-said notice" : d.done ? "live-said ok" : wrong !== null ? "live-said" : "live-hint"}>
        {said} <Found ladder={ladder} of={HUNT_NOTICES.length} notices={w.notices} g={g} />
      </p>
    </>
  );
}
