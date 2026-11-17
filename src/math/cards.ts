// A deck of 52 playing cards for chance and statistics. A card is a number 0–51: its suit is id ÷ 13 (spades, hearts,
// diamonds, clubs) and its rank id mod 13 (0 the ace … 12 the king), worth 1 (ace) to 13 (king).
// Four things to do with it (src/live/Cards.tsx draws them):
//   draw   draw cards one at a time, put back or kept out, and count them by suit, colour, rank or kind;
//   given  P(A | B): the cards outside B are set aside and A is counted among what is left;
//   two    two cards one after the other: a tree of P(first) × P(second | first), with or without putting back;
//   means  samples of n cards and the means of their values: they pile up round 7 and narrow as n grows.
// The card pictures are public/cards/*.svg, from the public-domain Vector Playing Cards 1.3 (Byron Knoll).

export const DECK = 52;
export const SUITS = ["spades", "hearts", "diamonds", "clubs"] as const;
export type Suit = (typeof SUITS)[number];
export const SUIT_SIGNS = ["♠", "♥", "♦", "♣"] as const;
const RANK_FILES = ["ace", "2", "3", "4", "5", "6", "7", "8", "9", "10", "jack", "queen", "king"];
export const RANK_LABELS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
export const ALL_CARDS = Array.from({ length: DECK }, (_, i) => i);

export const suitOf = (id: number) => Math.floor(id / 13);
export const rankOf = (id: number) => id % 13;
/** What a card is worth in the "means" mode: ace 1, 2–10 as marked, jack 11, queen 12, king 13. */
export const valueOf = (id: number) => rankOf(id) + 1;
export const isRed = (id: number) => suitOf(id) === 1 || suitOf(id) === 2;
/** "Q♥". */
export const cardName = (id: number) => `${RANK_LABELS[rankOf(id)]}${SUIT_SIGNS[suitOf(id)]}`;
/** The picture's file in public/cards: "queen_of_hearts.svg". */
export const cardFile = (id: number) => `${RANK_FILES[rankOf(id)]}_of_${SUITS[suitOf(id)]}.svg`;

// ——— Events ———

export const EVENTS = ["hearts", "spades", "diamonds", "clubs", "red", "black", "ace", "king", "face", "number", "high"] as const;
export type CardEvent = (typeof EVENTS)[number];
/** A condition can also be "any card", i.e. none. */
export type Condition = CardEvent | "any";
export const CONDITIONS: Condition[] = ["any", ...EVENTS];

export function inEvent(e: Condition, id: number): boolean {
  const r = rankOf(id);
  switch (e) {
    case "any": return true;
    case "spades": return suitOf(id) === 0;
    case "hearts": return suitOf(id) === 1;
    case "diamonds": return suitOf(id) === 2;
    case "clubs": return suitOf(id) === 3;
    case "red": return isRed(id);
    case "black": return !isRed(id);
    case "ace": return r === 0;
    case "king": return r === 12;
    case "face": return r >= 10;
    case "number": return r >= 1 && r <= 9;
    case "high": return r >= 9; // 10, J, Q, K: worth 10 or more
  }
}
export const cardsIn = (e: Condition, from: readonly number[] = ALL_CARDS) => from.filter((id) => inEvent(e, id));

// ——— Fractions ———

export type Frac = { n: number; d: number };
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
export const reduce = ({ n, d }: Frac): Frac => {
  const g = gcd(n, d) || 1;
  return { n: n / g, d: d / g };
};
/** "4/12 = 1/3", or "13/52 = 1/4", or just "1/3" when it is already as low as it goes; 0 and 1 are written as such. */
export function fracText(f: Frac): string {
  const r = reduce(f);
  const low = r.n === 0 ? "0" : r.d === 1 ? String(r.n) : `${r.n}/${r.d}`;
  return r.n === f.n && r.d === f.d ? low : `${f.n}/${f.d} = ${low}`;
}
export const fracValue = ({ n, d }: Frac) => (d ? n / d : 0);
export const decimal = (v: number) => v.toFixed(v > 0 && v < 0.01 ? 4 : 3);

// ——— Draw and count ———

export type Group = "suit" | "colour" | "rank" | "kind";
export const GROUPS: Group[] = ["suit", "colour", "rank", "kind"];
export const groupSize = (g: Group) => ({ suit: 4, colour: 2, rank: 13, kind: 3 })[g];
/** Which bar a card counts in: its suit, red/black, its rank, or ace / number card / face card. */
export function groupOf(g: Group, id: number): number {
  switch (g) {
    case "suit": return suitOf(id);
    case "colour": return isRed(id) ? 0 : 1;
    case "rank": return rankOf(id);
    case "kind": return rankOf(id) === 0 ? 0 : rankOf(id) >= 10 ? 2 : 1;
  }
}
/** How many of the given cards fall in each bar. */
export const groupCounts = (g: Group, from: readonly number[] = ALL_CARDS) => {
  const out = Array(groupSize(g)).fill(0);
  for (const id of from) out[groupOf(g, id)]++;
  return out as number[];
};

