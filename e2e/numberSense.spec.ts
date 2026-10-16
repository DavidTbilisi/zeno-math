// Number-sense games: a round of the estimation game played for three stars (kept after a reload, the next round
// open), and a practice question answered by putting the pin on the line; a round of quick look answered right, and a
// practice question whose dots flash before the number is typed; a target made on the board by tapping cards and
// signs, and a practice sum typed with the card buttons. Pins are dropped where the line draws the
// number, wherever the piece or the dialog has been scaled to.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { ESTIMATE_LADDER, roundTasks, shareAlong, type PinPlay } from "../src/math/estimate.ts";
import { check, exercise } from "../src/math/practice.ts";
import { LOOK_LADDER, lookRound } from "../src/math/quickLook.ts";
import { TARGET_LADDER, targetPuzzle, tokens } from "../src/math/target.ts";
import { rng } from "../src/math/random.ts";

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
    // A pin right on its number is a bullseye (or the middle of the line found), said in place of "Right!".
    if (i === 0) await expect(game.getByText(/^(Bullseye! Right on the spot\.|Half way — you found the middle of the line\.)/)).toBeVisible();
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

/** A new board with one live piece from the Shapes panel, ready to use (clicked in its middle). */
async function boardWith(page: Page, name: string, piece: string): Promise<Locator> {
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

test("a round of quick look, every flash counted right, earns three stars", async ({ page }) => {
  const game = await boardWith(page, "Quick look: how many dots?", ".live-quickLook");
  const round = lookRound(LOOK_LADDER[0].level, LOOK_LADDER[0].seed);
  await game.getByRole("button", { name: "👀 Look!" }).click();
  for (const [i, t] of round.entries()) {
    // The dots hide, and the buttons to answer with come up.
    await game.getByRole("button", { name: String(t.n), exact: true }).click();
    if (i < round.length - 1) await game.getByRole("button", { name: "Next →" }).click();
  }
  await expect(game.getByText("Round done! ★★★")).toBeVisible();
  await expect(game.getByRole("button", { name: /^Round 2/ })).toBeEnabled();
});

test("a practice question whose dots flash: look, then type how many", async ({ page, request }) => {
  const r = 0.61;
  const ex = exercise("quickLook", 1, Math.floor(r * 2 ** 31), w);
  const made = await (await request.post("/api/boards", { data: { title: "Quick look" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.keyboard.press("Control+k");
  await page.keyboard.type("Practice");
  await page.keyboard.press("Enter");
  await page.getByRole("tab", { name: "Number" }).click();
  await page.evaluate((x) => (Math.random = () => x), r);
  await page.getByRole("radio", { name: "easy" }).click();
  await page.getByRole("button", { name: "Quick look: how many?", exact: true }).click();
  const box = page.locator(".flash-answer input");
  await expect(box).toBeDisabled();
  await page.getByRole("button", { name: "👀 Look" }).click();
  await expect(page.locator(".flash-box circle").first()).toBeVisible();
  // Hidden again after the flash.
  await expect(page.locator(".flash-box circle")).toHaveCount(0);
  await box.fill(ex.plain);
  await box.press("Enter");
  await expect(page.getByText("Correct!")).toBeVisible();
  await expect(page.locator(".flash-box circle")).toHaveCount(Number(ex.plain));
});

test("make the target: tapping the cards and signs of a sum that makes it", async ({ page }) => {
  const game = await boardWith(page, "Make the target: cards and signs", ".live-target");
  const p = targetPuzzle(TARGET_LADDER[0].level, rng(TARGET_LADDER[0].seed));
  await expect(game.getByRole("img", { name: `Make ${p.target}` })).toBeVisible();
  const sign: Record<string, string> = { "+": "+", "-": "−", "*": "×", "/": "÷" };
  for (const t of tokens(p.sample)!) {
    if (typeof t === "number") await game.locator(".target-cards button:not([disabled])", { hasText: new RegExp(`^${t}$`) }).first().click();
    else await game.locator(".target-ops").getByRole("button", { name: sign[t] ?? t, exact: true }).click();
  }
  await expect(game.getByText(/Made it! ★★☆ Can you find another way\?/)).toBeVisible();
  await expect(game.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
});

test("a practice sum typed with the card buttons", async ({ page, request }) => {
  const r = 0.29;
  const ex = exercise("makeTarget", 1, Math.floor(r * 2 ** 31), w);
  const made = await (await request.post("/api/boards", { data: { title: "Target" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.keyboard.press("Control+k");
  await page.keyboard.type("Practice");
  await page.keyboard.press("Enter");
  await page.getByRole("tab", { name: "Number" }).click();
  await page.evaluate((x) => (Math.random = () => x), r);
  await page.getByRole("radio", { name: "easy" }).click();
  await page.getByRole("button", { name: "Make the target", exact: true }).click();
  await expect(page.locator(".practice-prompt")).toHaveText(ex.prompt);
  const picks = page.locator(".target-picks");
  const sign: Record<string, string> = { "+": "+", "-": "−" };
  for (const t of tokens(ex.plain)!) await picks.getByRole("button", { name: typeof t === "number" ? String(t) : sign[t] ?? t, exact: true }).first().click();
  await expect(page.getByLabel("Your answer")).toHaveValue(ex.plain.replace(/-/g, "−"));
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
