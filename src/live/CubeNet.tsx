// Cube nets: shapes of six squares, and which of them fold into a cube. Tap the ones that do, then check: a shape
// chosen that doesn't fold shows in red the squares that land on the same face, and once the board is right each net
// colours its opposite faces alike. The last three puzzles fold one net in the mind: tap the face opposite the ★, pair
// by pair. No misses earns three stars, one two. Nine puzzles open in turn (nets with four in a row, nets without,
// opposite faces), and the endless run keeps a streak of boards with no misses. Built on the game shell (useGame),
// which does the ladder, the sounds and the cheer.
import type { ReactNode } from "react";
import { clashes, fold, isNet, NET_LADDER, NET_NOTICES, netNotice, netNow, netStars, PAIR_FILL, type Cell, type LiveCubeNet } from "../math/cubeNets";
import { fill, FONT, INK, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";
import { starText } from "./ladderUi";

const BOX = 200;
const GAP = 14;
const W = 3 * BOX + 2 * GAP + 10;

const FRESH: Partial<LiveCubeNet> = { chosen: [], checked: false, misses: 0, done: false, said: null };

export function CubeNet({ state: d, set, w: words, svgRef }: PieceProps<"cubeNet">) {
  const [w, g] = [words.cubeNet, words.game];
  const game = useGame({ key: "zeno.cubenet.v1", size: NET_LADDER.length, notices: NET_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const board = netNow(d);
  const stars = netStars(d.misses);

  // Easy and medium: choose the shapes that fold, then check.
  const toggle = (i: number) => {
    if (d.done) return;
    game.tap({ chosen: d.chosen.includes(i) ? d.chosen.filter((k) => k !== i) : [...d.chosen, i].sort((a, b) => a - b), checked: false, said: null });
  };
  const check = () => {
    if (board.level === 3) return;
    const extra = d.chosen.filter((i) => !isNet(board.shapes[i])).length;
    const missing = board.shapes.filter((s, i) => isNet(s) && !d.chosen.includes(i)).length;
    if (extra || missing) return game.miss({ checked: true, misses: d.misses + 1, said: { kind: "wrong", extra, missing } });
    game.win({ stars, clean: d.misses === 0, notice: (streak) => netNotice(board, d.misses, streak), patch: { checked: true, done: true } });
  };
  // Hard: the face opposite the ★, pair by pair; the last pair is what is left.
  const star = board.level === 3 ? board.net.findIndex((_, i) => !d.chosen.includes(i)) : -1;
  const pick = (i: number) => {
    if (board.level !== 3 || d.done || i === star || d.chosen.includes(i)) return;
    const f = fold(board.net);
    if (f[i] !== (f[star] ^ 1)) return game.miss({ misses: d.misses + 1, said: { kind: "notOpposite", cell: i } });
    let chosen = [...d.chosen, star, i];
    if (chosen.length === 4) chosen = [...chosen, ...board.net.map((_, k) => k).filter((k) => !chosen.includes(k))];
    // A pair is a step on the board, not on the streak: only a net done with no misses counts.
    if (chosen.length < 6) return game.step({ chosen, said: null }, { counts: false });
    game.win({ stars, clean: d.misses === 0, notice: (streak) => netNotice(board, d.misses, streak), patch: { chosen, done: true } });
  };

  const right = fill(w.right, { stars: starText(stars) });
  const hint = board.level === 3 ? w.hintOpposite : w.hint;
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]} ${right}` }
    : d.done ? { tone: "ok", text: `${right}${d.mode === "puzzle" && stars === 1 ? ` ${g.oneStar}` : ""}` }
    : d.said?.kind === "wrong" ? { tone: "wrong", text: d.said.extra ? w.wrongExtra : fill(w.wrongMissing, { n: d.said.missing }) }
    : d.said?.kind === "notOpposite" ? { tone: "wrong", text: w.notOpposite }
    : { tone: "hint", text: hint };

  const squares = (cells: Cell[], x: number, y: number, s: number, fills: string[], onCell?: (k: number) => void, labels: string[] = []) =>
    cells.map(([cx, cy], k) => (
      <g key={k} onClick={onCell && (() => onCell(k))} role={onCell ? "button" : undefined} aria-label={onCell ? fill(w.face, { n: k + 1 }) : undefined} style={onCell ? { cursor: "pointer" } : undefined}>
        <rect x={x + cx * s} y={y + cy * s} width={s} height={s} fill={fills[k]} stroke={INK} strokeWidth={2} />
        {labels[k] && <text x={x + cx * s + s / 2} y={y + cy * s + s / 2 + s * 0.17} fontSize={s * 0.5} fontWeight={700} textAnchor="middle" fill={INK}>{labels[k]}</text>}
      </g>
    ));
  let H: number;
  let body: ReactNode;
  if (board.level === 3) {
    const s = 64;
    const [cw, ch] = [Math.max(...board.net.map((c) => c[0])) + 1, Math.max(...board.net.map((c) => c[1])) + 1];
    H = ch * s + 20;
    const f = fold(board.net);
    const fills = board.net.map((_, k) =>
      d.chosen.includes(k) ? PAIR_FILL[f[k] >> 1] : k === star ? "#ffec99" : d.said?.kind === "notOpposite" && d.said.cell === k ? "#ffc9c9" : "#fff",
    );
    body = squares(board.net, (W - cw * s) / 2, 10, s, fills, pick, board.net.map((_, k) => (k === star && !d.done ? "★" : "")));
  } else {
    H = 2 * BOX + GAP + 10;
    body = board.shapes.map((cells, i) => {
      const s = 30;
      const [cw, ch] = [Math.max(...cells.map((c) => c[0])) + 1, Math.max(...cells.map((c) => c[1])) + 1];
      const [bx, by] = [(i % 3) * (BOX + GAP) + 5, Math.floor(i / 3) * (BOX + GAP) + 5];
      const on = d.chosen.includes(i);
      const net = isNet(cells);
      const bad = d.checked && on && !net ? clashes(cells) : [];
      const fills = cells.map((_, k) => (d.done && net ? PAIR_FILL[fold(cells)[k] >> 1] : bad.includes(k) ? "#ff8787" : on ? "#d0ebff" : "#fff"));
      return (
        <g key={i} role="button" aria-label={fill(w.shape, { n: i + 1 })} aria-pressed={on} onClick={() => toggle(i)} style={{ cursor: d.done ? "default" : "pointer" }} opacity={d.done && !net ? 0.4 : 1}>
          <rect x={bx} y={by} width={BOX} height={BOX} rx={12} fill={on ? "#e7f5ff" : "#f8f9fa"} stroke={on ? "#1971c2" : "#dee2e6"} strokeWidth={on ? 3 : 2} />
          {squares(cells, bx + (BOX - cw * s) / 2, by + (BOX - ch * s) / 2, s, fills)}
        </g>
      );
    });
  }
  return (
    <>
      <GameHead game={game} g={g}>
        <Stake stars={stars} tries={d.misses} g={g} />
      </GameHead>
      <Said line={{ tone: "prompt", text: hint }} />
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} role="group" aria-label={hint}>
          <rect width={W} height={H} fill="#fff" />
          {body}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.done}>
        {board.level !== 3 && <button className="live-btn on" onClick={check}>{g.check}</button>}
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
