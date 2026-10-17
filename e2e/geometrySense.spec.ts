// Geometry-sense games: a round of angles guessed spot on for three stars, and the nearest size picked in practice; a
// missing angle answered right first time, and a practice angle whose wrong total is told before the right answer;
// the mirror lines of a shape tapped and checked, and the lines counted in practice; the nets on a board sorted with
// no misses, and a look-alike named in practice before the net is typed.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { GUESS_LADDER, guessRound } from "../src/math/angleGuess.ts";
import { isNet, NET_LADDER, netBoard } from "../src/math/cubeNets.ts";
import { HUNT_LADDER, huntTask } from "../src/math/missingAngle.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";
import { rng } from "../src/math/random.ts";
import { mirrorsOf, symNow } from "../src/math/symmetry.ts";
import { boardWith, practise, seedOf } from "./helpers.ts";

const w = en.pracWords;
const TAB = "Geometry & trigonometry";

test("guess the angle: a round guessed spot on earns three stars", async ({ page }) => {
  const game = await boardWith(page, "Guess the angle", ".live-angleGuess");
  const round = guessRound(GUESS_LADDER[0].level, GUESS_LADDER[0].seed);
  const key = (k: string) => game.locator(".keypad").getByRole("button", { name: k, exact: true });
  for (const [i, t] of round.entries()) {
    const digits = String(t.size);
    if (i === 0)
      await expect(async () => {
        await key(digits[0]).click();
        await expect(game.locator(".keypad-shown")).toHaveText(digits[0], { timeout: 1000 });
      }).toPass();
    else await key(digits[0]).click();
    for (const k of digits.slice(1)) await key(k).click();
    await game.getByRole("button", { name: "Check" }).click();
    if (i === 0) await expect(game.getByText("Spot on: exactly the right number of degrees!")).toBeVisible();
    if (i < round.length - 1) await game.getByRole("button", { name: /Next/ }).click();
  }
  await expect(game.getByText(/Round done! ★★★/)).toBeVisible();
  await expect(game.getByRole("button", { name: /^Round 2/ })).toBeEnabled();
});

test("estimating angles in practice: the nearest size picked from the buttons", async ({ page, request }) => {
  const r = 0.33;
  const ex = exercise("estimateAngle", 2, seedOf(r), w);
  if (ex.answer.k !== "near") throw new Error();
  await practise(page, request, { tab: TAB, skill: "Estimating angles", level: "medium", r, prompt: ex.prompt });
  await page.locator(".sign-picks").getByRole("button", { name: ex.answer.options[ex.answer.right].text, exact: true }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("missing angles: the angle typed right first time earns three stars", async ({ page }) => {
  const game = await boardWith(page, "Missing angles", ".live-angleHunt");
  const t = huntTask(HUNT_LADDER[0].level, rng(HUNT_LADDER[0].seed));
  const key = (k: string) => game.locator(".keypad").getByRole("button", { name: k, exact: true });
  const digits = String(t.v);
  await expect(async () => {
    await key(digits[0]).click();
    await expect(game.locator(".keypad-shown")).toHaveText(digits[0], { timeout: 1000 });
  }).toPass();
  for (const k of digits.slice(1)) await key(k).click();
  await game.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(new RegExp(`Right! ${t.v}°\\. ★★★`))).toBeVisible();
  await expect(game.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
});

test("missing angles in practice: the wrong total is named, then the right answer", async ({ page, request }) => {
  const r = 0.12;
  const ex = exercise("missingAngle", 1, seedOf(r), w);
  const slip = trapInputs(ex).find((x) => x.id === "wrongTotal");
  await practise(page, request, { tab: TAB, skill: "Missing angles", level: "easy", r, prompt: ex.prompt });
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

test("lines of symmetry: every mirror line chosen, checked once, earns three stars", async ({ page }) => {
  const game = await boardWith(page, "Lines of symmetry: fold the shape", ".live-mirror");
  const { task, lines } = symNow({ mode: "puzzle", stage: 0, level: 1, seed: 0 });
  const mirrors = mirrorsOf(task);
  const line = (k: number) => game.getByRole("button", { name: `Line ${k + 1}`, exact: true });
  const picks = lines.flatMap((d, k) => (mirrors.includes(d) ? [k] : []));
  // The lines cross in the middle, so each is chosen by its own click, not by where the pointer lands.
  await expect(async () => {
    await line(picks[0]).dispatchEvent("click");
    await expect(line(picks[0])).toHaveAttribute("aria-pressed", "true", { timeout: 1000 });
  }).toPass();
  for (const k of picks.slice(1)) await line(k).dispatchEvent("click");
  await game.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(new RegExp(`Right! ${mirrors.length} lines of symmetry\\. ★★★`))).toBeVisible();
  await expect(game.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
});

test("cube nets: the nets on a board chosen with no misses earn three stars", async ({ page }) => {
  const game = await boardWith(page, "Cube nets: which ones fold?", ".live-cubeNet");
  const board = netBoard(NET_LADDER[0].level, rng(NET_LADDER[0].seed));
  if (board.level === 3) throw new Error();
  const nets = board.shapes.flatMap((s, i) => (isNet(s) ? [i] : []));
  const shape = (i: number) => game.getByRole("button", { name: `Shape ${i + 1}`, exact: true });
  await expect(async () => {
    await shape(nets[0]).click();
    await expect(shape(nets[0])).toHaveAttribute("aria-pressed", "true", { timeout: 1000 });
  }).toPass();
  for (const i of nets.slice(1)) await shape(i).click();
  await game.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(/Every net found, no misses! Right! .* ★★★/)).toBeVisible();
});

test("nets of a cube in practice: a look-alike is named, then the net typed", async ({ page, request }) => {
  const r = 0.2;
  const ex = exercise("cubeNets", 2, seedOf(r), w);
  const slip = trapInputs(ex).find((x) => x.id === "sixSquares")!;
  await practise(page, request, { tab: TAB, skill: "Nets of a cube", level: "medium", r, prompt: ex.prompt });
  const box = page.getByLabel("Your answer");
  await box.fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(check(ex, slip.input, w).hint!)).toBeVisible();
  await box.fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
