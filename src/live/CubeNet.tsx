// Cube nets: shapes of six squares, and which of them fold into a cube. Tap the ones that do, then check: a shape
// chosen that doesn't fold shows in red the squares that land on the same face, and once the board is right each net
// colours its opposite faces alike. The last three puzzles fold one net in the mind: tap the face opposite the ★, pair
// by pair. No misses earns three stars, one two. Nine puzzles open in turn (nets with four in a row, nets without,
// opposite faces), and the endless run keeps a streak of boards with no misses.
import { useState, type ReactNode } from "react";
import { clashes, fold, isNet, NET_LADDER, NET_NOTICES, netNotice, netNow, netStars, PAIR_FILL, type Cell, type LiveCubeNet, type NetLevel } from "../math/cubeNets";
import { withBest, withFound, withStars } from "../math/ladder";
import { play } from "./juice";
import { Cheer, Found, GameNav, newSeed, nextStage, Onward, SoundToggle, starText, useLadder } from "./ladderUi";
import { fill, FONT, INK, type PieceProps } from "./ui";

const BOX = 200;
const GAP = 14;
const W = 3 * BOX + 2 * GAP + 10;

export function CubeNet({ state: d, set, w: words, svgRef }: PieceProps<"cubeNet">) {
  const [w, g] = [words.cubeNet, words.game];
  const [ladder, keep] = useLadder("zeno.cubenet.v1", NET_LADDER.length, NET_NOTICES);
  const [cheer, setCheer] = useState(0);
  const board = netNow(d);

  const finish = (misses: number) => {
    const stars = netStars(misses);
    const streak = d.mode === "endless" && misses === 0 ? d.streak + 1 : d.mode === "endless" ? 0 : d.streak;
    const key = netNotice(board, misses, streak);
    let next = withBest(ladder, d.mode === "endless" ? streak : 0);
    if (d.mode === "puzzle") next = withStars(next, d.stage, stars);
    if (key && !next.found.includes(key)) next = withFound(next, key, NET_NOTICES);
    if (next !== ladder) keep(next);
    play("good");
    setTimeout(() => play("star"), 260);
    setCheer((c) => c + 1);
    return { done: true, streak, said: key ? { kind: "notice" as const, key } : null };
  };

  // Easy and medium: choose the shapes that fold, then check.
  const toggle = (i: number) => {
    if (d.done) return;
    play("snap");
    set({ ...d, chosen: d.chosen.includes(i) ? d.chosen.filter((k) => k !== i) : [...d.chosen, i].sort((a, b) => a - b), checked: false, said: null });
  };
  const check = () => {
    if (board.level === 3) return;
    const extra = d.chosen.filter((i) => !isNet(board.shapes[i])).length;
    const missing = board.shapes.filter((s, i) => isNet(s) && !d.chosen.includes(i)).length;
    if (extra || missing) {
      play("miss");
      return set({ ...d, checked: true, misses: d.misses + 1, streak: 0, said: { kind: "wrong", extra, missing } });
    }
    set({ ...d, checked: true, ...finish(d.misses) });
  };
  // Hard: the face opposite the ★, pair by pair; the last pair is what is left.
  const star = board.level === 3 ? board.net.findIndex((_, i) => !d.chosen.includes(i)) : -1;
  const pick = (i: number) => {
    if (board.level !== 3 || d.done || i === star || d.chosen.includes(i)) return;
    const f = fold(board.net);
    if (f[i] !== (f[star] ^ 1)) {
      play("miss");
      return set({ ...d, misses: d.misses + 1, streak: 0, said: { kind: "notOpposite", cell: i } });
    }
    let chosen = [...d.chosen, star, i];
    if (chosen.length === 4) chosen = [...chosen, ...board.net.map((_, k) => k).filter((k) => !chosen.includes(k))];
    if (chosen.length < 6) {
      play("good");
      return set({ ...d, chosen, said: null });
    }
    set({ ...d, chosen, ...finish(d.misses) });
  };
  const fresh: Pick<LiveCubeNet, "chosen" | "checked" | "misses" | "done" | "said"> = { chosen: [], checked: false, misses: 0, done: false, said: null };
  const go = (stage: number) => set({ ...d, ...fresh, mode: "puzzle", stage });
  const endless = (l: NetLevel) => set({ ...d, ...fresh, mode: "endless", level: l, seed: newSeed() });
  const onward = () => (d.mode === "endless" ? endless(d.level) : go(nextStage(d.stage, NET_LADDER.length)));

  const stars = netStars(d.misses);
  const right = fill(w.right, { stars: starText(stars) });
  const hint = board.level === 3 ? w.hintOpposite : w.hint;
  const said =
    d.said?.kind === "notice" ? `${w.notices[d.said.key]} ${right}`
    : d.done ? right
    : d.said?.kind === "wrong" ? (d.said.extra ? w.wrongExtra : fill(w.wrongMissing, { n: d.said.missing }))
    : d.said?.kind === "notOpposite" ? w.notOpposite
    : hint;

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
      <GameNav ladder={ladder} mode={d.mode} stage={d.stage} level={d.level} streak={d.streak} onPuzzle={go} onEndless={endless} words={w} g={g} />
      <p className="live-said geo-prompt">{hint}</p>
      <div className="geo-stage-wrap">
        <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} role="group" aria-label={hint}>
          <rect width={W} height={H} fill="#fff" />
          {body}
        </svg>
        {cheer > 0 && d.done && <Cheer key={cheer} text={starText(stars)} />}
      </div>
      <div className="live-bar">
        {d.done ? (
          <Onward mode={d.mode} stage={d.stage} size={NET_LADDER.length} onClick={onward} g={g} />
        ) : (
          board.level !== 3 && <button className="live-btn on" onClick={check}>{g.check}</button>
        )}
        <SoundToggle title={g.sound} />
      </div>
      <p className={d.said?.kind === "notice" ? "live-said notice" : d.done ? "live-said ok" : d.said ? "live-said" : "live-hint"}>
        {said} <Found ladder={ladder} of={NET_NOTICES.length} notices={w.notices} g={g} />
      </p>
    </>
  );
}
