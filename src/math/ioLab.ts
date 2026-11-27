// Talking to devices (#856): a disk sends a block one byte at a time while a program wants the CPU. Polling: the CPU
// keeps asking the disk and its work waits until every byte is in. Interrupts: the CPU works, and each byte rings: save
// where it was, take the byte, go back. DMA: the CPU tells the DMA controller where and how much, works on while the
// bytes go straight to memory, and is rung once at the end (Stallings 7.2-7.5; Tanenbaum 5.6.5). A keyboard polled
// every k ticks loses a key if the next one comes before it is taken.
import type { GameBase } from "./ladder";

export type Method = "polling" | "interrupts" | "dma";
export const METHODS: readonly Method[] = ["polling", "interrupts", "dma"];
export type Act = "work" | "poll" | "take" | "save" | "return" | "setup" | "check";
/** What the learner must do at a tick: take the byte, answer the ring, set up the DMA; or nothing (step the clock). */
export type Decision = "take" | "ring" | "setup" | null;
export type Tick = { act: Act; decide: Decision; arrive: boolean; stored: boolean };

/** The CPU's tick by tick, for a method and the ticks the disk's bytes arrive at. */
export function plan(m: Method, arrivals: readonly number[], T: number): Tick[] {
  const ticks: Tick[] = Array.from({ length: T }, (_, t) => ({ act: "work", decide: null, arrive: arrivals.includes(t), stored: false }));
  const handler = (t: number, mid: Act) => {
    const seq: Act[] = ["save", mid, "return"];
    seq.forEach((a, i) => t + i < T && (ticks[t + i].act = a));
    return t + seq.length;
  };
  if (m === "polling") {
    let t = 0;
    for (const a of arrivals) {
      for (; t < Math.min(a, T); t++) ticks[t].act = "poll";
      if (t >= T) break;
      Object.assign(ticks[t], { act: "take", decide: "take", stored: true });
      t++;
    }
  } else if (m === "interrupts") {
    let free = 0;
    for (const a of arrivals) {
      const t = Math.max(a, free);
      if (t >= T) break;
      ticks[t].decide = "ring";
      free = handler(t, "take");
      if (t + 1 < T) ticks[t + 1].stored = true;
    }
  } else {
    ticks[0] = { ...ticks[0], act: "setup", decide: "setup" };
    for (const a of arrivals) if (a < T) ticks[a].stored = true;
    const last = arrivals[arrivals.length - 1];
    if (last !== undefined && last < T) {
      ticks[last].decide = "ring";
      handler(last, "check");
    }
  }
  return ticks;
}
export const workOf = (ticks: readonly Tick[]) => ticks.filter((x) => x.act === "work").length;

/** A keyboard polled every k ticks (at 0, k, 2k, …): each poll costs a tick, and a key not taken before the next comes is lost. */
export function pollKeys(keys: readonly number[], k: number, T: number): { ticks: Act[]; lost: number[]; taken: number[] } {
  const ticks: Act[] = Array.from({ length: T }, () => "work");
  const lost: number[] = [];
  const taken: number[] = [];
  let waiting: number | null = null;
  for (let t = 0; t < T; t++) {
    if (keys.includes(t)) {
      if (waiting !== null) lost.push(waiting);
      waiting = t;
    }
    if (t % k === 0) {
      ticks[t] = waiting !== null ? "take" : "poll";
      if (waiting !== null) taken.push(waiting);
      waiting = null;
    }
  }
  return { ticks, lost, taken };
}
/** The slowest polling that loses no key. */
export const bestInterval = (keys: readonly number[], T: number) => [...Array(T).keys()].map((i) => T - i).find((k) => k >= 1 && pollKeys(keys, k, T).lost.length === 0) ?? 1;

export type IoPuzzle = { goal: "hand"; method: Method; arrivals: readonly number[]; T: number } | { goal: "keys"; keys: readonly number[]; T: number };
export const DISK = [4, 9, 14];
export const KEYS = [2, 5, 9, 13, 16];
export const IO_T = 20;
export const IO_LADDER: readonly IoPuzzle[] = [
  { goal: "hand", method: "polling", arrivals: DISK, T: IO_T },
  { goal: "hand", method: "interrupts", arrivals: DISK, T: IO_T },
  { goal: "hand", method: "dma", arrivals: DISK, T: IO_T },
  { goal: "keys", keys: KEYS, T: IO_T },
];
export const INTERVALS = [1, 2, 3, 4, 5, 6];

export const IO_NOTICES = ["waste", "save", "lost"] as const;
export type IoNotice = (typeof IO_NOTICES)[number];

export type LiveIo = GameBase<IoNotice> & {
  mode: "puzzle" | "free";
  method: Method;
  /** Ticks done so far, wrong tries, and the keyboard's polling interval (0 until one is picked). */
  t: number;
  misses: number;
  k: number;
  done: boolean;
};
export function ioStart(p: IoPuzzle | null): Pick<LiveIo, "method" | "t" | "misses" | "k" | "done"> {
  return { method: p && p.goal === "hand" ? p.method : "polling", t: 0, misses: 0, k: 0, done: false };
}
export const IO_START: LiveIo = { mode: "puzzle", stage: 0, said: null, ...ioStart(IO_LADDER[0]) };
export const ioPuzzleOf = (s: Pick<LiveIo, "mode" | "stage">) => (s.mode === "puzzle" ? IO_LADDER[s.stage] ?? null : null);
export const starsFor = (misses: number) => (misses === 0 ? 3 : misses <= 2 ? 2 : 1);
