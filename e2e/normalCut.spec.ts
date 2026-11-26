// The empirical rule by cutting a normal curve (#740): dragging the cuts shades the share between them, too small and
// too large a share are named, the keys move the cut a quarter of a standard deviation, a tail on the wrong side is
// named, and the last round states the whole rule.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

/** Drags the cut to z standard deviations from the mean (the picture is 720 wide, the mean at 360, 84 a deviation). */
async function dragTo(page: Page, pic: Locator, from: number, z: number) {
  const box = (await pic.boundingBox())!;
  const at = (v: number) => box.x + ((360 + v * 84) / 720) * box.width;
  const y = box.y + (300 / 640) * box.height;
  await page.mouse.move(at(from), y);
  await page.mouse.down();
  await page.mouse.move(at((from + z) / 2), y, { steps: 4 });
  await page.mouse.move(at(z), y, { steps: 4 });
  await page.mouse.up();
}

test("cutting the normal curve finds 68%, 95% and 99.7%, then the tails", async ({ page }) => {
  const piece = await boardWith(page, "Normal curve: cut it and find the 68–95–99.7 rule", ".live-normalCut");
  const pic = piece.locator("svg").first();
  const say = pic.locator("[data-say]");
  const reading = pic.locator("[data-reading]");
  const next = () => pic.getByRole("button", { name: "Next" }).click();

  await expect(pic.locator("[data-ask]")).toContainText("about 68% of the heights");
  await expect(reading).toHaveText("38.3% between 165 and 175");
  await dragTo(page, pic, 0.5, 1.5);
  await expect(reading).toHaveText("86.6% between 155 and 185");
  await expect(say).toContainText("more than asked for");
  await pic.getByRole("slider").focus();
  for (let i = 0; i < 2; i++) await page.keyboard.press("ArrowLeft");
  await expect(say).toContainText("within 1 standard deviation of the mean");

  await next();
  await dragTo(page, pic, 0.5, 2);
  await expect(say).toContainText("within 2 standard deviations");
  await next();
  await dragTo(page, pic, 0.5, 3);
  await expect(say).toContainText("almost every height");

  await next();
  await dragTo(page, pic, 0, -1);
  await expect(reading).toHaveText("84.1% above 496");
  await expect(say).toContainText("the other side of the mean");
  await dragTo(page, pic, -1, 1);
  await expect(say).toContainText("two equal tails");

  await next();
  await dragTo(page, pic, 0, -2);
  await expect(say).toContainText("1, 2 and 3 standard deviations");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/normalCut-rule.png` });
  await next();
  await expect(pic.locator("[data-ask]")).toContainText("All rounds done");
});
