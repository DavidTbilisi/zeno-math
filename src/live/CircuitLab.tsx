// The circuit lab (#841), worked by hand: a gate dragged from the tray onto the board, a wire dragged from an output
// (a switch's, a gate's) to an input pin, a wire tapped to cut it, a gate dropped in the bin to take it away, a switch
// tapped to flip it and a row of the truth table tapped to set every switch to it. Wires and lamps that carry a 1 light
// up. A puzzle is won the moment every row of its table is right; stars for doing it in few gates. The board keeps what
// its gates last settled to, so a latch remembers (#842); a memory puzzle's rows run in turn, a row tapped replays them.
// Chips (#843) are parts with several pins, named beside each; numbers of several switches are read in decimal.
import { useMemo, type KeyboardEvent } from "react";
import {
  CHIP_PINS,
  CIRCUIT_LADDER,
  CIRCUIT_NOTICES,
  MAX_GATES,
  bitsOf,
  circuitStars,
  freeKinds,
  groupsOf,
  ioOf,
  isBasic,
  joined,
  nextGateId,
  outId,
  outsOf,
  partOf,
  pinsOf,
  puzzleOf,
  settle,
  tableOf,
  without,
  type Circuit,
  type Gate,
  type GateKind,
  type LiveCircuit,
  type Row,
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
/** A gate's body, its pins outside it; a chip's width and the gap between its pins. */
const GW = 56;
const GH = 40;
const CW = 64;
const PIN = 16;
const HIT = 16;
const OFF = "#adb5bd";
const LIT = "#ffd43b";
const CHIP = "#fff3bf";
const BIN = { x: W - 106, y: 4, w: 98, h: 58 };
const CHIP_NAME: Record<string, string> = { fa: "FA", mux: "MUX", dff: "D FF", tff: "T FF", add4: "ADD 4", alu1: "ALU" };

const FRESH: Partial<LiveCircuit> = { gates: [], wires: [], on: 0, done: false, said: null, mem: {}, step: 0 };

/** A part's width and height. */
const sizeOf = (k: GateKind): [number, number] => (k === "one" ? [34, 28] : isBasic(k) ? [GW, GH] : [CW, 12 + PIN * Math.max(pinsOf(k), outsOf(k))]);
const clampGate = (k: GateKind, x: number, y: number): [number, number] => {
  const [w, h] = sizeOf(k);
  return [Math.round(Math.min(BW - w - 70, Math.max(78, x))), Math.round(Math.min(H - h - 8, Math.max(TRAY + 8, y)))];
};

/** Where switch k of n sits (its middle), and the lamps likewise. */
const rowY = (k: number, n: number) => TRAY + (BH * (k + 1)) / (n + 1);
const switchOut = (k: number, n: number): [number, number] => [66, rowY(k, n)];
const lampIn = (k: number, n: number): [number, number] => [BW - 58, rowY(k, n)];
const gateIn = (g: Gate, pin: number): [number, number] =>
  isBasic(g.kind) ? [g.x - 8, pinsOf(g.kind) === 1 ? g.y + GH / 2 : g.y + (pin === 0 ? 12 : 28)] : [g.x - 8, g.y + 14 + PIN * pin];
const gateOut = (g: Gate, k = 0): [number, number] => {
  const [w, h] = sizeOf(g.kind);
  return isBasic(g.kind) || g.kind === "one" ? [g.x + w + 8, g.y + h / 2] : [g.x + w + 8, g.y + 14 + PIN * k];
};

/** A part's outline with its top-left corner at (x, y). */
function gateBody(kind: GateKind, x: number, y: number, stroke: string) {
  const body = { fill: "#fff", stroke, strokeWidth: 2, strokeLinejoin: "round" as const };
  if (kind === "one")
    return (
      <>
        <rect x={x} y={y} width={34} height={28} rx={6} {...body} fill="#fff9db" />
        <text x={x + 17} y={y + 19} fontSize={14} fontWeight={700} textAnchor="middle" fill={stroke}>1</text>
      </>
    );
  if (!isBasic(kind)) {
    const [w, h] = sizeOf(kind);
    const pins = CHIP_PINS[kind];
    return (
      <>
        <rect x={x} y={y} width={w} height={h} rx={6} {...body} fill={CHIP} />
        <text x={x + w / 2} y={y - 4} fontSize={10} fontWeight={700} textAnchor="middle" fill={stroke}>{CHIP_NAME[kind]}</text>
        {pins.ins.map((s, p) => <text key={`i${p}`} x={x + 4} y={y + 17 + PIN * p} fontSize={8.5} fill={stroke}>{s}</text>)}
        {pins.outs.map((s, k) => <text key={`o${k}`} x={x + w - 4} y={y + 17 + PIN * k} fontSize={8.5} textAnchor="end" fill={stroke}>{s}</text>)}
      </>
    );
  }
  const bubble = (cx: number) => <circle cx={cx} cy={y + GH / 2} r={4.5} fill="#fff" stroke={stroke} strokeWidth={2} />;
  const or = (x0: number) => `M${x0} ${y} Q${x0 + 30} ${y} ${x0 + 46} ${y + GH / 2} Q${x0 + 30} ${y + GH} ${x0} ${y + GH} Q${x0 + 12} ${y + GH / 2} ${x0} ${y} Z`;
  const and = `M${x} ${y} H${x + 24} A20 20 0 0 1 ${x + 24} ${y + GH} H${x} Z`;
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
  const game = useGame({ key: "zeno.circuitlab.v1", size: CIRCUIT_LADDER.length, notices: CIRCUIT_NOTICES, modes: ["puzzle", "free"], state: d, set, fresh: FRESH });
  const kinds = p ? p.gates : freeKinds(game.ladder.stars);
  const kindName = (k: GateKind) => (k === "one" ? "1" : CHIP_NAME[k] ?? k.toUpperCase());

  const ins = bitsOf(d.on, n);
  const mem = d.mem ?? {};
  const { val, steady } = settle(d, ins, m, mem);
  // The whole table (up to 1024 rows), worked out again only when the circuit or the puzzle changes.
  const table = useMemo(() => tableOf(d, io, p), [d.gates, d.wires, d.mode, d.stage]); // eslint-disable-line react-hooks/exhaustive-deps
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
    const [kw, kh] = sizeOf(k);
    // Pins stick out 8 either side, so parts keep 30 apart side by side.
    for (let y = TRAY + 16; y < H - kh; y += 28)
      for (let x = 96; x < BW - kw - 70; x += 20)
        if (!d.gates.some((o) => {
          const [ow, oh] = sizeOf(o.kind);
          return x < o.x + ow + 30 && o.x < x + kw + 30 && y < o.y + oh + 14 && o.y < y + kh + 14;
        })) return [x, y];
    return clampGate(k, BW / 2 - kw / 2, TRAY + 20);
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
      if (to !== partOf(from) && dd <= HIT && (!best || dd < best.dd)) best = { to, pin, dd };
    };
    for (const o of d.gates) for (let pin = 0; pin < pinsOf(o.kind); pin++) look(o.id, pin, gateIn(o, pin));
    for (let k = 0; k < m; k++) look(`o${k}`, 0, lampIn(k, m));
    return best;
  };

  const { drag, begin, svgProps } = useDrag<Held>((h) => {
    if (h.what === "new") {
      const [kw, kh] = sizeOf(h.kind);
      if (h.moved && h.y > TRAY && h.x < BW) add(h.kind, ...clampGate(h.kind, h.x - kw / 2, h.y - kh / 2));
    } else if (h.what === "gate") {
      if (!h.moved) return;
      if (inBox(BIN, h.x, h.y)) return change(without(d, h.id));
      const o = d.gates.find((x) => x.id === h.id);
      if (!o) return;
      const [x, y] = clampGate(o.kind, h.x - h.dx, h.y - h.dy);
      game.tap({ gates: d.gates.map((q) => (q.id === h.id ? { ...q, x, y } : q)) });
    } else {
      const at = pinNear(h.x, h.y, h.from);
      if (at) change({ gates: d.gates, wires: joined(d, { from: h.from, ...at }) });
    }
  });

  const held = drag?.what === "gate" && drag.moved ? drag : null;
  const heldGate = held && d.gates.find((o) => o.id === held.id);
  const heldAt = held && heldGate && clampGate(heldGate.kind, held.x - held.dx, held.y - held.dy);
  const shown: Gate[] = d.gates.map((o) => (held && heldAt && o.id === held.id ? { ...o, x: heldAt[0], y: heldAt[1] } : o));
  const outAt = (from: string): [number, number] | null => {
    if (from.startsWith("i")) return switchOut(Number(from.slice(1)), n);
    const [id, k] = from.split(".");
    const o = shown.find((x) => x.id === id);
    return o ? gateOut(o, Number(k ?? 0)) : null;
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
  const toRow = (r: Row, i: number) => (p?.steps ? game.tap({ on: r.on, step: i, mem: r.val }) : setTo(r.on));
  const right = table.filter((r) => r.ok).length;
  const line: Line =
    d.done && p ? { tone: "ok", text: `${fill(w.right, { n: d.gates.length, stars: starText(stars) })}${stars < 3 ? ` ${fill(w.fewer, { best: p.best })}` : ""}` }
    : d.said?.kind === "notice" ? { tone: "notice", text: w.notices[d.said.key] }
    : !steady ? { tone: "wrong", text: w.loop }
    : p && d.gates.length ? { tone: "hint", text: fill(w.rows, { k: right, n: table.length }) }
    : { tone: "hint", text: w.hint };
  const ask = p ? w.asks[`p${d.stage + 1}` as keyof typeof w.asks] : w.freeAsk;

  // The table, right of the board: the switches, what the lamps give, and what the puzzle wants; numbers in decimal.
  const rows = p?.show ? table.filter((r) => p.show!.includes(r.on)) : table;
  const nums = p?.nums;
  const [inCols, outCols] = nums ? [nums.ins.map(([s]) => s), nums.outs.map(([s]) => s)] : [io.ins, io.outs];
  const COL = nums ? 25 : 22;
  const tx = BW + 14;
  // Each group at least as wide as its heading, so "yours" and "wanted" don't run together.
  const gotX = tx + inCols.length * COL + (nums ? 6 : 14);
  const wantX = gotX + Math.max(outCols.length * COL, 44) + (nums ? 4 : 12);
  const rh = Math.min(28, (BH - 50) / rows.length);
  const bit = (b: boolean) => (b ? "1" : "0");
  const cells = (r: Row) => {
    if (!nums) return { ins: r.ins.map(bit), got: r.got.map(bit), want: r.want?.map((b) => (b === null ? "–" : bit(b))) ?? null, ok: r.want?.map((b, k) => b === null || b === r.got[k]) };
    const wants = r.want && nums.outs.map((_, k) => {
      const at = nums.outs.slice(0, k).reduce((s, [, b]) => s + b, 0);
      return r.want!.slice(at, at + nums.outs[k][1]).some((b) => b === null) ? null : 0;
    });
    const got = groupsOf(r.got, nums.outs);
    const want = r.want ? groupsOf(r.want, nums.outs) : null;
    return {
      ins: groupsOf(r.ins, nums.ins).map(String),
      got: got.map(String),
      want: want?.map((v, k) => (wants?.[k] === null ? "–" : String(v))) ?? null,
      ok: want?.map((v, k) => wants?.[k] === null || v === got[k]),
    };
  };

  // Many switches: smaller, their names beside them.
  const small = n > 5;
  const tile = Math.min(76, (BIN.x - 8) / kinds.length);

  return (
    <>
      <GameHead game={game} g={g} />
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done && !!p} g={g} notices={w.notices}>
        <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} style={{ touchAction: "none", cursor: drag ? "grabbing" : "default" }} {...svgProps}>
          <rect width={W} height={H} fill="#fff" />
          <rect x={4} y={TRAY} width={BW - 4} height={BH - 4} rx={10} fill="#f8f9fa" stroke="#dee2e6" />

          {/* The tray: a part of each kind the puzzle allows, to drag onto the board. */}
          {kinds.map((k, i) => {
            const [kw, kh] = sizeOf(k);
            const s = Math.min(1, (tile - 12) / (kw + 6), 44 / kh);
            const x0 = 8 + i * tile;
            return (
              <g key={k} role="button" tabIndex={0} aria-label={fill(w.add, { g: kindName(k) })} style={{ cursor: "grab" }}
                onPointerDown={(e) => begin(e, { what: "new", kind: k })} onKeyDown={(e: KeyboardEvent) => keyTap(e, () => add(k, ...spotFor(k)))}>
                <title>{fill(w.add, { g: kindName(k) })}</title>
                <rect x={x0} y={6} width={tile - 6} height={54} rx={8} fill="#fff" stroke="#ced4da" />
                {isBasic(k) || k === "one" ? (
                  <g transform={`translate(${x0 + (tile - 6 - kw * s) / 2} ${33 - (kh * s) / 2}) scale(${s})`}>{gateBody(k, 0, 0, INK)}</g>
                ) : (
                  <>
                    <rect x={x0 + 6} y={14} width={tile - 18} height={38} rx={5} fill={CHIP} stroke={INK} strokeWidth={1.5} />
                    <text x={x0 + (tile - 6) / 2} y={37} fontSize={tile < 50 ? 9 : 11} fontWeight={700} textAnchor="middle" fill={INK}>{CHIP_NAME[k]}</text>
                  </>
                )}
              </g>
            );
          })}
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
                  {small ? (
                    <>
                      <rect x={26} y={py - 10} width={30} height={20} rx={10} fill={on ? GREEN : "#e9ecef"} stroke={on ? GREEN : "#ced4da"} />
                      <circle cx={on ? 46 : 36} cy={py} r={7} fill="#fff" stroke={on ? GREEN : MUTED} />
                      <text x={6} y={py + 4} fontSize={11} fontWeight={700} fill={INK}>{name}</text>
                    </>
                  ) : (
                    <>
                      <rect x={12} y={py - 17} width={44} height={34} rx={17} fill={on ? GREEN : "#e9ecef"} stroke={on ? GREEN : "#ced4da"} />
                      <circle cx={on ? 39 : 29} cy={py} r={12} fill="#fff" stroke={on ? GREEN : MUTED} />
                      <text x={34} y={py - 22} fontSize={13} fontWeight={700} textAnchor="middle" fill={INK}>{name}</text>
                    </>
                  )}
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

          {/* Gates: drag the body to move it (into the bin to take it away), drag from an output pin for a wire. */}
          {shown.map((o) => {
            const [bw, bh] = sizeOf(o.kind);
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
                  <rect x={o.x - 2} y={o.y - 2} width={bw + 4} height={bh + 4} fill="transparent" />
                  {gateBody(o.kind, o.x, o.y, INK)}
                </g>
                {Array.from({ length: outsOf(o.kind) }, (_, k) => {
                  const [ox, oy] = gateOut(o, k);
                  const id = outId(o.id, k);
                  const on = !!val[id];
                  return (
                    <g key={`o${k}`}>
                      <line x1={o.x + bw - (isBasic(o.kind) ? 4 : 0)} y1={oy} x2={ox} y2={oy} stroke={on ? GREEN : INK} strokeWidth={2} />
                      <circle cx={ox} cy={oy} r={6} fill={on ? GREEN : "#fff"} stroke={INK} strokeWidth={1.5} style={{ cursor: "crosshair" }} data-out={id}
                        onPointerDown={(e) => begin(e, { what: "wire", from: id })} />
                    </g>
                  );
                })}
              </g>
            );
          })}
          {drag?.what === "new" && drag.moved && <g opacity={0.6} pointerEvents="none">{gateBody(drag.kind, drag.x - sizeOf(drag.kind)[0] / 2, drag.y - sizeOf(drag.kind)[1] / 2, INK)}</g>}

          {/* The table: tap a row to set the switches to it. */}
          <text x={gotX + (outCols.length * COL) / 2 - 6} y={TRAY + 14} fontSize={11} textAnchor="middle" fill={MUTED}>{w.yours}</text>
          {p && <text x={wantX + (outCols.length * COL) / 2 - 6} y={TRAY + 14} fontSize={11} textAnchor="middle" fill={MUTED}>{w.wanted}</text>}
          {[...inCols.map((s, k) => [s, tx + k * COL] as const), ...outCols.map((s, k) => [s, gotX + k * COL] as const), ...(p ? outCols.map((s, k) => [s, wantX + k * COL] as const) : [])].map(([s, x], i) => (
            <text key={i} x={x + 4} y={TRAY + 32} fontSize={nums ? 11 : 12} fontWeight={700} textAnchor="middle" fill={INK}>{s}</text>
          ))}
          {rows.map((r, i) => {
            const y = TRAY + 40 + i * rh;
            const here = p?.steps ? i === (d.step ?? 0) && d.on === r.on : r.on === d.on;
            const c = cells(r);
            return (
              <g key={i} role="button" tabIndex={0} aria-label={fill(p?.steps ? w.step : w.row, { bits: r.ins.map(bit).join(""), k: i + 1 })} style={{ cursor: "pointer" }} data-row={i}
                aria-pressed={here} onPointerDown={(e) => e.stopPropagation()} onClick={() => toRow(r, i)} onKeyDown={(e: KeyboardEvent) => keyTap(e, () => toRow(r, i))}>
                <rect x={tx - 8} y={y} width={W - tx + 4} height={rh - 2} rx={6} fill={here ? "#e7f5ff" : "transparent"} stroke={here ? "#74c0fc" : "none"} />
                {c.ins.map((s, k) => <text key={`i${k}`} x={tx + k * COL + 4} y={y + rh / 2 + 4} fontSize={13} textAnchor="middle" fill={INK}>{s}</text>)}
                {c.got.map((s, k) => (
                  <text key={`g${k}`} x={gotX + k * COL + 4} y={y + rh / 2 + 4} fontSize={13} fontWeight={700} textAnchor="middle"
                    fill={!r.steady ? RED : c.want && c.want[k] !== "–" ? (c.ok?.[k] ? GREEN : RED) : INK}>{r.steady ? s : "?"}</text>
                ))}
                {c.want?.map((s, k) => <text key={`w${k}`} x={wantX + k * COL + 4} y={y + rh / 2 + 4} fontSize={13} textAnchor="middle" fill={MUTED}>{s}</text>)}
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
