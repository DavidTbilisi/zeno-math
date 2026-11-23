// The item panel: a new tool's picture goes on the board at once and changes in place, its controls beside it and no
// modal; Escape closes it, one undo takes back everything it did; anything else on the board still gets Excalidraw's own menu.
import { expect, test, type Page } from "@playwright/test";
import { insertGroup, insertPanel } from "./helpers.ts";

const SHOTS = process.env.SHOTS_DIR;

async function newBoard(page: Page) {
  await page.goto("/#/boards");
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

test("a formula goes on the board at once and changes in the panel beside it; one undo per panel", async ({ page }) => {
  await newBoard(page);
  await insertGroup(page, /Algebra/);
  await insertPanel(page).getByRole("button", { name: /Formula/ }).click();
  // No modal and no Insert: the first example is on the board already, its panel beside it.
  const panel = page.locator(".item-panel");
  await expect(panel.getByRole("heading", { name: "Formula" })).toBeVisible();
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(panel.getByRole("button", { name: "Insert" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Edit formula/ })).toBeVisible();
  await panel.getByRole("textbox").fill("x^2");
  // Closed straight after the last change, still typesetting: the change reaches the board all the same.
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  // The picture stays selected: its Edit button opens the panel again.
  const edit = page.getByRole("button", { name: /Edit formula/ });
  await edit.click();
  await expect(panel.getByRole("heading", { name: "Edit formula" })).toBeVisible();
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
  await edit.click();
  await expect(panel.getByRole("textbox")).toHaveValue("y^3 + 1");
  await page.keyboard.press("Escape");

  // One undo goes back to before the second panel.
  await page.locator(".undo-button-container button").click();
  await page.waitForTimeout(300);
  await edit.click();
  await expect(panel.getByRole("textbox")).toHaveValue("x^2");
});

test("a number theory picture follows its slider; a rectangle keeps Excalidraw's menu", async ({ page }) => {
  await newBoard(page);
  await insertGroup(page, /Discrete/);
  await insertPanel(page).getByRole("button", { name: /Number theory/ }).click();
  await expect(page.locator(".item-panel")).toBeVisible();
  await expect(page.getByRole("button", { name: /Edit number theory/ })).toBeVisible();
  await page.keyboard.press("Escape");
  // The new picture is one step: undo takes it away, redo puts it back.
  await page.locator(".undo-button-container button").click();
  await expect(page.getByRole("button", { name: /Edit number theory/ })).toHaveCount(0);
  await page.locator(".redo-button-container button").click();
  await page.waitForTimeout(300);

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

test("one click on a piece reaches its button; its right-click panel holds only actions", async ({ page }) => {
  await newBoard(page);
  await insertGroup(page, "Arithmetic");
  await insertPanel(page).getByRole("button", { name: /Number patterns as dots/ }).click();
  const piece = page.locator(".live-numberShapes");
  await expect(piece).toHaveCount(1);
  await page.waitForTimeout(600);
  const n = piece.getByRole("slider", { name: "Figure" });
  await expect(n).toHaveAttribute("aria-valuenow", "4");

  // The piece is not in use yet: one click on the top of its number (by where it is on screen) makes it one more.
  const box = (await n.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 4);
  await expect(n).toHaveAttribute("aria-valuenow", "5");
  // In use now: the next click goes straight to it.
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 4);
  await expect(n).toHaveAttribute("aria-valuenow", "6");

  // Its settings stay on the piece: the panel has no copy of them, only what to do with the piece.
  await page.keyboard.press("Escape");
  await rightClickPiece(page, piece);
  const panel = page.locator(".item-panel");
  await expect(panel.getByRole("heading", { name: "Number patterns as dots" })).toBeVisible();
  await expect(page.locator(".context-menu")).toHaveCount(0);
  await expect(panel.getByRole("combobox")).toHaveCount(0);
  await expect(panel.getByRole("button")).toHaveText(["×", /Reset/, /Copy as a picture/, "Duplicate", "Delete"]);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/panel-piece.png` });

  await panel.getByRole("button", { name: /Reset/ }).click();
  await expect(n).toHaveAttribute("aria-valuenow", "4");
  await panel.getByRole("button", { name: "Duplicate" }).click();
  await expect(page.locator(".live-numberShapes")).toHaveCount(2);
  await panel.getByRole("button", { name: "Delete" }).click();
  await expect(panel).toHaveCount(0);
  await expect(page.locator(".live-numberShapes")).toHaveCount(1);
});
