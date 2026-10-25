// Guess my rule: a machine that does the same to every number put in, and its rule to find. Put numbers in (0 to 10)
// and see what comes out, in a table; then answer for a number too big to put in — or, at hard, say what went in.
// Right first time earns three stars, after one miss two. Nine puzzles open in turn — one step (n + 7, 4n), two
// steps (3n + 2), two steps asked for 100 or backwards — and the endless run keeps a streak right first time. Once
// it is answered, the machine shows its rule. Built on the game shell (useGame), which does the ladder, the sounds and
// the cheer.
import { apply, INPUTS, MACHINE_LADDER, MACHINE_NOTICES, machineAnswer, machineNotice, machineNow, machineStars, readWhole, type LiveMachine } from "../math/machine";
import { Keypad } from "./Keypad";
import { starText } from "./ladderUi";
import { fill, FONT, INK, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";

const [W, H] = [520, 210];
const ruleText = (mul: number, add: number) => `${mul === 1 ? "" : `× ${mul} `}${add === 0 ? "" : `${add < 0 ? "−" : "+"} ${Math.abs(add)}`}`.trim();

const FRESH: Partial<LiveMachine> = { tried: [], typed: "", misses: 0, done: false, said: null };

export function Machine({ state: d, set, w: words, svgRef }: PieceProps<"machine">) {
  const [w, g] = [words.machine, words.game];
  const game = useGame({ key: "zeno.machine.v1", size: MACHINE_LADDER.length, notices: MACHINE_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const task = machineNow(d);
  const last = d.tried.at(-1);
  const stars = machineStars(d.misses);

  const feed = (n: number) => !d.done && game.tap({ tried: [...d.tried.filter((k) => k !== n), n], said: d.said?.kind === "notice" ? null : d.said });
  const check = () => {
    const v = readWhole(d.typed);
    if (v === null) return;
    if (v !== machineAnswer(task)) return game.miss({ typed: "", misses: d.misses + 1, said: { kind: "wrong", v } });
    game.win({ stars, clean: d.misses === 0, notice: (streak) => machineNotice(task, d.tried, d.misses, streak), patch: { done: true } });
  };

  const ask = task.ask.dir === "out" ? fill(w.askOut, { n: task.ask.n }) : fill(w.askIn, { out: task.ask.out });
  const right = `${fill(w.right, { rule: `n ${ruleText(task.rule.mul, task.rule.add)}`, stars: starText(stars) })}${d.mode === "puzzle" && stars === 1 ? ` ${g.oneStar}` : ""}`;
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]} ${right}` }
    : d.done ? { tone: "ok", text: right }
    : d.said?.kind === "wrong" ? { tone: "wrong", text: fill(w.wrong, { v: d.said.v }) }
    : { tone: "hint", text: d.tried.length ? w.more : w.hint };
  // The table: what went in, in order, and what came out.
  const rows = [...d.tried].sort((a, b) => a - b);
  const colW = Math.min(40, (W - 70) / Math.max(rows.length, 1));
  return (
    <>
      <GameHead game={game} g={g}>
        <Stake stars={stars} tries={d.misses} g={g} />
      </GameHead>
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} role="img" aria-label={ask}>
          <rect width={W} height={H} fill="#fff" />
          <rect x={60} y={20} width={86} height={50} rx={10} fill="#fff3bf" stroke="#fab005" strokeWidth={2} />
          <text x={103} y={53} fontSize={24} fontWeight={700} textAnchor="middle" fill={INK}>{last ?? "?"}</text>
          <path d="M156,45 L200,45 M192,38 L202,45 L192,52" stroke="#868e96" strokeWidth={3} fill="none" />
          <rect x={210} y={8} width={110} height={74} rx={12} fill={d.done ? "#d3f9d8" : "#e7f5ff"} stroke={d.done ? "#2f9e44" : "#1971c2"} strokeWidth={3} />
          <text x={265} y={d.done ? 54 : 58} fontSize={d.done ? 22 : 34} fontWeight={700} textAnchor="middle" fill={INK}>{d.done ? ruleText(task.rule.mul, task.rule.add) : "⚙ ?"}</text>
          <path d="M330,45 L374,45 M366,38 L376,45 L366,52" stroke="#868e96" strokeWidth={3} fill="none" />
          <rect x={384} y={20} width={86} height={50} rx={10} fill="#d0ebff" stroke="#1971c2" strokeWidth={2} />
          <text x={427} y={53} fontSize={24} fontWeight={700} textAnchor="middle" fill={INK}>{last === undefined ? "?" : apply(task.rule, last)}</text>
          <g transform="translate(0 110)" fontSize={16} fill={INK}>
            <text x={50} y={22} textAnchor="end" fill="#495057">{w.in}</text>
            <text x={50} y={62} textAnchor="end" fill="#495057">{w.out}</text>
            <line x1={58} y1={36} x2={W - 10} y2={36} stroke="#ced4da" strokeWidth={1.5} />
            {rows.map((n, i) => (
              <g key={n} fontWeight={n === last ? 700 : 400}>
                <text x={58 + colW * (i + 0.5)} y={22} textAnchor="middle">{n}</text>
                <text x={58 + colW * (i + 0.5)} y={62} textAnchor="middle" fill="#1971c2">{apply(task.rule, n)}</text>
              </g>
            ))}
          </g>
        </svg>
      </Stage>
      <div className="live-bar machine-inputs">
        <span className="est-streak">{w.putIn}</span>
        {INPUTS.map((n) => (
          <button key={n} className={`live-btn${d.tried.includes(n) ? " on" : ""}`} disabled={d.done} onClick={() => feed(n)}>{n}</button>
        ))}
      </div>
      {!d.done && <Keypad value={d.typed} onChange={(typed) => set({ ...d, typed, said: d.said?.kind === "wrong" ? null : d.said })} erase={w.erase} minus={task.level > 1} />}
      <GameActions game={game} g={g} done={d.done}>
        <button className="live-btn on" disabled={readWhole(d.typed) === null} onClick={check}>{g.check}</button>
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