/** The cards drawn and shown last, newest last. */
export const SHOWN = 6;
export const MAX_DRAWS = 1_000_000;

export type DrawState = {
  group: Group;
  /** Put each card back (and shuffle) before the next draw? */
  replace: boolean;
  /** The cards still in the deck, when they are not put back; it is shuffled full again when it runs out. */
  left: number[];
  /** How many cards have been drawn, and how many of them fell in each bar. */
  n: number;
  counts: number[];
  shown: number[];
  /** The bar the words below the chart are about. */
  focus: number;
};

export const freshDraw = (group: Group, replace: boolean, focus = 0): DrawState => ({
  group, replace, left: [...ALL_CARDS], n: 0, counts: Array(groupSize(group)).fill(0), shown: [], focus: Math.min(focus, groupSize(group) - 1),
});

/** `m` more cards drawn; without putting back, the deck is shuffled full again each time it runs out. */
export function drawMore(s: DrawState, m: number, r: () => number): DrawState {
  const counts = [...s.counts];
  let left = [...s.left];
  const shown = [...s.shown];
  const room = Math.max(0, Math.min(m, MAX_DRAWS - s.n));
  for (let i = 0; i < room; i++) {
    let id: number;
    if (s.replace) id = Math.floor(r() * DECK);
    else {
      if (!left.length) left = [...ALL_CARDS];
      id = left.splice(Math.floor(r() * left.length), 1)[0];
    }
    counts[groupOf(s.group, id)]++;
    if (i >= room - SHOWN) shown.push(id);
  }
  return { ...s, n: s.n + room, counts, left, shown: shown.slice(-SHOWN) };
}

/** The chance that the next card falls in bar `i`: from the whole deck when cards go back, from what is left when not. */
export function nextChance(s: DrawState, i: number): Frac {
  const deck = s.replace || !s.left.length ? ALL_CARDS : s.left;
  return { n: groupCounts(s.group, deck)[i], d: deck.length };
}

// ——— P(A | B) ———

/** What the grid of 52 says: P(A), P(B), P(A and B) and P(A | B) as counted fractions. */
export function conditional(a: CardEvent, b: Condition) {
  const inB = cardsIn(b);
  const both = cardsIn(a, inB);
  const pa: Frac = { n: cardsIn(a).length, d: DECK };
  const given: Frac = { n: both.length, d: inB.length };
  const diff = fracValue(given) - fracValue(pa);
  return {
    pa,
    pb: { n: inB.length, d: DECK } as Frac,
    pBoth: { n: both.length, d: DECK } as Frac,
    given,
    /** Knowing B makes A more likely (1), less likely (−1) or leaves it alone (0: independent). */
    effect: (Math.abs(diff) < 1e-12 ? 0 : diff > 0 ? 1 : -1) as -1 | 0 | 1,
  };
}

// ——— Two cards ———

/**
 * The tree for "A on the first card, B on the second". Without putting back, the second card comes from the 51 left,
 * one fewer B card among them when the first was a B card too. When only some first cards are B cards (A = hearts,
 * B = king), the chance is averaged over them: (k·|B| − k_B) / (51·k) for k first cards of which k_B are in B.
 */
export function twoCards(a: CardEvent, b: CardEvent, replace: boolean) {
  const A = cardsIn(a).length;
  const B = cardsIn(b).length;
  const AB = cardsIn(b, cardsIn(a)).length;
  const after = (k: number, kB: number): Frac =>
    replace ? { n: B, d: DECK } : kB === 0 ? { n: B, d: DECK - 1 } : kB === k ? { n: B - 1, d: DECK - 1 } : reduce({ n: k * B - kB, d: (DECK - 1) * k });
  const first: Frac = { n: A, d: DECK };
  const firstNot: Frac = { n: DECK - A, d: DECK };
  const yes = after(A, AB);
  const no = after(DECK - A, B - AB);
  /** Along each branch the chances multiply: 4/52 × 3/51 = 12/2652. */
  const path = (f: Frac, s: Frac): Frac => ({ n: f.n * s.n, d: f.d * s.d });
  return { first, firstNot, yes, no, both: path(first, yes), notThen: path(firstNot, no) };
}

export type TwoTally = { n: number; firstHits: number; both: number };
/** `m` more pairs of cards drawn; the deck is full again for each pair. */
export function drawPairs(t: TwoTally, a: CardEvent, b: CardEvent, replace: boolean, m: number, r: () => number): { tally: TwoTally; last: [number, number] | null } {
  let { n, firstHits, both } = t;
  let last: [number, number] | null = null;
  const room = Math.max(0, Math.min(m, MAX_DRAWS - n));
  for (let i = 0; i < room; i++) {
    const x = Math.floor(r() * DECK);
    let y = Math.floor(r() * (replace ? DECK : DECK - 1));
    if (!replace && y >= x) y++;
    n++;
    if (inEvent(a, x)) {
      firstHits++;
      if (inEvent(b, y)) both++;
    }
    last = [x, y];
  }
  return { tally: { n, firstHits, both }, last };
}

