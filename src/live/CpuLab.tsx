// A tiny computer (#844), worked by hand: memory on the left (program from 300, data from 940), the system bus in the
// middle, the CPU and the I/O module on the right. The clock tapped is one step of the cycle, each a transfer that
// lights its path; ▶ runs a whole instruction at a time. An instruction dragged onto a cell sets its opcode, an
// address dragged onto a cell sets its address, a cell tapped can be typed into. A device's plug dragged to a port
// plugs it in, its cable tapped pulls it out. When the program halts it is checked on the puzzle's tests.
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  CPU_LADDER,
  CPU_NOTICES,
  CPU_START,
  DATA,
  DEVICES,
  OP_CODE,
  OP_TRAY,
  PORTS,
  PROGRAM,
  addrOf,
  check,
  cpuPuzzleOf,
  cpuStart,
  hex,
  keysOf,
  memoryFor,
  mnemonic,
  opOf,
  parseCell,
  signed,
  tick,
  word,
  type Device,
  type Memory,
  type Move,
  type OpName,
} from "../math/cpuLab";
import { BLUE, GREEN, MUTED, RED, keyTap, useDrag } from "./hand";
import { starText } from "./ladderUi";
import { fill, FONT, INK, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const W = 700;
const H = 540;
const TRAY = 52;
const ROW = 22;
const MEM_Y = TRAY + 34;
const PX = 8;
const DX = 158;
const BUS = [318, 330, 342];
const CPU = { x: 356, y: TRAY + 6, w: 338, h: 270 };
const IO = { x: 356, y: CPU.y + CPU.h + 10, w: 338, h: H - (CPU.y + CPU.h + 10) - 6 };
const HOT = "#f08c00";
const TILE = 66;

type Box = { x: number; y: number; w: number; h: number };
const REG: Record<"pc" | "mar" | "mbr" | "ir" | "ac" | "alu" | "cu", Box> = {
  pc: { x: CPU.x + 12, y: CPU.y + 30, w: 92, h: 40 },
  mar: { x: CPU.x + 122, y: CPU.y + 30, w: 92, h: 40 },
  mbr: { x: CPU.x + 232, y: CPU.y + 30, w: 92, h: 40 },
  ir: { x: CPU.x + 12, y: CPU.y + 92, w: 150, h: 44 },
  alu: { x: CPU.x + 182, y: CPU.y + 92, w: 60, h: 50 },
  ac: { x: CPU.x + 232, y: CPU.y + 156, w: 92, h: 40 },
  cu: { x: CPU.x + 12, y: CPU.y + 206, w: 314, h: 56 },
};
const PORT_X = (k: number) => IO.x + 70 + k * 100;
const PORT_Y = IO.y + 40;
const DEV_HOME: Record<Device, [number, number]> = { keyboard: [IO.x + 60, IO.y + IO.h - 40], display: [IO.x + 230, IO.y + IO.h - 40] };

const cellY = (a: number) => MEM_Y + ROW * (a >= 0x940 ? a - 0x940 : a - 0x300);
const cellX = (a: number) => (a >= 0x940 ? DX : PX);
const mid = (b: Box): [number, number] => [b.x + b.w / 2, b.y + b.h / 2];

/** What each step moves: from where to where, and which bus lines carry it (0 address, 1 data, 2 control). */
function pathOf(m: Move | null, mar: number, port: number | null): { from: [number, number] | null; to: [number, number] | null; buses: number[]; lit: string[] } {
  const cell: [number, number] = [cellX(mar) + 70, cellY(mar) + ROW / 2];
  const dev: [number, number] = [PORT_X(PORTS.indexOf((port ?? 5) as 5)), PORT_Y];
  switch (m) {
    case "f1": return { from: mid(REG.pc), to: mid(REG.mar), buses: [], lit: ["pc", "mar"] };
    case "f2": case "read": return { from: cell, to: mid(REG.mbr), buses: [0, 1, 2], lit: ["mar", "mbr", "cell"] };
    case "f3": return { from: mid(REG.mbr), to: mid(REG.ir), buses: [], lit: ["mbr", "ir", "pc"] };
    case "d": return { from: mid(REG.ir), to: mid(REG.cu), buses: [], lit: ["ir", "cu"] };
    case "addr": return { from: mid(REG.ir), to: mid(REG.mar), buses: [], lit: ["ir", "mar"] };
    case "load": return { from: mid(REG.mbr), to: mid(REG.ac), buses: [], lit: ["mbr", "ac"] };
    case "alu": return { from: mid(REG.alu), to: mid(REG.ac), buses: [], lit: ["mbr", "alu", "ac"] };
    case "toMbr": return { from: mid(REG.ac), to: mid(REG.mbr), buses: [], lit: ["ac", "mbr"] };
    case "write": return { from: mid(REG.mbr), to: cell, buses: [0, 1, 2], lit: ["mar", "mbr", "cell"] };
    case "in": return { from: dev, to: mid(REG.ac), buses: [0, 1, 2], lit: ["ac", "port"] };
    case "out": return { from: mid(REG.ac), to: dev, buses: [0, 1, 2], lit: ["ac", "port"] };
    case "jump": return { from: mid(REG.ir), to: mid(REG.pc), buses: [], lit: ["ir", "pc"] };
    case "wait": return { from: null, to: dev, buses: [2], lit: ["port"] };
    default: return { from: null, to: null, buses: [], lit: m ? ["cu"] : [] };
  }
}

type Held = { what: "op"; op: OpName } | { what: "addr"; a: number } | { what: "cell"; a: number } | { what: "plug"; dev: Device };

/** How long a program is: up to its last word that isn't 0, and the HALT after it. */
const lengthOf = (program: Memory) => {
  const last = PROGRAM.reduce((k, a, i) => (program[a] ? i : k), -1);
  return last + 2;
};
const BEST = [4, 4, 4, 7, 9, 9];
const starsFor = (stage: number, n: number) => (n <= BEST[stage] ? 3 : n <= BEST[stage] + 2 ? 2 : 1);

export function CpuLab({ state, set, w: words, svgRef }: PieceProps<"cpuLab">) {
  const [w, g] = [words.cpuLab, words.game];
  const d = state;
  const p = cpuPuzzleOf(d);
  const game = useGame({
    key: "zeno.cpulab.v1", size: CPU_LADDER.length, notices: CPU_NOTICES, modes: ["puzzle", "free"], state: d, set,
    fresh: { said: null }, stagePatch: (k) => cpuStart(CPU_LADDER[k]), freePatch: cpuStart(null),
  });
  const keys = keysOf(p);
  const [running, setRunning] = useState(false);
  const [typed, setTyped] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const latest = useRef(d);
  latest.current = d;

  /** One step, or a whole instruction: what it did, a device waited on, the program halted and checked. */
  const advance = (whole: boolean) => {
    const s = latest.current;
    let cpu = s.cpu;
    let mem = s.mem;
    let wroteProgram = false;
    do {
      const r = tick(cpu, mem, s.ports, keys);
      if (r.cpu.last === "write" && PROGRAM.includes(r.cpu.mar)) wroteProgram = true;
      [cpu, mem] = [r.cpu, r.mem];
    } while (whole && cpu.phase !== "f1" && !cpu.halted && cpu.wait === null);
    const patch = { cpu, mem };
    if (cpu.wait !== null) {
      setRunning(false);
      return game.spot(patch, "wait");
    }
    if (cpu.halted) {
      setRunning(false);
      if (!p || s.done) return set({ ...s, ...patch });
      const f = check(s.program, s.ports, p);
      if (!f) {
        setFailed(null);
        return game.win({ stars: starsFor(s.stage, lengthOf(s.program)), patch: { ...patch, done: true } });
      }
      const t = p.tests[f.test];
      setFailed(fill(w.fails[f.why], { k: f.test + 1, p: f.port ?? "", a: hex(f.at ?? 0, 3), got: f.got ?? "", want: f.want ?? (t.shown ?? []).join(", ") }));
      return game.miss(patch);
    }
    if (wroteProgram) return game.spot(patch, "selfChange");
    if (whole) set({ ...s, ...patch });
    else game.tap(patch);
  };

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => advance(true), 260);
    return () => window.clearInterval(t);
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => {
    setRunning(false);
    setFailed(null);
    game.tap({ cpu: CPU_START, mem: p ? memoryFor(d.program, p.tests[0]) : { ...d.program } });
  };
  /** A cell given a new word: in memory now, and in the program the tests run. */
  const write = (a: number, v: number) => {
    setFailed(null);
    game.tap({ mem: { ...d.mem, [a]: v }, program: { ...d.program, [a]: v }, sel: a });
  };
  const plug = (dev: Device, port: number | null) => {
    const ports = { ...d.ports };
    for (const k of PORTS) if (ports[k] === dev) delete ports[k];
    if (port !== null) ports[port] = dev;
    setFailed(null);
    game.tap({ ports, cpu: d.cpu.wait !== null ? { ...d.cpu, wait: null } : d.cpu });
  };

  const portNear = (x: number, y: number) => PORTS.find((_, k) => Math.hypot(x - PORT_X(k), y - PORT_Y) < 30) ?? null;
  const cellNear = (x: number, y: number) => [...PROGRAM, ...DATA].find((a) => x >= cellX(a) && x <= cellX(a) + 144 && y >= cellY(a) && y < cellY(a) + ROW) ?? null;

  const { drag, begin, svgProps } = useDrag<Held>((h) => {
    if (h.what === "plug") {
      if (h.moved) plug(h.dev, portNear(h.x, h.y));
      return;
    }
    if (!h.moved) {
      if (h.what === "cell" || h.what === "addr") return game.tap({ sel: h.a });
      return d.sel !== null && setOp(d.sel, h.op);
    }
    const a = cellNear(h.x, h.y);
    if (a === null) return;
    if (h.what === "op") setOp(a, h.op);
    else write(a, word(opOf(d.mem[a] ?? 0), h.a));
  });
  const setOp = (a: number, op: OpName) => write(a, op === "HALT" ? 0 : word(OP_CODE[op], (d.mem[a] ?? 0) === 0 ? 0x940 : addrOf(d.mem[a] ?? 0)));

  const c = d.cpu;
  const path = pathOf(c.last, c.mar, c.wait ?? (c.last === "in" || c.last === "out" ? addrOf(c.ir) : null));
  const lit = (k: string) => path.lit.includes(k);
  const op = mnemonic(c.ir);
  const moveText = c.last
    ? fill(w.moves[c.last], { op: op ?? hex(c.ir), a: hex(c.last === "write" || c.last === "read" || c.last === "f2" ? c.mar : addrOf(c.ir), 3), p: c.wait ?? addrOf(c.ir), pc: hex(c.pc, 3), sign: opOf(c.ir) === 6 ? "−" : "+", dev: w.devices[c.wait !== null && opOf(c.ir) === 7 ? "display" : "keyboard"] })
    : w.start;
  const stars = p && d.done ? starsFor(d.stage, lengthOf(d.program)) : 0;
  const line: Line =
    d.done && p ? { tone: "ok", text: fill(w.right, { n: lengthOf(d.program), stars: starText(stars) }) }
    : failed ? { tone: "wrong", text: failed }
    : d.said?.kind === "notice" ? { tone: "notice", text: w.notices[d.said.key] }
    : { tone: "hint", text: w.hint };
  const ask = p ? w.asks[`p${d.stage + 1}` as keyof typeof w.asks] : w.freeAsk;

  const reg = (k: keyof typeof REG, name: string, value: string, sub?: string) => {
    const b = REG[k];
    return (
      <g key={k} data-reg={k}>
        <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={6} fill={lit(k) ? "#fff4e6" : "#fff"} stroke={lit(k) ? HOT : "#adb5bd"} strokeWidth={lit(k) ? 2.5 : 1.5} />
        <text x={b.x + 6} y={b.y + 13} fontSize={10} fontWeight={700} fill={MUTED}>{name}</text>
        <text x={b.x + b.w - 8} y={b.y + 30} fontSize={15} fontWeight={700} textAnchor="end" fill={INK} fontFamily="monospace">{value}</text>
        {sub && <text x={b.x + 6} y={b.y + 40} fontSize={10} fill={BLUE}>{sub}</text>}
      </g>
    );
  };

  const cellRow = (a: number) => {
    const v = d.mem[a] ?? 0;
    const [x, y] = [cellX(a), cellY(a)];
    const here = (lit("cell") && c.mar === a) || d.sel === a;
    const isPc = PROGRAM.includes(a) && c.pc === a && !c.halted;
    const m = mnemonic(v);
    const label = fill(w.cell, { a: hex(a, 3), v: hex(v), m: m ?? String(signed(v)) });
    return (
      <g key={a} data-cell={hex(a, 3)} role="button" tabIndex={0} aria-label={label} aria-pressed={d.sel === a}
        onPointerDown={(e) => begin(e, { what: "cell", a })} onKeyDown={(e: KeyboardEvent) => keyTap(e, () => game.tap({ sel: a }))} style={{ cursor: "pointer" }}>
        <rect x={x} y={y} width={144} height={ROW - 2} rx={4} fill={here ? (lit("cell") && c.mar === a ? "#fff4e6" : "#e7f5ff") : "#fff"} stroke={here ? (lit("cell") && c.mar === a ? HOT : "#74c0fc") : "#dee2e6"} />
        {isPc && <text x={x - 7} y={y + 15} fontSize={11} fill={HOT} textAnchor="middle">▶</text>}
        <text x={x + 4} y={y + 14} fontSize={11} fill={MUTED} fontFamily="monospace" style={{ cursor: "grab" }} onPointerDown={(e) => begin(e, { what: "addr", a })}>{hex(a, 3)}</text>
        <text x={x + 34} y={y + 14} fontSize={12} fontWeight={700} fill={INK} fontFamily="monospace">{hex(v)}</text>
        <text x={x + 76} y={y + 14} fontSize={10.5} fill={a >= 0x940 || !m ? MUTED : BLUE}>{a >= 0x940 ? `= ${signed(v)}` : m ?? `= ${signed(v)}`}</text>
      </g>
    );
  };

  const at = (dev: Device): [number, number] => {
    const port = PORTS.find((k) => d.ports[k] === dev);
    return drag?.what === "plug" && drag.dev === dev && drag.moved ? [drag.x, drag.y] : port ? [PORT_X(PORTS.indexOf(port)), PORT_Y + 12] : [DEV_HOME[dev][0] + 40, DEV_HOME[dev][1] - 22];
  };

  return (
    <>
      <GameHead game={game} g={g} />
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done && !!p} g={g} notices={w.notices}>
        <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} style={{ touchAction: "none", cursor: drag ? "grabbing" : "default" }} {...svgProps}>
          <rect width={W} height={H} fill="#fff" />

          {/* The instructions, to drag onto a cell (or tap, for the picked cell). */}
          {OP_TRAY.map((o, i) => (
            <g key={o} role="button" tabIndex={0} aria-label={fill(w.setOp, { op: o })} style={{ cursor: "grab" }}
              onPointerDown={(e) => begin(e, { what: "op", op: o })} onKeyDown={(e: KeyboardEvent) => keyTap(e, () => d.sel !== null && setOp(d.sel, o))}>
              <rect x={6 + i * (TILE + 3)} y={6} width={TILE} height={TRAY - 12} rx={7} fill="#e7f5ff" stroke="#74c0fc" />
              <text x={6 + i * (TILE + 3) + TILE / 2} y={25} fontSize={12} fontWeight={700} textAnchor="middle" fill={INK}>{o}</text>
              <text x={6 + i * (TILE + 3) + TILE / 2} y={39} fontSize={10} textAnchor="middle" fill={MUTED} fontFamily="monospace">{hex(OP_CODE[o], 1)}</text>
            </g>
          ))}

          {/* Memory: the program's cells and the data's, each address, word in hex, and what it reads as. */}
          <text x={PX} y={MEM_Y - 18} fontSize={12} fontWeight={700} fill={INK}>{w.memory}</text>
          <text x={PX + 4} y={MEM_Y - 5} fontSize={10} fill={MUTED}>{w.program}</text>
          <text x={DX + 4} y={MEM_Y - 5} fontSize={10} fill={MUTED}>{w.data}</text>
          {[...PROGRAM, ...DATA].map(cellRow)}

          {/* The system bus: address, data and control lines, lit while they carry the step. */}
          {BUS.map((x, k) => (
            <g key={k}>
              <line x1={x} y1={MEM_Y - 6} x2={x} y2={H - 10} stroke={path.buses.includes(k) ? HOT : "#ced4da"} strokeWidth={path.buses.includes(k) ? 4 : 3} />
              <text x={x} y={MEM_Y - 10} fontSize={9} textAnchor="middle" fill={MUTED}>{["A", "D", "C"][k]}</text>
            </g>
          ))}
          <text x={BUS[1]} y={H - 2} fontSize={9} textAnchor="middle" fill={MUTED}>{w.bus}</text>
          {[[DX + 146, MEM_Y + 120], [CPU.x, CPU.y + 50], [IO.x, PORT_Y]].map(([x, y], k) => (
            <line key={k} x1={Math.min(x, BUS[0])} y1={y} x2={Math.max(x, BUS[2])} y2={y} stroke={path.buses.length ? HOT : "#ced4da"} strokeWidth={2.5} />
          ))}

          {/* The CPU: its registers, the ALU and the control unit with the clock. */}
          <rect x={CPU.x} y={CPU.y} width={CPU.w} height={CPU.h} rx={10} fill="#f8f9fa" stroke="#adb5bd" />
          <text x={CPU.x + 10} y={CPU.y + 18} fontSize={12} fontWeight={700} fill={INK}>{w.cpu}</text>
          {reg("pc", "PC", hex(c.pc, 3))}
          {reg("mar", "MAR", hex(c.mar, 3))}
          {reg("mbr", "MBR", hex(c.mbr))}
          {reg("ir", "IR", hex(c.ir), op ?? undefined)}
          {reg("ac", "AC", hex(c.ac), `= ${signed(c.ac)}`)}
          <path d={`M${REG.alu.x} ${REG.alu.y} L${REG.alu.x + REG.alu.w} ${REG.alu.y + 14} L${REG.alu.x + REG.alu.w} ${REG.alu.y + REG.alu.h - 14} L${REG.alu.x} ${REG.alu.y + REG.alu.h} L${REG.alu.x} ${REG.alu.y + 32} L${REG.alu.x + 10} ${REG.alu.y + 25} L${REG.alu.x} ${REG.alu.y + 18} Z`}
            fill={lit("alu") ? "#fff4e6" : "#fff"} stroke={lit("alu") ? HOT : "#adb5bd"} strokeWidth={lit("alu") ? 2.5 : 1.5} />
          <text x={REG.alu.x + 34} y={REG.alu.y + 29} fontSize={11} fontWeight={700} textAnchor="middle" fill={MUTED}>ALU</text>
          <g data-reg="cu">
            <rect x={REG.cu.x} y={REG.cu.y} width={REG.cu.w} height={REG.cu.h} rx={6} fill={lit("cu") ? "#fff4e6" : "#fff"} stroke={lit("cu") ? HOT : "#adb5bd"} />
            <text x={REG.cu.x + 6} y={REG.cu.y + 13} fontSize={10} fontWeight={700} fill={MUTED}>{w.control}</text>
            <foreignObject x={REG.cu.x + 6} y={REG.cu.y + 15} width={REG.cu.w - 108} height={REG.cu.h - 16}>
              <div style={{ fontSize: 11, lineHeight: "13px", color: c.wait !== null ? RED : INK, fontFamily: FONT }} data-move={c.last ?? "start"}>{moveText}</div>
            </foreignObject>
            {/* The clock: one step a tap. ▶ runs, ↺ starts again. */}
            {[
              { k: "tick", label: w.tick, glyph: "⏱", act: () => advance(false) },
              { k: "run", label: running ? w.pause : w.run, glyph: running ? "⏸" : "▶", act: () => setRunning((r) => !r) },
              { k: "reset", label: w.reset, glyph: "↺", act: reset },
            ].map((b, i) => (
              <g key={b.k} role="button" tabIndex={0} aria-label={b.label} style={{ cursor: "pointer" }} onPointerDown={(e) => e.stopPropagation()} onClick={b.act} onKeyDown={(e: KeyboardEvent) => keyTap(e, b.act)}>
                <title>{b.label}</title>
                <rect x={REG.cu.x + REG.cu.w - 100 + i * 34} y={REG.cu.y + 12} width={30} height={36} rx={6} fill={b.k === "tick" ? "#fff9db" : "#f1f3f5"} stroke={b.k === "tick" ? "#fab005" : "#ced4da"} />
                <text x={REG.cu.x + REG.cu.w - 85 + i * 34} y={REG.cu.y + 36} fontSize={16} textAnchor="middle">{b.glyph}</text>
              </g>
            ))}
          </g>

          {/* The I/O module: three ports, and the devices on cables, dragged by their plugs. */}
          <rect x={IO.x} y={IO.y} width={IO.w} height={IO.h} rx={10} fill="#f8f9fa" stroke="#adb5bd" />
          <text x={IO.x + 10} y={IO.y + 18} fontSize={12} fontWeight={700} fill={INK}>{w.io}</text>
          {PORTS.map((k, i) => {
            const hot = lit("port") && (c.wait ?? addrOf(c.ir)) === k;
            return (
              <g key={k} data-port={k}>
                <rect x={PORT_X(i) - 22} y={PORT_Y - 14} width={44} height={26} rx={5} fill={hot ? "#fff4e6" : "#fff"} stroke={hot ? (c.wait !== null ? RED : HOT) : "#868e96"} strokeWidth={hot ? 2.5 : 1.5} />
                <text x={PORT_X(i)} y={PORT_Y + 4} fontSize={12} fontWeight={700} textAnchor="middle" fill={INK}>{k}</text>
                <text x={PORT_X(i)} y={PORT_Y - 18} fontSize={9} textAnchor="middle" fill={MUTED}>{fill(w.port, { p: k })}</text>
              </g>
            );
          })}
          {DEVICES.map((dev) => {
            const [hx, hy] = DEV_HOME[dev];
            const [px, py] = at(dev);
            const port = PORTS.find((k) => d.ports[k] === dev);
            const cable = `M${hx + 40} ${hy - 12} C${hx + 40} ${hy - 50} ${px} ${py + 40} ${px} ${py + 8}`;
            return (
              <g key={dev} data-device={dev} data-plugged={port ?? ""}>
                <path d={cable} fill="none" stroke="#495057" strokeWidth={3} />
                {port && (
                  <path d={cable} fill="none" stroke="transparent" strokeWidth={14} style={{ cursor: "pointer" }} onPointerDown={(e) => e.stopPropagation()} onClick={() => plug(dev, null)}>
                    <title>{fill(w.unplug, { dev: w.devices[dev] })}</title>
                  </path>
                )}
                <g role="button" tabIndex={0} aria-label={fill(w.plugIn, { dev: w.devices[dev] })} style={{ cursor: "grab" }} onPointerDown={(e) => begin(e, { what: "plug", dev })}
                  onKeyDown={(e: KeyboardEvent) => keyTap(e, () => plug(dev, PORTS[(PORTS.indexOf((port ?? 7) as 7) + 1) % PORTS.length]))}>
                  <rect x={px - 7} y={py - 4} width={14} height={14} rx={2} fill={port ? GREEN : "#868e96"} />
                </g>
                {dev === "keyboard" ? (
                  <g>
                    <rect x={hx} y={hy - 12} width={120} height={40} rx={6} fill="#fff" stroke={INK} strokeWidth={1.5} />
                    {Array.from({ length: 12 }, (_, k) => <rect key={k} x={hx + 6 + (k % 6) * 19} y={hy - 7 + Math.floor(k / 6) * 14} width={15} height={10} rx={2} fill="#e9ecef" stroke="#adb5bd" />)}
                    <text x={hx + 60} y={hy + 42} fontSize={10} textAnchor="middle" fill={MUTED}>
                      {`${w.devices.keyboard}: ${keys.slice(c.read).join(" ") || "–"}`}
                    </text>
                  </g>
                ) : (
                  <g>
                    <rect x={hx} y={hy - 12} width={110} height={40} rx={6} fill="#212529" stroke={INK} strokeWidth={1.5} />
                    <text x={hx + 100} y={hy + 13} fontSize={14} fontWeight={700} textAnchor="end" fill="#69db7c" fontFamily="monospace" data-shown={c.shown.join(",")}>{c.shown.slice(-5).join(" ")}</text>
                    <text x={hx + 55} y={hy + 42} fontSize={10} textAnchor="middle" fill={MUTED}>{w.devices.display}</text>
                  </g>
                )}
              </g>
            );
          })}

          {/* The step just done: an arrow from where it came to where it went. */}
          {path.from && path.to && <line x1={path.from[0]} y1={path.from[1]} x2={path.to[0]} y2={path.to[1]} stroke={HOT} strokeWidth={3} strokeDasharray="7 5" markerEnd="url(#cpu-arrow)" opacity={0.85} pointerEvents="none" />}
          <defs>
            <marker id="cpu-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 Z" fill={HOT} />
            </marker>
          </defs>
          {drag?.what === "op" && drag.moved && (
            <g pointerEvents="none" opacity={0.75}>
              <rect x={drag.x - TILE / 2} y={drag.y - 14} width={TILE} height={28} rx={7} fill="#e7f5ff" stroke={BLUE} />
              <text x={drag.x} y={drag.y + 4} fontSize={12} fontWeight={700} textAnchor="middle" fill={INK}>{drag.op}</text>
            </g>
          )}
          {drag?.what === "addr" && drag.moved && <text x={drag.x} y={drag.y} fontSize={13} fontWeight={700} fill={BLUE} fontFamily="monospace" pointerEvents="none">{hex(drag.a, 3)}</text>}
        </svg>
      </Stage>
      {d.sel !== null && (
        <label className="live-field">
          {fill(w.type, { a: hex(d.sel, 3) })}
          <input
            key={d.sel}
            className={typed !== null && parseCell(typed) === null ? "invalid" : ""}
            defaultValue={mnemonic(d.mem[d.sel] ?? 0) && d.sel < 0x940 ? mnemonic(d.mem[d.sel] ?? 0)! : String(signed(d.mem[d.sel] ?? 0))}
            spellCheck={false}
            aria-label={fill(w.type, { a: hex(d.sel, 3) })}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              const v = parseCell((e.target as HTMLInputElement).value);
              if (v !== null && d.sel !== null) {
                setTyped(null);
                write(d.sel, v);
              }
            }}
            onBlur={(e) => {
              const v = parseCell(e.target.value);
              if (v !== null && d.sel !== null && v !== (d.mem[d.sel] ?? 0)) write(d.sel, v);
              setTyped(null);
            }}
          />
        </label>
      )}
      <GameActions game={game} g={g} done={d.done && !!p} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
