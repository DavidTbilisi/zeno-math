// Graphs-and-charts games: a round of points tapped on the grid for three stars, and a practice point whose numbers typed the
// wrong way round are named before it is typed right; a bar chart raised with the arrow keys and right first time,
// and a practice chart whose lines counted are named; a walk's graph built piece by piece, and a practice graph whose
// stop taken for a walk is named; a line drawn through A with its gradient, and a practice gradient typed along over
// up and then right.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { CHART_LADDER, chartTask } from "../src/math/barChart.ts";
import { STORY_LADDER, storyTask } from "../src/math/graphStory.ts";
import { PLOT_CELL, PLOT_LADDER, plotRange, plotRound, type Pt } from "../src/math/plotPoint.ts";
import { check, exercise, trapInputs, type SkillId } from "../src/math/practice.ts";
import { rng } from "../src/math/random.ts";
import { SLOPE_CELL, SLOPE_LADDER, slopeRange, slopeTask } from "../src/math/slope.ts";
import { boardWith, practise, seedOf } from "./helpers.ts";

const w = en.pracWords;
const PAD = 30;

/** Taps a crossing of the grid drawn in `svg`, wherever the piece has been scaled to. */
async function tapAt(page: Page, svg: Locator, [x, y]: Pt, lo: number, hi: number, cell: number) {
  await svg.scrollIntoViewIfNeeded();
  const box = (await svg.boundingBox())!;
  const k = box.width / ((hi - lo) * cell + 2 * PAD);
  await page.mouse.click(box.x + (PAD + (x - lo) * cell) * k, box.y + (PAD + (hi - y) * cell) * k);
}

/** A question of the skill and level whose slip `id` can be typed, and the r that makes it. */
function withTrap(skill: SkillId, level: 1 | 2 | 3, id: string) {
  for (let i = 1; i < 500; i++) {
    const r = i / 501;
    const ex = exercise(skill, level, seedOf(r), w);
    const slip = trapInputs(ex).find((x) => x.id === id);
    if (slip) return { r, ex, slip };
  }
  throw new Error(`no ${skill} question names ${id}`);
}

/** Types the slip, sees it named, then types the answer and sees it marked right. */
async function slipThenRight(page: Page, ex: ReturnType<typeof exercise>, input: string) {
  const box = page.getByLabel("Your answer");
  await box.fill(input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(check(ex, input, w).hint!)).toBeVisible();
  await box.fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
}

test("plot the point: a round of points tapped right earns three stars", async ({ page }) => {
  const game = await boardWith(page, "Plot the point", ".live-plotPoint");
  const { level, seed } = PLOT_LADDER[0];
  const [lo, hi] = plotRange(level);
  const svg = game.locator("svg.plot-grid");
  for (const [i, t] of plotRound(level, seed).entries()) {
    if (i === 0)
      await expect(async () => {
        await tapAt(page, svg, t.p, lo, hi, PLOT_CELL);
        await expect(game.getByRole("button", { name: /Next/ })).toBeVisible({ timeout: 1000 });
      }).toPass();
    else await tapAt(page, svg, t.p, lo, hi, PLOT_CELL);
    if (i < 4) await game.getByRole("button", { name: /Next/ }).click();
  }
  await expect(game.getByText(/Round done! ★★★/)).toBeVisible();
  await expect(game.getByRole("button", { name: /^Round 2/ })).toBeEnabled();
});

test("coordinates in practice: the numbers the wrong way round are named, then the point typed", async ({ page, request }) => {
  const { r, ex, slip } = withTrap("coordinates", 2, "swappedXY");
  await practise(page, request, { tab: "Geometry & trigonometry", skill: "Coordinates", level: "medium", r, prompt: ex.prompt });
  await slipThenRight(page, ex, slip.input);
});

test("make the bar chart: every bar raised to its number with the arrow keys, right first time", async ({ page }) => {
  const game = await boardWith(page, "Make the bar chart", ".live-barChart");
  const t = chartTask(CHART_LADDER[0].level, rng(CHART_LADDER[0].seed));
  for (const [k, it] of t.items.entries()) {
    const bar = game.getByRole("slider", { name: it.icon });
    if (k === 0)
      await expect(async () => {
        await bar.focus();
        await bar.press("ArrowUp");
        await expect(bar).toHaveAttribute("aria-valuenow", "1", { timeout: 1000 });
      }).toPass();
    else {
      await bar.focus();
      await bar.press("ArrowUp");
    }
    for (let v = 1; v < it.v; v++) await bar.press("ArrowUp");
    await expect(bar).toHaveAttribute("aria-valuenow", String(it.v));
  }
  await game.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(/Right! The chart shows every number\. ★★★/)).toBeVisible();
  await expect(game.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
});

test("reading bar charts in practice: the lines counted are named, then the number typed", async ({ page, request }) => {
  const { r, ex, slip } = withTrap("readChart", 2, "countedLines");
  await practise(page, request, { tab: "Probability & statistics", skill: "Reading bar charts", level: "medium", r, prompt: ex.prompt });
  await slipThenRight(page, ex, slip.input);
});

test("graph stories: a walk's graph built piece by piece, right first time", async ({ page }) => {
  const game = await boardWith(page, "Graph stories: draw the walk", ".live-graphStory");
  const t = storyTask(STORY_LADDER[0].level, rng(STORY_LADDER[0].seed));
  const pieces = en.live.graphStory.pieces;
  const piece = (p: (typeof t.parts)[number]) => game.getByRole("button", { name: pieces[p], exact: true });
  await expect(async () => {
    await piece(t.parts[0]).click();
    await expect(game.getByRole("button", { name: /Undo/ })).toBeEnabled({ timeout: 1000 });
  }).toPass();
  for (const p of t.parts.slice(1)) await piece(p).click();
  await game.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(/Right! The graph tells the walk\. ★★★/)).toBeVisible();
});

test("graph stories in practice: a stop taken for a walk is named, then the right graph picked", async ({ page, request }) => {
  const { r, ex, slip } = withTrap("graphStory", 1, "flatMoving");
  await practise(page, request, { tab: "Algebra", skill: "Graph stories", level: "easy", r, prompt: ex.prompt });
  const pick = (l: string) => page.locator(".sign-picks").getByRole("button", { name: l, exact: true });
  await pick(slip.input).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(check(ex, slip.input, w).hint!)).toBeVisible();
  await pick(ex.plain).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("draw the gradient: a line through A with its gradient, right first time", async ({ page }) => {
  const game = await boardWith(page, "Draw the gradient", ".live-slopeLine");
  const t = slopeTask(SLOPE_LADDER[0].level, rng(SLOPE_LADDER[0].seed));
  const [lo, hi] = slopeRange(t.level);
  const svg = game.locator("svg.plot-grid");
  await expect(async () => {
    await tapAt(page, svg, [t.a[0] + t.run, t.a[1] + t.rise], lo, hi, SLOPE_CELL);
    await expect(game.getByRole("button", { name: "Check" })).toBeEnabled({ timeout: 1000 });
  }).toPass();
  await game.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(new RegExp(`Right! Gradient ${t.rise}\\. ★★★`))).toBeVisible();
  await expect(game.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
});

test("gradient of a line in practice: along over up is named, then the gradient typed", async ({ page, request }) => {
  const { r, ex, slip } = withTrap("slope", 3, "runOverRise");
  await practise(page, request, { tab: "Geometry & trigonometry", skill: "Gradient of a line", level: "hard", r, prompt: ex.prompt });
  await slipThenRight(page, ex, slip.input);
});