// ——— Sample means ———

export const POP_MEAN = 7;
/** The spread of the values 1–13, four of each: σ² = (13² − 1)/12 = 14. */
export const POP_SD = Math.sqrt(14);
export const MAX_SAMPLE = 10;

/** The spread of the means of samples of n cards drawn without putting back: σ/√n × √((52 − n)/51). */
export const meanSd = (n: number) => (POP_SD / Math.sqrt(n)) * Math.sqrt((DECK - n) / (DECK - 1));

/** One sample of n different cards. */
export function sample(n: number, r: () => number): number[] {
  const left = [...ALL_CARDS];
  return Array.from({ length: n }, () => left.splice(Math.floor(r() * left.length), 1)[0]);
}

/**
 * Counts of the sample sums (index sum − n, so length 12n + 1): the means are sum / n. Kept as sums, not means, so the
 * state is small and exact.
 */
export type MeansState = { size: number; sums: number[]; samples: number; last: number[] };
export const freshMeans = (size: number): MeansState => ({ size, sums: Array(12 * size + 1).fill(0), samples: 0, last: [] });

export function drawSamples(s: MeansState, m: number, r: () => number): MeansState {
  const sums = [...s.sums];
  let last = s.last;
  const room = Math.max(0, Math.min(m, MAX_DRAWS - s.samples));
  for (let i = 0; i < room; i++) {
    last = sample(s.size, r);
    sums[last.reduce((t, id) => t + valueOf(id), 0) - s.size]++;
  }
  return { ...s, sums, samples: s.samples + room, last };
}

/** The chance of each sum of n cards drawn without putting back (index sum − n), counted over all C(52, n) hands. */
export function sumDistribution(n: number): number[] {
  // ways[k][t]: the ways to pick k cards from the values so far with total t. Each value has 4 cards: C(4, c) ways for c of them.
  const C4 = [1, 4, 6, 4, 1];
  const maxT = 13 * n;
  let ways = Array.from({ length: n + 1 }, () => Array(maxT + 1).fill(0));
  ways[0][0] = 1;
  for (let v = 1; v <= 13; v++) {
    const next = Array.from({ length: n + 1 }, () => Array(maxT + 1).fill(0));
    for (let k = 0; k <= n; k++)
      for (let t = 0; t <= maxT; t++) {
        if (!ways[k][t]) continue;
        for (let c = 0; c <= 4 && k + c <= n && t + c * v <= maxT; c++) next[k + c][t + c * v] += ways[k][t] * C4[c];
      }
    ways = next;
  }
  const row = ways[n];
  const total = row.reduce((a, b) => a + b, 0);
  return Array.from({ length: 12 * n + 1 }, (_, i) => row[i + n] / total);
}

/** The mean and spread of the sample means so far. */
export function meanStats(s: MeansState): { mean: number; sd: number } | null {
  if (!s.samples) return null;
  let sum = 0;
  let sq = 0;
  s.sums.forEach((k, i) => {
    const m = (i + s.size) / s.size;
    sum += k * m;
    sq += k * m * m;
  });
  const mean = sum / s.samples;
  return { mean, sd: Math.sqrt(Math.max(0, sq / s.samples - mean * mean)) };
}

/** The bars of the histogram of means: one per value for one card, otherwise half a point wide, 1 to 13. */
export function meanBins(size: number): { width: number; count: number; binOf: (sumIndex: number) => number; centre: (bin: number) => number } {
  const width = size === 1 ? 1 : 0.5;
  const count = Math.round(12 / width) + 1;
  return {
    width,
    count,
    binOf: (i) => Math.round(((i + size) / size - 1) / width),
    centre: (bin) => 1 + bin * width,
  };
}

// ——— The piece ———

export type CardsMode = "draw" | "given" | "two" | "means";
export const CARD_MODES: CardsMode[] = ["draw", "given", "two", "means"];

export type LiveCards = {
  mode: CardsMode;
  draw: DrawState;
  given: { a: CardEvent; b: Condition };
  two: { a: CardEvent; b: CardEvent; replace: boolean; tally: TwoTally; last: [number, number] | null };
  means: MeansState;
};

export const CARDS_START: LiveCards = {
  mode: "draw",
  draw: freshDraw("suit", true, 1),
  given: { a: "king", b: "face" },
  two: { a: "ace", b: "ace", replace: false, tally: { n: 0, firstHits: 0, both: 0 }, last: null },
  means: freshMeans(4),
};
