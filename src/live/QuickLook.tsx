// The quick-look game: dots show for a moment and hide, and the player taps how many there were. Nine rounds of five
// flashes (up to 6, up to 10 as frames, dice and groups, then up to 20) earn stars for how many were right, a second
// look capping them at two; the endless run's flash gets an eighth shorter with every right answer in the streak.
// After each answer the dots come back coloured by group, so 7 can be seen as 4 and 3.
import { useEffect, useRef, useState } from "react";
import { withBest, withFound, withStars } from "../math/ladder";
import {
  dotsHeight,
  dotsSvg,
  FLASH_MS,
  flashFor,
  LOOK_LADDER,
  LOOK_NOTICES,
  LOOK_W,
  lookNotice,
  lookNow,
  lookStars,
  padMax,
  ROUND,
  type LiveQuickLook,
  type LookLevel,
} from "../math/quickLook";
import { useI18n } from "../i18n";
import { play } from "./juice";
import { Cheer, LadderBar, SoundToggle, starText, useLadder } from "./ladderUi";
import { fill, FONT, Toggle, type PieceProps } from "./ui";

const newSeed = () => Math.floor(Math.random() * 2 ** 31);

export function QuickLook({ state: d, set, w: words, svgRef }: PieceProps<"quickLook">) {
  const w = words.quickLook;
  const { t } = useI18n();
  const [ladder, keep] = useLadder("zeno.quicklook.v1", LOOK_LADDER.length, LOOK_NOTICES);
  const [cheer, setCheer] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hiddenAt = useRef(0);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const task = lookNow(d);
  const level = d.mode === "puzzle" ? LOOK_LADDER[d.stage].level : d.level;
  const ms = d.mode === "endless" ? flashFor(level, d.streak) : FLASH_MS[level];

  /** Shows the dots of `s` for the flash, then hides them and waits for a number. */
  const look = (s: LiveQuickLook) => {
    set({ ...s, phase: "look" });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      hiddenAt.current = performance.now();
      set({ ...s, phase: "answer" });
    }, s.mode === "endless" ? flashFor(s.level, s.streak) : FLASH_MS[LOOK_LADDER[s.stage].level]);
  };
  const answer = (k: number) => {
    if (d.phase !== "answer") return;
    const right = k === task.n;
    play(right ? "good" : "miss");
    const results = [...d.results, right];
    const streak = d.mode === "endless" ? (right ? d.streak + 1 : 0) : d.streak;
    const key = lookNotice(task, right, performance.now() - hiddenAt.current, streak);
    let next = withBest(ladder, d.mode === "endless" ? streak : 0);
    if (key && !next.found.includes(key)) {
      next = withFound(next, key, LOOK_NOTICES);
      setTimeout(() => play("star"), 200);
    }
    let said: LiveQuickLook["said"] = key ? { kind: "notice", key } : null;
    if (d.mode === "puzzle" && d.i === ROUND - 1) {
      const stars = lookStars(results.filter(Boolean).length, d.relooked);
      next = withStars(next, d.stage, stars);
      said = { kind: "done", stars };
      setTimeout(() => play("star"), 300);
      setCheer((c) => c + 1);
    }
    if (next !== ladder) keep(next);
    set({ ...d, phase: "shown", answer: k, results, streak, said });
  };
  const fresh: Pick<LiveQuickLook, "i" | "results" | "answer" | "relooked" | "said"> = { i: 0, results: [], answer: null, relooked: false, said: null };
  const go = (stage: number) => set({ ...d, ...fresh, mode: "puzzle", stage, phase: "ready" });
  const endless = (l: LookLevel) => set({ ...d, ...fresh, mode: "endless", level: l, seed: newSeed(), phase: "ready" });
  const roundDone = d.mode === "puzzle" && d.said?.kind === "done";
  const onward = () => {
    if (d.mode === "endless") return look({ ...d, seed: newSeed(), answer: null, said: null });
    if (roundDone) return go(d.stage + 1 < LOOK_LADDER.length ? d.stage + 1 : d.stage);
    look({ ...d, i: d.i + 1, answer: null, said: null });
  };

  const h = dotsHeight(task);
  const shown = d.phase === "look" || d.phase === "shown";
  const right = d.phase === "shown" && d.answer === task.n;
  const said =
    d.said?.kind === "done" ? fill(w.roundDone, { stars: starText(d.said.stars) })
    : d.said?.kind === "notice" ? w.notices[d.said.key]
    : d.phase === "shown" ? (right ? fill(w.right, { n: task.n }) : fill(w.wrong, { n: task.n }))
    : d.phase === "ready" ? w.ready
    : d.phase === "answer" ? w.howMany
    : null;
  return (
    <>
      <LadderBar stars={ladder.stars} current={d.mode === "puzzle" ? d.stage : null} onPick={go} words={w}>
        <Toggle on={d.mode === "endless"} onClick={() => endless(d.level)}>∞ {w.endless}</Toggle>
      </LadderBar>
      {d.mode === "puzzle" ? (
        <span className="est-dots" aria-label={`${d.i + 1} / ${ROUND}`}>
          {Array.from({ length: ROUND }, (_, k) => (
            <i key={k} className={k < d.results.length ? (d.results[k] ? "ok" : "off") : k === d.i ? "now" : ""} />
          ))}
        </span>
      ) : (
        <span className="est-streak">⚡ {(ms / 1000).toFixed(2)} s · {fill(w.streak, { n: d.streak, best: ladder.best })}</span>
      )}
      <div className="geo-stage-wrap">
        <svg ref={svgRef} width={480} height={360} viewBox={`0 0 ${LOOK_W} 240`} fontFamily={FONT} role="img" aria-label={w.howMany}>
          <rect x={1} y={1} width={LOOK_W - 2} height={238} rx={12} fill={shown ? "#fff" : "#f1f3f5"} stroke="#dee2e6" strokeWidth={2} />
          {shown ? (
            <g transform={`translate(0 ${(240 - h) / 2})`} dangerouslySetInnerHTML={{ __html: dotsSvg(task, d.phase === "shown") }} />
          ) : (
            <text x={LOOK_W / 2} y={140} fontSize={60} textAnchor="middle" fill="#adb5bd">{d.phase === "ready" ? "👀" : "?"}</text>
          )}
        </svg>
        {cheer > 0 && roundDone && d.said?.kind === "done" && <Cheer key={cheer} text={starText(d.said.stars)} />}
      </div>
      {d.phase === "answer" ? (
        <div className="live-bar look-pad">
          {Array.from({ length: padMax(level) }, (_, k) => (
            <button key={k} className="live-btn" onClick={() => answer(k + 1)}>{k + 1}</button>
          ))}
        </div>
      ) : (
        <div className="live-bar">
          {d.phase === "ready" && <button className="live-btn on look-go" onClick={() => look(d)}>👀 {w.look}</button>}
          {d.phase === "shown" && (
            <button className="live-btn on" onClick={onward}>
              {roundDone ? (d.stage + 1 < LOOK_LADDER.length ? w.nextRound : w.again) : w.next} →
            </button>
          )}
        </div>
      )}
      <div className="live-bar">
        {d.mode === "endless" &&
          ([1, 2, 3] as const).map((l) => (
            <Toggle key={l} on={d.level === l} onClick={() => endless(l)}>{t.pracWords.levels[String(l) as "1" | "2" | "3"]}</Toggle>
          ))}
        {d.mode === "puzzle" && d.phase === "answer" && (
          <button className="live-btn" title={w.peek} onClick={() => look({ ...d, relooked: true })}>👀 {w.lookAgain}</button>
        )}
        <SoundToggle title={w.sound} />
      </div>
      <p className={d.said?.kind === "notice" ? "live-said notice" : d.said?.kind === "done" || right ? "live-said ok" : d.phase === "shown" ? "live-said" : "live-hint"}>
        {said}{" "}
        <span className="geo-found" title={ladder.found.map((k) => w.notices[k]).join("\n")}>
          {fill(w.found, { n: ladder.found.length, of: LOOK_NOTICES.length })}
        </span>
      </p>
    </>
  );
}
