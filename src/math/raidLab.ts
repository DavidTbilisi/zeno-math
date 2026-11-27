// Disks and RAID (#854): a file's blocks laid out on drives as RAID 0 (striped), 1 (mirrored) or 5 (striped with a
// rotating parity block, the XOR of its stripe). A drive pulled out loses its blocks; the file can still be read while
// every block has a copy on a drive still in, or is the only one missing from its stripe. A fresh drive is rebuilt
// cell by cell, each block copied or worked out again as the XOR of the others (Stallings 6.2; Tanenbaum 2.3).
import type { GameBase } from "./ladder";

export type Level = 0 | 1 | 5;
export const LEVELS: readonly Level[] = [0, 1, 5];
export type Cell = { kind: "data"; block: number } | { kind: "parity"; stripe: number };
export type Layout = { rows: number; cells: (Cell | null)[][] };

/** Where each block goes: `cells[drive][row]`. */
export function layout(level: Level, n: number, blocks: number): Layout {
  const cells: (Cell | null)[][] = Array.from({ length: n }, () => []);
  if (level === 0) {
    const rows = Math.ceil(blocks / n);
    for (let d = 0; d < n; d++) for (let r = 0; r < rows; r++) cells[d][r] = r * n + d < blocks ? { kind: "data", block: r * n + d } : null;
    return { rows, cells };
  }
  if (level === 1) {
    for (let d = 0; d < n; d++) for (let r = 0; r < blocks; r++) cells[d][r] = { kind: "data", block: r };
    return { rows: blocks, cells };
  }
  const rows = Math.ceil(blocks / (n - 1));
  for (let r = 0; r < rows; r++) {
    const pd = n - 1 - (r % n);
    let j = 0;
    for (let d = 0; d < n; d++) {
      if (d === pd) cells[d][r] = { kind: "parity", stripe: r };
      else {
        const b = r * (n - 1) + j++;
        cells[d][r] = b < blocks ? { kind: "data", block: b } : null;
      }
    }
  }
  return { rows, cells };
}

/** A cell's 4 bits: the block's value, or the XOR of the data in its stripe. */
export function valueOf(L: Layout, values: readonly number[], d: number, r: number): number {
  const c = L.cells[d][r];
  if (!c) return 0;
  if (c.kind === "data") return values[c.block];
  return L.cells.reduce((x, col) => (col[r]?.kind === "data" ? x ^ values[(col[r] as { block: number }).block] : x), 0);
}

export type DriveState = { state: "ok" | "out" | "fresh"; done: boolean[] };
export const okDrive = (): DriveState => ({ state: "ok", done: [] });
export const alive = (dr: DriveState, r: number) => dr.state === "ok" || (dr.state === "fresh" && !!dr.done[r]);

/** How a cell can be had again: copied from another drive, or the XOR of the rest of its row; null if it can't. */
export function sourceOf(level: Level, L: Layout, drives: readonly DriveState[], d: number, r: number): { how: "copy" | "xor"; from: number[] } | null {
  if (!L.cells[d][r]) return null;
  const others = drives.map((_, k) => k).filter((k) => k !== d);
  if (level === 1) {
    const k = others.find((k) => alive(drives[k], r));
    return k === undefined ? null : { how: "copy", from: [k] };
  }
  if (level === 5) {
    const from = others.filter((k) => L.cells[k][r]);
    return from.every((k) => alive(drives[k], r)) ? { how: "xor", from } : null;
  }
  return null;
}

/** The blocks of the file that can't be read now. */
export function lostBlocks(level: Level, L: Layout, drives: readonly DriveState[], blocks: number): number[] {
  const lost: number[] = [];
  for (let b = 0; b < blocks; b++) {
    const at: [number, number][] = [];
    L.cells.forEach((col, d) => col.forEach((c, r) => c?.kind === "data" && c.block === b && at.push([d, r])));
    if (!at.some(([d, r]) => alive(drives[d], r) || sourceOf(level, L, drives, d, r))) lost.push(b);
  }
  return lost;
}

