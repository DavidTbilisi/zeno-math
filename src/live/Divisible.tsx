// Divisible by? A number and a row of divisors: tap every one that divides it exactly, then check. A divisor chosen
// wrongly turns red, with the number divided by it and what is left over; if the ones chosen are right but some are
// missing, the board says so. Right at the first check earns three stars, at the second two; the hint — the test for
// one divisor applied to this number (its last digits, its digit sum), as the Divisibility tab writes it — costs one.
// Nine puzzles open in turn (2, 5 and 10; then 3 and 9; then 4, 6 and 8), and the endless run keeps a streak of numbers
// right at the first check without the hint.
import { useRef, useState } from "react";
import { useI18n } from "../i18n";
import { divide, DIV_LADDER, DIV_NOTICES, divNotice, divNow, divStars, hintDivisor, ruleTest, type DivLevel, type LiveDivisible } from "../math/divisible";
import { withBest, withFound, withStars } from "../math/ladder";
import { play } from "./juice";
import { Cheer, Found, GameNav, newSeed, nextStage, Onward, SoundToggle, starText, useLadder } from "./ladderUi";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 560;
const H = 210;
const GREEN = "#2f9e44";
const RED = "#e03131";

export function Divisible({ state: d, set, w: words, svgRef }: PieceProps<"divisible">) {
  const [w, g] = [words.divisible, words.game];
  const { t } = useI18n();
  const [ladder, keep] = useLadder("zeno.divisible.v1", DIV_LADDER.length, DIV_NOTICES);
  const [cheer, setCheer] = useState(0);
  const started = useRef(performance.now());
  const task = divNow(d);
  const divides = (k: number) => task.right.includes(k);

  const tap = (k: number) => {
    if (d.done) return;
    play("snap");
    const chosen = d.chosen.includes(k) ? d.chosen.filter((c) => c !== k) : [...d.chosen, k].sort((a, b) => a - b);
    set({ ...d, chosen, wrong: [], said: null });
  };
  const check = () => {
    const wrong = d.chosen.filter((k) => !divides(k));
    if (wrong.length || d.chosen.length < task.right.length) {
      play("miss");
      return set({ ...d, wrong, misses: d.misses + 1, streak: 0, said: { kind: "wrong", more: !wrong.length } });
    }
    const hinted = d.hint !== null;
    const stars = divStars(d.misses, hinted);
    const clean = d.misses === 0 && !hinted;
    const streak = d.mode === "endless" ? (clean ? d.streak + 1 : 0) : d.streak;
    const key = divNotice(task, d.misses, hinted, performance.now() - started.current, streak);
    let next = withBest(ladder, d.mode === "endless" ? streak : 0);
    if (d.mode === "puzzle") next = withStars(next, d.stage, stars);
    if (key && !next.found.includes(key)) next = withFound(next, key, DIV_NOTICES);
    if (next !== ladder) keep(next);
    play("good");
    setTimeout(() => play("star"), 260);
    setCheer((c) => c + 1);
    set({ ...d, wrong: [], done: true, streak, said: key ? { kind: "notice", key } : null });
  };
  const fresh: Pick<LiveDivisible, "chosen" | "wrong" | "misses" | "hint" | "done" | "said"> = { chosen: [], wrong: [], misses: 0, hint: null, done: false, said: null };
  const restart = (next: Partial<LiveDivisible>) => {
    started.current = performance.now();
    set({ ...d, ...fresh, ...next });
  };
  const go = (stage: number) => restart({ mode: "puzzle", stage });
  const endless = (level: DivLevel) => restart({ mode: "endless", level, seed: newSeed() });
  const onward = () => (d.mode === "endless" ? endless(d.level) : go(nextStage(d.stage, DIV_LADDER.length)));

  const stars = divStars(d.misses, d.hint !== null);
  const right = fill(w.right, { n: task.n, list: task.right.join(", "), stars: starText(stars) });
  const said =
    d.said?.kind === "notice" ? `${w.notices[d.said.key]} ${right}`
    : d.done ? right
    : d.said?.kind === "wrong" ? (d.said.more ? w.more : w.wrongOff)
    : d.chosen.length ? fill(w.chosen, { n: d.chosen.length })
    : fill(w.hint, { n: task.n });
  const hintText = d.hint !== null && !d.done && fill(w.hintText, { d: d.hint, rule: (t.mentalWords.rules.rule as Record<string, string>)[String(d.hint)] ?? "", test: ruleTest(task.n, d.hint) });
  // Under the number: each divisor with what it gives once done, or the red ones with what is left over.
  const sums = d.done
    ? task.right.map((k) => ({ k, text: `÷ ${k} = ${divide(task.n, k).q}`, color: GREEN }))
    : d.wrong.map((k) => ({ k, text: `÷ ${k} = ${fill(w.remainder, divide(task.n, k))}`, color: RED }));
  const perRow = 4;
  return (
    <>
      <GameNav ladder={ladder} mode={d.mode} stage={d.stage} level={d.level} streak={d.streak} onPuzzle={go} onEndless={endless} words={w} g={g} />
      <div className="geo-stage-wrap">
        <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} role="img" aria-label={fill(w.which, { n: task.n })}>
          <rect width={W} height={H} fill="#fff" />
          <text x={W / 2} y={96} fontSize={72} fontWeight={700} textAnchor="middle" fill={d.done ? GREEN : INK}>{task.n}</text>
          {sums.map((s, i) => {
            const row = Math.floor(i / perRow);
            const inRow = Math.min(perRow, sums.length - row * perRow);
            const x = W / 2 + ((i % perRow) - (inRow - 1) / 2) * (W / perRow);
            return (
              <text key={s.k} x={x} y={146 + row * 32} fontSize={20} fontWeight={700} textAnchor="middle" fill={s.color}>{s.text}</text>
            );
          })}
        </svg>
        {cheer > 0 && d.done && <Cheer key={cheer} text={starText(stars)} />}
      </div>
      <div className="live-bar div-options">
        {task.offered.map((k) => {
          const on = d.chosen.includes(k);
          const state = d.done ? (divides(k) ? " right" : "") : d.wrong.includes(k) ? " wrong" : on ? " on" : "";
          return (
            <button key={k} className={`live-btn${state}`} aria-pressed={on} disabled={d.done} onClick={() => tap(k)}>{k}</button>
          );
        })}
      </div>
      <div className="live-bar">
        {!d.done && d.hint === null && <button className="live-btn" title={w.hintCost} onClick={() => set({ ...d, hint: hintDivisor(task, d.chosen) })}>💡 {w.hintBtn}</button>}
        {d.done ? (
          <Onward mode={d.mode} stage={d.stage} size={DIV_LADDER.length} onClick={onward} g={g} />
        ) : (
          // Every number divides by one of them at least, so there is nothing to check before one is chosen.
          <button className="live-btn on" disabled={!d.chosen.length} onClick={check}>{g.check}</button>
        )}
        <SoundToggle title={g.sound} />
      </div>
      <p className={d.said?.kind === "notice" ? "live-said notice" : d.done ? "live-said ok" : d.said?.kind === "wrong" ? "live-said" : "live-hint"}>
        {said} <Found ladder={ladder} of={DIV_NOTICES.length} notices={w.notices} g={g} />
      </p>
      {hintText && <p className="live-hint">💡 {hintText}</p>}
    </>
  );
}
