// Hamming code (#857): check bits filled by hand, a flipped bit found in the circles and in the row of twelve, and two
// flips fooling the code into a third.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;
const NAME = "Hamming code: find the flipped bit";
const press = async (l: Locator) => {
  await l.focus();
  await l.press("Enter");
};
const open = async (page: Page, n: number) => {
  await page.addInitScript((k) => localStorage.setItem("zeno.hamminglab.v1", JSON.stringify({ stars: [3, 3, 3, 3, 3].map((s, i) => (i < k ? s : 0)) })), n - 1);
  const piece = await boardWith(page, NAME, ".live-hammingLab");
  if (n > 1) await press(piece.getByRole("button", { name: new RegExp(`^Puzzle ${n}`) }));
  return { piece, pic: piece.locator("svg.hand-pic") };
};
const bit = (pic: Locator, i: number) => pic.locator(`g[data-bit='${i}']`);

test("fill the check bits: data is fixed, each circle made even", async ({ page }) => {
  const { piece, pic } = await open(page, 1);
  await bit(pic, 3).click();
  await expect(piece).toContainText("Place 3 is a data bit");
  await expect(pic.locator("g[data-circle='2']")).toHaveAttribute("data-odd", "1");
  await bit(pic, 2).click();
  await expect(piece).toContainText("Done! ★★");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/hamming-fill.png` });
});

test("find the flipped bit: inside exactly the red circles", async ({ page }) => {
  const { piece, pic } = await open(page, 2);
  await expect(pic.locator("[data-syndrome]")).toHaveAttribute("data-syndrome", "5");
  await bit(pic, 7).click();
  await expect(piece).toContainText("Not place 7: the failing checks are 1 + 4 = 5");
  await bit(pic, 5).click();
  await expect(piece).toContainText("Done!");
});

test("twelve in a row: failing checks 2 + 8 name place 10", async ({ page }) => {
  const { piece, pic } = await open(page, 4);
  await expect(pic.locator("g[data-check='2']")).toHaveAttribute("data-odd", "1");
  await expect(pic.locator("g[data-check='8']")).toHaveAttribute("data-odd", "1");
  await expect(pic).toContainText("in binary 1010");
  await bit(pic, 10).click();
  await expect(piece).toContainText("Done! ★★★");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/hamming-row.png` });
});

test("two flips point at a third bit, and fixing it gives the wrong word", async ({ page }) => {
  const { piece, pic } = await open(page, 5);
  await bit(pic, 2).click();
  await bit(pic, 5).click();
  await expect(piece).toContainText("they point to place 7");
  await bit(pic, 7).click();
  await expect(piece).toContainText("wrong at places 2, 5, 7");
  await expect(piece).toContainText("Done!");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/hamming-two.png` });
});
