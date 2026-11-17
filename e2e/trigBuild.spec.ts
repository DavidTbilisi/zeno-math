// Trig builder: the first puzzle solved on the picture, a step at a time: the sides tapped as they are asked for (one
// wrong side told what it is), cos chosen, a wrong rearrangement drawn and told impossible, then the right one.
import { expect, test } from "@playwright/test";
import { rng } from "../src/math/random.ts";
import { TRIG_LADDER, trigTask } from "../src/math/trigBuild.ts";
import { boardWith } from "./helpers.ts";

test("trig builder: name the sides, choose the ratio, rearrange; a wrong step is told why; the hint explains", async ({ page }) => {
  const game = await boardWith(page, "Trig builder", ".live-trigBuild");
  const t = trigTask(TRIG_LADDER[0].level, rng(TRIG_LADDER[0].seed));
  // The first puzzle: a 9 m ladder at 53° to the ground; how far is its foot from the wall?
  expect([t.scene, t.top, t.ask, t.known[0], t.len.hyp]).toEqual(["ladder", false, "adj", "hyp", 9]);
  await expect(game.getByText("The ladder is 9 m, at 53°. How far is the foot of the ladder from the wall?", { exact: true })).toBeVisible();
  const side = (name: string) => game.getByRole("button", { name, exact: true });
  // The hint opens at the step the puzzle is on (the hypotenuse) and steps on to the opposite side.
  await game.getByRole("button", { name: "💡 Why?" }).click();
  await expect(game.getByRole("note")).toContainText("1/7 The hypotenuse is the side across from the right angle.");
  await game.getByRole("button", { name: "Next step" }).click();
  await expect(game.getByRole("note")).toContainText("2/7 The opposite side is across from θ");
  await game.getByRole("button", { name: "💡 Why?" }).click();
  await expect(game.getByRole("note")).toHaveCount(0);
  await expect(async () => {
    await side("the ladder").dispatchEvent("pointerdown");
    await expect(game.getByText(/^Tap the side opposite θ/)).toBeVisible({ timeout: 1000 });
  }).toPass();
  await side("the ground").dispatchEvent("pointerdown");
  await expect(game.getByText(/That side touches θ and isn't the hypotenuse/)).toBeVisible();
  await side("the wall").dispatchEvent("pointerdown");
  await side("the ground").dispatchEvent("pointerdown");
  await expect(game.getByText("Which ratio joins the hypotenuse and the adjacent?")).toBeVisible();
  await game.getByRole("button", { name: "cos = adj / hyp" }).click();
  await expect(game.getByText("cos 53° = x / 9")).toBeVisible();
  await game.getByRole("button", { name: "x = 9 ÷ cos 53°" }).click();
  await expect(game.getByText(/makes x = 15 m, longer than the 9 m hypotenuse/)).toBeVisible();
  await game.getByRole("button", { name: "x = 9 × cos 53°" }).click();
  // Two misses: one star, and the puzzle to be tried again.
  await expect(game.getByText(/^Right! x = 9 × cos 53° = 5\.4 m\. ★☆☆ Two stars open the next one/)).toBeVisible();
  await expect(game.getByText("cos 53° = x / 9 ⇒ x = 9 × cos 53° = 5.4 m")).toBeVisible();
});
