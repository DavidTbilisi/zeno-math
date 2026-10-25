// Make the target: number cards and a target; tap cards and signs to build a sum, and what it makes so far shows as it
// grows. A sum that makes the target counts; a second, different way earns the third star (3 + 4 and 4 + 3 are one
// way), and the hint — the first step of one way — leaves one. Nine puzzles open in turn; the endless run keeps a streak
// of puzzles made without a hint. Built on the game shell (useGame): each new way to the target wins the puzzle again,
// for more stars; only the first counts on the streak.
import { canonical, firstStep, judgeTarget, parseSum, piecesText, qText, sumSource, sumValue, TARGET_LADDER, TARGET_NOTICES, targetNotice, targetNow, targetStars, type LiveTarget, type Op, type Piece } from "../math/target";
import { starText } from "./ladderUi";
import { fill, FONT, INK, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const SIGN: Record<Op, string> = { "+": "+", "-": "−", "*": "×", "/": "÷" };
const FRESH: Partial<LiveTarget> = { sum: [], ways: [], hinted: false, said: null };

export function Target({ state: d, set, w: words, svgRef }: PieceProps<"target">) {
  const [w, g] = [words.target, words.game];
  const game = useGame({ key: "zeno.target.v1", size: TARGET_LADDER.length, notices: TARGET_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const p = targetNow(d);
  const used = new Set(d.sum.flatMap((x) => ("card" in x ? [x.card] : [])));
  const value = sumValue(d.sum, p.cards);
  const made = d.ways.length > 0;

  const build = (sum: Piece[]) => {
    const src = sumSource(sum, p.cards);
    const v = judgeTarget(p, src);
    const way = v.ok ? canonical(parseSum(src)!) : null;
    if (!way || d.ways.includes(way)) return set({ ...d, sum, said: null });
    // A new way to the target.
    const ways = [...d.ways, way];
    game.win({
      stars: targetStars(ways.length, d.hinted),
      clean: !d.hinted,
      counts: ways.length === 1,
      notice: (streak) => targetNotice(p, src, ways.length, game.sinceShown(), streak),
      patch: { sum, ways },
    });
  };
  const tapCard = (i: number) => !used.has(i) && build([...d.sum, { card: i }]);
  // Skipping a puzzle ends the streak.
  const skip = () => game.endless(d.level, { streak: 0 });

  const stars = targetStars(d.ways.length, d.hinted);
  const right = value && value[1] === 1 && value[0] === p.target;
  const madeText = `${fill(d.ways.length >= 2 ? w.twoWays : w.made, { stars: starText(stars) })}${d.mode === "puzzle" && stars === 1 ? ` ${g.oneStar}` : ""}`;
  // The level's way of thinking about the puzzle stays in view, before the hint and beside its first step.
  const think = fill(w.think[p.level], { t: p.target });
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]} ${madeText}` }
    : made ? { tone: "ok", text: madeText }
    : d.hinted ? { tone: "hint", text: `${think} ${fill(w.hintText, { s: firstStep(p.sample) })}` }
    : { tone: "hint", text: `${p.all ? fill(w.useAll, { n: p.cards.length }) : w.hint} ${think}` };
  return (
    <>
      <GameHead game={game} g={g} />
      <Stage game={game} stars={stars} done={made} g={g} notices={w.notices}>
        <svg ref={svgRef} width={600} height={170} viewBox="0 0 600 170" fontFamily={FONT} role="img" aria-label={fill(w.make, { t: p.target })}>
          <rect width={600} height={170} fill="#fff" />
          <text x={300} y={62} fontSize={52} fontWeight={700} textAnchor="middle" fill="#e8590c">🎯 {p.target}</text>
          <text x={300} y={128} fontSize={32} textAnchor="middle" fill={right ? "#2f9e44" : INK}>
            {d.sum.length ? piecesText(d.sum, p.cards) : "…"}
            {value && <tspan fill={right ? "#2f9e44" : "#868e96"}> = {qText(value)}</tspan>}
          </text>
        </svg>
      </Stage>
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
      <GameActions game={game} g={g} done={made} always>
        {!made && !d.hinted && <button className="live-btn" title={w.hintCost} onClick={() => set({ ...d, hinted: true })}>💡 {w.hintBtn}</button>}
        {!made && d.mode === "endless" && <button className="live-btn" onClick={skip}>{w.skip}</button>}
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
