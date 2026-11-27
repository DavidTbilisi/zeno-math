// Number bases by skip counting (#862): dragging the dots sets every k-th column, the binary number groups into hex
// and octal, dots started at 2 don't group, and base 3 groups into base 9.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;
const NAME = "Skip-count dots: binary to octal and hex";
const dragTo = async (page: Page, from: Locator, to: Locator) => {
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, a.y + a.height / 2, { steps: 10 });
  await page.mouse.up();
};

test("binary: every 3rd column is octal, every 4th hex, and a start at 2 doesn't group", async ({ page }) => {
  const piece = await boardWith(page, NAME, ".live-baseDots");
  const pic = piece.locator("svg.hand-pic");
  await expect(pic.locator("[data-read]")).toHaveAttribute("data-read", "266");
  await expect(pic.locator("g[data-dot='1']")).toHaveCount(3);
  await dragTo(page, pic.getByRole("slider", { name: /^Second dot/ }), pic.locator("g[data-col='4'] rect").first());
  await expect(pic.locator("[data-newbase]")).toHaveAttribute("data-newbase", "16");
  await expect(pic.locator("[data-read]")).toHaveAttribute("data-read", "B6");
  await expect(pic).toContainText("10110110 in base 2 = 1011 | 0110 = B6 in base 16 = 182");
  await pic.locator("g[data-digit='0']").click();
  await expect(pic.locator("[data-read]")).toHaveAttribute("data-read", "B7");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/bases-hex.png` });
  await dragTo(page, pic.getByRole("slider", { name: /^First dot/ }), pic.locator("g[data-col='1'] rect").first());
  await expect(pic).toContainText("Dots from 2");
  await expect(pic.locator("g[data-group]")).toHaveCount(0);
});

test("base 3: every 2nd column is base 9", async ({ page }) => {
  const piece = await boardWith(page, NAME, ".live-baseDots");
  const pic = piece.locator("svg.hand-pic");
  await pic.getByRole("button", { name: "Base 3" }).click();
  const second = pic.getByRole("slider", { name: /^Second dot/ });
  await second.focus();
  await second.press("ArrowRight");
  await expect(pic.locator("[data-newbase]")).toHaveAttribute("data-newbase", "9");
  await expect(pic.locator("g[data-group]")).toHaveCount(3);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/bases-three.png` });
});
