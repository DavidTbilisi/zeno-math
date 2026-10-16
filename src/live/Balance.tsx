// Balance puzzles: scales that balance with shapes and weights on them, and what each shape weighs to find. Set each
// shape's weight, then weigh: the scales tip as those weights would make them, with each pan's total beneath, until
// they balance. Balanced at the first weighing earns three stars, the second two. Nine puzzles open in turn — one
// shape on one side, the same shape on both sides, two shapes and two scales — and the endless run keeps a streak of
// puzzles balanced at the first weighing.
import { useState } from "react";
import {
  BALANCE_LADDER,
  BALANCE_NOTICES,
  balanceNotice,
  balanceNow,
  balanceStars,
  balanceSvg,
  balanced,
  MAX_GUESS,
  SHAPE_GLYPHS,
  type BalanceLevel,
  type LiveBalance,
} from "../math/balance";
import { withBest, withFound, withStars } from "../math/ladder";
import { play } from "./juice";
import { Cheer, Found, GameNav, newSeed, nextStage, Onward, SoundToggle, starText, useLadder } from "./ladderUi";
import { fill, FONT, Stepper, type PieceProps } from "./ui";

export function Balance({ state: d, set, w: words, svgRef }: PieceProps<"balance">) {
  const [w, g] = [words.balance, words.game];
  const [ladder, keep] = useLadder("zeno.balance.v1", BALANCE_LADDER.length, BALANCE_NOTICES);
  const [cheer, setCheer] = useState(0);
  const task = balanceNow(d);
  const guess = task.values.map((_, i) => d.guess[i] ?? 1);
  const pic = balanceSvg(task, d.weighed || d.done ? guess : null);
  const [W, H] = [Math.max(pic.w, 300) + 20, balanceSvg(task, guess).h + 16];

  const weigh = () => {
    if (!balanced(task, guess)) {
      play("miss");
      return set({ ...d, guess, weighed: true, misses: d.misses + 1, streak: 0, said: null });
    }
    const stars = balanceStars(d.misses);
    const streak = d.mode === "endless" && d.misses === 0 ? d.streak + 1 : d.mode === "endless" ? 0 : d.streak;
    const key = balanceNotice(task, d.misses, streak);
    let next = withBest(ladder, d.mode === "endless" ? streak : 0);
    if (d.mode === "puzzle") next = withStars(next, d.stage, stars);
    if (key && !next.found.includes(key)) next = withFound(next, key, BALANCE_NOTICES);
    if (next !== ladder) keep(next);
    play("good");
    setTimeout(() => play("star"), 260);
    setCheer((c) => c + 1);
    set({ ...d, guess, weighed: true, done: true, streak, said: key ? { kind: "notice", key } : null });
  };
  const fresh: Pick<LiveBalance, "guess" | "weighed" | "misses" | "done" | "said"> = { guess: [], weighed: false, misses: 0, done: false, said: null };
  const go = (stage: number) => set({ ...d, ...fresh, mode: "puzzle", stage });
  const endless = (l: BalanceLevel) => set({ ...d, ...fresh, mode: "endless", level: l, seed: newSeed() });
  const onward = () => (d.mode === "endless" ? endless(d.level) : go(nextStage(d.stage, BALANCE_LADDER.length)));

  const stars = balanceStars(d.misses);
  const right = fill(w.right, { stars: starText(stars) });
  const said =
    d.said?.kind === "notice" ? `${w.notices[d.said.key]} ${right}`
    : d.done ? right
    : d.weighed ? w.notYet
    : task.values.length > 1 ? w.hintTwo : w.hint;
  return (
    <>
      <GameNav ladder={ladder} mode={d.mode} stage={d.stage} level={d.level} streak={d.streak} onPuzzle={go} onEndless={endless} words={w} g={g} />
      <div className="geo-stage-wrap">
        <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} role="img" aria-label={task.values.length > 1 ? w.hintTwo : w.hint}>
          <rect width={W} height={H} fill="#fff" />
          <g transform={`translate(${(W - pic.w) / 2} 8)`} dangerouslySetInnerHTML={{ __html: pic.body }} />
        </svg>
        {cheer > 0 && d.done && <Cheer key={cheer} text={starText(stars)} />}
      </div>
      <div className="live-bar">
        {task.values.map((_, i) => (
          <span key={i} className="balance-guess">
            <b className={`balance-shape s${i}`}>{SHAPE_GLYPHS[i]}</b> =
            <Stepper
              value={guess[i]}
              min={0}
              max={MAX_GUESS}
              less={fill(w.lighter, { s: SHAPE_GLYPHS[i] })}
              more={fill(w.heavier, { s: SHAPE_GLYPHS[i] })}
              onChange={(v) => !d.done && set({ ...d, guess: guess.map((x, j) => (j === i ? v : x)), weighed: false, said: null })}
            />
          </span>
        ))}
      </div>
      <div className="live-bar">
        {d.done ? (
          <Onward mode={d.mode} stage={d.stage} size={BALANCE_LADDER.length} onClick={onward} g={g} />
        ) : (
          <button className="live-btn on" onClick={weigh}>⚖️ {w.weigh}</button>
        )}
        <SoundToggle title={g.sound} />
      </div>
      <p className={d.said?.kind === "notice" ? "live-said notice" : d.done ? "live-said ok" : d.weighed ? "live-said" : "live-hint"}>
        {said} <Found ladder={ladder} of={BALANCE_NOTICES.length} notices={w.notices} g={g} />
      </p>
    </>
  );
}
