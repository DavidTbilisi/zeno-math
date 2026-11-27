// Disks and RAID (#854), in 3D: drives in a rack, each one's front showing the blocks it holds. Tap a drive to pull it
// out: it slides forward and its blocks go grey, and the lab says whether the file can still be read. Drag the new
// drive from the desk into the empty bay (or tap the pulled one) for a fresh drive, then tap each blank cell to rebuild
// it: a copy from the mirror, or the XOR of the rest of its row, the working written out. In the puzzle by hand the
// bits are set by tapping them. The design puzzles choose the level and the drives, then pull each drive in turn.
import { useState, type KeyboardEvent, type ReactNode } from "react";
import {
  LEVELS,
  MAX_DRIVES,
  RAID_LADDER,
  RAID_NOTICES,
  alive,
  bitsOf,
  capOf,
  fewest,
  fits,
  layout,
  lostBlocks,
  raidPuzzleOf,
  raidStart,
  rebuilt,
  sourceOf,
  survives,
  valueOf,
  valuesOf,
  type DriveState,
  type Layout,
  type Level,
} from "../math/raidLab";
import type { V3 } from "../math/solid";
import { BLUE, GREEN, MUTED, RED, keyTap, useDrag } from "./hand";
import { starText } from "./ladderUi";
import { box, clamp, FlatFace, lay, projector, type Face } from "./stage3d";
import { fill, FONT, INK, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const W = 720;
const TOP = 52;
const SH = 330;
const PANEL = TOP + SH + 4;
const H = PANEL + 92;
const PX = 30;
const BAY = 2.4;
const DW = 2.0;
const ROW = 0.9;
const OUT_Y = -3.6;
const BLOCK_COLORS = ["#74c0fc", "#8ce99a", "#ffe066", "#ffa8a8", "#d0bfff", "#ffc078", "#99e9f2", "#fcc2d7"];
const PARITY = "#e9ecef";
const NEW_AT: V3 = [MAX_DRIVES * BAY + 0.6, -2.5, 0];

type Hold = { what: "turn"; yaw0: number; pitch0: number } | { what: "fresh" };

export function RaidLab({ state, set, w: words, svgRef }: PieceProps<"raidLab">) {
  const [w, g] = [words.raidLab, words.game];
  const d = state;
  const p = raidPuzzleOf(d);
  const game = useGame({
    key: "zeno.raidlab.v1", size: RAID_LADDER.length, notices: RAID_NOTICES, modes: ["puzzle", "free"], state: d, set,
    fresh: { said: null }, stagePatch: (k) => raidStart(RAID_LADDER[k]), freePatch: raidStart(null),
  });
  const [view, setView] = useState<{ yaw: number; pitch: number } | null>(null);
  const [said, setSaid] = useState<{ text: string; tone: "ok" | "wrong"; on: DriveState[] } | null>(null);
  const v = view ?? { yaw: d.yaw, pitch: d.pitch };
  const values = valuesOf(p);
  const cap = capOf(p);
  const L: Layout = layout(d.level, d.n, values.length);
  const rows = Math.max(cap, L.rows);
  const DH = rows * ROW + 0.9;
  const at = projector(v, [(MAX_DRIVES * BAY) / 2, 0, DH / 2], PX, W / 2 - 20, TOP + SH / 2 + 10);
  const lost = lostBlocks(d.level, L, d.drives, values.length);
  const design = !p || p.goal === "design";
  const say = said && said.on === d.drives ? said : null;
  const tell = (text: string, tone: "ok" | "wrong", drives = d.drives) => setSaid({ text, tone, on: drives });

  const name = (dr: number, r: number) => {
    const c = L.cells[dr][r];
    return !c ? "" : c.kind === "data" ? `D${c.block + 1}` : `P${c.stripe + 1}`;
  };

  // ---- moves ----------------------------------------------------------------------------------------------------
  const withDrive = (k: number, dr: DriveState) => d.drives.map((x, j) => (j === k ? dr : x));
  const pull = (k: number) => {
    const drives = withDrive(k, { state: "out", done: [] });
    const lostNow = lostBlocks(d.level, L, drives, values.length);
    tell(lostNow.length ? fill(w.lostNow, { blocks: lostNow.map((b) => `D${b + 1}`).join(", ") }) : fill(w.stillReads, { k: k + 1 }), lostNow.length ? "wrong" : "ok", drives);
    const patch = { drives, pick: null, tested: false };
    if (lostNow.length) game.spot(patch, "lost");
    else game.tap(patch);
  };
  const fresh = (k: number) => {
    const drives = withDrive(k, { state: "fresh", done: [] });
    tell(w.freshIn, "ok", drives);
    game.tap({ drives, pick: null });
  };
  const finished = (drives: DriveState[]) => drives.every((dr, k) => dr.state !== "out" && rebuilt(L, dr, k)) && drives.some((dr) => dr.state === "fresh");
  const rebuild = (k: number, r: number) => {
    const src = sourceOf(d.level, L, d.drives, k, r);
    if (!src) {
      tell(fill(w.cant, { cell: name(k, r) }), "wrong");
      return game.miss({ misses: d.misses + 1 });
    }
    const drives = withDrive(k, { state: "fresh", done: Object.assign([...d.drives[k].done], { [r]: true }) });
    const vals = src.from.map((j) => valueOf(L, values, j, r));
    const text = src.how === "copy"
      ? fill(w.copied, { cell: name(k, r), from: src.from[0] + 1, bits: bitsOf(vals[0]) })
      : `${name(k, r)} = ${src.from.map((j) => name(j, r)).join(" ⊕ ")} = ${vals.map(bitsOf).join(" ⊕ ")} = ${bitsOf(valueOf(L, values, k, r))}`;
    tell(text, "ok", drives);
    if (p && finished(drives)) return game.win({ stars: d.misses === 0 ? 3 : d.misses <= 2 ? 2 : 1, patch: { drives, done: true } });
    if (src.how === "xor") return game.spot({ drives }, "xor");
    game.step({ drives });
  };
  /** By hand: the bits set for the picked cell, checked. */
  const write = () => {
    if (!d.pick) return;
    const [k, r] = d.pick;
    if (!sourceOf(d.level, L, d.drives, k, r)) return;
    if (d.bits !== valueOf(L, values, k, r)) {
      tell(fill(w.notIt, { cell: name(k, r), bits: bitsOf(d.bits) }), "wrong");
      return game.miss({ misses: d.misses + 1 });
    }
    const drives = withDrive(k, { state: "fresh", done: Object.assign([...d.drives[k].done], { [r]: true }) });
    tell(fill(w.rightBits, { cell: name(k, r), bits: bitsOf(d.bits) }), "ok", drives);
    if (finished(drives)) return game.win({ stars: d.misses === 0 ? 3 : d.misses <= 2 ? 2 : 1, patch: { drives, pick: null, done: true } });
    game.step({ drives, pick: null, bits: 0 });
  };
  const tapCell = (k: number, r: number) => {
    const dr = d.drives[k];
    if (dr.state === "ok") return pull(k);
    if (dr.state === "out") return fresh(k);
    if (dr.done[r] || !L.cells[k][r]) return;
    if (p?.goal === "hand") return game.tap({ pick: [k, r], bits: 0 });
    rebuild(k, r);
  };
  const setArray = (level: Level, n: number) => {
    setSaid(null);
    game.tap({ level, n, drives: Array.from({ length: n }, () => ({ state: "ok" as const, done: [] })), tested: false, pick: null });
  };
  const test = () => {
    if (!fits(d.level, d.n, values.length, cap)) {
      tell(L.rows > cap ? fill(w.noFit, { cap, rows: L.rows }) : w.tooFew, "wrong");
      return game.miss({ misses: d.misses + 1, tested: false }, { notice: () => "fit" });
    }
    const ok = survives(d.level, d.n, values.length);
    if (!ok.every(Boolean)) {
      tell(fill(w.failsTest, { k: ok.indexOf(false) + 1 }), "wrong");
      return game.miss({ tested: true, misses: d.misses + 1 });
    }
    const best = fewest(values.length, cap);
    tell(fill(w.passes, { n: d.n }), "ok");
    if (p) game.win({ stars: d.n === best ? 3 : 2, patch: { tested: true, done: true } });
    else game.tap({ tested: true });
  };

  const { drag, begin, svgProps } = useDrag<Hold>(
    (h) => {
      if (h.what === "turn") {
        if (view) set({ ...d, ...view });
        return setView(null);
      }
      // The new drive let go over a pulled drive's bay.
      const k = d.drives.findIndex((dr, j) => dr.state === "out" && Math.abs(h.x - at([j * BAY + DW / 2, 0, DH / 2])[0]) < (BAY * PX) / 2);
      if (k >= 0) fresh(k);
    },
    (h) => {
      if (h.what !== "turn" || !h.moved) return;
      setView({ yaw: clamp(Math.round(h.yaw0 - (h.x - h.x0) * 0.4), -60, 60), pitch: clamp(Math.round(h.pitch0 + (h.y - h.y0) * 0.3), 0, 60) });
    },
  );

  // ---- the rack in 3D ---------------------------------------------------------------------------------------------
  const rackW = MAX_DRIVES * BAY;
  const faces: (Face & { k: number | null })[] = [
    ...box(-0.3, -0.05, -0.4, rackW + 0.2, 5.6, 0.4, "#495057"),
    ...box(-0.3, -0.05, DH + 0.2, rackW + 0.2, 5.6, 0.35, "#495057"),
    ...box(-0.3, 5.2, 0, rackW + 0.2, 0.35, DH + 0.2, "#343a40"),
    ...box(-0.3, -0.05, 0, 0.2, 5.6, DH + 0.2, "#495057"),
    ...box(rackW - 0.3, -0.05, 0, 0.2, 5.6, DH + 0.2, "#495057"),
  ].map((f) => ({ ...f, k: null }));
  d.drives.forEach((dr, k) => {
    const y0 = dr.state === "out" ? OUT_Y : 0;
    // A drive in its bay is under the rack's lid: its top would only show through it.
    const sides = box(k * BAY, y0, 0.05, DW, 5, DH, dr.state === "out" ? "#adb5bd" : dr.state === "fresh" ? "#f8f9fa" : "#ced4da").filter((f) => dr.state === "out" || f.n[2] !== 1);
    faces.push(...sides.map((f) => ({ ...f, k })));
  });
  const anyOut = d.drives.some((dr) => dr.state === "out");
  if (anyOut && drag?.what !== "fresh") faces.push(...box(NEW_AT[0], NEW_AT[1], 0, DW, 5, DH * 0.6, "#f8f9fa").map((f) => ({ ...f, k: -1 })));
  const flats = lay(faces, v, at, (f) => ({ color: f.color, stroke: "#212529", width: 0.6 }));

  const quad = (pts: V3[]) => pts.map(at).map((q) => q.map((x) => x.toFixed(1)).join(" ")).join(" L");
  /** A drive's front: its cells, top row first, and a handle below them. */
  const front = (k: number): ReactNode => {
    const dr = d.drives[k];
    const y = dr.state === "out" ? OUT_Y - 0.01 : -0.01;
    const x0 = k * BAY;
    return (
      <g key={`f${k}`} data-drive={k + 1} data-state={dr.state}>
        {Array.from({ length: rows }, (_, r) => {
          const c = L.cells[k][r];
          const zt = 0.05 + DH - 0.35 - r * ROW;
          const pts: V3[] = [[x0 + 0.2, y, zt], [x0 + DW - 0.2, y, zt], [x0 + DW - 0.2, y, zt - ROW + 0.12], [x0 + 0.2, y, zt - ROW + 0.12]];
          const [cx, cy] = at([x0 + DW / 2, y, zt - (ROW - 0.12) / 2]);
          const over = r >= cap;
          if (!c) return <path key={r} d={`M${quad(pts)}Z`} fill="none" stroke={over ? RED : "#adb5bd"} strokeDasharray="3 3" pointerEvents="none" />;
          const has = alive(dr, r);
          const picked = d.pick?.[0] === k && d.pick[1] === r;
          const color = !has ? (dr.state === "out" ? "#868e96" : "#fff") : c.kind === "parity" ? PARITY : BLOCK_COLORS[c.block % BLOCK_COLORS.length];
          const label = fill(w.cellName, { cell: name(k, r), k: k + 1, v: has ? valueOf(L, values, k, r).toString(16).toUpperCase() : "?" });
          return (
            <g key={r} data-cell={`${k + 1}.${r + 1}`} data-has={has ? "1" : "0"} role="button" tabIndex={0} aria-label={label} style={{ cursor: "pointer" }}
              onPointerDown={(e) => e.stopPropagation()} onClick={() => tapCell(k, r)} onKeyDown={(e: KeyboardEvent) => keyTap(e, () => tapCell(k, r))}>
              <title>{label}</title>
              <path d={`M${quad(pts)}Z`} fill={color} stroke={picked ? BLUE : over ? RED : dr.state === "fresh" && !has ? "#868e96" : "#495057"} strokeWidth={picked ? 3 : 1} strokeDasharray={dr.state === "fresh" && !has ? "4 3" : undefined} />
              <text x={cx} y={cy + 4} fontSize={11} fontWeight={700} textAnchor="middle" fill={c.kind === "parity" ? "#5f3dc4" : INK} pointerEvents="none">
                {has ? `${name(k, r)} ${valueOf(L, values, k, r).toString(16).toUpperCase()}` : dr.state === "out" ? "" : `${name(k, r)} ?`}
              </text>
            </g>
          );
        })}
        {/* The handle: tap to pull the drive out, or (pulled) to put a fresh one in. */}
        {(() => {
          const pts: V3[] = [[x0 + 0.5, y, 0.4], [x0 + DW - 0.5, y, 0.4], [x0 + DW - 0.5, y, 0.18], [x0 + 0.5, y, 0.18]];
          const label = dr.state === "out" ? fill(w.freshName, { k: k + 1 }) : fill(w.pullName, { k: k + 1 });
          const act = () => (dr.state === "out" ? fresh(k) : pull(k));
          return (
            <g role="button" tabIndex={0} aria-label={label} data-handle={k + 1} style={{ cursor: "pointer" }} onPointerDown={(e) => e.stopPropagation()} onClick={act} onKeyDown={(e: KeyboardEvent) => keyTap(e, act)}>
              <title>{label}</title>
              <path d={`M${quad(pts)}Z`} fill={dr.state === "out" ? "#ffe3e3" : "#212529"} stroke="#212529" />
            </g>
          );
        })()}
      </g>
    );
  };

  // The pulled drives stand in front of the rack: their fronts last.
  const order = d.drives.map((_, k) => k).sort((a, b) => Number(d.drives[a].state === "out") - Number(d.drives[b].state === "out"));

  // ---- words --------------------------------------------------------------------------------------------------------
  const cells = L.cells.flat().filter(Boolean).length;
  const usage = fill(w.usage, { level: d.level, n: d.n, file: values.length, cells, extra: cells - values.length });
  const stars = p && d.done ? (p.goal === "design" ? (d.n === fewest(values.length, cap) ? 3 : 2) : d.misses === 0 ? 3 : d.misses <= 2 ? 2 : 1) : 0;
  const line: Line =
    p && d.done ? { tone: "ok", text: `${say?.text ?? ""} ${fill(w.right, { stars: starText(stars) })}`.trim() }
    : say ? { tone: say.tone, text: say.text }
    : lost.length ? { tone: "wrong", text: fill(w.lostNow, { blocks: lost.map((b) => `D${b + 1}`).join(", ") }) }
    : d.said?.kind === "notice" ? { tone: "notice", text: w.notices[d.said.key] }
    : { tone: "hint", text: w.hint };
  const ask = p ? w.asks[`p${d.stage + 1}` as keyof typeof w.asks] : w.freeAsk;

  const pickRow = d.pick ? L.cells.map((_, j) => j).filter((j) => j !== d.pick![0] && L.cells[j][d.pick![1]]) : [];
  const tile = (key: string, x: number, label: string, on: boolean, act: () => void, wide = 70) => (
    <g key={key} role="button" tabIndex={0} aria-label={label} aria-pressed={on} style={{ cursor: "pointer" }} onPointerDown={(e) => e.stopPropagation()} onClick={act} onKeyDown={(e: KeyboardEvent) => keyTap(e, act)}>
      <rect x={x} y={8} width={wide} height={34} rx={7} fill={on ? "#d0ebff" : "#f8f9fa"} stroke={on ? BLUE : "#ced4da"} strokeWidth={on ? 2 : 1} />
      <text x={x + wide / 2} y={30} fontSize={13} fontWeight={700} textAnchor="middle" fill={INK}>{label}</text>
    </g>
  );

  return (
    <>
      <GameHead game={game} g={g} />
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done && !!p} g={g} notices={w.notices}>
        <svg className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} style={{ touchAction: "none", userSelect: "none" }} {...svgProps}>
          <rect width={W} height={H} fill="#fff" />
          {/* The array: its level and drives (chosen in the design puzzles and free play), and the test. */}
          {design ? (
            <>
              {LEVELS.map((lv, i) => tile(`l${lv}`, 8 + i * 76, `RAID ${lv}`, d.level === lv, () => setArray(lv, Math.max(d.n, lv === 5 ? 3 : 2))))}
              {[2, 3, 4, 5].map((n, i) => tile(`n${n}`, 250 + i * 46, String(n), d.n === n, () => setArray(d.level, n), 40))}
              <text x={250 + 4 * 46 + 2} y={30} fontSize={12} fill={MUTED}>{w.drives}</text>
              {tile("test", W - 196, w.test, d.tested, test, 188)}
            </>
          ) : (
            <text x={12} y={32} fontSize={15} fontWeight={700} fill={INK}>{`RAID ${d.level} · ${fill(w.nDrives, { n: d.n })}`}</text>
          )}

          <g role="slider" tabIndex={0} aria-label={w.turn} aria-valuemin={-60} aria-valuemax={60} aria-valuenow={v.yaw} style={{ cursor: "grab" }}
            onPointerDown={(e) => begin(e, { what: "turn", yaw0: v.yaw, pitch0: v.pitch })}
            onKeyDown={(e: KeyboardEvent) => {
              const by: Record<string, [number, number]> = { ArrowLeft: [10, 0], ArrowRight: [-10, 0], ArrowUp: [0, -6], ArrowDown: [0, 6] };
              const m = by[e.key];
              if (!m) return;
              e.preventDefault();
              e.stopPropagation();
              set({ ...d, yaw: clamp(d.yaw + m[0], -60, 60), pitch: clamp(d.pitch + m[1], 0, 60) });
            }}>
            <title>{w.turn}</title>
            <rect y={TOP} width={W} height={SH} fill="transparent" />
            {flats.map((f) => <FlatFace key={f.key} f={f} />)}
          </g>
          {order.map(front)}
          {/* The new drive on the desk, to drag into a pulled drive's bay. */}
          {anyOut && (() => {
            const [x, y] = drag?.what === "fresh" && drag.moved ? [drag.x, drag.y] : at([NEW_AT[0] + DW / 2, NEW_AT[1], DH * 0.3]);
            return (
              <g role="button" tabIndex={0} aria-label={w.newDrive} data-new="1" style={{ cursor: "grab" }} onPointerDown={(e) => begin(e, { what: "fresh" })}
                onKeyDown={(e: KeyboardEvent) => keyTap(e, () => fresh(d.drives.findIndex((dr) => dr.state === "out")))}>
                <title>{w.newDrive}</title>
                <circle cx={x} cy={y} r={20} fill="#fff" stroke={GREEN} strokeWidth={2.5} />
                <text x={x} y={y + 5} fontSize={14} fontWeight={700} textAnchor="middle" fill={GREEN}>{w.newShort}</text>
              </g>
            );
          })()}
          {/* The test: each drive pulled in turn, and whether the file lived. */}
          {d.tested && survives(d.level, d.n, values.length).map((ok, k) => {
            const [x, y] = at([k * BAY + DW / 2, 0, DH + 0.9]);
            return <text key={k} x={x} y={y} fontSize={20} fontWeight={700} textAnchor="middle" fill={ok ? GREEN : RED} data-test={ok ? "ok" : "lost"}>{ok ? "✓" : "✗"}</text>;
          })}

          {/* Below: how much of the array is the file, and the bits to work out by hand. */}
          <text x={12} y={PANEL + 16} fontSize={12} fill={MUTED}>{usage}</text>
          {d.pick && (
            <g>
              {pickRow.map((j, i) => (
                <text key={j} x={12 + i * 120} y={PANEL + 44} fontSize={14} fontFamily="monospace" fill={INK}>{`${name(j, d.pick![1])} ${bitsOf(valueOf(L, values, j, d.pick![1]))}`}</text>
              ))}
              <text x={12 + pickRow.length * 120} y={PANEL + 44} fontSize={14} fontWeight={700} fill={BLUE}>{`${name(d.pick[0], d.pick[1])} =`}</text>
              {[3, 2, 1, 0].map((b, i) => {
                const on = (d.bits >> b) & 1;
                const x = 60 + pickRow.length * 120 + i * 40;
                return (
                  <g key={b} role="switch" tabIndex={0} aria-checked={!!on} aria-label={fill(w.bit, { b: 1 << b })} style={{ cursor: "pointer" }}
                    onClick={() => game.tap({ bits: d.bits ^ (1 << b) })} onKeyDown={(e: KeyboardEvent) => keyTap(e, () => game.tap({ bits: d.bits ^ (1 << b) }))}>
                    <rect x={x} y={PANEL + 26} width={34} height={30} rx={6} fill={on ? "#d0ebff" : "#fff"} stroke={on ? BLUE : "#adb5bd"} strokeWidth={1.5} />
                    <text x={x + 17} y={PANEL + 47} fontSize={16} fontWeight={700} textAnchor="middle" fontFamily="monospace" fill={INK}>{on}</text>
                  </g>
                );
              })}
              <g role="button" tabIndex={0} aria-label={w.writeIt} style={{ cursor: "pointer" }} onClick={write} onKeyDown={(e: KeyboardEvent) => keyTap(e, write)}>
                <rect x={60 + pickRow.length * 120 + 168} y={PANEL + 26} width={110} height={30} rx={6} fill="#ebfbee" stroke={GREEN} strokeWidth={1.5} />
                <text x={60 + pickRow.length * 120 + 223} y={PANEL + 46} fontSize={13} fontWeight={700} textAnchor="middle" fill={GREEN}>{w.writeIt}</text>
              </g>
              <text x={12} y={PANEL + 76} fontSize={11} fill={MUTED}>{w.xorRule}</text>
            </g>
          )}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.done && !!p} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
      <div hidden>
        <svg ref={svgRef} width={W} height={SH} viewBox={`0 ${TOP} ${W} ${SH}`} fontFamily={FONT}>
          <rect y={TOP} width={W} height={SH} fill="#fff" />
          {flats.map((f) => <FlatFace key={f.key} f={f} />)}
          {order.map(front)}
        </svg>
      </div>
    </>
  );
}
