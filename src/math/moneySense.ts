// Everyday money: two changes in a row. A percentage is always of the price it is taken from, so after 20 % off the
// second 10 % is of the lower price and takes off less than 10 % of the first: 20 % off then 10 % off is 28 % off, not
// 30 %, and 20 % up then 20 % down ends below where it began. The piece `twoChanges` draws the price as a bar and each
// change as a cut or a piece added, the second bar with its own tenths, beside the one change of the two added.

/** The piece: off then off, or up then down, and the two changes in per cent. */
export type LiveTwoChanges = { mode: "offOff" | "upDown"; first: number; second: number };
export const TWO_START: LiveTwoChanges = { mode: "offOff", first: 20, second: 10 };
export const TWO_MAX = 50;
export const TWO_STEP = 5;
/** The price the piece starts from: 100, so each per cent of it is one unit of money. */
export const TWO_PRICE = 100;

/** The price after the first change, after the second, and after the two taken as one change of the original. */
export function twoChanges({ mode, first, second }: LiveTwoChanges) {
  const after1 = TWO_PRICE * (1 + ((mode === "upDown" ? 1 : -1) * first) / 100);
  const after2 = after1 * (1 - second / 100);
  const added = TWO_PRICE * (1 + ((mode === "upDown" ? first : -first) - second) / 100);
  return { after1, after2, added, net: TWO_PRICE - after2 };
}

/** A sum of money written to the cent, without a trailing ".00" when it is whole. */
export const cash = (v: number) => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(2));
