// Samples (#653). A sample's share estimates the population's: 3 red in a sample of 10 suggests about 30 in 100. Random
// samples scatter around the truth, closer on average the more of them there are; samples picked by hand lean, here
// towards the red fish, which are bigger and catch the eye. The piece `sampleField` has the learner take samples of 10
// from a pond by tapping, or draw them at random, and stacks each sample's estimate on a line under the pond.

/** The piece: the fish picked in the sample being taken, the estimates so far, and how many random draws there have been. */
export type LiveSampleField = { picked: number[]; samples: { v: number; hand: boolean }[]; draws: number };
export const SAMPLE_START: LiveSampleField = { picked: [], samples: [], draws: 0 };
export const POND = 100;
export const SAMPLE = 10;
/** How many samples before the true number shows. */
export const REVEAL = 5;

/** A small seeded generator, so the pond and the random draws are the same every time. */
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

/** The fish: a jittered 10 × 10 grid in a 400 × 250 pond, 30 of them red (spread at random). */
export const FISH: readonly { x: number; y: number; red: boolean }[] = (() => {
  const rnd = lcg(653);
  const red = new Set<number>();
  while (red.size < 30) red.add(Math.floor(rnd() * POND));
  return Array.from({ length: POND }, (_, i) => ({ x: 22 + (i % 10) * 38 + (rnd() - 0.5) * 18, y: 18 + Math.floor(i / 10) * 23.5 + (rnd() - 0.5) * 8, red: red.has(i) }));
})();
export const TRUE_RED = FISH.filter((f) => f.red).length;

/** The estimate for the pond from a sample: its red share of the whole pond. */
export const estimate = (picked: readonly number[]) => (picked.filter((i) => FISH[i].red).length * POND) / picked.length;

/** A tap on fish i: picked (a new sample begins after a full one), and a full sample adds its estimate. */
export function tapFish(s: LiveSampleField, i: number): LiveSampleField {
  const base = s.picked.length >= SAMPLE ? [] : s.picked;
  if (base.includes(i)) return s;
  const picked = [...base, i];
  return picked.length === SAMPLE ? { ...s, picked, samples: [...s.samples, { v: estimate(picked), hand: true }] } : { ...s, picked };
}
/** Ten fish drawn at random, as a sample. */
export function drawRandom(s: LiveSampleField): LiveSampleField {
  const rnd = lcg(7919 * (s.draws + 1));
  const picked: number[] = [];
  while (picked.length < SAMPLE) {
    const i = Math.floor(rnd() * POND);
    if (!picked.includes(i)) picked.push(i);
  }
  return { picked, samples: [...s.samples, { v: estimate(picked), hand: false }], draws: s.draws + 1 };
}
