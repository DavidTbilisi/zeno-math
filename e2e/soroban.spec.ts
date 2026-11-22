// The soroban, worked by hand: beads pushed by a drag and a tap, a rod set from the keyboard, the beam wiped clear,
// the frame's edge dragged for fewer rods, and a sum set on the digit wheels and stepped through by tapping the blue rod.
import { expect, test } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

test("soroban by hand: beads, beam, rods and a sum rod by rod", async ({ page }) => {
  const piece = await boardWith(page, "Soroban (abacus)", ".live-soroban");
  const pic = piece.locator("svg").first();
  const value = pic.locator("text[data-value]");
  const ones = pic.getByRole("slider", { name: "Ones rod" });
  await expect(value).toHaveAttribute("data-value", "0");

  // The third one bead on the ones rod pushed up to the beam takes the two above it: 3.
  const bead = (await ones.locator(":scope > g").nth(3).boundingBox())!;
  await page.mouse.move(bead.x + bead.width / 2, bead.y + bead.height / 2);
  await page.mouse.down();
  await page.mouse.move(bead.x + bead.width / 2, bead.y - 40, { steps: 6 });
  await page.mouse.up();
  await expect(value).toHaveAttribute("data-value", "3");
  // The tens rod's five bead tapped down to the beam: 53; one more on the ones rod from the keyboard: 54.
  await pic.getByRole("slider", { name: "Tens rod" }).locator(":scope > g").first().click();
  await expect(value).toHaveAttribute("data-value", "53");
  await ones.press("ArrowUp");
  await expect(value).toHaveAttribute("data-value", "54");
  // A tap on the beam clears it.
  await pic.getByRole("button", { name: /^Clear:/ }).click();
  await expect(value).toHaveAttribute("data-value", "0");

  // The frame's edge dragged two rods in: 7 rods become 5.
  const edge = pic.getByRole("slider", { name: /^Rods:/ });
  await expect(edge).toHaveAttribute("aria-valuenow", "7");
  const grip = (await edge.boundingBox())!;
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip.x + grip.width / 2 - 116, grip.y + grip.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(edge).toHaveAttribute("aria-valuenow", "5");
  await expect(pic.locator("g[data-rod]")).toHaveCount(5);

  // 7 on the ones rod, the 38 on the wheels turned down to 8, and + 8 stepped through rod by rod: 15.
  for (let i = 0; i < 7; i++) await ones.press("ArrowUp");
  const tens = pic.getByRole("slider", { name: "Number to add or take away: Tens" });
  for (let i = 0; i < 3; i++) await tens.press("ArrowDown");
  await pic.getByRole("button", { name: "+ Add" }).click();
  await expect(piece).toContainText("7 + 8: rod by rod");
  const next = pic.getByRole("button", { name: "Next rod" });
  while (await next.count()) await next.click();
  await expect(piece).toContainText("7 + 8 = 15");
  await expect(value).toHaveAttribute("data-value", "15");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/soroban.png` });
  // The first dot goes back to the start.
  await pic.getByRole("button", { name: "Back to the start" }).click();
  await expect(value).toHaveAttribute("data-value", "7");
});
