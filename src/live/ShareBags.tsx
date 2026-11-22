// Share the bag, worked by hand. A set: a tap on the pile deals a round (a sweet into each bag), a tap on a bag puts one
// sweet in, a tap on a bag's sweets takes one back; the tag under a bag takes it, and the answer counts the sweets
// taken. A bar model: cut the bar with the box beside it, the amount known sits over its parts, and one part's value and
// all of it are written in the boxes under it, each part showing its value. In free play the sweets and bags are set,
// and the bags taken read as a fraction of the set. Built on the game shell (useGame).
import type { ReactNode } from "react";
import {
  dealRound,
  judgeShare,
  pileOf,
  putIn,
  SHARE_FRESH,
  SHARE_LADDER,
  SHARE_NOTICES,
  shareNotice,
  shareNow,
  shareStars,
  takeOut,
  toggleTaken,
  unitOf,
  wantOf,
  type LiveShare,
  type ShareTask,
} from "../math/shareBags";
import { starText } from "./ladderUi";
import { CHECK_H, CheckRow, keyTap, MUTED, NumBox } from "./hand";
import { fill, FONT, INK, SvgFrac, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";

const W = 640;
const X0 = 60;
const SWEET = "#f783ac";
const SWEET_EDGE = "#c2255c";
const GREEN = "#2b8a3e";

/** A tappable SVG group, with the hand kit's press rules. */
function Tap({ label, on, children, role = "button", checked }: { label: string; on: (() => void) | null; children: ReactNode; role?: "button" | "checkbox"; checked?: boolean }) {
  return (
    <g role={role} aria-checked={role === "checkbox" ? !!checked : undefined} tabIndex={on ? 0 : -1} aria-label={label} aria-disabled={!on || undefined}
      style={{ cursor: on ? "pointer" : "default" }} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); on?.(); }}
      onKeyDown={(e) => on && keyTap(e, on)}>
      {children}
    </g>
  );
}

/** Sweets as dots in rows, from (x, y), cols to a row. */
const dots = (k: number, x: number, y: number, cols: number, r = 6) =>
  Array.from({ length: k }, (_, i) => (
    <circle key={i} cx={x + (i % cols) * (2 * r + 4) + r} cy={y + Math.floor(i / cols) * (2 * r + 4) + r} r={r} fill={SWEET} stroke={SWEET_EDGE} strokeWidth={1} />
  ));

