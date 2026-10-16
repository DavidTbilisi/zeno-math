// Make the target: number cards and a target; tap cards and signs to build a sum, and what it makes so far shows as it
// grows. A sum that makes the target counts; a second, different way earns the third star (3 + 4 and 4 + 3 are one
// way), and the hint — the first step of one way — leaves one. Nine puzzles open in turn; the endless run keeps a streak
// of puzzles made without a hint.
import { useRef, useState } from "react";
import { useI18n } from "../i18n";
import { withBest, withFound, withStars } from "../math/ladder";
import {
  canonical,
  firstStep,
  judgeTarget,
  parseSum,
  piecesText,
  qText,
  sumSource,
  sumValue,
  TARGET_LADDER,
  TARGET_NOTICES,
  targetNotice,
  targetNow,
  targetStars,
  type LiveTarget,
  type Op,
  type Piece,
  type TargetLevel,
} from "../math/target";
import { play } from "./juice";
import { Cheer, LadderBar, SoundToggle, starText, useLadder } from "./ladderUi";
import { fill, FONT, INK, Toggle, type PieceProps } from "./ui";

const SIGN: Record<Op, string> = { "+": "+", "-": "−", "*": "×", "/": "÷" };
const newSeed = () => Math.floor(Math.random() * 2 ** 31);

