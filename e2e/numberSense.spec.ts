// Number-sense games: a round of the estimation game played for three stars (kept after a reload, the next round
// open), and a practice question answered by putting the pin on the line; a round of quick look answered right, and a
// practice question whose dots flash before the number is typed; a target made on the board by tapping cards and
// signs, and a practice sum typed with the card buttons; a round of "closer to?" all right, and a practice benchmark
// picked from its buttons; a "divisible by?" puzzle tapped right first time, and a practice list of divisors tapped
// from its buttons; a prime slice wave played without a slip; Kakooma's first two puzzles and its first grid, and a practice Kakooma picked from its buttons. Pins are dropped where the line draws the
// number, wherever the piece or the dialog has been scaled to.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { ESTIMATE_LADDER, roundTasks, shareAlong, type PinPlay } from "../src/math/estimate.ts";
import { check, exercise } from "../src/math/practice.ts";
import { LOOK_LADDER, lookRound } from "../src/math/quickLook.ts";
import { TARGET_LADDER, targetPuzzle, tokens } from "../src/math/target.ts";
import { DIV_LADDER, divTask } from "../src/math/divisible.ts";
import { isPrime } from "../src/math/numtheory.ts";
import { cutsIn, sliceNow } from "../src/math/primeSlice.ts";
import { rng } from "../src/math/random.ts";
import { NEAR_LADDER, nearRound } from "../src/math/benchmark.ts";
import { KAK_LADDER, kakTask } from "../src/math/kakooma.ts";
import { practise, seedOf } from "./helpers.ts";

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
    // The first click may still be waking the piece up on a slow machine: drop again until the number shows.
    await expect(async () => {
      await dropPin(page, game.locator("svg").first(), t.play, t.v, [50, 650, 700, 130]);
      await expect(game.getByRole("button", { name: /^Next/ })).toBeEnabled({ timeout: 1000 });
    }).toPass();
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
  // The level's way of thinking stays in view next to the hint's first step.
  await expect(game.getByText(`Think of ${p.target} as two parts`)).toBeVisible();
  await game.getByRole("button", { name: /Hint/ }).click();
  await expect(game.getByText(new RegExp(`Think of ${p.target} as two parts.*Try starting with`))).toBeVisible();
  const sign: Record<string, string> = { "+": "+", "-": "−", "*": "×", "/": "÷" };
  for (const t of tokens(p.sample)!) {
    if (typeof t === "number") await game.locator(".target-cards button:not([disabled])", { hasText: new RegExp(`^${t}$`) }).first().click();
    else await game.locator(".target-ops").getByRole("button", { name: sign[t] ?? t, exact: true }).click();
  }
  await expect(game.getByText(/Made it! ★☆☆ Can you find another way\?/)).toBeVisible();
  // A hint leaves one star, and only two pass a puzzle: the next stays locked (the drill ladder's accuracy first).
  await expect(game.getByRole("button", { name: /^Puzzle 2/ })).toHaveCount(0);
  await expect(game.getByRole("button", { name: "Get two stars on the puzzle before to open this one" }).first()).toBeDisabled();
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

test("closer to?: a round of eight picked right earns three stars", async ({ page }) => {
  const game = await boardWith(page, "Closer to? Benchmarks against the clock", ".live-closerTo");
  const round = nearRound(NEAR_LADDER[0].level, NEAR_LADDER[0].seed);
  for (const [i, t] of round.entries()) {
    await expect(game.getByRole("img", { name: `Which is ${t.text} closest to?` })).toBeVisible();
    await game.locator(".near-options").getByRole("button", { name: t.options[t.right].text, exact: true }).click();
    if (i < round.length - 1) await game.getByRole("button", { name: "Next →" }).click();
  }
  await expect(game.getByText(/Round done! ★★★|A perfect round/)).toBeVisible();
  await expect(game.getByRole("button", { name: /^Round 2/ })).toBeEnabled();
});

