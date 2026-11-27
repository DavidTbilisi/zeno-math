// Hamming code (#857): seven bits in three overlapping circles, or twelve in a row with a line per check. Tap a bit to
// flip it; every circle (check) whose count of 1s is odd turns red, and the red checks added up name the one bit inside
// exactly those circles. Puzzles fill in the check bits, find the flipped bit, and see two flips fool the code.
import { useState, type KeyboardEvent } from "react";
import {
  HAMMING_LADDER,
  HAMMING_NOTICES,
  checksOf,
  covers,
  diffs,
  encode,
  failing,
  flip,
  hammingPuzzleOf,
  hammingStart,
  isCheck,
  parityOf,
  sentOf,
  starsFor,
  syndrome,
} from "../math/hammingLab";
import { BLUE, GREEN, MUTED, RED, keyTap } from "./hand";
import { starText } from "./ladderUi";
import { fill, FONT, INK, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const W = 700;
const H = 440;
const R = 112;
const CIRCLES: Record<number, [number, number]> = { 1: [290, 175], 2: [410, 175], 4: [350, 275] };
const SPOT: Record<number, [number, number]> = { 1: [235, 145], 2: [465, 145], 3: [350, 125], 4: [350, 345], 5: [280, 260], 6: [420, 260], 7: [350, 210] };
const TINT: Record<number, string> = { 1: "#1971c2", 2: "#2f9e44", 4: "#e8590c" };
const RX = 20;
const RW = 46;

export function HammingLab({ state, set, w: words, svgRef }: PieceProps<"hammingLab">) {
  const [w, g] = [words.hammingLab, words.game];
  const d = state;
  const p = hammingPuzzleOf(d);
  const game = useGame({
    key: "zeno.hamminglab.v1", size: HAMMING_LADDER.length, notices: HAMMING_NOTICES, modes: ["puzzle", "free"], state: d, set,
    fresh: { said: null }, stagePatch: (k) => hammingStart(HAMMING_LADDER[k]), freePatch: hammingStart(null),
  });
  const [said, setSaid] = useState<{ text: string; tone: "ok" | "wrong"; on: unknown } | null>(null);
  const last = said && said.on === d.bits ? said : null;

  const n = d.bits.length;
  const bad = failing(d.bits);
  const s = syndrome(d.bits);
  const sent = p ? sentOf(p) : null;
  const flipped = sent ? diffs(d.bits, sent) : [];
  const name = (i: number) => (isCheck(i) ? `c${i}` : `d${i}`);
  const sumText = (cs: number[]) => (cs.length ? `${cs.join(" + ")} = ${cs.reduce((a, b) => a + b, 0)}` : "0");

  // ---- moves ----------------------------------------------------------------------------------------------------
  const wrong = (text: string, bits = d.bits) => {
    setSaid({ text, tone: "wrong", on: bits });
    game.miss({ misses: d.misses + 1 });
  };
  const tap = (i: number) => {
    if (d.done) return;
    const bits = flip(d.bits, i);
    const ok = (text: string) => setSaid({ text, tone: "ok", on: bits });
    if (!p) {
      ok(failing(bits).length ? fill(w.points, { sum: sumText(failing(bits)), i: syndrome(bits) }) : w.allEven);
      return failing(bits).length ? game.spot({ bits }, n === 7 ? "culprit" : "binary") : game.tap({ bits });
    }
    if (p.goal === "fill") {
      if (!isCheck(i)) {
        setSaid({ text: fill(w.dataFixed, { i }), tone: "wrong", on: d.bits });
        return game.miss({ misses: d.misses + 1 });
      }
      ok(fill(parityOf(bits, i) ? w.checkOdd : w.checkEven, { c: i }));
      if (!failing(bits).length) return game.win({ stars: starsFor(d.misses), patch: { bits, done: true } });
      return game.step({ bits });
    }
    if (p.goal === "fix") {
      if (i !== s) return wrong(fill(w.notThis, { i, sum: sumText(bad), s }));
      ok(fill(w.fixed, { i }));
      return game.win({ stars: starsFor(d.misses), patch: { bits, done: true }, notice: () => (n === 7 ? "culprit" : "binary") });
    }
    // Two flips: the learner flips any two bits, then corrects the one the circles point to.
    if (flipped.length < 2 || flipped.includes(i)) {
      const now = diffs(bits, sent!);
      ok(now.length === 2 ? fill(w.twoMade, { a: now[0], b: now[1], sum: sumText(failing(bits)), s: syndrome(bits) }) : fill(w.flipped, { k: now.length }));
      return game.tap({ bits });
    }
    if (i !== s) return wrong(fill(w.pointsTo, { s }));
    ok(fill(w.fooled, { i, list: diffs(bits, sent!).join(", ") }));
    game.win({ stars: starsFor(d.misses), patch: { bits, done: true }, notice: () => "twoFlips" });
  };
  const reveal = (v: "venn" | "row") => game.tap({ view: v, bits: v === "venn" ? encode([1, 0, 1, 1], 7) : encode([1, 0, 0, 1, 1, 1, 0, 1], 12) });

  // ---- words --------------------------------------------------------------------------------------------------------
  const stars = p && d.done ? starsFor(d.misses) : 0;
  const line: Line =
    p && d.done ? { tone: "ok", text: `${last?.text ?? ""} ${fill(w.right, { stars: starText(stars) })}`.trim() }
    : last ? { tone: last.tone, text: last.text }
    : d.said?.kind === "notice" ? { tone: "notice", text: w.notices[d.said.key] }
    : { tone: "hint", text: p?.goal === "two" ? w.hintTwo : p?.goal === "fill" ? w.hintFill : w.hint };
  const ask = p ? w.asks[`p${d.stage + 1}` as keyof typeof w.asks] : w.freeAsk;

  // ---- drawing --------------------------------------------------------------------------------------------------------
  const bit = (i: number, x: number, y: number, r: number) => {
    const b = d.bits[i - 1];
    const check = isCheck(i);
    const mark = p?.goal === "two" && flipped.includes(i);
    return (
      <g key={i} data-bit={i} data-value={b} role="button" tabIndex={0} aria-label={fill(w.bitName, { i, what: check ? w.check : w.data, b })} style={{ cursor: "pointer" }}
        onClick={() => tap(i)} onKeyDown={(e: KeyboardEvent) => keyTap(e, () => tap(i))}>
        <title>{fill(w.bitName, { i, what: check ? w.check : w.data, b })}</title>
        {check ? <rect x={x - r} y={y - r} width={2 * r} height={2 * r} rx={6} fill={b ? "#fff3bf" : "#fff"} stroke={mark ? RED : INK} strokeWidth={mark ? 3 : 2} />
          : <circle cx={x} cy={y} r={r} fill={b ? "#d0ebff" : "#fff"} stroke={mark ? RED : INK} strokeWidth={mark ? 3 : 2} />}
        <text x={x} y={y + 7} fontSize={20} fontWeight={700} textAnchor="middle" fill={INK} pointerEvents="none">{b}</text>
        <text x={x} y={y + r + 13} fontSize={10} textAnchor="middle" fill={MUTED} pointerEvents="none">{`${i} · ${name(i)}`}</text>
      </g>
    );
  };
  const readout = (y: number) => (
    <g>
      <text x={W / 2} y={y} fontSize={14} fontWeight={700} textAnchor="middle" fill={bad.length ? RED : GREEN} data-syndrome={s}>
        {bad.length ? fill(w.syndrome, { sum: sumText(bad), bin: s.toString(2).padStart(checksOf(n).length, "0"), s }) : w.allEven}
      </text>
    </g>
  );

  return (
    <>
      <GameHead game={game} g={g} />
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done && !!p} g={g} notices={w.notices}>
        <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} style={{ userSelect: "none" }}>
          <rect width={W} height={H} fill="#fff" />
          {!p && (["venn", "row"] as const).map((v, k) => (
            <g key={v} role="button" tabIndex={0} aria-label={w.views[v]} aria-pressed={d.view === v} style={{ cursor: "pointer" }} onClick={() => reveal(v)} onKeyDown={(e: KeyboardEvent) => keyTap(e, () => reveal(v))}>
              <rect x={10 + k * 150} y={8} width={142} height={30} rx={7} fill={d.view === v ? "#d0ebff" : "#f8f9fa"} stroke={d.view === v ? BLUE : "#ced4da"} strokeWidth={d.view === v ? 2 : 1} />
              <text x={81 + k * 150} y={28} fontSize={12} fontWeight={700} textAnchor="middle" fill={INK}>{w.views[v]}</text>
            </g>
          ))}
          {n === 7 ? (
            <g>
              {/* Three circles, one per check; red while its count of 1s is odd. */}
              {checksOf(7).map((c) => {
                const [cx, cy] = CIRCLES[c];
                const odd = bad.includes(c);
                const ones = d.bits.filter((b, k) => b && covers(c, k + 1)).length;
                const [lx, ly] = c === 4 ? [cx, cy + R + 16] : [cx + (c === 1 ? -R + 10 : R - 10), cy - R + 12];
                return (
                  <g key={c} data-circle={c} data-odd={odd ? "1" : "0"} pointerEvents="none">
                    <circle cx={cx} cy={cy} r={R} fill={odd ? "rgba(250,82,82,0.12)" : "rgba(64,192,87,0.08)"} stroke={odd ? RED : TINT[c]} strokeWidth={odd ? 3 : 2} />
                    <text x={lx} y={ly} fontSize={12} fontWeight={700} textAnchor="middle" fill={odd ? RED : TINT[c]}>{fill(w.circle, { c, ones })}</text>
                  </g>
                );
              })}
              {[1, 2, 3, 4, 5, 6, 7].map((i) => bit(i, SPOT[i][0], SPOT[i][1], 20))}
              {/* The same seven bits in a row, place by place. */}
              <text x={150} y={H - 42} fontSize={11} textAnchor="end" fill={MUTED}>{w.inRow}</text>
              {d.bits.map((b, k) => (
                <g key={k}>
                  <rect x={160 + k * 34} y={H - 62} width={30} height={30} rx={4} fill={isCheck(k + 1) ? "#fff3bf" : "#f8f9fa"} stroke={k + 1 === s && bad.length ? RED : "#ced4da"} strokeWidth={k + 1 === s && bad.length ? 2.5 : 1} />
                  <text x={175 + k * 34} y={H - 41} fontSize={14} fontWeight={700} textAnchor="middle" fill={INK}>{b}</text>
                </g>
              ))}
              {readout(H - 8)}
            </g>
          ) : (
            <g>
              {/* Twelve bits in a row; under them one line per check, a dot at every place it covers. */}
              {d.bits.map((_, k) => bit(k + 1, RX + 20 + k * RW, 90, 20))}
              {checksOf(12).map((c, r) => {
                const y = 160 + r * 44;
                const odd = bad.includes(c);
                return (
                  <g key={c} data-check={c} data-odd={odd ? "1" : "0"}>
                    <rect x={RX - 6} y={y - 16} width={12 * RW + 4} height={34} rx={6} fill={odd ? "#fff5f5" : "#f4fce3"} stroke={odd ? RED : "#d8f5a2"} />
                    {d.bits.map((b, k) => covers(c, k + 1) && <circle key={k} cx={RX + 20 + k * RW} cy={y} r={7} fill={b ? (odd ? RED : GREEN) : "#fff"} stroke={odd ? RED : GREEN} strokeWidth={1.5} />)}
                    <text x={RX + 12 * RW + 8} y={y + 5} fontSize={12} fontWeight={700} fill={odd ? RED : GREEN}>{fill(odd ? w.lineOdd : w.lineEven, { c })}</text>
                  </g>
                );
              })}
              {readout(370)}
            </g>
          )}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.done && !!p} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
