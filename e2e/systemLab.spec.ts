// Build a system (#853) by hand: a computer that starts up, its parts put in from the tray; then the office computer
// turned into a game console: a plug that won't fit, the hard disk pulled out, the card in, the display moved onto it.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;
const NAME = "Build a system: plug devices into a board";

async function dragTo(page: Page, from: Locator, to: Locator) {
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
  await page.mouse.up();
}
const press = async (l: Locator) => {
  await l.focus();
  await l.press("Enter");
};

test("build a system: a computer that starts up, from the tray, then powered", async ({ page }) => {
  const piece = await boardWith(page, NAME, ".live-systemLab");
  const pic = piece.locator("svg.hand-pic");
  await expect(piece).toContainText("A computer that starts up");
  await press(pic.getByRole("button", { name: "Power: run the system" }));
  await expect(piece).toContainText("The signal stops: no CPU plugged in.");

  for (const dev of ["CPU", "memory", "SSD"]) await press(pic.getByRole("button", { name: `Put in the ${dev}` }));
  // The display by hand: dragged from the tray onto the board's display port.
  await dragTo(page, pic.locator("g[data-tray='display'] rect"), pic.locator("g[data-slot='video'] circle").last());
  await expect(pic.locator("g[data-slot='video']")).toHaveAttribute("data-dev", "display");
  await press(pic.getByRole("button", { name: "Power: run the system" }));
  await expect(piece).toContainText("It runs!");
  await expect(pic.locator("[data-run]")).toHaveAttribute("data-run", "ok");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/system-boot.png` });
});

test("build a system: the office computer becomes a game console", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("zeno.systemlab.v1", JSON.stringify({ stars: [3, 3, 3, 3, 0, 0, 0, 0] })));
  const piece = await boardWith(page, NAME, ".live-systemLab");
  await press(piece.getByRole("button", { name: /^Puzzle 5/ }));
  await expect(piece).toContainText("A game console");
  const pic = piece.locator("svg.hand-pic");

  // A game pad's USB plug won't go into the green sound jack.
  await dragTo(page, pic.locator("g[data-tray='gamepad'] rect"), pic.locator("g[data-slot='audioOut'] circle").last());
  await expect(piece).toContainText("won't go into a sound out");
  await dragTo(page, pic.locator("g[data-tray='gamepad'] rect"), pic.locator("g[data-slot='usb1'] circle").last());
  await expect(pic.locator("g[data-slot='usb1']")).toHaveAttribute("data-dev", "gamepad");

  // The hard disk out (a tap), the SSD, the card and the speakers in.
  await press(pic.getByRole("button", { name: /^Pull out the hard disk/ }));
  for (const dev of ["SSD", "graphics card", "speakers"]) await press(pic.getByRole("button", { name: `Put in the ${dev}` }));
  await press(pic.getByRole("button", { name: "Power: run the system" }));
  await expect(piece).toContainText("it has to be in the graphics card's display port");

  // The display moved from the board's port onto the card's.
  await dragTo(page, pic.locator("g[data-device='display'] circle"), pic.locator("g[data-slot='gpuVideo'] circle").last());
  await expect(pic.locator("g[data-slot='gpuVideo']")).toHaveAttribute("data-dev", "display");
  await press(pic.getByRole("button", { name: "Power: run the system" }));
  await expect(piece).toContainText("It runs! The signal got through every link.");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/system-console.png` });
});
