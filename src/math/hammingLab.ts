// Hamming code (#857): bits at places 1..n, check bits at the powers of two. Check c covers every place whose number has
// c's bit set, and makes the count of 1s it covers even. Seven places drawn as three overlapping circles (Venn), twelve
// as a row (eight data bits, four check bits). A flipped bit breaks exactly the checks that cover it, and those checks
// added up name its place: the syndrome (Stallings 5.2, Figures 5.8-5.10; Tanenbaum 2.2.4).
import type { GameBase } from "./ladder";

export const isCheck = (i: number) => (i & (i - 1)) === 0;
export const checksOf = (n: number) => [1, 2, 4, 8].filter((c) => c <= n);
export const covers = (c: number, i: number) => (i & c) !== 0;
/** bits[i - 1] is place i. */
export const parityOf = (bits: readonly number[], c: number) => bits.reduce((s, b, k) => (covers(c, k + 1) ? s ^ b : s), 0);
export const failing = (bits: readonly number[]) => checksOf(bits.length).filter((c) => parityOf(bits, c) === 1);
export const syndrome = (bits: readonly number[]) => failing(bits).reduce((s, c) => s + c, 0);
export const dataPlaces = (n: number) => Array.from({ length: n }, (_, k) => k + 1).filter((i) => !isCheck(i));

/** The data bits in the non-check places, and each check bit set so its checks come out even. */
export function encode(data: readonly number[], n: number): number[] {
  const bits = Array<number>(n).fill(0);
  dataPlaces(n).forEach((i, k) => (bits[i - 1] = data[k] ?? 0));
  for (const c of checksOf(n)) bits[c - 1] = parityOf(bits, c);
  return bits;
}
export const flip = (bits: readonly number[], i: number) => bits.map((b, k) => (k === i - 1 ? 1 - b : b));
export const diffs = (a: readonly number[], b: readonly number[]) => a.flatMap((x, k) => (x !== b[k] ? [k + 1] : []));

export type HammingPuzzle = { goal: "fill" | "fix" | "two"; n: 7 | 12; data: readonly number[]; flip?: number };
export const HAMMING_LADDER: readonly HammingPuzzle[] = [
  { goal: "fill", n: 7, data: [1, 0, 1, 1] },
  { goal: "fix", n: 7, data: [0, 1, 1, 0], flip: 5 },
  { goal: "fill", n: 12, data: [1, 0, 0, 1, 1, 1, 0, 1] },
  { goal: "fix", n: 12, data: [0, 1, 1, 0, 1, 0, 0, 1], flip: 10 },
  { goal: "two", n: 7, data: [1, 1, 0, 1] },
];
/** The word sent: the code word of the data. */
export const sentOf = (p: HammingPuzzle) => encode(p.data, p.n);
/** What the puzzle starts from: data with check bits 0 (fill), a word with one bit flipped (fix), the word itself (two). */
export function startBits(p: HammingPuzzle): number[] {
  if (p.goal === "fill") return encode(p.data, p.n).map((b, k) => (isCheck(k + 1) ? 0 : b));
  if (p.goal === "fix") return flip(sentOf(p), p.flip!);
  return sentOf(p);
}

export const HAMMING_NOTICES = ["culprit", "binary", "twoFlips"] as const;
export type HammingNotice = (typeof HAMMING_NOTICES)[number];

export type LiveHamming = GameBase<HammingNotice> & {
  mode: "puzzle" | "free";
  view: "venn" | "row";
  bits: number[];
  misses: number;
  done: boolean;
};
export const hammingPuzzleOf = (s: Pick<LiveHamming, "mode" | "stage">) => (s.mode === "puzzle" ? HAMMING_LADDER[s.stage] ?? null : null);
export function hammingStart(p: HammingPuzzle | null): Pick<LiveHamming, "view" | "bits" | "misses" | "done"> {
  return p ? { view: p.n === 7 ? "venn" : "row", bits: startBits(p), misses: 0, done: false } : { view: "venn", bits: encode([1, 0, 1, 1], 7), misses: 0, done: false };
}
export const HAMMING_START: LiveHamming = { mode: "puzzle", stage: 0, said: null, ...hammingStart(HAMMING_LADDER[0]) };
export const starsFor = (misses: number) => (misses === 0 ? 3 : misses <= 2 ? 2 : 1);
