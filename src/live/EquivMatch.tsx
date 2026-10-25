// Equal amounts: cards to pair up (or put in threes at hard) — a fraction and its picture, a fraction and an equal one
// with bigger numbers, a fraction with its decimal and its percentage. Tap the cards that go together; they turn green
// and stay, and two that don't go together flash red. Clearing the board with no misses earns three stars. The endless
// run deals board after board and keeps a streak of groups made without a miss. Built on the game shell (useGame),
// which does the ladder, the sounds and the cheer.
import { EQ_LADDER, EQ_NOTICES, eqNotice, eqNow, eqStars, groupSize, partsSvg, same, type Card, type LiveEquiv } from "../math/equivMatch";
import { fill, FONT, INK, SvgFrac, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";
import { starText } from "./ladderUi";

const [CW, CH, GAP] = [132, 92, 12];

const FRESH: Partial<LiveEquiv> = { cleared: [], picked: [], misses: 0, said: null };

function Face({ c, x, y }: { c: Card; x: number; y: number }) {
  const [cx, cy] = [x + CW / 2, y + CH / 2];
  if (c.kind === "frac") return <SvgFrac n={c.n} d={c.d} x={cx} y={cy - 4} size={26} />;
  if (c.kind === "pic") return <g transform={`translate(${x + 10} ${cy - 16})`} dangerouslySetInnerHTML={{ __html: partsSvg(c.n, c.d, CW - 20, 32) }} />;
  return <text x={cx} y={cy + 10} fontSize={28} fontWeight={700} textAnchor="middle" fill={INK}>{c.text}</text>;
}

export function EquivMatch({ state: d, set, w: words, svgRef }: PieceProps<"equivMatch">) {
  const [w, g] = [words.equivMatch, words.game];
  const game = useGame({ key: "zeno.equivmatch.v1", size: EQ_LADDER.length, notices: EQ_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const cards = eqNow(d);
  const level = d.mode === "puzzle" ? EQ_LADDER[d.stage].level : d.level;
  const size = groupSize(level);
  const cols = cards.length === 9 ? 3 : 4;
  const rows = Math.ceil(cards.length / cols);
  const [W, H] = [cols * (CW + GAP) + GAP, rows * (CH + GAP) + GAP];
  const done = d.cleared.length === cards.length;
  const stars = eqStars(d.misses);

  const tap = (i: number) => {
    if (done || d.cleared.includes(i)) return;
    if (d.picked.includes(i)) return set({ ...d, picked: d.picked.filter((j) => j !== i), said: null });
    const picked = [...d.picked, i];
    if (!same(cards[picked[0]], cards[i])) return game.miss({ picked: [], misses: d.misses + 1, said: { kind: "miss", a: picked[0], b: i } });
    if (picked.length < size) return set({ ...d, picked, said: null });
    // A whole group: it stays, green, and counts on the streak; the last one clears the board.
    const cleared = [...d.cleared, ...picked];
    const all = cleared.length === cards.length;
    const notice = (streak: number) => eqNotice(level, all, d.misses, game.sinceShown(), streak);
    if (!all) return game.step({ cleared, picked: [] }, { notice });
    game.win({ stars, clean: true, notice, patch: { cleared, picked: [] } });
  };

  const missed = d.said?.kind === "miss" ? [d.said.a, d.said.b] : [];
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]}${done ? ` ${fill(w.done, { stars: starText(stars) })}` : ""}` }
    : done ? { tone: "ok", text: `${fill(w.done, { stars: starText(stars) })}${d.mode === "puzzle" && stars === 1 ? ` ${g.oneStar}` : ""}` }
    : d.said?.kind === "miss" ? { tone: "wrong", text: w.miss }
    : { tone: "hint", text: size === 3 ? w.hintThrees : w.hint };
  return (
    <>
      <GameHead game={game} g={g} words={w}>
        <span className="est-streak">{fill(w.misses, { n: d.misses })}</span>
      </GameHead>
      <Stage game={game} stars={stars} done={done} g={g} notices={w.notices}>
        <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} role="group" aria-label={size === 3 ? w.hintThrees : w.hint}>
          <rect width={W} height={H} fill="#fff" />
          {cards.map((c, i) => {
            const [x, y] = [GAP + (i % cols) * (CW + GAP), GAP + Math.floor(i / cols) * (CH + GAP)];
            const state = d.cleared.includes(i) ? "cleared" : d.picked.includes(i) ? "picked" : missed.includes(i) ? "missed" : "";
            return (
              <g key={i} className={`eq-card ${state}`} role="button" aria-label={c.kind === "pic" ? fill(w.picture, { n: c.n, d: c.d }) : c.text} aria-pressed={state === "picked"} style={{ cursor: state === "cleared" ? "default" : "pointer" }} onClick={() => tap(i)}>
                <rect x={x} y={y} width={CW} height={CH} rx={10} fill={state === "cleared" ? "#d3f9d8" : state === "picked" ? "#d0ebff" : state === "missed" ? "#ffe3e3" : "#f8f9fa"} stroke={state === "cleared" ? "#2f9e44" : state === "picked" ? "#1971c2" : state === "missed" ? "#e03131" : "#ced4da"} strokeWidth={state ? 3 : 2} />
                <g opacity={state === "cleared" ? 0.55 : 1}>
                  <Face c={c} x={x} y={y} />
                </g>
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
