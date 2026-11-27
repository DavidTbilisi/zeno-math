// Disks and RAID (#854) by hand: a mirror loses a drive and is rebuilt by copying; a dead RAID 5 drive is worked out
// bit by bit; the design puzzle finds that RAID 5 on three drives keeps the file with the fewest drives.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;
const NAME = "Disks and RAID: pull a drive, keep the file";
const press = async (l: Locator) => {
  await l.focus();
  await l.press("Enter");
};
const open = async (page: Page, n: number) => {
  await page.addInitScript((k) => localStorage.setItem("zeno.raidlab.v1", JSON.stringify({ stars: [3, 3, 3, 3, 3].map((s, i) => (i < k ? s : 0)) })), n - 1);
  const piece = await boardWith(page, NAME, ".live-raidLab");
  if (n > 1) await press(piece.getByRole("button", { name: new RegExp(`^Puzzle ${n}`) }));
  return { piece, pic: piece.locator("svg.hand-pic") };
};

test("RAID 1: a drive pulled out, the file still reads, a fresh drive rebuilt by copying", async ({ page }) => {
  const { piece, pic } = await open(page, 1);
  await pic.getByRole("button", { name: "Pull drive 2 out" }).click();
  await expect(piece).toContainText("Drive 2 is out, and the file still reads");
  await expect(pic.locator("g[data-drive='2']")).toHaveAttribute("data-state", "out");
  // The new drive dragged from the desk into the empty bay.
  const from = (await pic.locator("g[data-new] circle").boundingBox())!;
  const to = (await pic.locator("g[data-handle='2'] path").boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y - 40, { steps: 12 });
  await page.mouse.up();
  await expect(pic.locator("g[data-drive='2']")).toHaveAttribute("data-state", "fresh");
  for (const r of [1, 2]) await pic.locator(`g[data-cell='2.${r}']`).click();
  await expect(piece).toContainText("copied back from drive 1");
  await pic.locator("g[data-cell='2.3']").click();
  await expect(piece).toContainText("Done!");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/raid-mirror.png` });
});

test("RAID 5 by hand: a lost block is the XOR of the rest of its row", async ({ page }) => {
  const { piece, pic } = await open(page, 2);
  await expect(piece).toContainText("Work out each of its blocks by hand");
  // Drive 2, row 1 holds D2 = 9 = 1001; the rest of its row: D1 = 0101 and P1 = 1100.
  await pic.locator("g[data-cell='2.1']").click();
  await expect(pic).toContainText("D1 0101");
  await pic.getByRole("switch", { name: "The 8s bit" }).click();
  await pic.getByRole("button", { name: "Write it" }).click();
  await expect(piece).toContainText("D2 is not 1000");
  await pic.getByRole("switch", { name: "The 1s bit" }).click();
  await pic.getByRole("button", { name: "Write it" }).click();
  await expect(piece).toContainText("D2 = 1001. Right!");
  // Row 2 on drive 2 is the parity P2 = D3 ⊕ D4 = 1100 ⊕ 0110 = 1010.
  await pic.locator("g[data-cell='2.2']").click();
  await pic.getByRole("switch", { name: "The 8s bit" }).click();
  await pic.getByRole("switch", { name: "The 2s bit" }).click();
  await pic.getByRole("button", { name: "Write it" }).click();
  await expect(piece).toContainText("Done!");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/raid-hand.png` });
});

test("design: RAID 0 fails the test, RAID 5 on three drives passes with the fewest", async ({ page }) => {
  const { piece, pic } = await open(page, 4);
  const testIt = pic.getByRole("button", { name: "Pull each drive in turn" });
  await testIt.click();
  await expect(piece).toContainText("Drive 1 pulled out and the file is lost.");
  await pic.getByRole("button", { name: "RAID 1" }).click();
  await testIt.click();
  await expect(piece).toContainText("The file doesn't fit");
  await pic.getByRole("button", { name: "RAID 5" }).click();
  await testIt.click();
  await expect(piece).toContainText("Any one of the 3 drives can go and the file lives.");
  await expect(pic.locator("[data-test='ok']")).toHaveCount(3);
  await expect(piece).toContainText("★★★");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/raid-design.png` });
});
