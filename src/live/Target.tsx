// Make the target: number cards and a target; tap cards and signs to build a sum, and what it makes so far shows as it
// grows. A sum that makes the target counts; a second, different way earns the third star (3 + 4 and 4 + 3 are one
// way), and the hint — the first step of one way — leaves one. Nine puzzles open in turn; the endless run keeps a streak
// of puzzles made without a hint.
import { useRef, useState } from "react";
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
import { Cheer, Found, GameNav, newSeed, nextStage, Onward, SoundToggle, starText, useLadder } from "./ladderUi";
import { fill, FONT, INK, type PieceProps } from "./ui";

const SIGN: Record<Op, string> = { "+": "+", "-": "−", "*": "×", "/": "÷" };

export function Target({ state: d, set, w: words, svgRef }: PieceProps<"target">) {
  const [w, g] = [words.target, words.game];
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
  const onward = () => (d.mode === "endless" ? endless(d.level) : go(nextStage(d.stage, TARGET_LADDER.length)));
  // Skipping a puzzle ends the streak.
  const skip = () => restart({ seed: newSeed(), streak: 0 });

  const stars = targetStars(d.ways.length, d.hinted);
  const right = value && value[1] === 1 && value[0] === p.target;
  const madeText = fill(d.ways.length >= 2 ? w.twoWays : w.made, { stars: starText(stars) });
  // The level's way of thinking about the puzzle stays in view, before the hint and beside its first step.
  const think = fill(w.think[p.level], { t: p.target });
  const said =
    d.said?.kind === "notice" ? `${w.notices[d.said.key]} ${madeText}`
    : made ? madeText
    : d.hinted ? `${think} ${fill(w.hintText, { s: firstStep(p.sample) })}`
    : `${p.all ? fill(w.useAll, { n: p.cards.length }) : w.hint} ${think}`;
  return (
    <>
      <GameNav ladder={ladder} mode={d.mode} stage={d.stage} level={d.level} streak={d.streak} onPuzzle={go} onEndless={endless} words={w} g={g} />
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
        <button className="live-btn" disabled={!d.sum.length} onClick={() => set({ ...d, sum: [], said: null })}>{g.clear}</button>
      </div>
      <div className="live-bar">
        {!made && !d.hinted && <button className="live-btn" title={w.hintCost} onClick={() => set({ ...d, hinted: true })}>💡 {w.hintBtn}</button>}
        {made ? (
          <Onward mode={d.mode} stage={d.stage} size={TARGET_LADDER.length} onClick={onward} g={g} />
        ) : (
          d.mode === "endless" && <button className="live-btn" onClick={skip}>{w.skip}</button>
        )}
        <SoundToggle title={g.sound} />
      </div>
      <p className={d.said?.kind === "notice" ? "live-said notice" : made ? "live-said ok" : "live-hint"}>
        {said} <Found ladder={ladder} of={TARGET_NOTICES.length} notices={w.notices} g={g} />
      </p>
    </>
  );
}