/** Losing any one drive, one at a time: which of them the file survives. */
export const survives = (level: Level, n: number, blocks: number) => {
  const L = layout(level, n, blocks);
  return Array.from({ length: n }, (_, k) => lostBlocks(level, L, Array.from({ length: n }, (_, j) => (j === k ? { state: "out" as const, done: [] } : okDrive())), blocks).length === 0);
};
export const fits = (level: Level, n: number, blocks: number, cap: number) => layout(level, n, blocks).rows <= cap && (level !== 5 || n >= 3) && (level !== 1 || n >= 2);
export const MAX_DRIVES = 5;
/** The fewest drives that hold the file and survive any one lost. */
export function fewest(blocks: number, cap: number): number {
  for (let n = 2; n <= MAX_DRIVES; n++) for (const lv of LEVELS) if (fits(lv, n, blocks, cap) && survives(lv, n, blocks).every(Boolean)) return n;
  return MAX_DRIVES + 1;
}

export type RaidPuzzle = { goal: "rebuild" | "hand" | "design"; level: Level; n: number; values: readonly number[]; cap: number; start?: DriveState["state"][] };
export const RAID_LADDER: readonly RaidPuzzle[] = [
  { goal: "rebuild", level: 1, n: 2, values: [0xa, 0x3, 0x6], cap: 3 },
  { goal: "hand", level: 5, n: 3, values: [0x5, 0x9, 0xc, 0x6], cap: 3, start: ["ok", "fresh", "ok"] },
  { goal: "rebuild", level: 5, n: 4, values: [0x5, 0x9, 0xc, 0x6, 0x3, 0xa], cap: 3 },
  { goal: "design", level: 0, n: 3, values: [0x5, 0x9, 0xc, 0x6, 0x3, 0xa], cap: 3 },
  { goal: "design", level: 0, n: 3, values: [0x5, 0x9, 0xc, 0x6, 0x3, 0xa], cap: 6 },
];
export const FREE_VALUES = [0x5, 0x9, 0xc, 0x6, 0x3, 0xa];

export const RAID_NOTICES = ["lost", "xor", "fit"] as const;
export type RaidNotice = (typeof RAID_NOTICES)[number];

export type LiveRaid = GameBase<RaidNotice> & {
  mode: "puzzle" | "free";
  level: Level;
  n: number;
  drives: DriveState[];
  /** The cell picked to work out by hand, and the bits set so far. */
  pick: [number, number] | null;
  bits: number;
  /** The design puzzles: each drive pulled in turn, shown. */
  tested: boolean;
  /** Wrong tries on this puzzle, for its stars. */
  misses: number;
  yaw: number;
  pitch: number;
  done: boolean;
};

export function raidStart(p: RaidPuzzle | null): Pick<LiveRaid, "level" | "n" | "drives" | "pick" | "bits" | "tested" | "misses" | "done"> {
  const n = p?.n ?? 3;
  return {
    level: p?.level ?? 5,
    n,
    drives: Array.from({ length: n }, (_, k) => ({ state: p?.start?.[k] ?? "ok", done: [] })),
    pick: null, bits: 0, tested: false, misses: 0, done: false,
  };
}
export const RAID_START: LiveRaid = { mode: "puzzle", stage: 0, said: null, yaw: -18, pitch: 16, ...raidStart(RAID_LADDER[0]) };
export const raidPuzzleOf = (s: Pick<LiveRaid, "mode" | "stage">) => (s.mode === "puzzle" ? RAID_LADDER[s.stage] ?? null : null);
export const valuesOf = (p: RaidPuzzle | null) => p?.values ?? FREE_VALUES;
export const capOf = (p: RaidPuzzle | null) => p?.cap ?? 6;
/** A fresh drive is finished when every cell it should hold is back. */
export const rebuilt = (L: Layout, dr: DriveState, d: number) => dr.state !== "fresh" || L.cells[d].every((c, r) => !c || dr.done[r]);
export const bitsOf = (v: number) => v.toString(2).padStart(4, "0");
