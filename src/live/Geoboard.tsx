// The geoboard: a dot grid to make shapes on by tapping. In free play the area and perimeter follow the shape as it
// changes, and the board says when a shape shows something worth noticing (a square, a tilted square, the same area
// with a different perimeter). The puzzles are a ladder of nine: rectangles, triangles, then shapes with an area and
// a perimeter, each the practice question of its level, marked by the same checker. Up to three stars each — a miss
// or a peek at the numbers costs one — and a puzzle opens once the one before it has a star. Stars and discoveries
// are kept in this browser.
import { useState } from "react";
import { useI18n } from "../i18n";
import {
  areaText,
  encodePoly,
  GEO_COLS,
  GEO_LADDER,
  GEO_ROWS,
  judgePoly,
  ladderTask,
  measurePoly,
  notice,
  NOTICES,
  shapeProblem,
  starsFor,
  withFound,
  withStars,
  type GeoPt,
} from "../math/geoPlay";
import { play } from "./juice";
import { GeoGrid } from "./GeoGrid";
import { Cheer, LadderBar, SoundToggle, starText as stars, useLadder } from "./ladderUi";
import { fill, Toggle, type PieceProps } from "./ui";

export function Geoboard({ state: d, set, w: words, svgRef }: PieceProps<"geoboard">) {
  const w = words.geoboard;
  const { t } = useI18n();
  const pw = t.pracWords;
  const [progress, keep] = useLadder("zeno.geoplay.v1", GEO_LADDER.length, NOTICES);
  // Bumped on every puzzle done, so the celebration plays again.
  const [cheer, setCheer] = useState(0);
  const task = d.mode === "puzzle" ? ladderTask(d.stage) : null;
  const goal = task?.play.goal;

  const prompt = !task || !goal
    ? w.freeHint
    : task.level === 1 ? fill(pw.prompts.shapeRect, { n: areaText(goal.area2!) })
    : task.level === 2 ? fill(pw.prompts.shapeTriangle, { n: areaText(goal.area2!) })
    : fill(pw.prompts.shapeAreaPerim, { a: areaText(goal.area2!), p: goal.perim! });

  const valid = (pts: GeoPt[]) => pts.length >= 3 && !shapeProblem(pts, GEO_COLS, GEO_ROWS);
  const change = (pts: GeoPt[]) => {
    if (d.mode === "puzzle") return set({ ...d, pts, said: d.said?.kind === "right" ? d.said : null });
    // Free play: what the new shape shows, next to the last whole shape made.
    const now = valid(pts) ? measurePoly(pts) : null;
    const key = now ? notice(d.last, now) : null;
    if (key && !progress.found.includes(key)) {
      keep(withFound(progress, key));
      play("star");
    }
    set({ ...d, pts, said: key ? { kind: "notice", key } : null, last: now ? { area2: now.area2, perim: now.perim } : d.last ?? null });
  };
  const check = () => {
    if (!task) return;
    const v = judgePoly(task.play, encodePoly(d.pts));
    if (v.ok) {
      const got = starsFor(d.misses, d.peeked);
      keep(withStars(progress, d.stage, got));
      play("good");
      setTimeout(() => play("star"), 260);
      setCheer((c) => c + 1);
      return set({ ...d, said: { kind: "right", stars: got } });
    }
    if (v.problem) return set({ ...d, said: { kind: "problem", problem: v.problem } });
    play("miss");
    set({ ...d, misses: d.misses + 1, said: { kind: "wrong" } });
  };
  const go = (stage: number) => set({ ...d, mode: "puzzle", stage, pts: [], misses: 0, peeked: false, area: false, perim: false, said: null });
  // In a puzzle, showing a number the puzzle asks for is a peek.
  const toggle = (key: "area" | "perim") => {
    const on = !d[key];
    const asked = key === "area" || goal?.perim !== undefined;
    set({ ...d, [key]: on, peeked: d.peeked || (d.mode === "puzzle" && on && asked && d.said?.kind !== "right") });
  };

  const m = valid(d.pts) ? measurePoly(d.pts) : null;
  const said = (() => {
    const s = d.said;
    if (!s) return null;
    if (s.kind === "right") return fill(w.right, { stars: stars(s.stars) });
    if (s.kind === "problem") return pw.reasons.shape[s.problem];
    if (s.kind === "notice") return w.notices[s.key];
    if (!m) return w.wrongShape;
    return goal?.perim !== undefined && m.perim !== null
      ? fill(w.wrongBoth, { a: areaText(m.area2), p: m.perim })
      : fill(w.wrong, { a: areaText(m.area2) });
  })();
  const done = d.said?.kind === "right";
  const allDone = progress.stars.every((s) => s > 0);

  return (
    <>
      <LadderBar stars={progress.stars} current={d.mode === "puzzle" ? d.stage : null} onPick={go} words={w}>
        <Toggle on={d.mode === "free"} onClick={() => set({ ...d, mode: "free", area: true, perim: true, said: null })}>✏️ {w.free}</Toggle>
      </LadderBar>
      <p className="live-said geo-prompt">{prompt}</p>
      <div className="geo-stage-wrap">
        <GeoGrid
          cols={GEO_COLS}
          rows={GEO_ROWS}
          pts={d.pts}
          onChange={change}
          svgRef={svgRef}
          cell={44}
          readouts={{ area: d.area ? w.area : undefined, perim: d.perim ? w.perimeter : undefined }}
          tone={done ? "right" : d.said?.kind === "wrong" ? "wrong" : null}
          label={prompt}
          disabled={done}
        />
        {cheer > 0 && done && <Cheer key={cheer} text={stars(d.said?.kind === "right" ? d.said.stars : 0)} />}
      </div>
      <div className="live-bar">
        <Toggle on={d.area} onClick={() => toggle("area")} title={d.mode === "puzzle" ? w.peek : undefined}>▦ {w.area}</Toggle>
        <Toggle on={d.perim} onClick={() => toggle("perim")} title={d.mode === "puzzle" ? w.peek : undefined}>⬚ {w.perimeter}</Toggle>
        <button className="live-btn" disabled={!d.pts.length || done} onClick={() => change(d.pts.slice(0, -1))}>↶ {w.undo}</button>
        <button className="live-btn" disabled={!d.pts.length || done} onClick={() => change([])}>{w.clear}</button>
        {d.mode === "puzzle" &&
          (done ? (
            d.stage + 1 < GEO_LADDER.length && <button className="live-btn on" onClick={() => go(d.stage + 1)}>{w.next} →</button>
          ) : (
            <button className="live-btn on" disabled={d.pts.length < 3} onClick={check}>{w.check}</button>
          ))}
        <SoundToggle title={w.sound} />
      </div>
      <p className={said ? `live-said${d.said?.kind === "right" ? " ok" : d.said?.kind === "notice" ? " notice" : ""}` : "live-hint"}>
        {said ?? (d.mode === "puzzle" ? w.hint : allDone ? w.allDone : w.hint)}
        {" "}
        <span className="geo-found" title={progress.found.map((k) => w.notices[k]).join("\n")}>
          {fill(w.found, { n: progress.found.length, of: NOTICES.length })}
        </span>
      </p>
    </>
  );
}