test("a practice benchmark picked from its buttons", async ({ page, request }) => {
  const r = 0.44;
  const ex = exercise("closerTo", 2, Math.floor(r * 2 ** 31), w);
  if (ex.answer.k !== "near") throw new Error("not a benchmark question");
  const best = ex.answer.options[ex.answer.right];
  const made = await (await request.post("/api/boards", { data: { title: "Closer" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.keyboard.press("Control+k");
  await page.keyboard.type("Practice");
  await page.keyboard.press("Enter");
  await page.getByRole("tab", { name: "Number" }).click();
  await page.evaluate((x) => (Math.random = () => x), r);
  await page.getByRole("radio", { name: "medium" }).click();
  await page.getByRole("button", { name: "Closer to?", exact: true }).click();
  await expect(page.locator(".practice-prompt")).toHaveText(ex.prompt);
  await page.locator(".sign-picks").getByRole("button", { name: best.text, exact: true }).click();
  await expect(page.getByLabel("Your answer")).toHaveValue(best.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("divisible by?: every divisor tapped and checked earns three stars and opens the next", async ({ page }) => {
  const game = await boardWith(page, "Divisible by? Tap every divisor", ".live-divisible");
  const t = divTask(DIV_LADDER[0].level, rng(DIV_LADDER[0].seed));
  await expect(game.getByRole("img", { name: `Which of these divide ${t.n}?` })).toBeVisible();
  for (const d of t.right) await game.locator(".div-options").getByRole("button", { name: String(d), exact: true }).click();
  await game.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(`Right! ${t.n} is divisible by ${t.right.join(", ")}. ★★★`)).toBeVisible();
  await expect(game.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
});

test("prime slice: every number that isn't prime tapped as it flies, and no prime, earns three stars and opens the next", async ({ page }) => {
  const game = await boardWith(page, "Prime slice: cut the numbers that aren't prime", ".live-primeSlice");
  await game.getByRole("button", { name: /Start/ }).click();
  // Tap each number that isn't prime once it is well inside the stage, as the player would.
  await page.waitForFunction(() => {
    const g = document.querySelector(".live-primeSlice")!;
    if (/Wave over/.test(g.textContent ?? "")) return true;
    const svg = g.querySelector("svg")!;
    const box = svg.getBoundingClientRect();
    const prime = (n: number) => n > 1 && Array.from({ length: Math.max(0, Math.floor(Math.sqrt(n)) - 1) }, (_, i) => i + 2).every((d) => n % d !== 0);
    for (const e of g.querySelectorAll<SVGGElement>("g[data-live]")) {
      const r = e.querySelector("circle")!.getBoundingClientRect();
      const [x, y] = [r.x + r.width / 2, r.y + r.height / 2];
      if (prime(Number(e.dataset.n)) || y > box.bottom - r.height) continue;
      const o = { bubbles: true, clientX: x, clientY: y, pointerId: 1, button: 0 };
      svg.dispatchEvent(new PointerEvent("pointerdown", o));
      svg.dispatchEvent(new PointerEvent("pointerup", o));
    }
    return false;
  }, null, { polling: 30, timeout: 30_000 });
  const { throws } = sliceNow({ mode: "puzzle", stage: 0, level: 1, seed: 1 });
  const spared = throws.filter((t) => isPrime(t.n)).length;
  await expect(game.getByText(`Wave over: ${cutsIn(throws)} cut, ${spared} primes let fall, 0 slips. ★★★`)).toBeVisible();
  await expect(game.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
});

test("a practice list of divisors tapped from its buttons, in any order", async ({ page, request }) => {
  const r = 0.57;
  const ex = exercise("divisibility", 3, Math.floor(r * 2 ** 31), w);
  const a = ex.answer;
  if (a.k !== "divisors") throw new Error("not a divisors question");
  const made = await (await request.post("/api/boards", { data: { title: "Divisible" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.keyboard.press("Control+k");
  await page.keyboard.type("Practice");
  await page.keyboard.press("Enter");
  await page.getByRole("tab", { name: "Number" }).click();
  await page.evaluate((x) => (Math.random = () => x), r);
  await page.getByRole("radio", { name: "hard" }).click();
  await page.getByRole("button", { name: "Divisible by?", exact: true }).click();
  await expect(page.locator(".practice-prompt")).toHaveText(ex.prompt);
  const picks = page.locator(".sign-picks");
  // A divisor that doesn't divide it, tapped and tapped off again; the right ones in reverse.
  const off = a.offered.find((d) => !a.right.includes(d))!;
  await picks.getByRole("button", { name: String(off), exact: true }).click();
  for (const d of [...a.right].reverse()) await picks.getByRole("button", { name: String(d), exact: true }).click();
  await picks.getByRole("button", { name: String(off), exact: true }).click();
  await expect(page.getByLabel("Your answer")).toHaveValue(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("hundred square: jumps from a start traced as arrows, and the sum they make", async ({ page }) => {
  const game = await boardWith(page, "Hundred square to colour", ".live-hundred");
  await game.getByRole("button", { name: /Jumps/ }).click();
  await game.locator("svg text", { hasText: /^100$/ }).click();
  // 100 − 36: three tens back, then six ones.
  for (const step of ["−10", "−10", "−10", "−1", "−1", "−1", "−1", "−1", "−1"]) await game.getByRole("button", { name: step, exact: true }).click();
  await expect(game.getByText("100 − 36 = 64")).toBeVisible();
  await expect(game.locator("svg path[marker-end]")).toHaveCount(9);
  // A tap on the square next to where the walk is jumps there; ⌫ takes it back.
  await game.locator("svg text", { hasText: /^65$/ }).click();
  await expect(game.getByText("100 − 35 = 65")).toBeVisible();
  await game.getByRole("button", { name: "Take the last jump back" }).click();
  await expect(game.getByText("100 − 36 = 64")).toBeVisible();
  await game.getByRole("button", { name: /Replay/ }).click();
  await expect(game.locator("svg path[marker-end]")).toHaveCount(9, { timeout: 10_000 });
});

test("kakooma: a set tapped right, one after a slip, and a grid solved corner by corner, then its middle", async ({ page }) => {
  const game = await boardWith(page, "Kakooma: find the sum of two others", ".live-kakooma");
  const tasks = KAK_LADDER.slice(0, 3).map((p) => kakTask(p.level, p.grid, p.seed));
  const tapIn = (nums: (number | string)[], n: number) => game.getByRole("group", { name: `Numbers ${nums.join(", ")}`, exact: true }).getByRole("button", { name: String(n), exact: true }).click();
  // 7 = 2 + 5, first time.
  const [one] = tasks[0].sets;
  await tapIn(one.nums, one.answer);
  await expect(game.getByText("Right! 7 = 2 + 5. ★★★")).toBeVisible();
  await game.getByRole("button", { name: "Next →" }).click();
  // 9 = 4 + 5 beside 8: 8 tapped first would need the 4 twice.
  const [two] = tasks[1].sets;
  await tapIn(two.nums, 8);
  await expect(game.getByText("4 + 4 = 8, but there is only one 4: a number can't be used twice.")).toBeVisible();
  await tapIn(two.nums, two.answer);
  await expect(game.getByText("Right! 9 = 4 + 5. ★★☆")).toBeVisible();
  await game.getByRole("button", { name: "Next →" }).click();
  // The grid: each corner, its answer filling the middle, then the middle.
  const sets = tasks[2].sets;
  for (const [i, s] of sets.slice(0, 4).entries()) {
    await tapIn(s.nums, s.answer);
    if (i < 3) await expect(game.getByText(/into the middle it goes\./)).toBeVisible();
  }
  await expect(game.getByText(/The middle is full: now solve it\./)).toBeVisible();
  await tapIn(sets[4].nums, sets[4].answer);
  await expect(game.getByText(/A whole grid with no misses! Right! .* ★★★/)).toBeVisible();
  await expect(game.getByRole("button", { name: /^Puzzle 4/ })).toBeEnabled();
});

test("a practice kakooma picked from its buttons", async ({ page, request }) => {
  const r = 0.61;
  const ex = exercise("kakooma", 3, seedOf(r), w);
  await practise(page, request, { tab: "Number", skill: "Kakooma", level: "hard", r, prompt: ex.prompt });
  await page.locator(".sign-picks").getByRole("button", { name: ex.plain, exact: true }).click();
  await expect(page.getByLabel("Your answer")).toHaveValue(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
