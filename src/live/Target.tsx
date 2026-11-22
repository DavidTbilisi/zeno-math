// Make the target: number cards and a target; tap cards and signs to build a sum, and what it makes so far shows as it
// grows. A sum that makes the target counts; a second, different way earns the third star (3 + 4 and 4 + 3 are one
// way), and the hint — the first step of one way — leaves one. Nine puzzles open in turn; the endless run keeps a streak
// of puzzles made without a hint. Built on the game shell (useGame): each new way to the target wins the puzzle again,
// for more stars; only the first counts on the streak. Worked by hand: a card or sign is dragged from the trays into
// the sum's row, where it is let go (or tapped, to go at the end); a piece of the row is dragged out or into the bin (or
// tapped) to take it back, and the bin tapped clears the row. The hint is a bulb in the corner, the endless run's skip a
// pill.
import { canonical, firstStep, judgeTarget, parseSum, pieceText, qText, sumSource, sumValue, TARGET_LADDER, TARGET_NOTICES, targetNotice, targetNow, targetStars, type LiveTarget, type Piece } from "../math/target";
import { starText } from "./ladderUi";
import { Bin, BLUE, GREEN, inBox, keyTap, MUTED, Pill, RED, useDrag } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const W = 600;
/** The sum's row (where pieces are let go), the card tray and the sign tray under it, and the bin beside the trays. */
const [ROW_Y, CARD_Y, SIGN_Y] = [112, 172, 248];
const [CHIP_H, CARD_W, CARD_H, SIGN_S] = [44, 60, 60, 46];
const H = SIGN_Y + SIGN_S + 14;
const ROW = { x: 0, y: ROW_Y - 36, w: W, h: 72 };
const BIN = { x: W - 118, y: CARD_Y, w: 100, h: SIGN_Y + SIGN_S - CARD_Y };
/** How wide a piece of the row is drawn: room for its text. */
const chipW = (text: string) => 18 + 15 * text.length;
type Grab = { from: "row"; i: number } | { from: "tray"; piece: Piece };
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
  // The row's pieces, laid out from its left end; `slot` is where a piece let go at x goes in.
  const texts = d.sum.map((x) => pieceText(x, p.cards));
  const widths = texts.map(chipW);
  const lefts = widths.map((_, i) => 32 + widths.slice(0, i).reduce((a, b) => a + b + 6, 0));
  const rowEnd = d.sum.length ? lefts[d.sum.length - 1] + widths[d.sum.length - 1] : 32;
  const slot = (x: number) => lefts.filter((l, i) => l + widths[i] / 2 < x).length;
  const put = (piece: Piece, at = d.sum.length) => {
    if ("card" in piece && used.has(piece.card)) return;
    build([...d.sum.slice(0, at), piece, ...d.sum.slice(at)]);
  };
  const takeOut = (i: number) => build(d.sum.filter((_, j) => j !== i));
  const { drag, begin, svgProps } = useDrag<Grab>((t) => {
    const inRow = inBox(ROW, t.x, t.y);
    if (t.from === "tray") {
      if (!t.moved) put(t.piece);
      else if (inRow) put(t.piece, slot(t.x));
    } else if (!t.moved || !inRow) takeOut(t.i);
    else {
      // A piece of the row dragged along it moves to where it is let go.
      const rest = d.sum.filter((_, j) => j !== t.i);
      const at = lefts.filter((l, j) => j !== t.i && l + widths[j] / 2 < t.x).length;
      build([...rest.slice(0, at), d.sum[t.i], ...rest.slice(at)]);
    }
  });
  const grabbed = drag?.moved ? (drag.from === "row" ? d.sum[drag.i] : drag.piece) : null;
  const taking = drag?.moved && drag.from === "row" && !inBox(ROW, drag.x, drag.y);
  const dropping = drag?.moved && drag.from === "tray" && inBox(ROW, drag.x, drag.y);
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
        <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} className="hand-pic" style={{ touchAction: "none" }} {...svgProps} aria-label={fill(w.make, { t: p.target })}>
          <rect width={W} height={H} fill="#fff" />
          <text x={W / 2} y={54} fontSize={46} fontWeight={700} textAnchor="middle" fill="#e8590c">🎯 {p.target}</text>
          {!made && !d.hinted && (
            <g role="button" tabIndex={0} aria-label={`${w.hintBtn}: ${w.hintCost}`} style={{ cursor: "pointer" }}
              onPointerDown={(e) => e.stopPropagation()} onClick={() => set({ ...d, hinted: true })} onKeyDown={(e) => keyTap(e, () => set({ ...d, hinted: true }))}>
              <title>{w.hintCost}</title>
              <circle cx={W - 30} cy={30} r={20} fill="#fff9db" stroke="#fab005" strokeWidth={2} />
              <text x={W - 30} y={37} fontSize={20} textAnchor="middle">💡</text>
            </g>
          )}
          {!made && d.mode === "endless" && <Pill x={14} y={14} w={90} h={30} text={w.skip} onTap={skip} />}
          {/* The sum's row: a dashed slot to let pieces go in, the pieces so far, and what they make. */}
          <rect x={20} y={ROW_Y - CHIP_H / 2 - 8} width={W - 40} height={CHIP_H + 16} rx={10} fill={dropping ? "#e7f5ff" : "#f8f9fa"} stroke={dropping ? BLUE : "#ced4da"} strokeWidth={dropping ? 2.5 : 1.5} strokeDasharray="6 4" />
          {!d.sum.length && <text x={W / 2} y={ROW_Y + 7} fontSize={20} textAnchor="middle" fill={MUTED}>…</text>}
          {texts.map((t, i) => {
            const card = "card" in d.sum[i];
            const away = drag?.moved && drag.from === "row" && drag.i === i;
            return (
              <g key={i} role="button" tabIndex={0} aria-label={fill(w.takeOut, { p: t })} opacity={away ? 0.3 : 1} style={{ cursor: "grab" }}
                onPointerDown={(e) => begin(e, { from: "row", i })} onKeyDown={(e) => keyTap(e, () => takeOut(i))}>
                <rect x={lefts[i]} y={ROW_Y - CHIP_H / 2} width={widths[i]} height={CHIP_H} rx={8} fill={card ? "#fff3bf" : "#fff"} stroke={card ? "#fab005" : "#adb5bd"} strokeWidth={2} />
                <text x={lefts[i] + widths[i] / 2} y={ROW_Y + 9} fontSize={26} fontWeight={700} textAnchor="middle" fill={right ? GREEN : INK} pointerEvents="none">{t}</text>
              </g>
            );
          })}
          {value && d.sum.length > 0 && (
            <text x={rowEnd + 12} y={ROW_Y + 9} fontSize={24} fontWeight={700} fill={right ? GREEN : MUTED} pointerEvents="none">= {qText(value)}</text>
          )}
          {/* The trays: the cards (a used one paler), then the signs and brackets. */}
          {p.cards.map((c, i) => {
            const x = 20 + i * (CARD_W + 10);
            const off = used.has(i);
            return (
              <g key={i} role="button" tabIndex={off ? -1 : 0} aria-label={fill(w.card, { n: c })} aria-disabled={off || undefined} opacity={off ? 0.35 : 1}
                style={{ cursor: off ? "default" : "grab" }} onPointerDown={(e) => !off && begin(e, { from: "tray", piece: { card: i } })}
                onKeyDown={(e) => keyTap(e, () => put({ card: i }))}>
                <rect x={x} y={CARD_Y} width={CARD_W} height={CARD_H} rx={8} fill="#fff3bf" stroke="#fab005" strokeWidth={2} />
                <text x={x + CARD_W / 2} y={CARD_Y + CARD_H / 2 + 10} fontSize={28} fontWeight={700} textAnchor="middle" fill={INK} pointerEvents="none">{c}</text>
              </g>
            );
          })}
          {[...p.ops.map((op): Piece => ({ op })), { paren: "(" } as Piece, { paren: ")" } as Piece].map((piece, i) => {
            const x = 20 + i * (SIGN_S + 10);
            const t = pieceText(piece, p.cards);
            return (
              <g key={t} role="button" tabIndex={0} aria-label={t} style={{ cursor: "grab" }} onPointerDown={(e) => begin(e, { from: "tray", piece })} onKeyDown={(e) => keyTap(e, () => put(piece))}>
                <rect x={x} y={SIGN_Y} width={SIGN_S} height={SIGN_S} rx={8} fill="#fff" stroke="#adb5bd" strokeWidth={2} />
                <text x={x + SIGN_S / 2} y={SIGN_Y + SIGN_S / 2 + 8} fontSize={24} fontWeight={700} textAnchor="middle" fill={INK} pointerEvents="none">{t}</text>
              </g>
            );
          })}
          <Bin {...BIN} hot={!!taking && inBox(BIN, drag.x, drag.y)} label={g.clear} title={w.clearTitle} onTap={() => d.sum.length && set({ ...d, sum: [], said: null })} />
          {grabbed && drag && (
            <g pointerEvents="none" opacity={0.85}>
              <rect x={drag.x - chipW(pieceText(grabbed, p.cards)) / 2} y={drag.y - CHIP_H / 2} width={chipW(pieceText(grabbed, p.cards))} height={CHIP_H} rx={8}
                fill={taking ? "#ffc9c9" : "card" in grabbed ? "#fff3bf" : "#fff"} stroke={taking ? RED : "card" in grabbed ? "#fab005" : "#adb5bd"} strokeWidth={2} />
              <text x={drag.x} y={drag.y + 9} fontSize={26} fontWeight={700} textAnchor="middle" fill={INK}>{pieceText(grabbed, p.cards)}</text>
            </g>
          )}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={made} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
