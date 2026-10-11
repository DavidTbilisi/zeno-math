// Seeded random numbers for the learner-model studies, so every simulation and every bootstrap gives the same numbers
// on every run. The generator is the one in src/math/random.ts, except that seed 0 is a seed of its own here (there it
// becomes 1); the published simulations were made with this one, so it stays, in a module the browser's learner model
// can import without the simulator.

/** mulberry32, with normal draws by Box–Muller. */
export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const normal = (sd = 1) => sd * Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next());
  const pick = <T>(items: readonly T[]) => items[Math.floor(next() * items.length)];
  return { next, normal, pick };
}
