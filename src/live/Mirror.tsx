// Lines of symmetry: a shape with lines through its middle, and every line it folds onto itself along to tap — the
// diagonals of a rectangle among them, which halve it but don't fold it. Check, and each line chosen wrongly turns red
// with the shape folded over it, dashed, so the halves can be seen not to meet; if the lines chosen are right but some
// are missing, the board says so. No line at all is an answer too. Right at the first check earns three stars, at the
// second two. Nine puzzles open in turn (standing straight, turned, octagons, stars and shapes of squares), and the
// endless run keeps a streak right at the first check. Built on the game shell (useGame), which does the ladder, the
// sounds and the cheer.
import { foldedPath, lineEnds, mirrorsOf, shapePath, SYM_LADDER, SYM_NOTICES, SYM_SIDE, symNotice, symNow, symStars, type LiveMirror } from "../math/symmetry";
import { starText } from "./ladderUi";
import { fill, FONT, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";

const S = SYM_SIDE;
const LEN = S / 2 - 14;

const FRESH: Partial<LiveMirror> = { chosen: [], wrong: [], misses: 0, done: false, said: null };

export function Mirror({ state: d, set, w: words, svgRef }: PieceProps<"mirror">) {
  const [w, g] = [words.mirror, words.game];
  const game = useGame({ key: "zeno.mirror.v1", size: SYM_LADDER.length, notices: SYM_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const { task, lines } = symNow(d);
  const mirrors = mirrorsOf(task);
  const isMirror = (k: number) => mirrors.includes(lines[k]);
  const stars = symStars(d.misses);

  const tap = (k: number) => {
    if (d.done) return;
    const chosen = d.chosen.includes(k) ? d.chosen.filter((c) => c !== k) : [...d.chosen, k].sort((a, b) => a - b);
    game.tap({ chosen, wrong: [], said: null });
  };
  const check = () => {
    const wrong = d.chosen.filter((k) => !isMirror(k));
    const missing = mirrors.length - (d.chosen.length - wrong.length);
    if (wrong.length || missing) return game.miss({ wrong, misses: d.misses + 1, said: { kind: "wrong", more: !wrong.length } });
    game.win({ stars, clean: d.misses === 0, notice: (streak) => symNotice(task, d.misses, streak), patch: { done: true } });
  };

  const right = `${mirrors.length ? fill(w.right, { n: mirrors.length, stars: starText(stars) }) : fill(w.rightNone, { stars: starText(stars) })}${d.mode === "puzzle" && stars === 1 ? ` ${g.oneStar}` : ""}`;
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]} ${right}` }
    : d.done ? { tone: "ok", text: right }
    : d.said?.kind === "wrong" ? { tone: "wrong", text: d.said.more ? w.more : w.wrongFold }
    : { tone: "hint", text: d.chosen.length ? fill(w.chosen, { n: d.chosen.length }) : w.hint };
  return (
    <>
      <GameHead game={game} g={g}>
        <Stake stars={stars} tries={d.misses} g={g} />
      </GameHead>
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg ref={svgRef} width={S} height={S} viewBox={`0 0 ${S} ${S}`} fontFamily={FONT} role="group" aria-label={w.hint}>
          <rect width={S} height={S} fill="#fff" />
          <path d={shapePath(task, S)} fill={d.done ? "#d3f9d8" : "#a5d8ff"} stroke={d.done ? "#2f9e44" : "#1971c2"} strokeWidth={3} strokeLinejoin="round" />
          {d.wrong.map((k) => (
            <path key={`fold${k}`} d={foldedPath(task, lines[k], S)} fill="none" stroke="#e03131" strokeWidth={2.5} strokeDasharray="7 5" />
          ))}
          {lines.map((deg, k) => {
            const [x1, y1, x2, y2] = lineEnds(deg, S, LEN);
            const on = d.chosen.includes(k);
            const state = d.done ? (isMirror(k) ? "mirror" : "off") : d.wrong.includes(k) ? "wrong" : on ? "on" : "";
            const color = state === "mirror" ? "#2f9e44" : state === "wrong" ? "#e03131" : state === "on" ? "#1971c2" : "#868e96";
            if (state === "off") return null;
            return (
              <g key={k} role="button" aria-label={fill(w.line, { n: k + 1 })} aria-pressed={on} style={{ cursor: d.done ? "default" : "pointer" }} onClick={() => tap(k)}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={state ? 3.5 : 2} strokeDasharray={state ? undefined : "8 6"} />
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={18} />
                {[[x1, y1], [x2, y2]].map(([x, y], e) => (
                  <circle key={e} cx={x} cy={y} r={9} fill={state ? color : "#fff"} stroke={color} strokeWidth={2} />
                ))}
              </g>
            );
          })}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.done}>
        <button className="live-btn on" onClick={check}>{g.check}</button>
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
