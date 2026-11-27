// Talking to devices (#856): polling by hand (waiting, then taking the byte), interrupts (a wrong tap, then the bell),
// and the keyboard polled too slowly losing a key.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;
const NAME = "Talking to devices: polling, interrupts and DMA";
const press = async (l: Locator) => {
  await l.focus();
  await l.press("Enter");
};
const open = async (page: Page, n: number) => {
  await page.addInitScript((k) => localStorage.setItem("zeno.iolab.v1", JSON.stringify({ stars: [3, 3, 3, 3].map((s, i) => (i < k ? s : 0)) })), n - 1);
  const piece = await boardWith(page, NAME, ".live-ioLab");
  if (n > 1) await press(piece.getByRole("button", { name: new RegExp(`^Puzzle ${n}`) }));
  return { piece, pic: piece.locator("svg.hand-pic") };
};
const DISK = [4, 9, 14];

test("polling: the CPU waits, and takes each byte when the disk's light is on", async ({ page }) => {
  const { piece, pic } = await open(page, 1);
  const clock = pic.getByRole("button", { name: "One tick: step the clock" });
  for (let t = 0; t < 20; t++) {
    if (DISK.includes(t)) await pic.getByRole("button", { name: "The disk: tap to take the byte" }).click();
    else await clock.click();
    if (t === 1) await expect(pic.locator("g[data-tick='0']")).toHaveAttribute("data-act", "poll");
  }
  await expect(piece).toContainText("Done! ★★★");
  await expect(pic.locator("[data-compare='polling']")).toHaveAttribute("data-work", "5");
  await expect(pic.locator("[data-compare='dma']")).toHaveAttribute("data-work", "16");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/io-polling.png` });
});

test("interrupts: stepping past the bell is caught, answering it saves and takes the byte", async ({ page }) => {
  const { piece, pic } = await open(page, 2);
  const clock = pic.getByRole("button", { name: "One tick: step the clock" });
  for (let t = 0; t < 4; t++) await clock.click();
  await clock.click();
  await expect(piece).toContainText("The bell is ringing");
  await pic.getByRole("button", { name: "The interrupt bell: tap to answer it" }).click();
  await expect(pic.locator("g[data-tick='4']")).toHaveAttribute("data-act", "save");
  for (let t = 5; t < 20; t++) {
    if (t === 9 || t === 14) await pic.getByRole("button", { name: "The interrupt bell: tap to answer it" }).click();
    else await clock.click();
  }
  await expect(piece).toContainText("Done! ★★");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/io-interrupts.png` });
});

test("keyboard: every 4 ticks loses a key, every 3 keeps them all", async ({ page }) => {
  const { piece, pic } = await open(page, 4);
  await pic.getByRole("button", { name: "Poll every 4 ticks" }).click();
  await expect(piece).toContainText("the key from tick 14 is lost");
  await pic.getByRole("button", { name: "Poll every 3 ticks" }).click();
  await expect(piece).toContainText("loses no key");
  await pic.getByRole("button", { name: "Check" }).click();
  await expect(piece).toContainText("Done! ★★★");
});
