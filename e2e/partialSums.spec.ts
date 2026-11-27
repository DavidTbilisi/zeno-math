// The partial-sums piece (#751): dragging the line names a place too low by the bar that passes it and one too high by
// the bars never reaching it, the keys move it a step, each round once found says what it shows, and the last rounds
// draw only three bars so the sum must come from a/(1 − r).
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

/** Drags the line from the value `from` to `to` on a chart whose top is `top` (the picture is 720 tall, 0 at 540, top at 150). */
async function dragLine(page: Page, pic: Locator, top: number, from: number, to: number) {
  const box = (await pic.boundingBox())!;
  const at = (v: number) => box.y + ((540 - (v / top) * 390) / 720) * box.height;
  const x = box.x + (380 / 720) * box.width;
  await page.mouse.move(x, at(from));
  await page.mouse.down();
  await page.mouse.move(x, at((from + to) / 2), { steps: 4 });
  await page.mouse.move(x, at(to), { steps: 4 });
  await page.mouse.up();
}

test("dragging a line to where the partial sums close in finds the sum of a series, first seen and then from the rule", async ({ page }) => {
  const piece = await boardWith(page, "Partial sums: where does the series go?", ".live-partialSums");
  const pic = piece.locator("svg").first();
  const say = pic.locator("[data-say]");
  const next = () => pic.getByRole("button", { name: "Next" }).click();

  await expect(pic.locator("[data-ask]")).toContainText("1/2 + 1/4 + 1/8 + …");
  await dragLine(page, pic, 1.5, 0.4, 1.3);
  await expect(say).toContainText("Too high");
  await pic.getByRole("slider").focus();
  for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowDown");
  await expect(pic.locator("[data-line]")).toHaveAttribute("data-line", "1");
  await expect(say).toContainText("sum of the series");

  await next();
  await dragLine(page, pic, 4, 1, 2);
  await expect(say).toContainText("pass your line");
  await dragLine(page, pic, 4, 2, 3);
  await expect(say).toContainText("coincidence");

  await next();
  await dragLine(page, pic, 1.25, 1 / 3, 2 / 3);
  await expect(say).toContainText("a ÷ (1 − r)");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/partialSums-seen.png` });

  await next();
  await expect(pic.locator("[data-hidden]")).toHaveCount(9);
  await dragLine(page, pic, 5, 1.25, 4);
  await expect(say).toContainText("3 ÷ (1 − 1/4) = 4");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/partialSums-hidden.png` });

  await next();
  await dragLine(page, pic, 8, 2, 6);
  await expect(say).toContainText("a/(1 − r)");
  await next();
  await expect(pic.locator("[data-ask]")).toContainText("All rounds done");
});