export function ShareBags({ state: s, set, w: words, svgRef }: PieceProps<"shareBags">) {
  const [w, g] = [words.shareBags, words.game];
  const game = useGame({ key: "zeno.sharebags.v1", size: SHARE_LADDER.length, notices: SHARE_NOTICES, modes: ["puzzle", "endless", "free"], state: s, set, fresh: SHARE_FRESH });
  const task = shareNow(s);
  const t: ShareTask = task ?? { kind: "set", a: s.taken.length, b: s.b, n: s.n };
  const stars = shareStars(s.misses);
  const change = (p: Partial<LiveShare>) => !s.done && set({ ...s, ...p, said: null });

  const check = () => {
    if (!task) return;
    const why = judgeShare(task, s);
    if (why) return game.miss({ misses: s.misses + 1, said: { kind: "wrong", why } });
    game.win({ stars, clean: s.misses === 0, notice: (streak) => shareNotice(task, streak), patch: { done: true } });
  };

  let body: ReactNode;
  let H: number;
  let ask: string;
  let right: string;
  let status: string;
  if (t.kind === "set") {
    const bags = Array.from({ length: t.b }, (_, i) => s.bags[i] ?? 0);
    const pile = pileOf(t.n, bags);
    const fair = pile === 0 && bags.every((k) => k === bags[0]);
    const sum = s.taken.reduce((acc, j) => acc + (bags[j] ?? 0), 0);
    const gap = 14;
    const bw = Math.min(90, (W - 2 * X0 - (t.b - 1) * gap) / t.b);
    const cols = Math.max(1, Math.floor((bw - 12) / 16));
    const [BY, BHT] = [118, 124];
    const AY = 360;
    ask = task ? fill(w.askSet, { a: t.a, b: t.b, n: t.n }) : w.askFree;
    right = fill(w.rightSet, { a: t.a, b: t.b, n: t.n, s: wantOf(t), stars: starText(stars) });
    status = pile ? w.dealHint
      : !task && fair && s.taken.length ? fill(w.freeRead, { k: s.taken.length, b: t.b, n: t.n, s: sum })
      : fill(w.bagsRead, { k: s.taken.length });
    H = task ? AY + 50 : BY + BHT + 90;
    body = (
      <>
        <Tap label={w.deal} on={pile && !s.done ? () => change({ bags: dealRound(bags, t.b, t.n) }) : null}>
          <title>{w.deal}</title>
          <rect x={X0 - 8} y={14} width={12 * 16 + 16} height={Math.max(1, Math.ceil(t.n / 12)) * 16 + 16} rx={14} fill="#fff0f6" stroke={SWEET_EDGE} strokeDasharray={pile ? undefined : "5 4"} />
          {dots(pile, X0, 22, 12)}
        </Tap>
        <text x={X0 + 12 * 16 + 24} y={40} fontSize={15} fill={MUTED} pointerEvents="none">{fill(w.pileLeft, { k: pile })}</text>
        {!task && (
          <g>
            <text x={W - 186} y={84} fontSize={14} fill={MUTED} textAnchor="end" pointerEvents="none">{w.sweets}</text>
            <NumBox x={W - 180} y={58} w={46} h={38} size={17} value={s.n} min={1} max={24} label={w.sweets} onChange={(n) => set({ ...s, n, bags: [], taken: [] })} />
            <text x={W - 70} y={84} fontSize={14} fill={MUTED} textAnchor="end" pointerEvents="none">{w.bagsLabel}</text>
            <NumBox x={W - 64} y={58} w={46} h={38} size={17} value={s.b} min={2} max={6} label={w.bagsLabel} onChange={(b) => set({ ...s, b, bags: [], taken: [] })} />
          </g>
        )}
        {bags.map((k, j) => {
          const x = X0 + j * (bw + gap);
          const taken = s.taken.includes(j);
          const live = !s.done;
          return (
            <g key={j}>
              <Tap label={fill(w.put, { j: j + 1 })} on={live && pile ? () => change({ bags: putIn(bags, t.b, j) }) : null}>
                <path d={`M${x + bw * 0.3} ${BY} h${bw * 0.4} l${bw * 0.25} 18 q${bw * 0.05} 4 ${bw * 0.05} 14 v${BHT - 40} q0 8 -8 8 h${-(bw - 16)} q-8 0 -8 -8 v${-(BHT - 40)} q0 -10 ${bw * 0.05} -14 z`}
                  fill={taken ? "#d3f9d8" : "#fff9db"} stroke={taken ? GREEN : "#e67700"} strokeWidth={taken ? 3 : 2} />
              </Tap>
              <Tap label={fill(w.back, { j: j + 1 })} on={live && k ? () => change({ bags: takeOut(bags, t.b, j) }) : null}>
                {dots(k, x + 6, BY + 26, cols)}
              </Tap>
              <text x={x + bw / 2} y={BY + BHT + 4} fontSize={15} fontWeight={700} textAnchor="middle" fill={INK} pointerEvents="none" dy={14}>{k}</text>
              <Tap role="checkbox" checked={taken} label={fill(w.take, { j: j + 1 })} on={live ? () => change({ taken: toggleTaken(s.taken, j) }) : null}>
                <rect x={x} y={BY + BHT + 28} width={bw} height={30} rx={8} fill={taken ? GREEN : "#f1f3f5"} stroke={taken ? GREEN : "#adb5bd"} />
                <text x={x + bw / 2} y={BY + BHT + 48} fontSize={14} fontWeight={600} textAnchor="middle" fill={taken ? "#fff" : INK} pointerEvents="none">{taken ? `✓ ${w.taken}` : w.takeWord}</text>
              </Tap>
            </g>
          );
        })}
        {task && (
          <g>
            <g pointerEvents="none">
              <SvgFrac n={t.a} d={t.b} x={X0 + 14} y={AY} size={20} />
              <text x={X0 + 36} y={AY + 8} fontSize={20} fill={INK}>{fill(w.ofN, { n: t.n })}</text>
            </g>
            {s.done ? <text x={X0 + 150} y={AY + 9} fontSize={26} fontWeight={700} fill={GREEN} pointerEvents="none">{wantOf(t)}</text>
              : <NumBox x={X0 + 150} y={AY - 24} w={56} h={48} value={s.answer} min={0} max={24} label={w.answer} onChange={(answer) => change({ answer })} />}
          </g>
        )}
      </>
    );
  } else {
    const L = 520;
    const [BY, BH] = [110, 52];
    const known = t.kind === "part" ? [0, (t.a / t.b) * L] : [(t.a / t.b) * L, L];
    const pw = L / s.cut;
    const u = unitOf(t);
    const AY = 270;
    ask = fill(t.kind === "part" ? w.askPart : w.askLeft, { a: t.a, b: t.b, x: t.x });
    right = fill(w.rightBar, { u, t: wantOf(t), stars: starText(stars) });
    status = w.barHint;
    H = AY + 60;
    body = (
      <>
        <text x={W - 124} y={42} fontSize={15} fill={MUTED} textAnchor="end" pointerEvents="none">{w.cutInto}</text>
        <NumBox x={W - 116} y={14} w={50} h={40} size={18} value={s.cut} min={1} max={12} label={w.cutLabel} onChange={(cut) => change({ cut })} />
        <g pointerEvents="none">
          <rect x={X0} y={BY} width={L} height={BH} fill="#e7f5ff" stroke="#1971c2" strokeWidth={2.5} />
          {t.kind === "left" && (
            <g>
              <rect x={X0} y={BY} width={known[0]} height={BH} fill="#e9ecef" />
              <text x={X0 + known[0] / 2} y={BY - 14} fontSize={14} textAnchor="middle" fill={MUTED}>{w.spent}</text>
            </g>
          )}
          {Array.from({ length: s.cut - 1 }, (_, k) => (
            <line key={k} x1={X0 + (k + 1) * pw} y1={BY} x2={X0 + (k + 1) * pw} y2={BY + BH} stroke="#1971c2" strokeWidth={1.5} strokeDasharray="5 3" />
          ))}
          <rect x={X0} y={BY} width={L} height={BH} fill="none" stroke="#1971c2" strokeWidth={2.5} />
          {s.part > 0 && Array.from({ length: s.cut }, (_, k) => (
            <text key={k} x={X0 + (k + 0.5) * pw} y={BY + BH / 2 + 6} fontSize={pw < 50 ? 13 : 17} fontWeight={700} textAnchor="middle" fill="#1971c2">{s.part}</text>
          ))}
          <path d={`M${X0 + known[0] + 2} ${BY - 4} v-8 h${known[1] - known[0] - 4} v8`} fill="none" stroke="#e8590c" strokeWidth={2.5} />
          <text x={X0 + (known[0] + known[1]) / 2} y={BY - 18} fontSize={18} fontWeight={700} textAnchor="middle" fill="#e8590c">{t.x}</text>
          <path d={`M${X0 + 2} ${BY + BH + 6} v8 h${L - 4} v-8`} fill="none" stroke={INK} strokeWidth={2} />
          <text x={X0 + L / 2} y={BY + BH + 36} fontSize={18} fontWeight={700} textAnchor="middle" fill={s.done ? GREEN : INK}>{s.done ? wantOf(t) : "?"}</text>
        </g>
        <text x={X0} y={AY + 8} fontSize={17} fill={INK} pointerEvents="none">{w.onePart}</text>
        <NumBox x={X0 + 104} y={AY - 24} w={56} h={48} value={s.part} min={0} max={40} label={w.partLabel} onChange={(part) => change({ part })} />
        <text x={X0 + 210} y={AY + 8} fontSize={17} fill={INK} pointerEvents="none">{w.all}</text>
        <NumBox x={X0 + 300} y={AY - 24} w={64} h={48} value={s.answer} min={0} max={240} label={w.allLabel} onChange={(answer) => change({ answer })} />
      </>
    );
  }

  const k = t.kind === "part" ? t.a : t.b - t.a;
  const said: Line =
    s.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[s.said.key]} ${right}` }
    : s.done ? { tone: "ok", text: right }
    : s.said?.kind === "wrong" ? { tone: "wrong", text: fill(w.wrong[s.said.why], { a: t.a, b: t.b, k, x: t.kind === "set" ? t.n : t.x }) }
    : { tone: "hint", text: status };
  const row = task && !s.done ? CHECK_H : 0;
  return (
    <>
      <GameHead game={game} g={g}>
        {task && <Stake stars={stars} tries={s.misses} g={g} />}
      </GameHead>
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={s.done} g={g} notices={w.notices}>
        <svg ref={svgRef} className="hand-pic" width={W} height={H + row} viewBox={`0 0 ${W} ${H + row}`} fontFamily={FONT} style={{ touchAction: "none" }} aria-label={ask}>
          <rect width={W} height={H + row} fill="#fff" />
          {body}
          {row > 0 && <CheckRow w={W} y={H} check={{ text: g.check, onTap: check }} />}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={s.done} />
      <Said line={said} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
