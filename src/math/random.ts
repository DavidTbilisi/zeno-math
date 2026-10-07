// A small seeded random number generator, shared by the simulations that must come out the same every time (pictures
// re-rendered on the board, tests) and kept apart from the heavier maths modules.

/** Deterministic PRNG (mulberry32): the same seed always draws the same numbers. */
export function rng(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
