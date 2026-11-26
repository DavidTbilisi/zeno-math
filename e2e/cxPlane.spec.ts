// The complex plane by tapping points (#732): 3 + 2i with its parts swapped is named; the right point draws the
// parts across and up; z + w is reached with the keyboard after a difference is named; i·z the wrong way round is
// named before the quarter turn; the conjugate after −z; and all four rounds end the ladder.
import { expect, test } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

test("the complex plane: plot, add, multiply by i, conjugate", async ({ page }) => {
  const piece = await boardWith(page, "Complex plane: find the rules by tapping points", ".live-cxPlane");
  const pic = piece.locator("svg").first();
  const at = (p: string) => pic.getByRole("button", { name: `tap ${p}`, exact: true });
  const say = pic.locator("[data-say]");
  const ask = pic.locator("[data-ask]");
  const next = () => pic.getByRole("button", { name: "Next" }).click();

  await expect(ask).toContainText("Tap the point 3 + 2i.");
  await at("2 + 3i").click();
  await expect(say).toContainText("You swapped them");
  await expect(pic.locator("[data-tapped]")).toHaveAttribute("data-ok", "no");
  await at("3 + 2i").click();
  await expect(say).toContainText("Every complex number is one point");
  await expect(pic.locator("[data-shown]")).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/cxPlane-plot.png` });

  await next();
  await expect(ask).toContainText("Tap where z + w is.");
  await at("1 − 2i").click();
  await expect(say).toContainText("a difference");
  await at("3 + 4i").focus();
  await page.keyboard.press("Enter");
  await expect(say).toContainText("parallelogram");

  await next();
  await at("1 − 3i").click();
  await expect(say).toContainText("quarter clockwise");
  await at("−1 + 3i").click();
  await expect(say).toContainText("turns by 90°");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/cxPlane-turn.png` });

  await next();
  await at("−2 − 3i").click();
  await expect(say).toContainText("−z");
  await at("2 − 3i").click();
  await expect(say).toContainText("mirrored in the real axis");
  await next();
  await expect(ask).toContainText("All rounds done");
});
