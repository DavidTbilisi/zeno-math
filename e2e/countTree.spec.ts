// The counting principle as a tree of outfits (#738): the learner grows the tree a shirt at a time until all 6 outfits
// are made, then 8 with hats; then, with no tree, adding the choices is named, and the rule, multiply, is said only
// after a right prediction.
import { expect, test } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

test("the counts of choices multiply: the learner grows the tree, then predicts", async ({ page }) => {
  const piece = await boardWith(page, "Counting: grow a tree of outfits", ".live-countTree");
  const pic = piece.locator("svg").first();
  const node = (name: string) => pic.getByRole("button", { name, exact: true });
  const say = pic.locator("[data-say]");
  const ask = pic.locator("[data-ask]");
  const madeSay = pic.locator("[data-made]");
  const next = () => pic.getByRole("button", { name: "Next" }).click();

  await expect(ask).toContainText("Tap each shirt");
  await node("shirt 1").click();
  await expect(madeSay).toContainText("Outfits made: 2");
  await node("shirt 2").focus();
  await page.keyboard.press("Enter");
  await node("shirt 3").click();
  await expect(madeSay).toContainText("Outfits made: 6");
  await expect(say).toContainText("6 outfits");
  await expect(pic.locator("[data-outfit]")).toHaveCount(6);

  await next();
  for (const n of ["shirt 1", "shirt 1, trousers 1", "shirt 1, trousers 2", "shirt 2", "shirt 2, trousers 1", "shirt 2, trousers 2"]) await node(n).click();
  await expect(madeSay).toContainText("Outfits made: 8");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/countTree-tree.png` });

  await next();
  await expect(ask).toContainText("No tree this time");
  await pic.getByRole("button", { name: "7", exact: true }).click();
  await expect(say).toContainText("4 + 3: the choices added");
  await pic.getByRole("button", { name: "12", exact: true }).click();
  await expect(say).toContainText("The rule: multiply the numbers of choices");
  await next();
  await pic.getByRole("button", { name: "12", exact: true }).click();
  await expect(say).toContainText("leaves one of the choices out");
  await pic.getByRole("button", { name: "24", exact: true }).click();
  await expect(say).toContainText("24 = 3 × 2 × 4");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/countTree-rule.png` });
  await next();
  await expect(ask).toContainText("All rounds done");
});
