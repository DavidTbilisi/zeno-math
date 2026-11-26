// A matrix acting on the plane (#734): a row read across is named, (1, 0) and (0, 1) found (one with the keyboard)
// draw the square's image and the rule that the columns are where they land; the quarter turn, the reflection,
// the shear keeping its area and the parallelogram of area 3 end the ladder.
import { expect, test } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

test("matrices on the plane: columns are where (1, 0) and (0, 1) land, det scales area", async ({ page }) => {
  const piece = await boardWith(page, "Matrices: find where the plane goes by tapping points", ".live-matPlane");
  const pic = piece.locator("svg").first();
  const at = (p: string) => pic.getByRole("button", { name: `tap ${p}`, exact: true });
  const say = pic.locator("[data-say]");
  const ask = pic.locator("[data-ask]");
  const next = () => pic.getByRole("button", { name: "Next" }).click();
  const round = async (a: string, b: string) => {
    await at(a).click();
    await at(b).click();
  };

  await expect(ask).toContainText("Where does M send (1, 0)?");
  await at("(1, 0)").click();
  await expect(say).toContainText("M moves it");
  await at("(2, 0)").click();
  await expect(say).toContainText("M sends (1, 0) to (2, 0)");
  await at("(0, 1)").focus();
  await page.keyboard.press("Enter");
  await expect(say).toContainText("The first column is where (1, 0) goes");
  await expect(pic.locator("[data-image]")).toBeVisible();

  await next();
  await at("(0, −1)").click();
  await expect(say).toContainText("row 1 of M read across");
  await round("(0, 1)", "(−1, 0)");
  await expect(say).toContainText("quarter turn");

  await next();
  await round("(1, 0)", "(0, −1)");
  await expect(say).toContainText("reflection in the x-axis");
  await next();
  await round("(1, 0)", "(1, 1)");
  await expect(say).toContainText("kept its area");
  await next();
  await round("(2, 1)", "(1, 2)");
  await expect(say).toContainText("multiplied by the determinant");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/matPlane-area.png` });
  await next();
  await expect(ask).toContainText("All rounds done");
});
