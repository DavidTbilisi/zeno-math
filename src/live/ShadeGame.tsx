// Shade the fraction: a shape cut into equal pieces — a bar, a grid, a circle, or counters — and a fraction of it to
// shade. Tap pieces to shade them (again to unshade), then check: any pieces will do, as long as there are the right
// number. Right first time earns three stars, after one miss two. Nine puzzles open in turn — as many pieces as the
// bottom, then more, then counters too — and the endless run keeps a streak of shapes shaded right first time.
import { useState } from "react";
import { useI18n } from "../i18n";
import { withBest, withFound, withStars } from "../math/ladder";
import {
  encodeShade,
  judgeShade,
  piecesOf,
  SHADE_LADDER,
  SHADE_NOTICES,
  shadeNotice,
  shadeNow,
  shadeStars,
  shapeBox,
  type LiveShade,
  type ShadeLevel,
} from "../math/shadeFrac";
import { play } from "./juice";
import { Cheer, LadderBar, SoundToggle, starText, useLadder } from "./ladderUi";
import { ShadePieces } from "./ShadePieces";
import { fill, FONT, Toggle, type PieceProps } from "./ui";

const SIZE = 300;
const newSeed = () => Math.floor(Math.random() * 2 ** 31);

export function ShadeGame({ state: d, set, w: words, svgRef }: PieceProps<"shadeFrac">) {
  const w = words.shadeFrac;
  const { t } = useI18n();
  const [ladder, keep] = useLadder("zeno.shadefrac.v1", SHADE_LADDER.length, SHADE_NOTICES);
  const [cheer, setCheer] = useState(0);
  const task = shadeNow(d);
  const box = shapeBox(task.play, SIZE);

  const tap = (k: number) => {
    if (d.done) return;
    play("snap");
    set({ ...d, shaded: d.shaded.includes(k) ? d.shaded.filter((i) => i !== k) : [...d.shaded, k], said: null });
  };
  const check = () => {
    const v = judgeShade(task.play, task.count, encodeShade(d.shaded));
    if (!v.ok) {
      play("miss");
      return set({ ...d, misses: d.misses + 1, streak: 0, said: { kind: "wrong", shaded: d.shaded.length } });
    }
    const stars = shadeStars(d.misses);
    const streak = d.mode === "endless" && d.misses === 0 ? d.streak + 1 : d.mode === "endless" ? 0 : d.streak;
    const key = shadeNotice(task, d.shaded, streak);
    let next = withBest(ladder, d.mode === "endless" ? streak : 0);
    if (d.mode === "puzzle") next = withStars(next, d.stage, stars);
    if (key && !next.found.includes(key)) next = withFound(next, key, SHADE_NOTICES);
    if (next !== ladder) keep(next);
    play("good");
    setTimeout(() => play("star"), 260);
    setCheer((c) => c + 1);
    set({ ...d, done: true, streak, said: key ? { kind: "notice", key } : null });
  };
  const fresh: Pick<LiveShade, "shaded" | "misses" | "done" | "said"> = { shaded: [], misses: 0, done: false, said: null };
  const go = (stage: number) => set({ ...d, ...fresh, mode: "puzzle", stage });
  const endless = (l: ShadeLevel) => set({ ...d, ...fresh, mode: "endless", level: l, seed: newSeed() });
  const onward = () => (d.mode === "endless" ? endless(d.level) : go(d.stage + 1 < SHADE_LADDER.length ? d.stage + 1 : d.stage));

  const stars = shadeStars(d.misses);
  const done = d.done ? fill(w.right, { stars: starText(stars), k: task.count, p: task.play.pieces }) : "";
  const said =
    d.said?.kind === "notice" ? `${w.notices[d.said.key]} ${done}`
    : d.done ? done
    : d.said?.kind === "wrong" ? fill(w.wrong, { k: d.said.shaded })
    : fill(w.count, { k: d.shaded.length, p: task.play.pieces });
  return (
    <>
      <LadderBar stars={ladder.stars} current={d.mode === "puzzle" ? d.stage : null} onPick={go} words={w}>
        <Toggle on={d.mode === "endless"} onClick={() => endless(d.level)}>∞ {w.endless}</Toggle>
      </LadderBar>
      {d.mode === "endless" && <span className="est-streak">{fill(w.streak, { n: d.streak, best: ladder.best })}</span>}
      <p className="live-said geo-prompt">{fill(task.play.shape === "set" ? w.shadeSet : w.shadeShape, { f: `${task.n}/${task.d}` })}</p>
      <div className="geo-stage-wrap">
        <svg ref={svgRef} width={box.w + 8} height={box.h + 8} viewBox={`-4 -4 ${box.w + 8} ${box.h + 8}`} fontFamily={FONT} role="group" aria-label={fill(task.play.shape === "set" ? w.shadeSet : w.shadeShape, { f: `${task.n}/${task.d}` })}>
          <rect x={-4} y={-4} width={box.w + 8} height={box.h + 8} fill="#fff" />
          <ShadePieces pieces={piecesOf(task.play, SIZE)} shaded={d.shaded} onTap={tap} disabled={d.done} tone={d.done ? "right" : null} />
        </svg>
        {cheer > 0 && d.done && <Cheer key={cheer} text={starText(stars)} />}
      </div>
      <div className="live-bar">
        {d.mode === "endless" &&
          ([1, 2, 3] as const).map((l) => (
            <Toggle key={l} on={d.level === l} onClick={() => endless(l)}>{t.pracWords.levels[String(l) as "1" | "2" | "3"]}</Toggle>
          ))}
        <button className="live-btn" disabled={!d.shaded.length || d.done} onClick={() => set({ ...d, shaded: [], said: null })}>{w.clear}</button>
        {d.done ? (
          <button className="live-btn on" onClick={onward}>{d.mode === "endless" || d.stage + 1 < SHADE_LADDER.length ? w.next : w.again} →</button>
        ) : (
          <button className="live-btn on" disabled={!d.shaded.length} onClick={check}>{w.check}</button>
        )}
        <SoundToggle title={w.sound} />
      </div>
      <p className={d.said?.kind === "notice" ? "live-said notice" : d.done ? "live-said ok" : d.said?.kind === "wrong" ? "live-said" : "live-hint"}>
        {said}{" "}
        <span className="geo-found" title={ladder.found.map((k) => w.notices[k]).join("\n")}>
          {fill(w.found, { n: ladder.found.length, of: SHADE_NOTICES.length })}
        </span>
      </p>
    </>
  );
}
