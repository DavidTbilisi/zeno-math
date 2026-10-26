// Divisible by? A number and a row of divisors: tap every one that divides it exactly, then check. A divisor chosen
// wrongly turns red, with the number divided by it and what is left over; if the ones chosen are right but some are
// missing, the board says so. Right at the first check earns three stars, at the second two; the hint — the test for
// one divisor applied to this number (its last digits, its digit sum), as the Divisibility tab writes it — costs one.
// Nine puzzles open in turn (2, 5 and 10; then 3 and 9; then 4, 6 and 8), and the endless run keeps a streak of numbers
// right at the first check without the hint. Built on the game shell (useGame), which does the ladder, the sounds and
// the cheer.
import { useI18n } from "../i18n";
import { divide, DIV_LADDER, DIV_NOTICES, divNotice, divNow, divStars, hintDivisor, ruleTest, type LiveDivisible } from "../math/divisible";
import { starText } from "./ladderUi";
import { fill, FONT, INK, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";

const W = 560;
const H = 210;
const GREEN = "#2f9e44";
const RED = "#e03131";

const FRESH: Partial<LiveDivisible> = { chosen: [], wrong: [], misses: 0, hint: null, done: false, said: null };

export function Divisible({ state: d, set, w: words, svgRef }: PieceProps<"divisible">) {
  const [w, g] = [words.divisible, words.game];
  const { t } = useI18n();
  const game = useGame({ key: "zeno.divisible.v1", size: DIV_LADDER.length, notices: DIV_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const task = divNow(d);
  const divides = (k: number) => task.right.includes(k);
  const stars = divStars(d.misses, d.hint !== null);

  const tap = (k: number) => {
    if (d.done) return;
    const chosen = d.chosen.includes(k) ? d.chosen.filter((c) => c !== k) : [...d.chosen, k].sort((a, b) => a - b);
    game.tap({ chosen, wrong: [], said: null });
  };
  const check = () => {
    const wrong = d.chosen.filter((k) => !divides(k));
    if (wrong.length || d.chosen.length < task.right.length) return game.miss({ wrong, misses: d.misses + 1, said: { kind: "wrong", more: !wrong.length } });
    const hinted = d.hint !== null;
    game.win({
      stars: divStars(d.misses, hinted),
      clean: d.misses === 0 && !hinted,
      notice: (streak) => divNotice(task, d.misses, hinted, game.sinceShown(), streak),
      patch: { wrong: [], done: true },
    });
  };

  const right = `${fill(w.right, { n: task.n, list: task.right.join(", "), stars: starText(stars) })}${d.mode === "puzzle" && stars === 1 ? ` ${g.oneStar}` : ""}`;
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]} ${right}` }
    : d.done ? { tone: "ok", text: right }
    : d.said?.kind === "wrong" ? { tone: "wrong", text: d.said.more ? w.more : w.wrongOff }
    : { tone: "hint", text: d.chosen.length ? fill(w.chosen, { n: d.chosen.length }) : fill(w.hint, { n: task.n }) };
  const hintText = d.hint !== null && !d.done && fill(w.hintText, { d: d.hint, rule: (t.mentalWords.rules.rule as Record<string, string>)[String(d.hint)] ?? "", test: ruleTest(task.n, d.hint) });
  // Under the number: each divisor with what it gives once done, or the red ones with what is left over.
  const sums = d.done
    ? task.right.map((k) => ({ k, text: `÷ ${k} = ${divide(task.n, k).q}`, color: GREEN }))
    : d.wrong.map((k) => ({ k, text: `÷ ${k} = ${fill(w.remainder, divide(task.n, k))}`, color: RED }));
  const perRow = 4;
  return (
    <>
      <GameHead game={game} g={g}>
        <Stake stars={stars} tries={d.misses} g={g} />
      </GameHead>
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
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
      </Stage>
      <div className="live-bar div-options">
        {task.offered.map((k) => {
          const on = d.chosen.includes(k);
          const state = d.done ? (divides(k) ? " right" : "") : d.wrong.includes(k) ? " wrong" : on ? " on" : "";
          return (
            <button key={k} className={`live-btn${state}`} aria-pressed={on} disabled={d.done} onClick={() => tap(k)}>{k}</button>
          );
        })}
      </div>
      <GameActions game={game} g={g} done={d.done}>
        {d.hint === null && <button className="live-btn" title={w.hintCost} onClick={() => set({ ...d, hint: hintDivisor(task, d.chosen) })}>💡 {w.hintBtn}</button>}
        {/* Every number divides by one of them at least, so there is nothing to check before one is chosen. */}
        <button className="live-btn on" disabled={!d.chosen.length} onClick={check}>{g.check}</button>
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
      {hintText && <p className="live-hint">💡 {hintText}</p>}
    </>
  );
}
