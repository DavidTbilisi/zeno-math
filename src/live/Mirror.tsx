// Lines of symmetry: a shape with lines through its middle, and every line it folds onto itself along to tap — the
// diagonals of a rectangle among them, which halve it but don't fold it. Check, and each line chosen wrongly turns red
// with the shape folded over it, dashed, so the halves can be seen not to meet; if the lines chosen are right but some
// are missing, the board says so. No line at all is an answer too. Right at the first check earns three stars, at the
// second two. Nine puzzles open in turn (standing straight, turned, octagons, stars and shapes of squares), and the
// endless run keeps a streak right at the first check.
import { useState } from "react";
import { withBest, withFound, withStars } from "../math/ladder";
import { foldedPath, lineEnds, mirrorsOf, shapePath, SYM_LADDER, SYM_NOTICES, SYM_SIDE, symNotice, symNow, symStars, type LiveMirror, type SymLevel } from "../math/symmetry";
import { play } from "./juice";
import { Cheer, Found, GameNav, newSeed, nextStage, Onward, SoundToggle, starText, useLadder } from "./ladderUi";
import { fill, FONT, type PieceProps } from "./ui";

const S = SYM_SIDE;
const LEN = S / 2 - 14;

export function Mirror({ state: d, set, w: words, svgRef }: PieceProps<"mirror">) {
  const [w, g] = [words.mirror, words.game];
  const [ladder, keep] = useLadder("zeno.mirror.v1", SYM_LADDER.length, SYM_NOTICES);
  const [cheer, setCheer] = useState(0);
  const { task, lines } = symNow(d);
  const mirrors = mirrorsOf(task);
  const isMirror = (k: number) => mirrors.includes(lines[k]);

  const tap = (k: number) => {
    if (d.done) return;
    play("snap");
    const chosen = d.chosen.includes(k) ? d.chosen.filter((c) => c !== k) : [...d.chosen, k].sort((a, b) => a - b);
    set({ ...d, chosen, wrong: [], said: null });
  };
  const check = () => {
    const wrong = d.chosen.filter((k) => !isMirror(k));
    const missing = mirrors.length - (d.chosen.length - wrong.length);
    if (wrong.length || missing) {
      play("miss");
      return set({ ...d, wrong, misses: d.misses + 1, streak: 0, said: { kind: "wrong", more: !wrong.length } });
    }
    const stars = symStars(d.misses);
    const streak = d.mode === "endless" && d.misses === 0 ? d.streak + 1 : d.mode === "endless" ? 0 : d.streak;
    const key = symNotice(task, d.misses, streak);
    let next = withBest(ladder, d.mode === "endless" ? streak : 0);
    if (d.mode === "puzzle") next = withStars(next, d.stage, stars);
    if (key && !next.found.includes(key)) next = withFound(next, key, SYM_NOTICES);
    if (next !== ladder) keep(next);
    play("good");
    setTimeout(() => play("star"), 260);
    setCheer((c) => c + 1);
    set({ ...d, done: true, streak, said: key ? { kind: "notice", key } : null });
  };
  const fresh: Pick<LiveMirror, "chosen" | "wrong" | "misses" | "done" | "said"> = { chosen: [], wrong: [], misses: 0, done: false, said: null };
  const go = (stage: number) => set({ ...d, ...fresh, mode: "puzzle", stage });
  const endless = (l: SymLevel) => set({ ...d, ...fresh, mode: "endless", level: l, seed: newSeed() });
  const onward = () => (d.mode === "endless" ? endless(d.level) : go(nextStage(d.stage, SYM_LADDER.length)));

  const stars = symStars(d.misses);
  const right = mirrors.length ? fill(w.right, { n: mirrors.length, stars: starText(stars) }) : fill(w.rightNone, { stars: starText(stars) });
  const said =
    d.said?.kind === "notice" ? `${w.notices[d.said.key]} ${right}`
    : d.done ? right
    : d.said?.kind === "wrong" ? (d.said.more ? w.more : w.wrongFold)
    : d.chosen.length ? fill(w.chosen, { n: d.chosen.length })
    : w.hint;
  return (
    <>
      <GameNav ladder={ladder} mode={d.mode} stage={d.stage} level={d.level} streak={d.streak} onPuzzle={go} onEndless={endless} words={w} g={g} />
      <div className="geo-stage-wrap">
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
        {cheer > 0 && d.done && <Cheer key={cheer} text={starText(stars)} />}
      </div>
      <div className="live-bar">
        {d.done ? (
          <Onward mode={d.mode} stage={d.stage} size={SYM_LADDER.length} onClick={onward} g={g} />
        ) : (
          <button className="live-btn on" onClick={check}>{g.check}</button>
        )}
        <SoundToggle title={g.sound} />
      </div>
      <p className={d.said?.kind === "notice" ? "live-said notice" : d.done ? "live-said ok" : d.said?.kind === "wrong" ? "live-said" : "live-hint"}>
        {said} <Found ladder={ladder} of={SYM_NOTICES.length} notices={w.notices} g={g} />
      </p>
    </>
  );
}
