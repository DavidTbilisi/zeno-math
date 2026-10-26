// Equal expressions: cards to pair up, each with the simplest way to write it — like terms collected, brackets
// multiplied out, products and powers — with a near miss on the board too (2x + 3 beside 2(x + 3)). Tap two that are
// equal for every x; they turn green and stay, and two that aren't flash red. Clearing the board with no misses earns
// three stars. The endless run deals board after board and keeps a streak of pairs made without a miss. Built on the
// game shell (useGame), which does the ladder, the sounds and the cheer.
import { EXPR_LADDER, EXPR_NOTICES, exprNotice, exprNow, exprStars, same, type LiveExprMatch } from "../math/exprMatch";
import { fill, FONT, INK, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";
import { starText } from "./ladderUi";

const [CW, CH, GAP, COLS] = [170, 80, 12, 4];

const FRESH: Partial<LiveExprMatch> = { cleared: [], picked: [], misses: 0, said: null };

export function ExprMatch({ state: d, set, w: words, svgRef }: PieceProps<"exprMatch">) {
  const [w, g] = [words.exprMatch, words.game];
  const game = useGame({ key: "zeno.exprmatch.v1", size: EXPR_LADDER.length, notices: EXPR_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const cards = exprNow(d);
  const level = d.mode === "puzzle" ? EXPR_LADDER[d.stage].level : d.level;
  const rows = Math.ceil(cards.length / COLS);
  const [W, H] = [COLS * (CW + GAP) + GAP, rows * (CH + GAP) + GAP];
  const done = d.cleared.length === cards.length;
  const stars = exprStars(d.misses);

  const tap = (i: number) => {
    if (done || d.cleared.includes(i)) return;
    if (d.picked.includes(i)) return set({ ...d, picked: [], said: null });
    if (!d.picked.length) return set({ ...d, picked: [i], said: null });
    const a = d.picked[0];
    if (!same(cards[a], cards[i])) return game.miss({ picked: [], misses: d.misses + 1, said: { kind: "miss", a, b: i } });
    const cleared = [...d.cleared, a, i];
    // Every pair counts on the streak; the last one clears the board.
    if (cleared.length < cards.length) return game.step({ cleared, picked: [] }, { notice: (streak) => exprNotice(level, false, d.misses, streak) });
    game.win({ stars, clean: true, notice: (streak) => exprNotice(level, true, d.misses, streak), patch: { cleared, picked: [] } });
  };

  const missed = d.said?.kind === "miss" ? [d.said.a, d.said.b] : [];
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]}${done ? ` ${fill(w.done, { stars: starText(stars) })}` : ""}` }
    : done ? { tone: "ok", text: `${fill(w.done, { stars: starText(stars) })}${d.mode === "puzzle" && stars === 1 ? ` ${g.oneStar}` : ""}` }
    : d.said?.kind === "miss" ? { tone: "wrong", text: fill(w.miss, { a: cards[d.said.a].text, b: cards[d.said.b].text }) }
    : { tone: "hint", text: w.hint };
  return (
    <>
      <GameHead game={game} g={g}>
        <span className="est-streak">{fill(w.misses, { n: d.misses })}</span>
      </GameHead>
      <Stage game={game} stars={stars} done={done} g={g} notices={w.notices}>
        <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} role="group" aria-label={w.hint}>
          <rect width={W} height={H} fill="#fff" />
          {cards.map((c, i) => {
            const [x, y] = [GAP + (i % COLS) * (CW + GAP), GAP + Math.floor(i / COLS) * (CH + GAP)];
            const state = d.cleared.includes(i) ? "cleared" : d.picked.includes(i) ? "picked" : missed.includes(i) ? "missed" : "";
            return (
              <g key={i} className={`eq-card ${state}`} role="button" aria-label={c.text} aria-pressed={state === "picked"} style={{ cursor: state === "cleared" ? "default" : "pointer" }} onClick={() => tap(i)}>
                <rect x={x} y={y} width={CW} height={CH} rx={10} fill={state === "cleared" ? "#d3f9d8" : state === "picked" ? "#d0ebff" : state === "missed" ? "#ffe3e3" : "#f8f9fa"} stroke={state === "cleared" ? "#2f9e44" : state === "picked" ? "#1971c2" : state === "missed" ? "#e03131" : "#ced4da"} strokeWidth={state ? 3 : 2} />
                <text x={x + CW / 2} y={y + CH / 2 + 8} fontSize={c.text.length > 13 ? 17 : 22} fontWeight={700} textAnchor="middle" fill={INK} opacity={state === "cleared" ? 0.55 : 1}>{c.text}</text>
              </g>
            );
          })}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={done} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
