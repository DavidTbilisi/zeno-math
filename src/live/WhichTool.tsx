// Which tool?: a problem on a card, and under it the tiles of its set's tools; the player taps the tool that fits (or
// presses its number) without solving the problem. A wrong tile is not taken: the stage shakes, the line says what
// that tool is for, the card shows the problem solved by its own tool in two lines, and that tool's tile is lit, to tap
// on. Where two tools work both count, and the slower keeps the round from three stars. One game a set (fractions, word
// problems, equations, quadratics), each with its own ladder; against the clock once the ladder opens it. Built on the
// game shell (useGame), which does the ladder, the clock, the sounds and the cheer.
import type { KeyboardEvent } from "react";
import { useI18n } from "../i18n";
import { wrap } from "../math/chart";
import { barPart } from "../math/skills/barModels";
import { asked, checkTile, plainOf, replay, slowPicks, TOOLS, WHICH_LADDERS, WHICH_NOTICES, whichNotice, whichNow, whichStars, type LiveWhich, type Problem, type Group, type Tok, type Tool, type WhichSaid } from "../math/whichTool";
import { GREEN, keyTap, MUTED, RED } from "./hand";
import { starText } from "./ladderUi";
import { fill, FONT, INK, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";

const FRESH: Partial<LiveWhich> = { ops: [], misses: 0, done: false, said: null };
const W = 560;
const ORANGE = "#f08c00";

// ---------- written maths ----------

const GEORGIAN = /[\u10A0-\u10FF\u1C90-\u1CBF\u2D00-\u2D2F]/;
/** About how wide a run of text is at a size, letter by letter (Helvetica's widths, near enough). */
const textW = (s: string, size: number) =>
  [...s].reduce((sum, ch) => sum + (ch === " " ? 0.28 : GEORGIAN.test(ch) ? 0.75 : "()[],.;:²|".includes(ch) ? 0.33 : 0.56), 0) * size;
const FRAC = 0.8;
const tokW = (t: Tok, size: number) => (typeof t === "string" ? textW(t, size) : Math.max(textW(t.n, size * FRAC), textW(t.d, size * FRAC)) + 8);
const lineW = (toks: readonly Tok[], size: number) => toks.reduce((s, t) => s + tokW(t, size), 0);
const stacked = (toks: readonly Tok[]) => toks.some((t) => typeof t !== "string");
/** How tall a line of maths stands: a fraction needs room above and below its bar. */
const lineH = (toks: readonly Tok[], size: number) => (stacked(toks) ? size * 2.2 : size * 1.5);
/** The size a line is drawn at to fit `max` wide. */
const fitSize = (toks: readonly Tok[], size: number, max: number) => Math.min(size, (size * max) / Math.max(1, lineW(toks, size)));
/** Words and signs next to each other as one run, so they are drawn as one text with the font's own spacing. */
const runs = (toks: readonly Tok[]): Tok[] => toks.reduce<Tok[]>((out, t) => {
  const last = out[out.length - 1];
  if (typeof t === "string" && typeof last === "string") out[out.length - 1] = last + t;
  else out.push(t);
  return out;
}, []);

/** A line of maths with its middle (the fraction bars) at y, starting at x or centred on it. */
function MathLine({ toks, x, y, size, color = INK, middle }: { toks: readonly Tok[]; x: number; y: number; size: number; color?: string; middle?: boolean }) {
  const parts = runs(toks);
  let at = middle ? x - lineW(parts, size) / 2 : x;
  const f = size * FRAC;
  return (
    <g fill={color} aria-hidden>
      {parts.map((t, i) => {
        const w = tokW(t, size);
        const x0 = at;
        at += w;
        if (typeof t === "string")
          return (
            <text key={i} x={x0} y={y + size * 0.35} fontSize={size} xmlSpace="preserve">
              {t}
            </text>
          );
        return (
          <g key={i}>
            <text x={x0 + w / 2} y={y - 5} fontSize={f} textAnchor="middle">{t.n}</text>
            <line x1={x0 + 2} y1={y} x2={x0 + w - 2} y2={y} stroke={color} strokeWidth={1.6} />
            <text x={x0 + w / 2} y={y + f + 1} fontSize={f} textAnchor="middle">{t.d}</text>
          </g>
        );
      })}
    </g>
  );
}

// ---------- the piece ----------

/** The four sets' games are this one piece. */
type WhichProps = PieceProps<"whichWord"> | PieceProps<"whichFrac"> | PieceProps<"whichEq"> | PieceProps<"whichQuad">;
/** Where each set keeps its ladder in this browser (model/gameKeys.ts says the same). */
const LADDER: Record<Group, { key: string }> = {
  word: { key: "zeno.whichword.v1" },
  frac: { key: "zeno.whichfrac.v1" },
  eq: { key: "zeno.whicheq.v1" },
  quad: { key: "zeno.whichquad.v1" },
};

export function WhichTool({ state: d, set, w: words, svgRef }: WhichProps) {
  const [w, g] = [words.whichTool, words.game];
  const pw = useI18n().t.pracWords;
  const group = d.group;
  const game = useGame({ ...LADDER[group], size: WHICH_LADDERS[group].length, notices: WHICH_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const task = whichNow(d);
  const m = replay(task, d.ops);
  const all = TOOLS[group] as readonly Tool[];
  const stars = whichStars(d.misses, slowPicks(m));
  const name = (t: Tool) => w.tools[t];
  const now = asked(m);
  // The card shows the problem being asked, or once all are, the last one.
  const shown: Problem = now ?? task.items[task.items.length - 1];
  const wrongTile = d.said?.kind === "wrong" ? d.said.tile : null;

  const pick = (tile: number) => {
    if (d.done || !now) return;
    const c = checkTile(m, tile);
    if (!c.ok) return game.miss({ misses: d.misses + 1, said: { kind: "wrong", tile } });
    const ops = [...d.ops, tile];
    const after = replay(task, ops);
    const said: WhichSaid | null = c.slow ? { kind: "also", tile, k: m.k } : null;
    if (asked(after)) return game.step({ ops, said }, { counts: false });
    game.win({ stars: whichStars(d.misses, slowPicks(after)), clean: d.misses === 0, notice: (streak) => whichNotice(after, d.misses, streak), patch: { ops, done: true, said } });
  };
  // A tool's number picks it, against the clock the quickest way; the board's own keys must not see it.
  const keys = (e: KeyboardEvent) => {
    const n = Number(e.key);
    if (!Number.isInteger(n) || n < 1 || n > task.tools.length) return;
    e.preventDefault();
    e.stopPropagation();
    pick(all.indexOf(task.tools[n - 1]));
  };

  // ---------- the words ----------

  const word = shown.bar ? barPart(shown.bar, pw).prompt : "";
  const problemText = shown.bar ? word : plainOf(shown.show);
  const linesOf = (p: Problem): string[] | Tok[][] => (p.bar ? (w.barLines[p.bar.form] as string[]).map((l) => fill(l, p.vars)) : p.lines);
  const right = `${fill(w.right, { n: task.items.length, stars: starText(stars) })}${d.mode === "puzzle" && stars === 1 ? ` ${g.oneStar}` : ""}`;
  const also = d.said?.kind === "also" ? fill(w.also, { tool: name(all[d.said.tile]), right: name(task.items[d.said.k].tool) }) : "";
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]} ${right}` }
    : d.done ? { tone: "ok", text: also ? `${also} ${right}` : right }
    : wrongTile !== null ? { tone: "wrong", text: fill(w.wrong, { tool: name(all[wrongTile]), needs: w.needs[all[wrongTile]], right: name(shown.tool) }) }
    : also ? { tone: "near", text: also }
    : { tone: "hint", text: w.hint };

  // ---------- the picture ----------

  const pad = 16;
  const cardX = pad;
  const cardW = W - 2 * pad;
  const inner = cardW - 32;
  const cardY = 34;
  // The problem: words wrapped, or maths at a size that fits.
  const wordLines = shown.bar ? wrap(word, 62) : [];
  const size = shown.bar ? 0 : fitSize(shown.show, 28, inner);
  const probH = shown.bar ? wordLines.length * 21 + 8 : lineH(shown.show, size);
  // Solved by its tool, after a wrong pick.
  const solved = wrongTile !== null && !d.done ? linesOf(shown) : null;
  const solvedRows = solved
    ? shown.bar
      ? (solved as string[]).flatMap((l) => wrap(l, 70)).map((l) => ({ text: l, toks: null as Tok[] | null, size: 14, h: 20 }))
      : (solved as Tok[][]).map((toks) => {
          const s = fitSize(toks, 19, inner);
          return { text: plainOf(toks), toks, size: s, h: lineH(toks, s) };
        })
    : [];
  const solvedH = solved ? 26 + solvedRows.reduce((s, r) => s + r.h, 0) : 0;
  const cardH = 20 + probH + solvedH + 6;
  const tilesY = cardY + cardH + 16;
  const n = task.tools.length;
  const cols = n === 2 || n === 4 ? 2 : 3;
  const gap = 8;
  const tw = (cardW - gap * (cols - 1)) / cols;
  const th = 54;
  const H = tilesY + Math.ceil(n / cols) * (th + gap) + 8;
  const live = !d.done && !!now;
  const lastTool = m.k > 0 ? m.picks[m.k - 1] : null;

  let y = cardY + 20;
  const problem = shown.bar ? (
    <g fontSize={15} fill={INK}>
      {wordLines.map((l, i) => (
        <text key={i} x={cardX + 16} y={y + 10 + i * 21}>{l}</text>
      ))}
    </g>
  ) : (
    <MathLine toks={shown.show} x={W / 2} y={y + probH / 2 - 4} size={size} middle />
  );
  y += probH;
  const solvedPic = solved && (
    <g>
      <text x={cardX + 16} y={y + 18} fontSize={13} fontWeight={700} fill={GREEN}>{fill(w.solvedBy, { tool: name(shown.tool) })}</text>
      {solvedRows.map((r, i) => {
        const top = y + 26 + solvedRows.slice(0, i).reduce((s, q) => s + q.h, 0);
        return r.toks ? (
          <MathLine key={i} toks={r.toks} x={cardX + 16} y={top + r.h / 2} size={r.size} color={GREEN} />
        ) : (
          <text key={i} x={cardX + 16} y={top + 14} fontSize={r.size} fill={GREEN}>{r.text}</text>
        );
      })}
    </g>
  );

  return (
    <>
      <GameHead game={game} g={g}>
        <Stake stars={stars} tries={d.misses} g={g} />
      </GameHead>
      <Said line={{ tone: "prompt", text: w.ask }} />
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} role="group" aria-label={w.ask} onKeyDown={keys}>
          <rect width={W} height={H} fill="#fff" />
          <text x={pad} y={22} fontSize={13} fill={MUTED}>
            {`${w.sets[group]} · ${Math.min(m.k + 1, task.items.length)} / ${task.items.length}`}
          </text>
          {lastTool && (
            <text x={W - pad} y={22} fontSize={13} fontWeight={700} fill={GREEN} textAnchor="end">
              {`✓ ${name(lastTool)}`}
            </text>
          )}
          <g role="img" aria-label={`${w.problem}: ${problemText}`}>
            <rect x={cardX} y={cardY} width={cardW} height={cardH} rx={10} fill={live ? "#fff4e6" : "#ebfbee"} stroke={live ? ORANGE : GREEN} strokeWidth={2} />
            {problem}
            {solvedPic}
          </g>
          {solved && <desc>{solvedRows.map((r) => r.text).join(" ")}</desc>}
          {task.tools.map((t, i) => {
            const tile = all.indexOf(t);
            const [x, ty] = [pad + (i % cols) * (tw + gap), tilesY + Math.floor(i / cols) * (th + gap)];
            const isWrong = tile === wrongTile;
            const isRight = wrongTile !== null && !d.done && t === shown.tool;
            // The name in two lines at most, or three a size smaller (a long Georgian or Russian one).
            const lay = (fs: number) => ({ fs, lines: wrap(name(t), Math.floor((tw - 40) / (fs * 0.62))) });
            const big = lay(14);
            const { fs, lines: nameLines } = big.lines.length > 2 ? lay(12) : big;
            const act = () => pick(tile);
            return (
              <g
                key={t}
                role="button"
                tabIndex={live ? 0 : -1}
                aria-label={`${i + 1}: ${name(t)}`}
                aria-disabled={!live || undefined}
                style={{ cursor: live ? "pointer" : "default" }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={act}
                onKeyDown={(e) => keyTap(e, act)}
              >
                <rect
                  x={x}
                  y={ty}
                  width={tw}
                  height={th}
                  rx={8}
                  fill={isWrong ? "#fff5f5" : isRight ? "#ebfbee" : "#f8f9fa"}
                  stroke={isWrong ? RED : isRight ? GREEN : "#ced4da"}
                  strokeWidth={isRight ? 3 : isWrong ? 2.4 : 1.6}
                />
                <text x={x + 12} y={ty + 19} fontSize={12} fontWeight={700} fill={MUTED} pointerEvents="none">{i + 1}</text>
                {nameLines.map((l, k) => (
                  <text key={k} x={x + 30} y={ty + th / 2 + fs * 0.35 + (k - (nameLines.length - 1) / 2) * (fs + 3)} fontSize={fs} fontWeight={700} fill={isWrong ? RED : INK} pointerEvents="none">
                    {l}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>
      </Stage>
      <p className="live-said info">{fill(w.moves, { k: m.k, n: task.items.length })}</p>
      <GameActions game={game} g={g} done={d.done} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
