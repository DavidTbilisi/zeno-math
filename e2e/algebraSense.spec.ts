// Algebra-sense games: a balance puzzle weighed right at the first go for three stars, and its practice question
// typed; a function machine fed 0 and 1 and answered right first time, and a practice rule whose named slip is told
// before the right answer; figure 4 of a growing pattern built square by square, and a practice figure counted; a
// board of equal expressions cleared with no misses, and the equal one picked in practice.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { BALANCE_LADDER, balanceTask } from "../src/math/balance.ts";
import { exprNow, same } from "../src/math/exprMatch.ts";
import { buildGrid, figure, GROW_LADDER, growTask } from "../src/math/growing.ts";
import { MACHINE_LADDER, machineAnswer, machineTask } from "../src/math/machine.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";
import { rng } from "../src/math/random.ts";
import { boardWith, practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("balance: the shape's weight set and weighed right first time earns three stars", async ({ page }) => {
  const game = await boardWith(page, "Balance the scales", ".live-balance");
  const t = balanceTask(BALANCE_LADDER[0].level, rng(BALANCE_LADDER[0].seed));
  const heavier = game.getByRole("button", { name: "■ heavier" });
  const shown = game.locator(".live-stepper b");
  await expect(async () => {
    await heavier.click();
    await expect(shown).toHaveText("2", { timeout: 1000 });
  }).toPass();
  for (let v = 2; v < t.values[0]; v++) await heavier.click();
  await expect(shown).toHaveText(String(t.values[0]));
  await game.getByRole("button", { name: /Weigh/ }).click();
  await expect(game.getByText(/Balanced! ★★★/)).toBeVisible();
  await expect(game.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
});

test("balance in practice: what one square weighs, typed", async ({ page, request }) => {
  const r = 0.27;
  const ex = exercise("balance", 2, seedOf(r), w);
  await practise(page, request, { tab: "Algebra", skill: "Balance puzzles", level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("guess my rule: 0 and 1 put in, the answer typed right first time earns three stars and shows the rule", async ({ page }) => {
  const game = await boardWith(page, "Guess my rule: the function machine", ".live-machine");
  const t = machineTask(MACHINE_LADDER[0].level, rng(MACHINE_LADDER[0].seed));
  const input = (n: number) => game.locator(".machine-inputs").getByRole("button", { name: String(n), exact: true });
  await expect(async () => {
    await input(0).click();
    await expect(input(0)).toHaveClass(/\bon\b/, { timeout: 1000 });
  }).toPass();
  await input(1).click();
  for (const digit of String(machineAnswer(t))) await game.locator(".keypad").getByRole("button", { name: digit, exact: true }).click();
  await expect(game.locator(".keypad-shown")).toHaveText(String(machineAnswer(t)));
  await game.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(new RegExp(`Right! The rule is n \\+ ${t.rule.add}\\. ★★★`))).toBeVisible();
  await expect(game.getByText("Putting 0 in shows what the machine adds!")).toBeVisible();
});

test("find the rule in practice: the doubled output is named, then the right answer", async ({ page, request }) => {
  const r = 0.41;
  const ex = exercise("findRule", 1, seedOf(r), w);
  const slip = trapInputs(ex).find((x) => x.id === "scaledOutput");
  await practise(page, request, { tab: "Algebra", skill: "Find the rule", level: "easy", r, prompt: ex.prompt });
  const box = page.getByLabel("Your answer");
  if (slip) {
    await box.fill(slip.input);
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByText(check(ex, slip.input, w).hint!)).toBeVisible();
  }
  await box.fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("growing patterns: figure 4 built square by square earns three stars", async ({ page }) => {
  const game = await boardWith(page, "Growing patterns: what comes next", ".live-growing");
  const t = growTask(GROW_LADDER[0].level, rng(GROW_LADDER[0].seed));
  const { cols, rows } = buildGrid(t.kind);
  // Each square one in from the grid's bottom-left corner.
  const cells = figure(t.kind, 4).map((c) => (rows - 2 - c.y) * cols + c.x + 1);
  const cell = (i: number) => game.locator(".grow-cell").nth(i);
  await expect(async () => {
    await cell(cells[0]).click();
    await expect(cell(cells[0])).toHaveAttribute("aria-pressed", "true", { timeout: 1000 });
  }).toPass();
  for (const i of cells.slice(1)) await cell(i).click();
  await game.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(/Right! ★★★/)).toBeVisible();
  await expect(game.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
});

test("growing patterns in practice: figure 10 counted", async ({ page, request }) => {
  const r = 0.62;
  const ex = exercise("growingPattern", 2, seedOf(r), w);
  await practise(page, request, { tab: "Algebra", skill: "Growing patterns", level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("equal expressions: a board paired with no misses earns three stars", async ({ page }) => {
  const game = await boardWith(page, "Equal expressions: match the cards", ".live-exprMatch");
  const cards = exprNow({ mode: "puzzle", stage: 0, level: 1, seed: 1 });
  const card = (i: number) => game.locator(".eq-card").nth(i);
  const done = new Set<number>();
  for (let i = 0; i < cards.length; i++) {
    if (done.has(i)) continue;
    const j = cards.findIndex((c, k) => k !== i && !done.has(k) && same(c, cards[i]));
    if (i === 0)
      await expect(async () => {
        await card(i).click();
        await expect(card(i)).toHaveAttribute("aria-pressed", "true", { timeout: 1000 });
      }).toPass();
    else await card(i).click();
    await card(j).click();
    done.add(i).add(j);
  }
  await expect(game.getByText(/Board cleared! ★★★/)).toBeVisible();
  await expect(game.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
});

test("equal expressions in practice: the equal one picked from the buttons", async ({ page, request }) => {
  const r = 0.55;
  const ex = exercise("sameExpression", 2, seedOf(r), w);
  if (ex.answer.k !== "pick") throw new Error();
  const best = ex.answer.options[ex.answer.right];
  await practise(page, request, { tab: "Algebra", skill: "Equal expressions", level: "medium", r, prompt: ex.prompt });
  await page.locator(".sign-picks").getByRole("button", { name: best.text, exact: true }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
