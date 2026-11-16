// The right-click panel: a tool's picture changes in place, its controls beside it and no modal; Escape closes it,
// one undo takes back everything it did; anything else on the board still gets Excalidraw's own menu.
import { expect, test, type Page } from "@playwright/test";

const SHOTS = process.env.SHOTS_DIR;

async function newBoard(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /New board/ }).first().click();
  await page.waitForURL(/#\/b\/[0-9a-f-]+$/);
  await page.locator(".excalidraw").waitFor();
}

/** Right-clicks a live piece by where it is on screen (until it is in use, the board takes its pointer events). */
async function rightClickPiece(page: Page, piece: ReturnType<Page["locator"]>) {
  const box = (await piece.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "right" });
}

/** Right-clicks the middle of the board, where a picture just put on it sits. */
async function rightClickMiddle(page: Page) {
  const box = (await page.locator(".canvas-wrap").boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "right" });
}

test("a formula changes in the panel beside it, and one undo takes it back", async ({ page }) => {
  await newBoard(page);
  await page.getByRole("button", { name: /Algebra/ }).click();
  await page.getByRole("menuitem", { name: /Formula/ }).click();
  const modal = page.getByRole("dialog");
  await modal.getByRole("textbox").fill("x^2");
  await modal.getByRole("button", { name: "Insert" }).click();
  await expect(modal).toHaveCount(0);
  await page.waitForTimeout(600); // the board scrolls to the new picture

  await rightClickMiddle(page);
  const panel = page.locator(".item-panel");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("heading", { name: "Edit formula" })).toBeVisible();
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page.locator(".context-menu")).toHaveCount(0);
  const source = panel.getByRole("textbox");
  await expect(source).toHaveValue("x^2");
  // Typed a key at a time, with pauses: several changes reach the board, and still one undo takes them all back.
  await source.fill("");
  for (const part of ["y", "^3", " + 1"]) {
    await source.pressSequentially(part);
    await page.waitForTimeout(300);
  }
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/panel-formula.png` });
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);

  // The picture holds the new formula: the full editor opens with it.
  await page.getByRole("button", { name: /Edit formula/ }).click();
  await expect(page.getByRole("dialog").getByRole("textbox")).toHaveValue("y^3 + 1");
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();

  // One undo goes back to before the panel.
  await page.locator(".undo-button-container button").click();
  await rightClickMiddle(page);
  await expect(panel.getByRole("textbox")).toHaveValue("x^2");
});

test("a number theory picture follows its slider; a rectangle keeps Excalidraw's menu", async ({ page }) => {
  await newBoard(page);
  await page.getByRole("button", { name: /Discrete/ }).click();
  await page.getByRole("menuitem", { name: /Number theory/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Insert" }).click();
  await page.waitForTimeout(600);

  await rightClickMiddle(page);
  const panel = page.locator(".item-panel");
  await expect(panel).toBeVisible();
  const slider = panel.getByRole("slider").first();
  await expect(slider).toBeVisible();
  await slider.focus();
  await page.keyboard.press("End");
  await page.waitForTimeout(400);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/panel-nt.png` });
  const moved = await slider.inputValue();
  // Clicking the empty board closes it; opening again shows the slider where it was left.
  const wrap = (await page.locator(".canvas-wrap").boundingBox())!;
  await page.mouse.click(wrap.x + 30, wrap.y + wrap.height - 60);
  await expect(panel).toHaveCount(0);
  await rightClickMiddle(page);
  await expect(panel.getByRole("slider").first()).toHaveValue(moved);
  await page.keyboard.press("Escape");

  // A plain rectangle, away from the picture: Excalidraw's own menu.
  await page.keyboard.press("r");
  const [rx, ry] = [wrap.x + wrap.width / 2 - 50, wrap.y + wrap.height - 70];
  await page.mouse.move(rx, ry);
  await page.mouse.down();
  await page.mouse.move(rx + 100, ry + 40, { steps: 4 });
  await page.mouse.up();
  await page.mouse.click(rx + 50, ry + 20, { button: "right" });
  await expect(page.locator(".context-menu")).toBeVisible();
  await expect(panel).toHaveCount(0);
});

test("a live piece's settings in the panel: the dots piece changes from there, duplicates and goes", async ({ page }) => {
  await newBoard(page);
  await page.getByRole("button", { name: "Games" }).click();
  await page.getByRole("menuitem", { name: /Number patterns as dots/ }).click();
  const piece = page.locator(".live-numberShapes");
  await expect(piece).toHaveCount(1);
  await page.waitForTimeout(600);

  await rightClickPiece(page, piece);
  const panel = page.locator(".item-panel");
  await expect(panel.getByRole("heading", { name: "Number patterns as dots" })).toBeVisible();
  await expect(page.locator(".context-menu")).toHaveCount(0);
  // Its settings bar, in the panel: picking a pattern there redraws the piece.
  await panel.getByRole("combobox").selectOption("triangle");
  await expect(piece).toContainText("Triangle numbers");
  await panel.getByRole("button", { name: "Why?" }).click();
  await expect(piece).toContainText("Two copies make 4 rows of 5");
  await expect(panel.getByRole("button", { name: /Reset/ })).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/panel-piece.png` });
  // The piece took the right-click as its way in: its own button answers the first click.
  await piece.getByRole("button", { name: "One more" }).first().click();
  await expect(piece).toContainText("Rows of 1, 2, … up to 5: 15 dots");

  await panel.getByRole("button", { name: "Duplicate" }).click();
  await expect(page.locator(".live-numberShapes")).toHaveCount(2);
  await expect(page.locator(".live-numberShapes").nth(1)).toContainText("Triangle numbers");
  await panel.getByRole("button", { name: "Delete" }).click();
  await expect(panel).toHaveCount(0);
  await expect(page.locator(".live-numberShapes")).toHaveCount(1);
});

test("a game's puzzles in the panel", async ({ page }) => {
  await newBoard(page);
  await page.getByRole("button", { name: "Games" }).click();
  await page.getByRole("menuitem", { name: /Divisible by/ }).click();
  const piece = page.locator(".live-divisible");
  await expect(piece).toHaveCount(1);
  await page.waitForTimeout(600);
  await rightClickPiece(page, piece);
  const panel = page.locator(".item-panel");
  await expect(panel.locator(".geo-ladder")).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/panel-game.png` });
});
