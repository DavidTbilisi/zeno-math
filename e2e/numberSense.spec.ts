// Number-sense games: a round of the estimation game played for three stars (kept after a reload, the next round
// open), and a practice question answered by putting the pin on the line. Pins are dropped where the line draws the
// number, wherever the piece or the dialog has been scaled to.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { ESTIMATE_LADDER, roundTasks, shareAlong, type PinPlay } from "../src/math/estimate.ts";
import { check, exercise } from "../src/math/practice.ts";

const w = en.pracWords;

/** Clicks the line drawn in `svg` (from x0 to x1 at its own width w) where `v` is. */
async function dropPin(page: Page, svg: Locator, play: PinPlay, v: number, [x0, x1, width, y]: [number, number, number, number]) {
  await svg.scrollIntoViewIfNeeded();
  const box = (await svg.boundingBox())!;
  const k = box.width / width;
  await page.mouse.click(box.x + (x0 + shareAlong(play, v) * (x1 - x0)) * k, box.y + y * k);
}

test("a round of the estimation game with every pin on its number earns three stars and opens the next", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /New board/ }).first().click();
  await page.waitForURL(/#\/b\/[0-9a-f-]+$/);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: "Shapes" }).click();
  await page.getByRole("button", { name: "Number line estimation game", exact: true }).click();

  const game = page.locator(".live-estimate");
  await game.waitFor();
  const box = (await game.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(game.getByRole("button", { name: /^Round 2/ })).toHaveCount(0);

  const round = roundTasks(ESTIMATE_LADDER[0].level, ESTIMATE_LADDER[0].seed);
  for (const [i, t] of round.entries()) {
    await expect(game.getByRole("img", { name: `Where does ${t.text} go?` })).toBeVisible();
    await dropPin(page, game.locator("svg").first(), t.play, t.v, [50, 650, 700, 130]);
    // Right, or (a pin right on its number) a bullseye or the middle of the line, said in place of "Right!".
    if (i === 0) await expect(game.getByText(/^(Right! Off by only|Bullseye! Right on the spot\.|Half way — you found the middle of the line\.)/)).toBeVisible();
    if (i < round.length - 1) await game.getByRole("button", { name: "Next →" }).click();
  }
  await expect(game.getByText("Round done! ★★★")).toBeVisible();
  await expect(game.getByRole("button", { name: /^Round 2/ })).toBeEnabled();

  await page.reload();
  await expect(page.locator(".live-estimate").getByRole("button", { name: "Round 1: 3 ★" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("a practice question answered by putting the pin on the line", async ({ page, request }) => {
  const r = 0.37;
  const ex = exercise("estimateLine", 1, Math.floor(r * 2 ** 31), w);
  if (ex.answer.k !== "pin") throw new Error("not a pin question");
  const { play, v } = ex.answer;

  const made = await (await request.post("/api/boards", { data: { title: "Estimation" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.keyboard.press("Control+k");
  await page.keyboard.type("Practice");
  await page.keyboard.press("Enter");
  await page.getByRole("tab", { name: "Number" }).click();
  await page.evaluate((x) => (Math.random = () => x), r);
  await page.getByRole("radio", { name: "easy" }).click();
  await page.getByRole("button", { name: "Number line estimation", exact: true }).click();
  await expect(page.locator(".practice-prompt")).toHaveText(ex.prompt);

  const line = page.locator("svg.pin-line");
  // The far end first: a miss that says which way to go.
  const far = v - play.from > (play.to - play.from) / 2 ? play.from : play.to;
  await dropPin(page, line, play, far, [36, 444, 480, 54]);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.locator(".practice-hint")).toHaveText(far < v ? w.reasons.pin.left : w.reasons.pin.right);
  expect(check(ex, `pin:${far}`, w).ok).toBe(false);

  await dropPin(page, line, play, v, [36, 444, 480, 54]);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
