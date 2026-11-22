// Divisible by? A number and a row of divisors: tap every one that divides it exactly, then check. A divisor chosen
// wrongly turns red, with the number divided by it and what is left over; if the ones chosen are right but some are
// missing, the board says so. Right at the first check earns three stars, at the second two; the hint — the test for
// one divisor applied to this number (its last digits, its digit sum), as the Divisibility tab writes it — costs one.
// Nine puzzles open in turn (2, 5 and 10; then 3 and 9; then 4, 6 and 8), and the endless run keeps a streak of numbers
// right at the first check without the hint. Built on the game shell (useGame), which does the ladder, the sounds and
// the cheer. Worked by hand: the divisors are tiles in a tray, dragged (or tapped) into the box under the number; the
// number itself is tapped to check, and a bulb in the corner gives the hint.
import { useI18n } from "../i18n";
import { divide, DIV_LADDER, DIV_NOTICES, divNotice, divNow, divStars, hintDivisor, ruleTest, type LiveDivisible } from "../math/divisible";
import { starText } from "./ladderUi";
import { inBox, keyTap, useDrag, type DragAt } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";

const W = 560;
const H = 300;
/** The box the divisors go in, and the tray they wait in. */
const BOX = { x: 20, y: 112, w: W - 40, h: 92 };
const TRAY = { x: 20, y: 216, w: W - 40, h: 76 };
const T = 50;
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
  const { drag, begin, svgProps } = useDrag<{ k: number }>((g: DragAt<{ k: number }>) => {
    if (!g.moved) return tap(g.k);
    const into = inBox(BOX, g.x, g.y);
    if (into !== d.chosen.includes(g.k) && (into || inBox(TRAY, g.x, g.y))) tap(g.k);
  });
  // Each tile's place: in the box (in the order chosen) or in the tray (in the order offered), centred in its row.
  const inside = d.done ? task.right : d.chosen;
  const row = (ks: number[], y: number) => new Map(ks.map((k, i) => [k, { x: W / 2 + (i - (ks.length - 1) / 2) * (T + 12) - T / 2, y }]));
  const at = new Map([...row(task.offered.filter((k) => !inside.includes(k)), TRAY.y + 13), ...row(inside, BOX.y + 12)]);
  const note = (k: number) =>
    d.done ? divides(k) && { text: `÷ ${k} = ${divide(task.n, k).q}`, color: GREEN }
    : d.wrong.includes(k) && { text: fill(w.remainder, divide(task.n, k)), color: RED };
  const canCheck = !d.done && d.chosen.length > 0;
  const check1 = () => canCheck && check();
  const hintOn = d.hint === null && !d.done;
  const giveHint = () => set({ ...d, hint: hintDivisor(task, d.chosen) });
  return (
    <>
      <GameHead game={game} g={g}>
        <Stake stars={stars} tries={d.misses} g={g} />
      </GameHead>
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} className="hand-pic" aria-label={fill(w.which, { n: task.n })}
          style={{ touchAction: "none" }} {...svgProps}>
          <rect width={W} height={H} fill="#fff" />
          {/* Every number divides by one of them at least, so there is nothing to check before one is chosen. */}
          <g role="button" tabIndex={canCheck ? 0 : -1} aria-label={fill(w.checkTap, { n: task.n })} aria-disabled={!canCheck || undefined}
            style={{ cursor: canCheck ? "pointer" : "default" }} onPointerDown={(e) => e.stopPropagation()} onClick={check1} onKeyDown={(e) => keyTap(e, check1)}>
            {canCheck && <title>{fill(w.checkTap, { n: task.n })}</title>}
            <rect x={W / 2 - 150} y={14} width={300} height={90} rx={14} fill={canCheck ? "#f1f8ff" : "transparent"} />
            <text x={W / 2} y={86} fontSize={72} fontWeight={700} textAnchor="middle" fill={d.done ? GREEN : INK}>{task.n}</text>
          </g>
          {hintOn && (
            <g role="button" tabIndex={0} aria-label={`${w.hintBtn}: ${w.hintCost}`} style={{ cursor: "pointer" }} onPointerDown={(e) => e.stopPropagation()}
              onClick={giveHint} onKeyDown={(e) => keyTap(e, giveHint)}>
              <title>{w.hintCost}</title>
              <circle cx={W - 34} cy={34} r={22} fill="#fff9db" stroke="#fab005" strokeWidth={1.5} />
              <text x={W - 34} y={43} fontSize={24} textAnchor="middle" pointerEvents="none">💡</text>
            </g>
          )}
          <rect {...{ x: BOX.x, y: BOX.y, width: BOX.w, height: BOX.h }} rx={12} fill={drag?.moved && inBox(BOX, drag.x, drag.y) ? "#e7f5ff" : "#f8f9fa"}
            stroke={d.done ? GREEN : "#74c0fc"} strokeWidth={2} strokeDasharray={d.done ? undefined : "7 5"} />
          <text x={BOX.x + 4} y={BOX.y - 5} fontSize={12} fill="#868e96">{fill(w.box, { n: task.n })}</text>
          {task.offered.map((k) => {
            const p = at.get(k)!;
            const moving = drag?.k === k && drag.moved;
            const [x, y] = moving ? [drag.x - T / 2, drag.y - T / 2] : [p.x, p.y];
            const n = note(k);
            const wrong = d.wrong.includes(k);
            const tone = d.done ? (divides(k) ? GREEN : "#ced4da") : wrong ? RED : inside.includes(k) ? "#1971c2" : "#adb5bd";
            return (
              <g key={k} role="button" tabIndex={d.done ? -1 : 0} aria-label={String(k)} aria-pressed={d.chosen.includes(k)}
                style={{ cursor: d.done ? "default" : moving ? "grabbing" : "grab" }}
                onPointerDown={(e) => !d.done && begin(e, { k })} onKeyDown={(e) => !d.done && keyTap(e, () => tap(k))}>
                <rect x={x} y={y} width={T} height={T} rx={9} fill={wrong ? "#fff5f5" : d.done && divides(k) ? "#ebfbee" : "#fff"} stroke={tone} strokeWidth={2.5} />
                <text x={x + T / 2} y={y + T / 2 + 9} fontSize={26} fontWeight={700} textAnchor="middle" fill={d.done && !divides(k) ? "#adb5bd" : INK} pointerEvents="none">{k}</text>
                {n && !moving && <text x={x + T / 2} y={y + T + 18} fontSize={14} fontWeight={700} textAnchor="middle" fill={n.color} pointerEvents="none">{n.text}</text>}
              </g>
            );
          })}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.done} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
      {hintText && <p className="live-hint">💡 {hintText}</p>}
    </>
  );
}
