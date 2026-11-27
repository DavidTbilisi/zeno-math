// The shape of a graph from f′ and f″ (#746): dragging the line across f, f′ and f″ names a place by f′'s or f″'s sign
// there, the keys move it a quarter, each turn and inflection once found says its rule, and the last rounds hide f.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

/** Drags the line from x = from to x = to (the picture is 720 wide, x = 0 at 380, 70 to a unit). */
async function dragTo(page: Page, pic: Locator, from: number, to: number) {
  const box = (await pic.boundingBox())!;
  const at = (v: number) => box.x + ((380 + v * 70) / 720) * box.width;
  const y = box.y + (330 / 720) * box.height;
  await page.mouse.move(at(from), y);
  await page.mouse.down();
  await page.mouse.move(at((from + to) / 2), y, { steps: 4 });
  await page.mouse.move(at(to), y, { steps: 4 });
  await page.mouse.up();
}

test("dragging a line across f, f′ and f″ finds a maximum, a minimum and an inflection, then reads them from f′ alone", async ({ page }) => {
  const piece = await boardWith(page, "f, f′ and f″: read the shape of a graph", ".live-shapeRead");
  const pic = piece.locator("svg").first();
  const say = pic.locator("[data-say]");
  const reading = pic.locator("[data-reading]");
  const next = () => pic.getByRole("button", { name: "Next" }).click();

  await expect(pic.locator("[data-ask]")).toContainText("stops rising and starts falling");
  await expect(reading).toContainText("x = 1");
  await dragTo(page, pic, 1, 0);
  await expect(say).toContainText("f is falling here");
  await pic.getByRole("slider").focus();
  for (let i = 0; i < 8; i++) await page.keyboard.press("ArrowLeft");
  await expect(say).toContainText("a maximum");
  await expect(reading).toContainText("f′ = 0");

  await next();
  await dragTo(page, pic, 1, -2);
  await expect(say).toContainText("the other kind of turn");
  await dragTo(page, pic, -2, 2);
  await expect(say).toContainText("a minimum");

  await next();
  await dragTo(page, pic, -3, 0);
  await expect(say).toContainText("bends up here like a cup");
  await dragTo(page, pic, 0, 1);
  await expect(say).toContainText("A point of inflection");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/shapeRead-inflection.png` });

  await next();
  await expect(pic.locator("[data-hidden]")).toHaveCount(2);
  await dragTo(page, pic, -3, -1);
  await expect(say).toContainText("the other kind of turn");
  await dragTo(page, pic, -1, 3);
  await expect(say).toContainText("found without seeing f");

  await next();
  await dragTo(page, pic, -3, 1);
  await expect(say).toContainText("The rules");
  await next();
  await expect(pic.locator("[data-ask]")).toContainText("All rounds done");
});