export function Target({ state: d, set, w: words, svgRef }: PieceProps<"target">) {
  const w = words.target;
  const { t } = useI18n();
  const [ladder, keep] = useLadder("zeno.target.v1", TARGET_LADDER.length, TARGET_NOTICES);
  const [cheer, setCheer] = useState(0);
  const started = useRef(performance.now());
  const p = targetNow(d);
  const used = new Set(d.sum.flatMap((x) => ("card" in x ? [x.card] : [])));
  const value = sumValue(d.sum, p.cards);
  const made = d.said?.kind === "made" || d.ways.length > 0;

  const build = (sum: Piece[]) => {
    const src = sumSource(sum, p.cards);
    const v = judgeTarget(p, src);
    const way = v.ok ? canonical(parseSum(src)!) : null;
    if (!way || d.ways.includes(way)) return set({ ...d, sum, said: d.said?.kind === "made" ? d.said : null });
    // A new way to the target.
    const ways = [...d.ways, way];
    const stars = targetStars(ways.length, d.hinted);
    const streak = d.mode === "endless" && ways.length === 1 ? (d.hinted ? 0 : d.streak + 1) : d.streak;
    const key = targetNotice(p, src, ways.length, performance.now() - started.current, streak);
    let next = withBest(ladder, d.mode === "endless" ? streak : 0);
    if (d.mode === "puzzle") next = withStars(next, d.stage, stars);
    if (key && !next.found.includes(key)) next = withFound(next, key, TARGET_NOTICES);
    if (next !== ladder) keep(next);
    play("good");
    setTimeout(() => play("star"), 260);
    setCheer((c) => c + 1);
    set({ ...d, sum, ways, streak, said: key ? { kind: "notice", key } : { kind: "made", stars } });
  };
  const tapCard = (i: number) => !used.has(i) && build([...d.sum, { card: i }]);
  const fresh = { sum: [], ways: [], hinted: false, said: null } satisfies Partial<LiveTarget>;
  const restart = (next: Partial<LiveTarget>) => {
    started.current = performance.now();
    set({ ...d, ...fresh, ...next });
  };
  const go = (stage: number) => restart({ mode: "puzzle", stage });
  const endless = (level: TargetLevel) => restart({ mode: "endless", level, seed: newSeed() });
  const onward = () => (d.mode === "endless" ? endless(d.level) : go(d.stage + 1 < TARGET_LADDER.length ? d.stage + 1 : d.stage));
  const skip = () => (set({ ...d, streak: 0 }), endless(d.level));

  const stars = targetStars(d.ways.length, d.hinted);
  const right = value && value[1] === 1 && value[0] === p.target;
  const madeText = fill(d.ways.length >= 2 ? w.twoWays : w.made, { stars: starText(stars) });
  const said =
    d.said?.kind === "notice" ? `${w.notices[d.said.key]} ${madeText}`
    : made ? madeText
    : d.hinted ? fill(w.hintText, { s: firstStep(p.sample) })
    : p.all ? fill(w.useAll, { n: p.cards.length })
    : w.hint;
  return (
    <>
      <LadderBar stars={ladder.stars} current={d.mode === "puzzle" ? d.stage : null} onPick={go} words={w}>
        <Toggle on={d.mode === "endless"} onClick={() => endless(d.level)}>∞ {w.endless}</Toggle>
      </LadderBar>
      {d.mode === "endless" && <span className="est-streak">{fill(w.streak, { n: d.streak, best: ladder.best })}</span>}
      <div className="geo-stage-wrap">
        <svg ref={svgRef} width={600} height={170} viewBox="0 0 600 170" fontFamily={FONT} role="img" aria-label={fill(w.make, { t: p.target })}>
          <rect width={600} height={170} fill="#fff" />
          <text x={300} y={62} fontSize={52} fontWeight={700} textAnchor="middle" fill="#e8590c">🎯 {p.target}</text>
          <text x={300} y={128} fontSize={32} textAnchor="middle" fill={right ? "#2f9e44" : INK}>
            {d.sum.length ? piecesText(d.sum, p.cards) : "…"}
            {value && <tspan fill={right ? "#2f9e44" : "#868e96"}> = {qText(value)}</tspan>}
          </text>
        </svg>
        {cheer > 0 && made && <Cheer key={cheer} text={starText(stars)} />}
      </div>
      <div className="live-bar target-cards">
        {p.cards.map((c, i) => (
          <button key={i} className={`live-btn target-card${used.has(i) ? " used" : ""}`} disabled={used.has(i)} onClick={() => tapCard(i)}>{c}</button>
        ))}
      </div>
      <div className="live-bar target-ops">
        {p.ops.map((o) => (
          <button key={o} className="live-btn" onClick={() => build([...d.sum, { op: o }])}>{SIGN[o]}</button>
        ))}
        {(["(", ")"] as const).map((b) => (
          <button key={b} className="live-btn" onClick={() => build([...d.sum, { paren: b }])}>{b}</button>
        ))}
        <button className="live-btn" disabled={!d.sum.length} aria-label={w.back} title={w.back} onClick={() => build(d.sum.slice(0, -1))}>⌫</button>
        <button className="live-btn" disabled={!d.sum.length} onClick={() => set({ ...d, sum: [], said: null })}>{w.clear}</button>
      </div>
      <div className="live-bar">
        {d.mode === "endless" &&
          ([1, 2, 3] as const).map((l) => (
            <Toggle key={l} on={d.level === l} onClick={() => endless(l)}>{t.pracWords.levels[String(l) as "1" | "2" | "3"]}</Toggle>
          ))}
        {!made && !d.hinted && <button className="live-btn" title={w.hintCost} onClick={() => set({ ...d, hinted: true })}>💡 {w.hintBtn}</button>}
        {made ? (
          <button className="live-btn on" onClick={onward}>{d.mode === "endless" || d.stage + 1 < TARGET_LADDER.length ? w.next : w.again} →</button>
        ) : (
          d.mode === "endless" && <button className="live-btn" onClick={skip}>{w.skip}</button>
        )}
        <SoundToggle title={w.sound} />
      </div>
      <p className={d.said?.kind === "notice" ? "live-said notice" : made ? "live-said ok" : "live-hint"}>
        {said}{" "}
        <span className="geo-found" title={ladder.found.map((k) => w.notices[k]).join("\n")}>
          {fill(w.found, { n: ladder.found.length, of: TARGET_NOTICES.length })}
        </span>
      </p>
    </>
  );
}
