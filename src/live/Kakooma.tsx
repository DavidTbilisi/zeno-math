// Kakooma: a few numbers, one of them the sum (on hard the product) of two others; tap it. The answer turns green with
// its two parts ringed; a wrong tap turns red and says why — one of the two parts, a number that would need another
// twice, a sum among products, or simply not made from two others. No miss earns three stars, one miss two; the hint,
// one of the two parts ringed in blue, costs one. In a grid each corner's answer goes into the middle, which is solved
// last. Nine puzzles open in turn (two sets and a grid at each level), and the endless run keeps a streak of sets done
// with no miss and no hint. Built on the game shell (useGame), which does the ladder, the sounds and the cheer.
import { KAK_LADDER, KAK_NOTICES, kakNotice, kakNow, kakOpen, kakSlip, kakStars, kakSum, type KakSet, type LiveKakooma } from "../math/kakooma";
import { fill, FONT, INK, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";
import { starText } from "./ladderUi";

const W = 560;
const H = 380;
const GREEN = "#2f9e44";
const RED = "#e03131";
const BLUE = "#1971c2";
/** Where each corner's set sits in a grid, and the middle; the middle's i-th number lies towards corner i. */
const CORNERS: [number, number][] = [[110, 95], [450, 95], [110, 285], [450, 285]];
const MIDDLE: [number, number] = [W / 2, H / 2];
const sign = (s: Pick<KakSet, "op">) => (s.op === "+" ? "+" : "×");

const FRESH: Partial<LiveKakooma> = { solved: [], wrong: null, misses: 0, hinted: false, said: null };

/** The numbers of a set round its centre, the first at the top; a grid's middle has them towards the corners. */
function spots(n: number, [cx, cy]: [number, number], R: number, middle: boolean): [number, number][] {
  if (middle) return CORNERS.map(([x, y]) => [cx + Math.sign(x - cx) * R * 0.75, cy + Math.sign(y - cy) * R * 0.75]);
  return Array.from({ length: n }, (_, i) => [cx + R * Math.sin((2 * Math.PI * i) / n), cy - R * Math.cos((2 * Math.PI * i) / n)]);
}

export function Kakooma({ state: d, set, w: words, svgRef }: PieceProps<"kakooma">) {
  const [w, g] = [words.kakooma, words.game];
  const game = useGame({ key: "zeno.kakooma.v1", size: KAK_LADDER.length, notices: KAK_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const task = kakNow(d);
  const grid = task.sets.length > 1;
  const done = d.solved.length === task.sets.length;
  const stars = kakStars(d.misses, d.hinted);

  const tap = (i: number, n: number) => {
    const s = task.sets[i];
    if (done || d.solved.includes(i) || !kakOpen(task, d.solved, i)) return;
    if (n !== s.answer) return game.miss({ wrong: { set: i, n }, misses: d.misses + 1, said: null });
    const solved = [...d.solved, i];
    // One set of a grid is a step on the board, not on the streak: only a whole puzzle done clean counts.
    if (solved.length < task.sets.length) return game.step({ solved, wrong: null, said: null }, { counts: false });
    game.win({
      stars,
      clean: d.misses === 0 && !d.hinted,
      notice: (streak) => kakNotice(task, d.misses, d.hinted, game.sinceShown(), streak),
      patch: { solved, wrong: null },
    });
  };

  const last = task.sets[task.sets.length - 1];
  const right = fill(w.right, { sum: kakSum(last), stars: starText(stars) });
  const why = (s: KakSet, n: number) => {
    const slip = kakSlip(s, n);
    return slip ? fill(w[slip.id], { ...slip.vars, s: sign(s) }) : fill(s.op === "+" ? w.none : w.noneProduct, { n });
  };
  const justSolved = d.solved.length ? task.sets[d.solved[d.solved.length - 1]] : null;
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]} ${right}` }
    : done ? { tone: "ok", text: `${right}${d.mode === "puzzle" && stars === 1 ? ` ${g.oneStar}` : ""}` }
    : d.wrong ? { tone: "wrong", text: why(task.sets[d.wrong.set], d.wrong.n) }
    : grid && kakOpen(task, d.solved, 4) && justSolved ? { tone: "ok", text: `${fill(w.toMiddle, { sum: kakSum(justSolved) })} ${w.middleOpen}` }
    : grid && justSolved ? { tone: "ok", text: fill(w.toMiddle, { sum: kakSum(justSolved) }) }
    : { tone: "hint", text: grid ? w.hintGrid : task.sets[0].op === "+" ? w.hintSum : w.hintProduct };

  const drawSet = (s: KakSet, i: number) => {
    const middle = grid && i === 4;
    const centre = !grid ? MIDDLE : middle ? MIDDLE : CORNERS[i];
    const [R, r, font] = grid ? [52, 22, 20] : [104, 40, 34];
    const open = kakOpen(task, d.solved, i);
    const solved = d.solved.includes(i);
    const at = spots(s.nums.length, centre, R, middle);
    return (
      <g key={i} role="group" aria-label={fill(w.set, { list: s.nums.map((n, k) => (middle && !d.solved.includes(k) ? "?" : n)).join(", ") })}>
        <circle cx={centre[0]} cy={centre[1]} r={R + r + 8} fill={solved ? "#ebfbee" : "#f8f9fa"} stroke={solved ? GREEN : "#ced4da"} strokeWidth={2} strokeDasharray={open ? undefined : "6 5"} />
        {s.nums.map((n, k) => {
          const [x, y] = at[k];
          // A number of the middle shows once its corner is solved.
          const shown = !middle || d.solved.includes(k);
          const isWrong = d.wrong?.set === i && d.wrong.n === n && !solved;
          const isAnswer = solved && n === s.answer;
          const isPart = solved && s.parts.includes(n);
          const hinted = d.hinted && open && !solved && n === s.parts[0];
          const fillC = isAnswer ? "#d3f9d8" : isWrong ? "#ffe3e3" : "#fff";
          const stroke = isAnswer || isPart ? GREEN : isWrong ? RED : hinted ? BLUE : "#adb5bd";
          const can = open && !solved && !done && shown;
          return (
            <g key={k} role={can ? "button" : undefined} aria-label={shown ? String(n) : "?"} style={{ cursor: can ? "pointer" : "default" }} onClick={() => shown && tap(i, n)}>
              <circle cx={x} cy={y} r={r} fill={fillC} stroke={stroke} strokeWidth={isAnswer || isPart || isWrong || hinted ? 3 : 1.5} strokeDasharray={hinted ? "5 3" : undefined} />
              <text x={x} y={y + font * 0.36} fontSize={font} fontWeight={700} textAnchor="middle" fill={!shown ? "#adb5bd" : solved && !isAnswer && !isPart ? "#adb5bd" : isWrong ? RED : INK}>{shown ? n : "?"}</text>
            </g>
          );
        })}
      </g>
    );
  };
  return (
    <>
      <GameHead game={game} g={g}>
        <span className="est-streak">{fill(w.misses, { n: d.misses })}</span>
      </GameHead>
      <Stage game={game} stars={stars} done={done} g={g} notices={w.notices}>
        <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} role="group" aria-label={grid ? w.hintGrid : task.sets[0].op === "+" ? w.hintSum : w.hintProduct}>
          <rect width={W} height={H} fill="#fff" />
          {/* In a grid, a line from each corner to its place in the middle. */}
          {grid &&
            spots(4, MIDDLE, 52, true).map(([x, y], k) => (
              <line key={k} x1={CORNERS[k][0]} y1={CORNERS[k][1]} x2={x} y2={y} stroke={d.solved.includes(k) ? GREEN : "#dee2e6"} strokeWidth={2} />
            ))}
          {task.sets.map(drawSet)}
          {!grid && done && <text x={W / 2} y={H / 2 + 8} fontSize={22} fontWeight={700} textAnchor="middle" fill={GREEN}>{kakSum(task.sets[0])}</text>}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={done}>
        {!d.hinted && <button className="live-btn" title={w.hintCost} onClick={() => set({ ...d, hinted: true })}>💡 {w.hintBtn}</button>}
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
      {d.hinted && !done && <p className="live-hint">💡 {w.hintShown}</p>}
    </>
  );
}
