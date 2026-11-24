// The block area model, worked by hand: a part tapped in the rectangle (or its cell in the box) is filled with blocks
// and written into the box and the sum; other numbers start it again; with "Your turn" each product is given on the
// digit tiles first, a wrong one answered by how the blocks count it, and the parts are added at the end.
import { expect, test } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

// The picture with its digit tiles is taller than the usual window, where the board's own bars would cover them.
test.use({ viewport: { width: 1280, height: 1150 } });

test("multiplying with blocks: fill the parts, change the numbers, then your turn", async ({ page }) => {
  const piece = await boardWith(page, "Multiplying with blocks: the area model", ".live-areaBlocks");
  const pic = piece.locator("svg").first();
  const part = (r: number, c: number) => pic.getByRole("button", { name: `${r} × ${c} in the rectangle` });
  const cell = (r: number, c: number) => pic.getByRole("button", { name: `${r} × ${c} in the box` });
  const total = pic.locator("[data-total]");
  const product = pic.locator("[data-product]");

  // 24 × 16 starts with 20 × 10 and 20 × 6 in: 320 so far.
  await expect(total).toHaveText("So far: 320");
  await expect(cell(20, 10)).toHaveText("200");
  await expect(cell(4, 10)).toHaveText("?");
  await expect(product).toHaveText("?");

  // The other two parts, one tapped in the rectangle and one in the box: 200 + 120 + 40 + 24 = 384.
  await part(4, 10).click();
  await expect(cell(4, 10)).toHaveText("40");
  await expect(total).toHaveText("So far: 360");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/area-part.png` });
  await cell(4, 6).click();
  await expect(part(4, 6)).toHaveAttribute("aria-pressed", "true");
  await expect(total).toHaveText("24 × 16 = 384");
  await expect(product).toHaveText("384");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/area-done.png` });

  // A tap on a filled part empties it again.
  await part(20, 10).click();
  await expect(total).toHaveText("So far: 184");

  // The side down made 14 by its tens wheel: the rectangle starts empty, with 10 × 10 in place of 20 × 10.
  await pic.getByRole("slider", { name: "The number down the side: tens" }).press("ArrowDown");
  await expect(part(10, 10)).toHaveAttribute("aria-pressed", "false");
  await expect(total).toHaveText("");

  // Your turn: 10 × 6 asked for; 6 is answered by the count of rods, 60 fills it and the next part is asked.
  await pic.getByRole("button", { name: "Give each part's product yourself before it is filled in" }).click();
  await expect(pic.locator("[data-ask]")).toHaveText("Tap a part of the rectangle to work it out.");
  await part(10, 6).click();
  await expect(pic.locator("[data-ask]")).toHaveText("10 × 6 = ?");
  const answer = pic.getByRole("textbox", { name: "Your answer" });
  await answer.focus();
  await page.keyboard.type("6");
  await pic.getByRole("button", { name: "Check" }).click();
  await expect(pic.locator("[data-miss]")).toHaveText("Not 6. Count the rods: 1 × 6. Each rod is 10.");
  await answer.focus();
  await page.keyboard.type("60");
  await pic.getByRole("button", { name: "Check" }).click();
  await expect(cell(10, 6)).toHaveText("60");
  await expect(pic.locator("[data-ask]")).toHaveText("10 × 10 = ?");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/area-ask.png` });

  // The rest, then the parts added: 100 + 60 + 40 + 24 = 224.
  for (const n of ["100", "40", "24"]) {
    await answer.focus();
    await page.keyboard.type(n);
    await pic.getByRole("button", { name: "Check" }).click();
  }
  await expect(pic.locator("[data-ask]")).toHaveText("100 + 60 + 40 + 24 = ?");
  await expect(product).toHaveText("?");
  await answer.focus();
  await page.keyboard.type("224");
  await pic.getByRole("button", { name: "Check" }).click();
  await expect(product).toHaveText("224");
  await expect(pic.locator("[data-ask]")).toHaveText("✓ 14 × 16 = 224");
});
