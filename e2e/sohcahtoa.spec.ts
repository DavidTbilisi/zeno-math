// SOH CAH TOA: the first triangle (3, 4 and 5, θ at the end of the 4) built ratio by ratio: a wrong fraction told
// what it is (that's cos θ), sin θ dragged together side by side, cos θ and tan θ tapped in, and the hint opened.
import { expect, test } from "@playwright/test";
import { rng } from "../src/math/random.ts";
import { SOH_LADDER, sohTask } from "../src/math/sohcahtoa.ts";
import { boardWith } from "./helpers.ts";

test("sohcahtoa: build sin, cos and tan of θ from the sides; a wrong fraction is told what it is; the hint explains", async ({ page }) => {
  const game = await boardWith(page, "SOH CAH TOA", ".live-sohcahtoa");
  const t = sohTask(SOH_LADDER[0].level, rng(SOH_LADDER[0].seed));
  expect([t.len, t.at]).toEqual([{ a: 4, b: 3, c: 5 }, "a"]);
  await expect(game.getByText("Write sin θ, cos θ and tan θ for this triangle as fractions of its sides.", { exact: true })).toBeVisible();
  const side = (v: number) => game.getByRole("button", { name: `the side of ${v}`, exact: true });
  const tap = async (v: number) => {
    await side(v).focus();
    await side(v).press("Enter");
  };
  // The hint, from the start.
  await game.getByRole("button", { name: "💡 Why?" }).click();
  await expect(game.getByRole("note")).toContainText("1/5 Find the right angle first.");
  await game.getByRole("button", { name: "Next step" }).click();
  await expect(game.getByRole("note")).toContainText("2/5 Now find θ.");
  await game.getByRole("button", { name: "💡 Why?" }).click();
  await expect(game.getByRole("note")).toHaveCount(0);
  // sin θ as 4/5: that's cos θ.
  await expect(game.getByText(/^Build sin θ: drag a side's length/)).toBeVisible();
  await tap(4);
  await expect(game.getByRole("button", { name: "Top of the fraction: 4" })).toBeVisible();
  await tap(5);
  await expect(game.getByText(/^4\/5 is the adjacent over the hypotenuse: that's cos θ\. sin θ is the opposite over the hypotenuse\./)).toBeVisible();
  // Now dragged: the 3 into the top, the 5 into the bottom.
  const drag = async (v: number, slot: string) => {
    const from = (await side(v).locator("circle").boundingBox())!;
    const to = (await game.getByRole("button", { name: new RegExp(`^${slot}`) }).boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
    await page.mouse.up();
  };
  await drag(3, "Top of the fraction");
  await expect(game.getByRole("button", { name: "Top of the fraction: 3" })).toBeVisible();
  await drag(5, "Bottom of the fraction");
  await expect(game.getByText("sin θ = 3/5 ✓")).toBeVisible();
  await expect(game.getByText(/^Build cos θ/)).toBeVisible();
  await tap(4);
  await tap(5);
  await expect(game.getByText("cos θ = 4/5 ✓")).toBeVisible();
  await tap(3);
  await tap(4);
  // One miss: two stars.
  await expect(game.getByText(/^Right! sin θ = 3\/5, cos θ = 4\/5, tan θ = 3\/4\. ★★☆/)).toBeVisible();
});
