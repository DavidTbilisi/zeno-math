// The soroban (the Japanese abacus): a rod per place, each with one five bead above the beam and four one beads below
// it, a bead counting when it is pushed against the beam. Here are the digits the rods show, what clicking a bead
// does, and adding or taking away a number as it is done on a soroban: from the highest place down, each rod with the
// "friends" of 5 and of 10 when the beads it needs are not free, and carrying or borrowing on the rod to its left.
// Kept free of React so it can be tested on its own.

export const SOROBAN_RODS = { min: 3, max: 13 } as const;

/** The digits a soroban of `rods` rods shows for `value`, the leftmost rod first. */
export function rodDigits(value: number, rods: number): number[] {
  return Array.from({ length: rods }, (_, i) => Math.floor(value / 10 ** (rods - 1 - i)) % 10);
}

/** How a digit sits on its rod: the five bead down against the beam or not, and how many one beads are pushed up. */
export const beadsOf = (digit: number) => ({ five: digit >= 5, ones: digit % 5 });

/** The biggest number the rods can show. */
export const sorobanMax = (rods: number) => 10 ** rods - 1;

/**
 * The value after clicking a bead on the rod for `place` (0 for the ones): the five bead goes over to the other side,
 * and a one bead (0 is the one next to the beam) moves with the beads between it and the beam, the way a finger pushes
 * them.
 */
export function clickBead(value: number, place: number, bead: "five" | number): number {
  const p = 10 ** place;
  const digit = Math.floor(value / p) % 10;
  const { five, ones } = beadsOf(digit);
  const next = bead === "five" ? (five ? ones : 5 + ones) : (five ? 5 : 0) + (ones > bead ? bead : bead + 1);
  return value + (next - digit) * p;
}

/**
 * How a rod takes on or gives up d: straight on or off; with the friend of 5 (+d = +5 − c, or −d = −5 + c); with the
 * friend of 10 (+d = +10 − c, the 10 carried to the next rod, or −d = −10 + c, the 10 borrowed); or with both
 * ("mixed": the c of the friend of 10 itself needs the five bead, +d = +10 − 5 + e).
 */
export type SorobanRule = "direct" | "five" | "ten" | "mixed";

export type SorobanStep = {
  /** The rod, by place: 0 for the ones. */
  place: number;
  sign: 1 | -1;
  d: number;
  rule: SorobanRule;
  /** The friend: 5 − d with the friend of 5, 10 − d with the friend of 10. */
  c: number;
  /** With the mixed rule, the beads that make up the five bead: 5 − c. */
  e: number;
  /** A 1 carried (or borrowed) from the rod to the right, not a digit of the number itself. */
  carry: boolean;
  /** What the soroban shows after this step. */
  after: number;
};

/** The rule a rod showing `digit` uses to add d (sign 1) or take it away (sign −1). */
export function ruleFor(digit: number, sign: 1 | -1, d: number): { rule: SorobanRule; c: number; e: number } {
  if (sign === 1) {
    const s = digit + d;
    if (s <= 9) return d < 5 && digit < 5 && s >= 5 ? { rule: "five", c: 5 - d, e: 0 } : { rule: "direct", c: 0, e: 0 };
    const c = 10 - d;
    return digit >= 5 && c < 5 && digit - 5 < c ? { rule: "mixed", c, e: 5 - c } : { rule: "ten", c, e: 0 };
  }
  const s = digit - d;
  if (s >= 0) return d < 5 && digit >= 5 && s < 5 ? { rule: "five", c: 5 - d, e: 0 } : { rule: "direct", c: 0, e: 0 };
  const c = 10 - d;
  return digit < 5 && c < 5 && digit + c >= 5 ? { rule: "mixed", c, e: 5 - c } : { rule: "ten", c, e: 0 };
}

/** Whether the answer fits on the rods (and taking away doesn't go below nothing). */
export const sorobanFits = (start: number, sign: 1 | -1, n: number, rods: number) =>
  Number.isSafeInteger(n) && n >= 0 && start + sign * n >= 0 && start + sign * n <= sorobanMax(rods);

/**
 * Adding n to start (sign 1) or taking it away (sign −1) the soroban way, a step for each rod that changes: the digits
 * of n from the highest place down, and after a friend of 10 the carry (or borrow) on the rods to the left, which may
 * itself need a friend. The caller checks that the answer fits.
 */
export function sorobanSteps(start: number, sign: 1 | -1, n: number): SorobanStep[] {
  const steps: SorobanStep[] = [];
  let value = start;
  const put = (place: number, d: number, carry: boolean) => {
    const p = 10 ** place;
    const digit = Math.floor(value / p) % 10;
    const { rule, c, e } = ruleFor(digit, sign, d);
    const tens = rule === "ten" || rule === "mixed";
    value += sign * (tens ? d - 10 : d) * p;
    steps.push({ place, sign, d, rule, c, e, carry, after: value });
    if (tens) put(place + 1, 1, true);
  };
  const digits = String(n).split("").map(Number);
  digits.forEach((d, i) => d && put(digits.length - 1 - i, d, false));
  return steps;
}

/** A number for the pupil to show: up to `places` digits (at least two), none of them left as nought at the front. */
export function sorobanTarget(rods: number, r: () => number): number {
  const places = Math.min(rods, 2 + Math.floor(r() * 3));
  return 10 ** (places - 1) + Math.floor(r() * 9 * 10 ** (places - 1));
}
