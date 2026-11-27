// Build a system (#853), in 3D: a motherboard on a desk, turned by dragging the desk. Its sockets and slots (CPU,
// memory, a card slot, drive ports) and the ports on its back panel are drop targets; a device dragged from the tray
// goes only into a port of its own kind, its cable running from where it sits on the desk. A device tapped is pulled
// out, a device dragged to another port is moved there. The power button runs the system: the signal goes from the bus
// out to each link of its path, green, and stops red at the first one missing or plugged in the wrong place.
import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import type { V3 } from "../math/solid";
import {
  DEV_ORDER,
  DEVICES,
  SLOTS,
  SYSTEM_LADDER,
  SYSTEM_NOTICES,
  fitOf,
  freeSlot,
  kindOfSlot,
  plugIn,
  runSystem,
  slotOf,
  slotThere,
  spareOf,
  systemMissionOf,
  systemStars,
  systemStart,
  unplug,
  type Dev,
  type Kind,
  type LiveSystem,
  type SlotId,
} from "../math/systemLab";
import { GREEN, MUTED, RED, keyTap, useDrag } from "./hand";
import { starText } from "./ladderUi";
import { clamp, FlatFace, lay, projector, wrap360, type Flat } from "./stage3d";
import { fill, FONT, INK, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const W = 720;
const SH = 430;
const TRAY_Y = SH + 6;
const TILE = 72;
const H = TRAY_Y + 2 * 50 + 8;
const PX = 24;
const PITCH: [number, number] = [18, 82];
const BUS: V3 = [6.4, 4.6, 0.3];

type Face = { pts: V3[]; n: V3; color: string };
/** An upright box from (x, y, z), dx across, dy back and dz up: its six faces. */
function box(x: number, y: number, z: number, dx: number, dy: number, dz: number, color: string): Face[] {
  const p = (i: number, j: number, k: number): V3 => [x + i * dx, y + j * dy, z + k * dz];
  return [
    { pts: [p(0, 0, 1), p(1, 0, 1), p(1, 1, 1), p(0, 1, 1)], n: [0, 0, 1], color },
    { pts: [p(0, 0, 0), p(0, 1, 0), p(1, 1, 0), p(1, 0, 0)], n: [0, 0, -1], color },
    { pts: [p(0, 0, 0), p(1, 0, 0), p(1, 0, 1), p(0, 0, 1)], n: [0, -1, 0], color },
    { pts: [p(0, 1, 0), p(0, 1, 1), p(1, 1, 1), p(1, 1, 0)], n: [0, 1, 0], color },
    { pts: [p(0, 0, 0), p(0, 0, 1), p(0, 1, 1), p(0, 1, 0)], n: [-1, 0, 0], color },
    { pts: [p(1, 0, 0), p(1, 1, 0), p(1, 1, 1), p(1, 0, 1)], n: [1, 0, 0], color },
  ];
}

const KIND_COLOR: Record<Kind, string> = {
  cpu: "#495057", ram: "#2f9e44", pcie: "#1971c2", sata: "#e8590c", usb: "#1c7ed6", video: "#7048e8", audioOut: "#40c057", audioIn: "#f06595", net: "#f59f00",
};
/** Where each slot's plug goes, on the board or its back panel (y = 9). */
const SLOT_AT: Record<SlotId, V3> = {
  cpu: [5.2, 5, 0.45], ram0: [8.3, 5, 0.4], ram1: [8.9, 5, 0.4], pcie: [1.6, 5.2, 0.4], sata0: [11.6, 2.4, 0.4], sata1: [11.6, 3.4, 0.4],
  usb0: [3.3, 9.2, 0.5], usb1: [3.3, 9.2, 0.95], usb2: [4.1, 9.2, 0.5], usb3: [4.1, 9.2, 0.95],
  video: [5.6, 9.2, 0.7], gpuVideo: [1.6, 9.3, 0.75], audioOut: [8, 9.2, 0.5], audioIn: [8, 9.2, 0.95], net: [10.2, 9.2, 0.7],
};
/** The slot's own outline on the board, drawn whether or not a part is in it. */
const SLOT_BOX: Partial<Record<SlotId, [number, number, number, number, number, number]>> = {
  cpu: [4.1, 3.9, 0.25, 2.2, 2.2, 0.12], ram0: [8.15, 2.6, 0.25, 0.3, 4.8, 0.15], ram1: [8.75, 2.6, 0.25, 0.3, 4.8, 0.15],
  pcie: [1.45, 2.2, 0.25, 0.3, 6.2, 0.15], sata0: [11.3, 2.15, 0.25, 0.6, 0.5, 0.25], sata1: [11.3, 3.15, 0.25, 0.6, 0.5, 0.25],
};
/** The part itself: in its slot for the parts inside the case, on the desk for the rest. */
const DEV_BOX: Record<Dev, { boxes: [number, number, number, number, number, number][]; color: string; plug: V3 }> = {
  cpu: { boxes: [[4.3, 4.1, 0.37, 1.8, 1.8, 0.18], [4.5, 4.3, 0.55, 1.4, 1.4, 0.7]], color: "#adb5bd", plug: [5.2, 5, 1.25] },
  ram: { boxes: [[8.22, 2.7, 0.4, 0.16, 4.6, 1.2]], color: "#37b24d", plug: [8.3, 5, 1.6] },
  gpu: { boxes: [[0.8, 2.2, 0.4, 1.6, 7, 0.9]], color: "#343a40", plug: [1.6, 5.2, 1.3] },
  ssd: { boxes: [[13.4, 1.2, 0, 1.6, 1.1, 0.2]], color: "#4dabf7", plug: [13.4, 1.75, 0.1] },
  hdd: { boxes: [[13.4, 3.4, 0, 2, 1.5, 0.7]], color: "#868e96", plug: [13.4, 4.1, 0.35] },
  display: { boxes: [[5.6, 12.6, 0, 1.2, 0.8, 0.2], [6, 12.9, 0.2, 0.4, 0.3, 1.4], [3, 12.8, 1.6, 6.4, 0.3, 3.6]], color: "#212529", plug: [6.2, 12.6, 0.2] },
  speakers: { boxes: [[-2.6, 11, 0, 1.4, 1.2, 2.2]], color: "#495057", plug: [-1.2, 11.6, 0.4] },
  keyboard: { boxes: [[2.5, -4.6, 0, 6.6, 2.2, 0.35]], color: "#f1f3f5", plug: [5.8, -2.4, 0.2] },
  mouse: { boxes: [[10.2, -4.2, 0, 0.8, 1.2, 0.35]], color: "#dee2e6", plug: [10.6, -3, 0.2] },
  gamepad: { boxes: [[-1.8, -4.2, 0, 2.6, 1.3, 0.45]], color: "#5f3dc4", plug: [-0.5, -2.9, 0.2] },
  camera: { boxes: [[10.4, 12.2, 0, 0.5, 0.5, 1.2], [10.1, 11.9, 1.2, 1.1, 0.9, 0.8]], color: "#495057", plug: [10.65, 11.9, 0.3] },
  mic: { boxes: [[-2.4, 6.8, 0, 0.8, 0.8, 0.2], [-2.15, 7.05, 0.2, 0.3, 0.3, 1.4], [-2.3, 6.9, 1.6, 0.6, 0.6, 0.6]], color: "#adb5bd", plug: [-1.6, 7.2, 0.1] },
  sensor: { boxes: [[14.4, 6.2, 0, 0.9, 0.9, 0.3], [14.7, 6.5, 0.3, 0.3, 0.3, 1.6]], color: "#fab005", plug: [14.4, 6.65, 0.15] },
  link: { boxes: [[15, 9.6, 0, 1.8, 3, 3.4]], color: "#ced4da", plug: [15, 10.5, 0.5] },
};
const INSIDE: readonly Dev[] = ["cpu", "ram", "gpu"];
const ICON: Record<Dev, string> = {
  cpu: "🔲", ram: "▮", ssd: "💾", hdd: "🗄️", gpu: "🎴", keyboard: "⌨️", mouse: "🖱️", gamepad: "🎮", camera: "📷", mic: "🎤", sensor: "🌡️", display: "🖥️", speakers: "🔊", link: "🌐",
};

/** Where a dragged device ends up: from the tray, or from the slot it is in. */
type Hold = { what: "turn"; yaw0: number; pitch0: number } | { what: "dev"; dev: Dev; from: SlotId | null };

export function SystemLab({ state, set, w: words, svgRef }: PieceProps<"systemLab">) {
  const [w, g] = [words.systemLab, words.game];
  const [view, setView] = useState<{ yaw: number; pitch: number } | null>(null);
  const d = state;
  const m = systemMissionOf(d);
  const game = useGame({
    key: "zeno.systemlab.v1", size: SYSTEM_LADDER.length, notices: SYSTEM_NOTICES, modes: ["puzzle", "free"], state: d, set,
    fresh: { said: null }, stagePatch: (k) => systemStart(SYSTEM_LADDER[k]), freePatch: systemStart(null),
  });
  const [said, setSaid] = useState<{ text: string; on: LiveSystem["plugged"] } | null>(null);
  const v = view ?? { yaw: d.yaw, pitch: d.pitch };
  const at = projector(v, [6, 4, 1.2], PX, W / 2, SH / 2 + 26);
  const p = d.plugged;
  // A word about a plug that didn't go in, for as long as the board stays as it was.
  const say = said && said.on === p ? said.text : null;
  const setSay = (text: string | null) => setSaid(text === null ? null : { text, on: p });
  const run = useMemo(() => (d.ran ? runSystem(p, m) : null), [d.ran, p, m]);

  /** A device into a slot, if it fits: kept, with a notice for a move or the card's display port. */
  const put = (dev: Dev, slot: SlotId | null, from: SlotId | null) => {
    if (!slot) return;
    const why = fitOf(dev, slot, p);
    if (why === "kind") {
      setSay(fill(w.wrongKind, { dev: w.devices[dev], kind: w.kinds[DEVICES[dev].kind], port: w.kinds[kindOfSlot(slot)] }));
      return game.miss({ ran: false }, { notice: () => "kind" });
    }
    if (why) return setSay(fill(w.taken, { dev: w.devices[p[slot]!] }));
    if (slot === from) return;
    setSay(null);
    const patch = { plugged: plugIn(p, dev, slot), ran: false };
    if (slot === "gpuVideo") return game.spot(patch, "graphics");
    if (from) return game.spot(patch, "moved");
    game.tap(patch);
  };
  const pull = (dev: Dev) => {
    setSay(null);
    game.tap({ plugged: unplug(p, dev), ran: false });
  };
  const power = () => {
    const r = runSystem(p, m);
    const runs = d.runs + 1;
    setSay(null);
    if (!m) return game.tap({ ran: true, runs });
    if (r.fail === null) return game.win({ stars: systemStars(runs, spareOf(p, m).length), patch: { ran: true, runs, done: true } });
    game.miss({ ran: true, runs });
  };

  const slotNear = (x: number, y: number) => {
    let best: SlotId | null = null;
    let dist = 26;
    for (const s of SLOTS) {
      if (!slotThere(s.id, p)) continue;
      const [sx, sy] = at(SLOT_AT[s.id]);
      const k = Math.hypot(x - sx, y - sy);
      if (k < dist) [best, dist] = [s.id, k];
    }
    return best;
  };
  const { drag, begin, svgProps } = useDrag<Hold>(
    (h) => {
      if (h.what === "turn") {
        if (view) set({ ...d, ...view });
        return setView(null);
      }
      if (!h.moved) return h.from ? pull(h.dev) : put(h.dev, freeSlot(h.dev, p), null);
      if (h.y > TRAY_Y && h.from) return pull(h.dev);
      put(h.dev, slotNear(h.x, h.y), h.from);
    },
    (h) => {
      if (h.what !== "turn" || !h.moved) return;
      setView({ yaw: wrap360(h.yaw0 - (h.x - h.x0) * 0.5), pitch: clamp(Math.round(h.pitch0 + (h.y - h.y0) * 0.4), PITCH[0], PITCH[1]) });
    },
  );
  const held = drag?.what === "dev" && drag.moved ? drag.dev : null;

  // ---- the world: desk, board, slots, and the parts in it ---------------------------------------------------------
  const flats = useMemo(() => {
    const desk = lay([{ pts: [[-4, -6, -0.02], [17.5, -6, -0.02], [17.5, 14.5, -0.02], [-4, 14.5, -0.02]] as V3[], n: [0, 0, 1] as V3, color: "#e9d8b5" }], v, at, (f) => ({ color: f.color }));
    const board = lay([...box(0, 0, 0, 12, 9, 0.25, "#2b8a3e"), ...box(2.8, 8.95, 0.25, 8.4, 0.45, 1.2, "#ced4da")], v, at, (f) => ({ color: f.color, stroke: "#1b5e20", width: 0.6 }));
    const slots = (Object.keys(SLOT_BOX) as SlotId[]).flatMap((id) => {
      const [x, y, z, dx, dy, dz] = SLOT_BOX[id]!;
      return box(x, y, z, dx, dy, dz, KIND_COLOR[kindOfSlot(id)]);
    });
    const parts: (Face & { dev: Dev })[] = [];
    for (const dev of DEV_ORDER) {
      if (!slotOf(dev, p)) continue;
      for (const b of DEV_BOX[dev].boxes) parts.push(...box(...b, DEV_BOX[dev].color).map((f) => ({ ...f, dev })));
    }
    const laid = lay([...slots.map((f) => ({ ...f, dev: null as Dev | null })), ...parts], v, at, (f) => ({ color: f.color, stroke: "#212529", width: 0.5 }));
    const all = [...slots.map((f) => ({ ...f, dev: null as Dev | null })), ...parts];
    return { desk, board, top: laid.map((f) => ({ f, dev: all[Number(f.key)].dev })) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.yaw, v.pitch, p]);

  const cable = (dev: Dev, slot: SlotId) => {
    const [a, b] = [DEV_BOX[dev].plug, SLOT_AT[slot]];
    const n = 14;
    const pts = Array.from({ length: n + 1 }, (_, i) => {
      const t = i / n;
      const lift = INSIDE.includes(dev) ? 0 : Math.sin(Math.PI * t) * 0.3;
      return at([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t + lift]);
    });
    return pts.map((q) => q.map((x) => x.toFixed(1)).join(" ")).join(" L");
  };

  /** The signal: from the bus out to each link of the path, green where it got through, red where it stopped. */
  const signal = () => {
    if (!run) return null;
    const [bx, by] = at(BUS);
    return (
      <g pointerEvents="none" data-run={run.fail === null ? "ok" : "stopped"}>
        {run.links.map((l, i) => {
          const slot = l.slot ?? SLOTS.find((s) => s.kind === DEVICES[l.need.any[0]].kind && slotThere(s.id, p))?.id ?? (l.need.via?.[0] ?? null);
          if (!slot) return null;
          const [x, y] = at(l.slot && l.ok ? SLOT_AT[l.slot] : SLOT_AT[slot]);
          const color = l.ok ? GREEN : i === run.fail ? RED : "#ced4da";
          return (
            <g key={i}>
              <line x1={bx} y1={by} x2={x} y2={y} stroke={color} strokeWidth={i === run.fail ? 5 : 4} strokeLinecap="round" strokeDasharray={l.ok ? undefined : "6 5"} opacity={0.9} />
              {i === run.fail && <circle cx={x} cy={y} r={13} fill="none" stroke={RED} strokeWidth={3} />}
            </g>
          );
        })}
        <circle cx={bx} cy={by} r={7} fill={run.fail === null ? GREEN : "#fff"} stroke={run.fail === null ? GREEN : RED} strokeWidth={2.5} />
      </g>
    );
  };

  // ---- words --------------------------------------------------------------------------------------------------------
  const needName = (k: number) => run!.links[k].need.any.map((x) => w.devices[x]).join(w.or);
  const stars = m && d.done ? systemStars(d.runs, spareOf(p, m).length) : 0;
  let line: Line;
  if (say) line = { tone: "wrong", text: say };
  else if (m && d.done) line = { tone: "ok", text: fill(w.right, { stars: starText(stars), spare: spareOf(p, m).length ? fill(w.spare, { n: spareOf(p, m).map((x) => w.devices[x]).join(", ") }) : "" }) };
  else if (run && run.fail !== null) {
    const l = run.links[run.fail];
    line = l.why === "wrongPort"
      ? { tone: "wrong", text: fill(w.wrongPort, { dev: w.devices[l.dev!], port: w.slots[l.slot!], want: (l.need.via ?? []).map((s) => w.slots[s]).join(w.or) }) }
      : { tone: "wrong", text: fill(w.missing, { need: needName(run.fail) }) };
  } else if (run) line = { tone: "ok", text: w.runs };
  else if (d.said?.kind === "notice") line = { tone: "notice", text: w.notices[d.said.key] };
  else line = { tone: "hint", text: w.hint };
  const ask = m ? w.asks[m.key as keyof typeof w.asks] : w.freeAsk;

  // ---- drawing --------------------------------------------------------------------------------------------------------
  const tray: Dev[] = DEV_ORDER.filter((x) => !slotOf(x, p));
  const perRow = Math.floor((W - 12) / (TILE + 4));
  const slotMarks = SLOTS.filter((s) => slotThere(s.id, p)).map((s) => {
    const [x, y] = at(SLOT_AT[s.id]);
    const fits = held ? fitOf(held, s.id, p) === null && p[s.id] !== held : false;
    const r = s.kind === "cpu" || s.kind === "ram" || s.kind === "pcie" ? 9 : 7;
    return (
      <g key={s.id} data-slot={s.id} data-dev={p[s.id] ?? ""} pointerEvents="none">
        <title>{w.slots[s.id]}</title>
        {fits && <circle cx={x} cy={y} r={r + 7} fill="none" stroke={GREEN} strokeWidth={3} />}
        <circle cx={x} cy={y} r={r} fill={p[s.id] ? KIND_COLOR[s.kind] : "#fff"} stroke={KIND_COLOR[s.kind]} strokeWidth={2.5} opacity={held && !fits ? 0.45 : 1} />
      </g>
    );
  });
  const plugged = (DEV_ORDER.filter((x) => slotOf(x, p)) as Dev[]).map((dev) => {
    const slot = slotOf(dev, p)!;
    const [x, y] = at(DEV_BOX[dev].plug);
    return (
      <g key={dev} data-device={dev} data-plugged={slot} role="button" tabIndex={0} aria-label={fill(w.pull, { dev: w.devices[dev], port: w.slots[slot] })}
        style={{ cursor: "grab" }} onPointerDown={(e) => begin(e, { what: "dev", dev, from: slot })} onKeyDown={(e: KeyboardEvent) => keyTap(e, () => pull(dev))}>
        <title>{fill(w.pull, { dev: w.devices[dev], port: w.slots[slot] })}</title>
        {!INSIDE.includes(dev) && <path d={`M${cable(dev, slot)}`} fill="none" stroke="transparent" strokeWidth={14} />}
        <circle cx={x} cy={y} r={14} fill="transparent" />
      </g>
    );
  });

  const scene = (interactive: boolean): ReactNode => (
    <>
      {flats.desk.map((f: Flat) => <FlatFace key={`d${f.key}`} f={f} />)}
      {flats.board.map((f: Flat) => <FlatFace key={`b${f.key}`} f={f} />)}
      {(Object.keys(p) as SlotId[]).filter((s) => !INSIDE.includes(p[s]!)).map((s) => (
        <path key={`c${s}`} d={`M${cable(p[s]!, s)}`} fill="none" stroke={held === p[s] ? "#adb5bd" : "#212529"} strokeWidth={2.5} strokeLinecap="round" pointerEvents="none" />
      ))}
      {flats.top.map(({ f, dev }) => (
        <FlatFace key={`t${f.key}`} f={f} onPointerDown={interactive && dev ? (e) => begin(e, { what: "dev", dev, from: slotOf(dev, p) }) : undefined} />
      ))}
      {signal()}
    </>
  );

  return (
    <>
      <GameHead game={game} g={g} />
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done && !!m} g={g} notices={w.notices}>
        <svg className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} style={{ touchAction: "none", userSelect: "none", cursor: drag ? "grabbing" : "default" }} {...svgProps}>
          <rect width={W} height={H} fill="#fff" />
          <g role="slider" tabIndex={0} aria-label={w.turn} aria-valuemin={0} aria-valuemax={359} aria-valuenow={v.yaw} aria-valuetext={`${v.yaw}°, ${v.pitch}°`} style={{ cursor: "grab" }}
            onPointerDown={(e) => begin(e, { what: "turn", yaw0: v.yaw, pitch0: v.pitch })}
            onKeyDown={(e: KeyboardEvent) => {
              const by: Record<string, [number, number]> = { ArrowLeft: [15, 0], ArrowRight: [-15, 0], ArrowUp: [0, -8], ArrowDown: [0, 8] };
              const k = by[e.key];
              if (!k) return;
              e.preventDefault();
              e.stopPropagation();
              set({ ...d, yaw: wrap360(d.yaw + k[0]), pitch: clamp(d.pitch + k[1], PITCH[0], PITCH[1]) });
            }}>
            <title>{w.turn}</title>
            <rect width={W} height={SH} fill="transparent" />
            {scene(true)}
          </g>
          {slotMarks}
          {plugged}

          {/* The power button: run the system. */}
          <g role="button" tabIndex={0} aria-label={w.power} style={{ cursor: "pointer" }} onPointerDown={(e) => e.stopPropagation()} onClick={power} onKeyDown={(e: KeyboardEvent) => keyTap(e, power)}>
            <title>{w.power}</title>
            <circle cx={W - 34} cy={34} r={24} fill={run ? (run.fail === null ? "#d3f9d8" : "#ffe3e3") : "#f1f3f5"} stroke={run ? (run.fail === null ? GREEN : RED) : "#adb5bd"} strokeWidth={2.5} />
            <path d={`M${W - 42} 26 A11 11 0 1 0 ${W - 26} 26`} fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
            <line x1={W - 34} y1={20} x2={W - 34} y2={33} stroke={INK} strokeWidth={3} strokeLinecap="round" />
          </g>

          {/* The tray: every device not in, to drag onto the board, or tap to put in the first port it fits. */}
          <rect x={0} y={TRAY_Y - 4} width={W} height={H - TRAY_Y + 4} fill="#f8f9fa" />
          {tray.map((dev, i) => {
            const [x, y] = [6 + (i % perRow) * (TILE + 4), TRAY_Y + Math.floor(i / perRow) * 50];
            return (
              <g key={dev} data-tray={dev} role="button" tabIndex={0} aria-label={fill(w.add, { dev: w.devices[dev] })} style={{ cursor: "grab", opacity: held === dev ? 0.35 : 1 }}
                onPointerDown={(e) => begin(e, { what: "dev", dev, from: null })} onKeyDown={(e: KeyboardEvent) => keyTap(e, () => put(dev, freeSlot(dev, p), null))}>
                <title>{fill(w.add, { dev: w.devices[dev] })}</title>
                <rect x={x} y={y} width={TILE} height={44} rx={7} fill="#fff" stroke={KIND_COLOR[DEVICES[dev].kind]} strokeWidth={1.5} />
                <text x={x + TILE / 2} y={y + 20} fontSize={16} textAnchor="middle">{ICON[dev]}</text>
                <text x={x + TILE / 2} y={y + 37} fontSize={10} textAnchor="middle" fill={INK}>{w.devices[dev]}</text>
              </g>
            );
          })}
          {!tray.length && <text x={W / 2} y={TRAY_Y + 28} fontSize={12} textAnchor="middle" fill={MUTED}>{w.trayEmpty}</text>}
          {drag?.what === "dev" && drag.moved && (
            <g pointerEvents="none">
              <circle cx={drag.x} cy={drag.y} r={16} fill="#fff" stroke={KIND_COLOR[DEVICES[drag.dev].kind]} strokeWidth={2.5} />
              <text x={drag.x} y={drag.y + 6} fontSize={16} textAnchor="middle">{ICON[drag.dev]}</text>
            </g>
          )}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.done && !!m} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
      <div hidden>
        <svg ref={svgRef} width={W} height={SH} viewBox={`0 0 ${W} ${SH}`} fontFamily={FONT}>
          <rect width={W} height={SH} fill="#fff" />
          {scene(false)}
        </svg>
      </div>
    </>
  );
}
