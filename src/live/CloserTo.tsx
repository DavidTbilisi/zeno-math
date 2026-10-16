// Closer to? A number (or a calculation) and two or three benchmarks: tap the nearest. After each pick a little line
// shows where the number really is between them. Nine rounds of eight earn stars for how many were right; in the
// endless run a bar runs down for every question, four seconds at first and a tenth less with every right answer in a
// row, and when it runs out the question counts as missed.
import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import {
  NEAR_LADDER,
  NEAR_NOTICES,
  nearLimit,
  nearNotice,
  nearNow,
  nearStars,
  placeOn,
  ROUND,
  type LiveNear,
  type NearLevel,
} from "../math/benchmark";
import { withBest, withFound, withStars } from "../math/ladder";
import { play } from "./juice";
import { Cheer, LadderBar, SoundToggle, starText, useLadder } from "./ladderUi";
import { fill, FONT, INK, Toggle, type PieceProps } from "./ui";

const W = 600;
const [X0, X1, Y] = [80, 520, 150];
const GREEN = "#2f9e44";
const RED = "#e03131";
const newSeed = () => Math.floor(Math.random() * 2 ** 31);

export function CloserTo({ state: d, set, w: words, svgRef }: PieceProps<"closerTo">) {
  const w = words.closerTo;
  const { t } = useI18n();
  const [ladder, keep] = useLadder("zeno.closerto.v1", NEAR_LADDER.length, NEAR_NOTICES);
  const [cheer, setCheer] = useState(0);
  const shownAt = useRef(performance.now());
  const task = nearNow(d);
  const limit = nearLimit(d.streak);

  // Picks for the question shown: the timer's own render's state is the question it was set for.
  const pick = (k: number, s: LiveNear = d) => {
    if (s.picked !== null) return;
    const right = k === task.right;
    play(right ? "good" : "miss");
    const results = [...s.results, right];
    const streak = s.mode === "endless" ? (right ? s.streak + 1 : 0) : s.streak;
    const last = s.mode === "puzzle" && s.i === ROUND - 1;
    const key = nearNotice(task, right, performance.now() - shownAt.current, last ? results : null, streak);
    let next = withBest(ladder, s.mode === "endless" ? streak : 0);
    if (key && !next.found.includes(key)) {
      next = withFound(next, key, NEAR_NOTICES);
      setTimeout(() => play("star"), 200);
    }
    let said: LiveNear["said"] = key ? { kind: "notice", key } : null;
    if (last) {
      const stars = nearStars(results.filter(Boolean).length);
      next = withStars(next, s.stage, stars);
      said = { kind: "done", stars };
      setTimeout(() => play("star"), 300);
      setCheer((c) => c + 1);
    }
    if (next !== ladder) keep(next);
    set({ ...s, picked: k, results, streak, said });
  };

  // A new question: its clock starts now, and in the endless run its time runs out.
  useEffect(() => {
    shownAt.current = performance.now();
    if (d.mode !== "endless" || d.picked !== null) return;
    const timer = setTimeout(() => pick(-1, d), limit);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.mode, d.stage, d.seed, d.i, d.picked]);

  const fresh: Pick<LiveNear, "i" | "results" | "picked" | "said"> = { i: 0, results: [], picked: null, said: null };
  const go = (stage: number) => set({ ...d, ...fresh, mode: "puzzle", stage });
  const endless = (level: NearLevel) => set({ ...d, ...fresh, mode: "endless", level, seed: newSeed() });
  const roundDone = d.said?.kind === "done";
  const onward = () => {
    if (d.mode === "endless") return set({ ...d, seed: newSeed(), picked: null, said: null });
    if (roundDone) return go(d.stage + 1 < NEAR_LADDER.length ? d.stage + 1 : d.stage);
    set({ ...d, i: d.i + 1, picked: null, said: null });
  };

  const X = (f: number) => X0 + f * (X1 - X0);
  const answered = d.picked !== null;
  const right = d.picked === task.right;
  const said =
    d.said?.kind === "done" ? fill(w.roundDone, { stars: starText(d.said.stars) })
    : d.said?.kind === "notice" ? w.notices[d.said.key]
    : d.picked === -1 ? fill(w.timeUp, { b: task.options[task.right].text })
    : answered ? (right ? w.right : fill(w.wrong, { b: task.options[task.right].text }))
    : w.ask;
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
        <span className="est-streak">{fill(w.streak, { n: d.streak, best: ladder.best })}</span>
      )}
      {d.mode === "endless" && (
        <div className="near-clock" aria-hidden="true">
          {!answered && <i key={`${d.seed}`} style={{ animationDuration: `${limit}ms` }} />}
        </div>
      )}
      <div className="geo-stage-wrap">
        <svg ref={svgRef} width={W} height={200} viewBox={`0 0 ${W} 200`} fontFamily={FONT} role="img" aria-label={fill(w.which, { x: task.text })}>
          <rect width={W} height={200} fill="#fff" />
          <text x={W / 2} y={70} fontSize={48} fontWeight={700} textAnchor="middle" fill={INK}>{task.text}</text>
          {answered && (
            <g className="est-reveal">
              <line x1={X(0)} y1={Y} x2={X(1)} y2={Y} stroke={INK} strokeWidth={2} />
              {task.options.map((o, k) => {
                const f = placeOn(task, o.v);
                const color = k === task.right ? GREEN : k === d.picked ? RED : INK;
                return (
                  <g key={k}>
                    <line x1={X(f)} y1={Y - 10} x2={X(f)} y2={Y + 10} stroke={color} strokeWidth={k === task.right || k === d.picked ? 4 : 2} />
                    <text x={X(f)} y={Y + 34} fontSize={20} fontWeight={700} textAnchor="middle" fill={color}>{o.text}</text>
                  </g>
                );
              })}
              <path d={`M${X(placeOn(task, task.v))},${Y - 6} l-9,-18 h18 z`} fill={GREEN} />
            </g>
          )}
        </svg>
        {cheer > 0 && roundDone && d.said?.kind === "done" && <Cheer key={cheer} text={starText(d.said.stars)} />}
      </div>
      <div className="live-bar near-options">
        {task.options.map((o, k) => (
          <button
            key={k}
            className={`live-btn${answered && k === task.right ? " right" : answered && k === d.picked ? " wrong" : ""}`}
            disabled={answered}
            onClick={() => pick(k)}
          >
            {o.text}
          </button>
        ))}
      </div>
      <div className="live-bar">
        {d.mode === "endless" &&
          ([1, 2, 3] as const).map((l) => (
            <Toggle key={l} on={d.level === l} onClick={() => endless(l)}>{t.pracWords.levels[String(l) as "1" | "2" | "3"]}</Toggle>
          ))}
        {answered && (
          <button className="live-btn on" onClick={onward}>
            {roundDone ? (d.stage + 1 < NEAR_LADDER.length ? w.nextRound : w.again) : w.next} →
          </button>
        )}
        <SoundToggle title={w.sound} />
      </div>
      <p className={d.said?.kind === "notice" ? "live-said notice" : d.said?.kind === "done" || right ? "live-said ok" : answered ? "live-said" : "live-hint"}>
        {said}{" "}
        <span className="geo-found" title={ladder.found.map((k) => w.notices[k]).join("\n")}>
          {fill(w.found, { n: ladder.found.length, of: NEAR_NOTICES.length })}
        </span>
      </p>
    </>
  );
}
