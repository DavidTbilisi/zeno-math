// Virtual memory (#859): an address translated by tapping its byte, FIFO placed by hand, and Belady's anomaly.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;
const NAME = "Virtual memory: pages and frames";
const press = async (l: Locator) => {
  await l.focus();
  await l.press("Enter");
};
const open = async (page: Page, n: number) => {
  await page.addInitScript((k) => localStorage.setItem("zeno.paginglab.v1", JSON.stringify({ stars: [3, 3, 3, 3].map((s, i) => (i < k ? s : 0)) })), n - 1);
  const piece = await boardWith(page, NAME, ".live-pagingLab");
  if (n > 1) await press(piece.getByRole("button", { name: new RegExp(`^Puzzle ${n}`) }));
  return { piece, pic: piece.locator("svg.hand-pic") };
};

test("translate: the page table finds the frame, the offset finds the byte", async ({ page }) => {
  const { piece, pic } = await open(page, 1);
  const byte = (f: number, o: number) => pic.locator(`rect[data-byte='${f}.${o}']`);
  await byte(0, 11).click();
  await expect(piece).toContainText("Page 2 is in frame 1");
  await byte(1, 10).click();
  await expect(piece).toContainText("The offset is the last 4 bits, 1011 = 11");
  await byte(1, 11).click();
  await expect(piece).toContainText("the real address is 1 × 16 + 11 = 27");
  await byte(2, 5).click();
  await byte(0, 2).click();
  await expect(piece).toContainText("Done! ★★");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/paging-translate.png` });
});

test("FIFO by hand: free frames first, then the page that came in first goes", async ({ page }) => {
  const { piece, pic } = await open(page, 2);
  const frame = (f: number) => pic.getByRole("button", { name: new RegExp(`^Frame ${f},`) });
  for (const f of [0, 1, 2]) await frame(f).click();
  await frame(1).click();
  await expect(piece).toContainText("FIFO: page 7 in frame 0 came in first");
  for (const f of [0, 1, 1, 2, 0]) await frame(f).click();
  await expect(piece).toContainText("Done! ★★");
  await expect(pic.locator("[data-faults]").last()).toHaveAttribute("data-faults", "7");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/paging-fifo.png` });
});

test("Belady: four frames fault more than three under FIFO", async ({ page }) => {
  const { piece, pic } = await open(page, 4);
  await pic.getByRole("button", { name: "Run with 3 frames" }).click();
  await expect(pic.locator("g[data-run='3']")).toHaveAttribute("data-faults", "9");
  await pic.getByRole("button", { name: "Run with 4 frames" }).click();
  await expect(pic.locator("g[data-run='4']")).toHaveAttribute("data-faults", "10");
  await expect(piece).toContainText("Done! ★★★");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/paging-belady.png` });
});
