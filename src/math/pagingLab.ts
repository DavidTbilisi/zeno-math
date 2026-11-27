// Virtual memory (#859): a program of eight pages of 16 bytes, and a few frames of real memory. An address is its page
// (the high bits) and offset (the low four); the page table says which frame holds the page. A page not in memory is a
// page fault: it comes from the disk into a free frame, or in place of the one chosen to go, first in first out or
// least recently used. FIFO can fault more with more frames (Belady) (Stallings 8.3; Tanenbaum 6.1).
import type { GameBase } from "./ladder";

export const PAGE = 16;
export const PAGES = 8;
export type Policy = "fifo" | "lru";
export const POLICIES: readonly Policy[] = ["fifo", "lru"];
export type Frame = { page: number | null; loaded: number; used: number };
export const emptyFrames = (n: number): Frame[] => Array.from({ length: n }, () => ({ page: null, loaded: -1, used: -1 }));
export const tableOf = (frames: readonly Frame[]) => Array.from({ length: PAGES }, (_, p) => frames.findIndex((f) => f.page === p)).map((i) => (i < 0 ? null : i));

/** Where a fault may go: a free frame if there is one, or the one the policy throws out. */
export function choicesOf(frames: readonly Frame[], policy: Policy): number[] {
  const free = frames.flatMap((f, i) => (f.page === null ? [i] : []));
  if (free.length) return free;
  const key = (f: Frame) => (policy === "fifo" ? f.loaded : f.used);
  return [frames.reduce((a, f, i) => (key(f) < key(frames[a]) ? i : a), 0)];
}
export type Access = { hit: boolean; frame: number; out: number | null; frames: Frame[] };
export function access(frames: readonly Frame[], policy: Policy, page: number, t: number, frame?: number): Access {
  const at = frames.findIndex((f) => f.page === page);
  if (at >= 0) return { hit: true, frame: at, out: null, frames: frames.map((f, i) => (i === at ? { ...f, used: t } : f)) };
  const to = frame ?? choicesOf(frames, policy)[0];
  return { hit: false, frame: to, out: frames[to].page, frames: frames.map((f, i) => (i === to ? { page, loaded: t, used: t } : f)) };
}
export function runPages(policy: Policy, n: number, seq: readonly number[]): { hits: boolean[]; frames: Frame[] } {
  let frames = emptyFrames(n);
  const hits = seq.map((p, t) => {
    const a = access(frames, policy, p, t);
    frames = a.frames;
    return a.hit;
  });
  return { hits, frames };
}
export const faults = (policy: Policy, n: number, seq: readonly number[]) => runPages(policy, n, seq).hits.filter((h) => !h).length;

export const split = (addr: number) => ({ page: Math.floor(addr / PAGE), offset: addr % PAGE });
export const bitsOf = (addr: number) => ({ page: split(addr).page.toString(2).padStart(3, "0"), offset: split(addr).offset.toString(2).padStart(4, "0") });

export type PagingPuzzle =
  | { goal: "translate"; addrs: readonly number[]; table: readonly (number | null)[] }
  | { goal: "hand"; policy: Policy; n: number; seq: readonly number[] }
  | { goal: "belady"; policy: Policy; seq: readonly number[] };
export const HAND_SEQ = [7, 0, 1, 2, 0, 3, 0, 4];
export const BELADY_SEQ = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];
export const PAGING_LADDER: readonly PagingPuzzle[] = [
  { goal: "translate", addrs: [43, 5, 98], table: [2, null, 1, null, null, null, 0, null] },
  { goal: "hand", policy: "fifo", n: 3, seq: HAND_SEQ },
  { goal: "hand", policy: "lru", n: 3, seq: HAND_SEQ },
  { goal: "belady", policy: "fifo", seq: BELADY_SEQ },
];
/** The frames a page table describes (for translating, nothing is loaded or used). */
export const framesOfTable = (table: readonly (number | null)[], n: number): Frame[] =>
  emptyFrames(n).map((f, i) => ({ ...f, page: table.findIndex((fr) => fr === i) < 0 ? null : table.findIndex((fr) => fr === i) }));

export const PAGING_NOTICES = ["fault", "lru", "belady"] as const;
export type PagingNotice = (typeof PAGING_NOTICES)[number];

export type LivePaging = GameBase<PagingNotice> & {
  mode: "puzzle" | "free";
  policy: Policy;
  n: number;
  seq: number[];
  /** Requests done, hit or fault for each, the frames now; frame counts tried (Belady); wrong tries. */
  at: number;
  hits: boolean[];
  frames: Frame[];
  tried: number[];
  misses: number;
  done: boolean;
};
export function pagingStart(p: PagingPuzzle | null): Omit<LivePaging, "mode" | "stage" | "said"> {
  const base = { at: 0, hits: [], tried: [], misses: 0, done: false };
  if (!p) return { ...base, policy: "fifo", n: 3, seq: [], frames: emptyFrames(3) };
  if (p.goal === "translate") return { ...base, policy: "fifo", n: 3, seq: [...p.addrs], frames: framesOfTable(p.table, 3) };
  if (p.goal === "hand") return { ...base, policy: p.policy, n: p.n, seq: [...p.seq], frames: emptyFrames(p.n) };
  return { ...base, policy: p.policy, n: 3, seq: [...p.seq], frames: emptyFrames(3) };
}
export const PAGING_START: LivePaging = { mode: "puzzle", stage: 0, said: null, ...pagingStart(PAGING_LADDER[0]) };
export const pagingPuzzleOf = (s: Pick<LivePaging, "mode" | "stage">) => (s.mode === "puzzle" ? PAGING_LADDER[s.stage] ?? null : null);
export const starsFor = (misses: number) => (misses === 0 ? 3 : misses <= 2 ? 2 : 1);
