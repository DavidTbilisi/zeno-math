// Exponential growth and decay (#657). Linear growth adds the same amount each step; exponential growth multiplies by
// the same factor, so its steps get bigger and bigger, and sooner or later it passes any linear growth however far
// ahead that starts. The piece `growthRace` races a plant that adds 40 cm a day against one that starts at 10 cm and
// grows by a chosen percentage a day.

/** The piece: the day shown and the second plant's daily growth in per cent. */
export type LiveGrowthRace = { day: number; rate: number };
export const GROWTH_START: LiveGrowthRace = { day: 0, rate: 30 };
export const RACE_DAYS = 20;
export const RACE_RATES = [10, 50] as const;
/** The plant that adds the same each day. */
export const linearAt = (d: number) => 100 + 40 * d;
/** The plant that multiplies by the same each day. */
export const expAt = (d: number, rate: number) => 10 * (1 + rate / 100) ** d;
/** The first whole day the multiplying plant is taller. */
export function overtakes(rate: number) {
  let d = 0;
  while (expAt(d, rate) <= linearAt(d)) d++;
  return d;
}
