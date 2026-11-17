// Round the unit circle: the first puzzle played on the board: P turned with the arrow keys, a wrong angle told how
// far to turn, then the right one; a wrong pair of coordinates drawn where it really is, then the right pair.
import { expect, test } from "@playwright/test";
import { rng } from "../src/math/random.ts";
import { CIRCLE_LADDER, circleTask } from "../src/math/unitCircleGame.ts";
import { boardWith } from "./helpers.ts";

test("unit circle: P put at 120° with the arrow keys, then its coordinates picked", async ({ page }) => {
  const game = await boardWith(page, "Round the unit circle", ".live-unitCircleGame");
  const t = circleTask(CIRCLE_LADDER[0].level, rng(CIRCLE_LADDER[0].seed));
  expect(t.kind === "place" && t.angle).toBe(120);
  const handle = game.getByRole("slider", { name: "P, on the circle" });
  await expect(async () => {
    await handle.focus();
    await page.keyboard.press("ArrowRight");
    await expect(handle).toHaveAttribute("aria-valuenow", "15", { timeout: 1000 });
  }).toPass();
  for (let i = 0; i < 8; i++) await page.keyboard.press("ArrowRight");
  await expect(handle).toHaveAttribute("aria-valuenow", "135");
  await game.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText("P is at 135°, not 120°: turn it 15° clockwise.")).toBeVisible();
  await handle.focus();
  await page.keyboard.press("ArrowLeft");
  await game.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(/^P is at 120°\. Which are its coordinates/)).toBeVisible();
  await game.getByRole("button", { name: "(√3/2, −½)" }).or(game.getByRole("button", { name: "(−√3/2, ½)" })).first().click();
  await expect(game.getByText(/is the point at \d+° \(in orange\)/)).toBeVisible();
  await game.getByRole("button", { name: "(−½, √3/2)" }).click();
  await expect(game.getByText(/^Right! P at 120° is \(−½, √3\/2\)\. ★☆☆/)).toBeVisible();
});
