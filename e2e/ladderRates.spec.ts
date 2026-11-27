// The sliding ladder (#747): dragging the foot names a place by the top's speed there, the keys move it a step, each
// round once found says what it shows, and the last rounds hide the speed so x and y must do.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

/** Drags the foot from x = from to x = to metres on a ladder L long (the picture is 720 wide, the wall at 110, 440 to the ladder's length, the floor at 560). */
async function dragFoot(page: Page, pic: Locator, L: number, from: number, to: number) {
  const box = (await pic.boundingBox())!;
  const at = (v: number) => box.x + ((110 + (v * 440) / L) / 720) * box.width;
  const y = box.y + (560 / 720) * box.height;
  await page.mouse.move(at(from), y);
  await page.mouse.down();
  await page.mouse.move(at((from + to) / 2), y, { steps: 4 });
  await page.mouse.move(at(to), y, { steps: 4 });
  await page.mouse.up();
}

test("dragging the foot of a ladder finds where the top falls at a given speed, first seen and then from x and y alone", async ({ page }) => {
  const piece = await boardWith(page, "Sliding ladder: how fast does the top fall?", ".live-ladderRates");
  const pic = piece.locator("svg").first();
  const say = pic.locator("[data-say]");
  const reading = pic.locator("[data-reading]");
  const next = () => pic.getByRole("button", { name: "Next" }).click();

  await expect(pic.locator("[data-ask]")).toContainText("3/4 m/s");
  await dragFoot(page, pic, 5, 1, 4.5);
  await expect(say).toContainText("faster than 3/4 m/s");
  await pic.getByRole("slider").focus();
  for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowLeft");
  await expect(reading).toContainText("top falls 0.75 m/s");
  await expect(say).toContainText("coincidence");

  await next();
  await dragFoot(page, pic, 5, 1, 2);
  await expect(say).toContainText("slower than 4/3 m/s");
  await dragFoot(page, pic, 5, 2, 4);
  await expect(say).toContainText("x/y times");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/ladderRates-seen.png` });

  await next();
  await expect(reading).toContainText("top falls ? m/s");
  await expect(pic.locator("[data-top-arrow]")).toHaveCount(0);
  await dragFoot(page, pic, 10, 2, 8);
  await expect(say).toContainText("faster than 3/4 m/s");
  await dragFoot(page, pic, 10, 8, 6);
  await expect(say).toContainText("without seeing the speed");

  await next();
  await dragFoot(page, pic, 13, 2.5, 12);
  await expect(say).toContainText("dy/dt = −(x/y)·dx/dt");
  await next();
  await expect(pic.locator("[data-ask]")).toContainText("All rounds done");
});
