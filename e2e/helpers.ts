// What the game tests share: a new board with one live piece on it, ready to use, and practice opened on a skill
// with Math.random fixed so the question is the one the test works out.
import { expect, type Locator, type Page, type APIRequestContext } from "@playwright/test";

/** A new board with one live piece from the Shapes panel, clicked in its middle so it answers clicks. */
export async function boardWith(page: Page, name: string, piece: string): Promise<Locator> {
  await page.goto("/");
  await page.getByRole("button", { name: /New board/ }).first().click();
  await page.waitForURL(/#\/b\/[0-9a-f-]+$/);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: "Shapes" }).click();
  await page.getByRole("button", { name, exact: true }).click();
  const game = page.locator(piece);
  await game.waitFor();
  const box = (await game.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  return game;
}

/** Practice on a board, on one skill and level, with Math.random fixed at `r` (the question's seed is r × 2³¹). */
export async function practise(page: Page, request: APIRequestContext, o: { tab: string; skill: string; level: "easy" | "medium" | "hard"; r: number; prompt: string }) {
  const made = await (await request.post("/api/boards", { data: { title: o.skill } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.keyboard.press("Control+k");
  await page.keyboard.type("Practice");
  await page.keyboard.press("Enter");
  await page.getByRole("tab", { name: o.tab }).click();
  await page.evaluate((x) => (Math.random = () => x), o.r);
  await page.getByRole("radio", { name: o.level }).click();
  await page.getByRole("button", { name: o.skill, exact: true }).click();
  await expect(page.locator(".practice-prompt")).toHaveText(o.prompt);
}

export const seedOf = (r: number) => Math.floor(r * 2 ** 31);
