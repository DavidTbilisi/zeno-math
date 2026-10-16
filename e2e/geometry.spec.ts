// Shapes made by tapping dots: a puzzle of the geoboard on the board done for three stars (kept after a reload, and
// the next puzzle open), and a practice question answered with a shape, its known mistake named and its right shape
// accepted. Dots are tapped where the grid draws them, wherever the piece or the dialog has been scaled to.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { decodePoly, ladderTask, type GeoPt } from "../src/math/geoPlay.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";

const w = en.pracWords;
const PAD = 28;

/** Taps each dot of the grid drawn in `svg` (squares of `cell` pixels at its own size, 10 across). */
async function tapDots(page: Page, svg: Locator, pts: GeoPt[], cell: number) {
  await svg.scrollIntoViewIfNeeded();
  const box = (await svg.boundingBox())!;
  const k = box.width / (2 * PAD + 10 * cell);
  for (const [x, y] of pts) await page.mouse.click(box.x + (PAD + x * cell) * k, box.y + (PAD + y * cell) * k);
}

test("a geoboard puzzle done first time earns three stars and opens the next one, after a reload too", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /New board/ }).first().click();
  await page.waitForURL(/#\/b\/[0-9a-f-]+$/);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: "Shapes" }).click();
  await page.getByRole("button", { name: "Geoboard: shapes and area", exact: true }).click();

  const board = page.locator(".live-geoboard");
  await board.waitFor();
  const box = (await board.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await board.getByRole("button", { name: /^Puzzle 1/ }).click();
  await expect(board.getByText(/Make a rectangle with an area of \d+ squares/)).toBeVisible();
  await expect(board.getByRole("button", { name: /^Puzzle 2/ })).toHaveCount(0);

  await tapDots(page, board.locator("svg.geo-grid"), ladderTask(0).sample, 44);
  await board.getByRole("button", { name: "Check" }).click();
  await expect(board.getByText("Done! ★★★")).toBeVisible();
  await expect(board.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();

  await page.reload();
  await page.locator(".live-geoboard").waitFor();
  await expect(page.locator(".live-geoboard").getByRole("button", { name: "Puzzle 1: 3 ★" })).toBeVisible();
  await expect(page.locator(".live-geoboard").getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
  expect(errors).toEqual([]);
});

test("a practice question answered with a shape: the known mistake is named, the right shape accepted", async ({ page, request }) => {
  // A rectangle question whose area makes a rectangle with that perimeter possible.
  const seedOf = (r: number) => Math.floor(r * 2 ** 31);
  let r = 0;
  for (let i = 1; i < 500 && !r; i++) if (trapInputs(exercise("shapeArea", 1, seedOf(i / 501), w)).length) r = i / 501;
  const ex = exercise("shapeArea", 1, seedOf(r), w);
  const trap = trapInputs(ex)[0];
  expect(check(ex, trap.input, w).mistake).toBe("areaPerimeter");

  const made = await (await request.post("/api/boards", { data: { title: "Shapes" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.keyboard.press("Control+k");
  await page.keyboard.type("Practice");
  await page.keyboard.press("Enter");
  await page.getByRole("tab", { name: "Geometry" }).click();
  await page.evaluate((x) => (Math.random = () => x), r);
  await page.getByRole("radio", { name: "easy" }).click();
  await page.getByRole("button", { name: "Area on a grid", exact: true }).click();
  await expect(page.locator(".practice-prompt")).toHaveText(ex.prompt);

  const grid = page.locator(".geo-answer svg");
  // The trap's rectangle starts at the grid's corner, away from the right one.
  await tapDots(page, grid, decodePoly(trap.input)!, 36);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.locator(".practice-verdict.bad")).toContainText("Not quite — try again.");
  await expect(page.locator(".practice-hint")).toHaveText(check(ex, trap.input, w).hint!);

  // Tapping a corner takes it off: clear the shape, then make the right one.
  await tapDots(page, grid, decodePoly(trap.input)!, 36);
  await tapDots(page, grid, decodePoly(ex.plain)!, 36);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
