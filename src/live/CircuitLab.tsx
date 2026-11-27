// The circuit lab (#841), worked by hand: a gate dragged from the tray onto the board, a wire dragged from an output
// (a switch's, a gate's) to an input pin, a wire tapped to cut it, a gate dropped in the bin to take it away, a switch
// tapped to flip it and a row of the truth table tapped to set every switch to it. Wires and lamps that carry a 1 light
// up. A puzzle is won the moment every row of its table is right; stars for doing it in few gates. The board keeps what
// its gates last settled to, so a latch remembers (#842); a memory puzzle's rows run in turn, a row tapped replays them.
import { type KeyboardEvent } from "react";
import {
  CIRCUIT_LADDER,
  CIRCUIT_NOTICES,
  GATES,
  MAX_GATES,
  bitsOf,
  circuitStars,
  ioOf,
  joined,
  nextGateId,
  pinsOf,
  puzzleOf,
  settle,
  tableOf,
  without,
  type Circuit,
  type Gate,
  type GateKind,
  type LiveCircuit,
} from "../math/circuitLab";
import { Bin, GREEN, MUTED, RED, inBox, keyTap, pointIn, useDrag } from "./hand";
import { starText } from "./ladderUi";
import { fill, FONT, INK, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const W = 660;
const TRAY = 66;
/** The board, left of the truth table. */
const BW = 452;
const BH = 330;
const H = TRAY + BH;
/** A gate's body, its pins outside it. */
const GW = 56;
const GH = 40;
const HIT = 16;
const OFF = "#adb5bd";
const LIT = "#ffd43b";
const BIN = { x: W - 106, y: 4, w: 98, h: 58 };

const FRESH: Partial<LiveCircuit> = { gates: [], wires: [], on: 0, done: false, said: null, mem: {}, step: 0 };

const clampGate = (x: number, y: number): [number, number] =>
  [Math.round(Math.min(BW - GW - 70, Math.max(78, x))), Math.round(Math.min(H - GH - 8, Math.max(TRAY + 8, y)))];

/** Where switch k of n sits (its middle), and the lamps likewise. */
const rowY = (k: number, n: number) => TRAY + (BH * (k + 1)) / (n + 1);
const switchOut = (k: number, n: number): [number, number] => [66, rowY(k, n)];
const lampIn = (k: number, n: number): [number, number] => [BW - 58, rowY(k, n)];
const gateIn = (g: Gate, pin: number): [number, number] => [g.x - 8, pinsOf(g.kind) === 1 ? g.y + GH / 2 : g.y + (pin === 0 ? 12 : 28)];
const gateOut = (g: Gate): [number, number] => [g.x + GW + 8, g.y + GH / 2];

/** A gate's outline with its top-left corner at (x, y). */
function gateBody(kind: GateKind, x: number, y: number, stroke: string) {
  const bubble = (cx: number) => <circle cx={cx} cy={y + GH / 2} r={4.5} fill="#fff" stroke={stroke} strokeWidth={2} />;
  const or = (x0: number) => `M${x0} ${y} Q${x0 + 30} ${y} ${x0 + 46} ${y + GH / 2} Q${x0 + 30} ${y + GH} ${x0} ${y + GH} Q${x0 + 12} ${y + GH / 2} ${x0} ${y} Z`;
  const and = `M${x} ${y} H${x + 24} A20 20 0 0 1 ${x + 24} ${y + GH} H${x} Z`;
  const body = { fill: "#fff", stroke, strokeWidth: 2, strokeLinejoin: "round" as const };
  return (
    <>
      {kind === "not" && <path d={`M${x} ${y + 2} L${x + 42} ${y + GH / 2} L${x} ${y + GH - 2} Z`} {...body} />}
      {(kind === "and" || kind === "nand") && <path d={and} {...body} />}
      {(kind === "or" || kind === "nor") && <path d={or(x)} {...body} />}
      {kind === "xor" && (
        <>
          <path d={or(x + 6)} {...body} />
          <path d={`M${x} ${y} Q${x + 12} ${y + GH / 2} ${x} ${y + GH}`} fill="none" stroke={stroke} strokeWidth={2} />
        </>
      )}
      {kind === "not" && bubble(x + 47)}
      {kind === "nand" && bubble(x + 49)}
      {kind === "nor" && bubble(x + 51)}
      <text x={x + 19} y={y + GH / 2 + 4} fontSize={10} fontWeight={700} textAnchor="middle" fill={stroke}>{kind.toUpperCase()}</text>
    </>
  );
}

const wirePath = ([x1, y1]: [number, number], [x2, y2]: [number, number]) => {
  const k = Math.max(30, Math.abs(x2 - x1) / 2);
  return `M${x1} ${y1} C${x1 + k} ${y1} ${x2 - k} ${y2} ${x2} ${y2}`;
};

type Held = { what: "new"; kind: GateKind } | { what: "gate"; id: string; dx: number; dy: number } | { what: "wire"; from: string };

export function CircuitLab({ state, set, w: words, svgRef }: PieceProps<"circuitLab">) {
  const [w, g] = [words.circuitLab, words.game];
  const d = state;
  const p = puzzleOf(d);
  const io = ioOf(d);
  const [n, m] = [io.ins.length, io.outs.length];
  const kinds = p ? p.gates : GATES;
  const game = useGame({ key: "zeno.circuitlab.v1", size: CIRCUIT_LADDER.length, notices: CIRCUIT_NOTICES, modes: ["puzzle", "free"], state: d, set, fresh: FRESH });

  const ins = bitsOf(d.on, n);
  const mem = d.mem ?? {};
  const { val, steady } = settle(d, ins, m, mem);
  const table = tableOf(d, io, p);
  const stars = p ? circuitStars(p, d.gates.length) : 0;

  /** A change to the circuit: the puzzle won once every row is right, a loop that won't settle noticed. */
  const change = (c0: Circuit) => {
    const now = settle(c0, ins, m, mem);
    const c = { ...c0, mem: now.val };
    const rows = tableOf(c, io, p);
    if (p && !d.done && c.gates.length && rows.every((r) => r.ok))
      return game.win({ stars: circuitStars(p, c.gates.length), patch: { ...c, done: true } });
    if (steady && !now.steady) return game.spot(c, "loop");
    game.tap(c);
  };

  const spotFor = (k: GateKind): [number, number] => {
    // The first free place on a grid, for a gate added from the keyboard.
    for (let y = TRAY + 16; y < H - GH; y += 56)
      for (let x = 96; x < BW - GW - 70; x += 80)
        if (!d.gates.some((o) => Math.abs(o.x - x) < GW + 10 && Math.abs(o.y - y) < GH + 10)) return [x, y];
    return clampGate(BW / 2 - (k === "not" ? 20 : 28), TRAY + 20);
  };
  const add = (kind: GateKind, x: number, y: number) => {
    if (d.gates.length >= MAX_GATES) return;
    change({ gates: [...d.gates, { id: nextGateId(d.gates), kind, x, y }], wires: d.wires });
  };

  /** The input pin nearest (x, y), within reach, that isn't on the part the wire starts from. */
  const pinNear = (x: number, y: number, from: string): { to: string; pin: number } | null => {
    let best: { to: string; pin: number; dd: number } | null = null;
    const look = (to: string, pin: number, [px, py]: [number, number]) => {
      const dd = Math.hypot(px - x, py - y);
      if (to !== from && dd <= HIT && (!best || dd < best.dd)) best = { to, pin, dd };
    };
    for (const o of d.gates) for (let pin = 0; pin < pinsOf(o.kind); pin++) look(o.id, pin, gateIn(o, pin));
    for (let k = 0; k < m; k++) look(`o${k}`, 0, lampIn(k, m));
    return best;
  };

  const { drag, begin, svgProps } = useDrag<Held>((h) => {
    if (h.what === "new") {
      if (h.moved && h.y > TRAY && h.x < BW) add(h.kind, ...clampGate(h.x - GW / 2, h.y - GH / 2));
    } else if (h.what === "gate") {
      if (!h.moved) return;
      if (inBox(BIN, h.x, h.y)) return change(without(d, h.id));
      const [x, y] = clampGate(h.x - h.dx, h.y - h.dy);
      game.tap({ gates: d.gates.map((o) => (o.id === h.id ? { ...o, x, y } : o)) });
    } else {
      const at = pinNear(h.x, h.y, h.from);
      if (at) change({ gates: d.gates, wires: joined(d, { from: h.from, ...at }) });
    }
  });

  const held = drag?.what === "gate" && drag.moved ? drag : null;
  const heldAt = held && clampGate(held.x - held.dx, held.y - held.dy);
  const shown: Gate[] = d.gates.map((o) => (held && heldAt && o.id === held.id ? { ...o, x: heldAt[0], y: heldAt[1] } : o));
  const outAt = (id: string): [number, number] | null => {
    if (id.startsWith("i")) return switchOut(Number(id.slice(1)), n);
    const o = shown.find((x) => x.id === id);
    return o ? gateOut(o) : null;
  };
  const inAt = (id: string, pin: number): [number, number] | null => {
    if (id.startsWith("o")) return lampIn(Number(id.slice(1)), m);
    const o = shown.find((x) => x.id === id);
    return o ? gateIn(o, pin) : null;
  };

  /** The switches set to `on`, the gates settling from what they held. */
  const setTo = (on: number) => game.tap({ on, mem: settle(d, bitsOf(on, n), m, mem).val });
  const flip = (k: number) => setTo(d.on ^ (1 << (n - 1 - k)));
  /** A row tapped: a truth table's row set at once; a memory strip run from power-on to that row. */
  const toRow = (i: number) => (p?.steps ? game.tap({ on: p.steps[i], step: i, mem: table[i].val }) : setTo(i));
  const right = table.filter((r) => r.ok).length;
  const line: Line =
    d.done && p ? { tone: "ok", text: `${fill(w.right, { n: d.gates.length, stars: starText(stars) })}${stars < 3 ? ` ${fill(w.fewer, { best: p.best })}` : ""}` }
    : d.said?.kind === "notice" ? { tone: "notice", text: w.notices[d.said.key] }
    : !steady ? { tone: "wrong", text: w.loop }
    : p && d.gates.length ? { tone: "hint", text: fill(w.rows, { k: right, n: table.length }) }
    : { tone: "hint", text: w.hint };
  const ask = p ? w.asks[`p${d.stage + 1}` as keyof typeof w.asks] : w.freeAsk;

  // The truth table, right of the board: the switches, what the lamps give, and what the puzzle wants.
  const COL = 22;
  const tx = BW + 14;
  // Each group at least as wide as its heading, so "yours" and "wanted" don't run together.
  const gotX = tx + n * COL + 14;
  const wantX = gotX + Math.max(m * COL, 44) + 12;
  const bit = (b: boolean) => (b ? "1" : "0");

  return (
    <>
      <GameHead game={game} g={g} />
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done && !!p} g={g} notices={w.notices}>
        <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} style={{ touchAction: "none", cursor: drag ? "grabbing" : "default" }} {...svgProps}>
          <rect width={W} height={H} fill="#fff" />
          <rect x={4} y={TRAY} width={BW - 4} height={BH - 4} rx={10} fill="#f8f9fa" stroke="#dee2e6" />

          {/* The tray: a gate of each kind the puzzle allows, to drag onto the board. */}
          {kinds.map((k, i) => (
            <g key={k} role="button" tabIndex={0} aria-label={fill(w.add, { g: k.toUpperCase() })} style={{ cursor: "grab" }}
              onPointerDown={(e) => begin(e, { what: "new", kind: k })} onKeyDown={(e: KeyboardEvent) => keyTap(e, () => add(k, ...spotFor(k)))}>
              <title>{fill(w.add, { g: k.toUpperCase() })}</title>
              <rect x={8 + i * 76} y={6} width={70} height={54} rx={8} fill="#fff" stroke="#ced4da" />
              {gateBody(k, 15 + i * 76, 13, INK)}
            </g>
          ))}
          <Bin {...BIN} hot={!!held && inBox(BIN, held.x, held.y)} label={w.bin} title={w.binTitle} onTap={() => change({ gates: [], wires: [] })} />

          {/* Wires: lit when they carry a 1; a wide clear line over each to tap it away. */}
          {d.wires.map((x) => {
            const [a, b] = [outAt(x.from), inAt(x.to, x.pin)];
            if (!a || !b) return null;
            const path = wirePath(a, b);
            return (
              <g key={`${x.to}/${x.pin}`} data-wire={`${x.from}>${x.to}.${x.pin}`}>
                <path d={path} fill="none" stroke={val[x.from] ? GREEN : OFF} strokeWidth={val[x.from] ? 3.5 : 2.5} />
                <path d={path} fill="none" stroke="transparent" strokeWidth={12} style={{ cursor: "pointer" }} onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => change({ gates: d.gates, wires: d.wires.filter((o) => o !== x) })}>
                  <title>{w.cut}</title>
                </path>
              </g>
            );
          })}
          {drag?.what === "wire" && (() => {
            const a = outAt(drag.from);
            return a && <path d={wirePath(a, [drag.x, drag.y])} fill="none" stroke="#1971c2" strokeWidth={2.5} strokeDasharray="6 4" pointerEvents="none" />;
          })()}

          {/* Switches: tap to flip; drag from the pin on the right for a wire. */}
          {io.ins.map((name, k) => {
            const [px, py] = switchOut(k, n);
            const on = ins[k];
            return (
              <g key={name} data-switch={k}>
                <g role="switch" aria-checked={on} aria-label={fill(w.switchName, { s: name })} tabIndex={0} style={{ cursor: "pointer" }}
                  onPointerDown={(e) => e.stopPropagation()} onClick={() => flip(k)} onKeyDown={(e: KeyboardEvent) => keyTap(e, () => flip(k))}>
                  <rect x={12} y={py - 17} width={44} height={34} rx={17} fill={on ? GREEN : "#e9ecef"} stroke={on ? GREEN : "#ced4da"} />
                  <circle cx={on ? 39 : 29} cy={py} r={12} fill="#fff" stroke={on ? GREEN : MUTED} />
                  <text x={34} y={py - 22} fontSize={13} fontWeight={700} textAnchor="middle" fill={INK}>{name}</text>
                </g>
                <line x1={56} y1={py} x2={px} y2={py} stroke={on ? GREEN : OFF} strokeWidth={2.5} />
                <circle cx={px} cy={py} r={6} fill={on ? GREEN : "#fff"} stroke={INK} strokeWidth={1.5} style={{ cursor: "crosshair" }} data-out={`i${k}`}
                  onPointerDown={(e) => begin(e, { what: "wire", from: `i${k}` })} />
              </g>
            );
          })}

          {/* Lamps: lit by a 1 on their wire; "?" while the circuit won't settle. */}
          {io.outs.map((name, k) => {
            const [px, py] = lampIn(k, m);
            const lit = steady && val[`o${k}`];
            return (
              <g key={name} data-lamp={k} role="img" aria-label={`${name} = ${steady ? bit(!!val[`o${k}`]) : "?"}`}>
                <line x1={px} y1={py} x2={px + 14} y2={py} stroke={OFF} strokeWidth={2.5} />
                <circle cx={px + 30} cy={py} r={16} fill={lit ? LIT : "#f1f3f5"} stroke={lit ? "#f08c00" : MUTED} strokeWidth={2} />
                {lit && <circle cx={px + 30} cy={py} r={23} fill="none" stroke={LIT} strokeWidth={3} opacity={0.6} />}
                <text x={px + 30} y={py + 5} fontSize={13} fontWeight={700} textAnchor="middle" fill={INK}>{steady ? name : "?"}</text>
                <circle cx={px} cy={py} r={5} fill="#fff" stroke={INK} strokeWidth={1.5} data-in={`o${k}.0`} />
              </g>
            );
          })}

          {/* Gates: drag the body to move it (into the bin to take it away), drag from the output pin for a wire. */}
          {shown.map((o) => {
            const [ox, oy] = gateOut(o);
            const on = !!val[o.id];
            return (
              <g key={o.id} data-gate={o.id} data-kind={o.kind}>
                {Array.from({ length: pinsOf(o.kind) }, (_, pin) => {
                  const [ix, iy] = gateIn(o, pin);
                  return (
                    <g key={pin}>
                      <line x1={ix} y1={iy} x2={o.x + 4} y2={iy} stroke={INK} strokeWidth={2} />
                      <circle cx={ix} cy={iy} r={5} fill="#fff" stroke={INK} strokeWidth={1.5} data-in={`${o.id}.${pin}`} />
                    </g>
                  );
                })}
                <g style={{ cursor: "grab" }} onPointerDown={(e) => {
                  const [px, py] = pointIn(e);
                  begin(e, { what: "gate", id: o.id, dx: px - o.x, dy: py - o.y });
                }}>
                  <rect x={o.x - 2} y={o.y - 2} width={GW + 4} height={GH + 4} fill="transparent" />
                  {gateBody(o.kind, o.x, o.y, INK)}
                </g>
                <line x1={o.x + GW - 4} y1={oy} x2={ox} y2={oy} stroke={on ? GREEN : INK} strokeWidth={2} />
                <circle cx={ox} cy={oy} r={6} fill={on ? GREEN : "#fff"} stroke={INK} strokeWidth={1.5} style={{ cursor: "crosshair" }} data-out={o.id}
                  onPointerDown={(e) => begin(e, { what: "wire", from: o.id })} />
              </g>
            );
          })}
          {drag?.what === "new" && drag.moved && <g opacity={0.6} pointerEvents="none">{gateBody(drag.kind, drag.x - GW / 2, drag.y - GH / 2, INK)}</g>}

          {/* The truth table: tap a row to set the switches to it. */}
          <text x={gotX + (m * COL) / 2 - 6} y={TRAY + 14} fontSize={11} textAnchor="middle" fill={MUTED}>{w.yours}</text>
          {p && <text x={wantX + (m * COL) / 2 - 6} y={TRAY + 14} fontSize={11} textAnchor="middle" fill={MUTED}>{w.wanted}</text>}
          {[...io.ins.map((s, k) => [s, tx + k * COL] as const), ...io.outs.map((s, k) => [s, gotX + k * COL] as const), ...(p ? io.outs.map((s, k) => [s, wantX + k * COL] as const) : [])].map(([s, x], i) => (
            <text key={i} x={x + 4} y={TRAY + 32} fontSize={12} fontWeight={700} textAnchor="middle" fill={INK}>{s}</text>
          ))}
          {table.map((r, i) => {
            const y = TRAY + 40 + i * 28;
            const here = p?.steps ? i === (d.step ?? 0) && d.on === p.steps[i] : i === d.on;
            return (
              <g key={i} role="button" tabIndex={0} aria-label={fill(p?.steps ? w.step : w.row, { bits: r.ins.map(bit).join(""), k: i + 1 })} style={{ cursor: "pointer" }} data-row={i}
                aria-pressed={here} onPointerDown={(e) => e.stopPropagation()} onClick={() => toRow(i)} onKeyDown={(e: KeyboardEvent) => keyTap(e, () => toRow(i))}>
                <rect x={tx - 8} y={y} width={W - tx} height={26} rx={6} fill={here ? "#e7f5ff" : "transparent"} stroke={here ? "#74c0fc" : "none"} />
                {r.ins.map((b, k) => <text key={`i${k}`} x={tx + k * COL + 4} y={y + 18} fontSize={14} textAnchor="middle" fill={INK}>{bit(b)}</text>)}
                {r.got.map((b, k) => (
                  <text key={`g${k}`} x={gotX + k * COL + 4} y={y + 18} fontSize={14} fontWeight={700} textAnchor="middle"
                    fill={!r.steady ? RED : r.want && r.want[k] !== null ? (b === r.want[k] ? GREEN : RED) : INK}>{r.steady ? bit(b) : "?"}</text>
                ))}
                {r.want?.map((b, k) => <text key={`w${k}`} x={wantX + k * COL + 4} y={y + 18} fontSize={14} textAnchor="middle" fill={MUTED}>{b === null ? "–" : bit(b)}</text>)}
              </g>
            );
          })}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.done && !!p} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
