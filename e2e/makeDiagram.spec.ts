// Make the diagram: a picture graph built with the arrow keys, one row first given as many faces as its number (the
// slip named: each face stands for the key), then put right at the second check for two stars and the next puzzle.
import { expect, test } from "@playwright/test";
import { MAKE_LADDER, makeTask } from "../src/math/makeDiagram.ts";
import { rng } from "../src/math/random.ts";
import { boardWith } from "./helpers.ts";

test("make the diagram: faces put with the arrow keys; as many faces as the number named, then right", async ({ page }) => {
  const game = await boardWith(page, "Make the diagram", ".live-makeDiagram");
  const m = makeTask(MAKE_LADDER[0].level, rng(MAKE_LADDER[0].seed));
  if (m.kind !== "picto") throw new Error("the first puzzle is a picture graph");
  /** Row i's faces brought to n with the arrow keys (the key in the first puzzle is 5: whole faces only). */
  const setRow = async (i: number, n: number) => {
    const row = game.getByRole("slider", { name: m.t.rows[i].icon });
    await row.focus();
    const now = Number(await row.getAttribute("aria-valuenow"));
    for (let k = now; k < n; k++) await row.press("ArrowUp");
    for (let k = now; k > n; k--) await row.press("ArrowDown");
    await expect(row).toHaveAttribute("aria-valuenow", String(n));
  };
  // The first key press only puts the piece in use when the board hasn't taken it yet: retry until it counts.
  const first = game.getByRole("slider", { name: m.t.rows[0].icon });
  await expect(async () => {
    await first.focus();
    await first.press("ArrowUp");
    await expect(first).toHaveAttribute("aria-valuenow", "1", { timeout: 1000 });
  }).toPass();
  const slip = m.t.rows.findIndex((r) => r.v <= 12);
  for (const [i, r] of m.t.rows.entries()) await setRow(i, i === slip ? r.v : r.v / m.t.key);
  await game.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(new RegExp(`Each face stands for ${m.t.key}, not 1`))).toBeVisible();
  await setRow(slip, m.t.rows[slip].v / m.t.key);
  await game.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(/Right! The diagram shows every number\. ★★☆/)).toBeVisible();
  await expect(game.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
});
