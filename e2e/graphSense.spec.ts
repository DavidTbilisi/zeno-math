// Graph-sense games: a graph drawn in one stroke along its Euler trail with no misses, and a practice count of odd
// vertices whose even ones counted are named; a graph coloured right first time, and a practice colouring whose
// busiest vertex's edges plus one are named; the shortest route tapped place by place, and a practice route whose
// fewest roads are named; the cheapest network built road by road, and a practice network whose cheapest roads taken
// loop or not are named.
import { expect, test, type Page } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { colourWith, edgeName, name } from "../src/math/graphPlay.ts";
import { COLOUR_LADDER, colourTask } from "../src/math/colouring.ts";
import { TOWN_LADDER, townTask } from "../src/math/connectTowns.ts";
import { eulerTrail, STROKE_LADDER, strokeTask } from "../src/math/oneStroke.ts";
import { check, exercise, trapInputs, type SkillId } from "../src/math/practice.ts";
import { rng } from "../src/math/random.ts";
import { PATH_LADDER, pathTask, shortestRoute } from "../src/math/shortestPath.ts";
import { boardWith, practise, seedOf } from "./helpers.ts";

const w = en.pracWords;
const TAB = "Probability & statistics";

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

test("one stroke: the graph drawn along its Euler trail, no misses", async ({ page }) => {
  const game = await boardWith(page, "One stroke", ".live-oneStroke");
  const { g } = strokeTask(STROKE_LADDER[0].level, rng(STROKE_LADDER[0].seed));
  const trail = eulerTrail(g)!;
  // The vertices are dots on top of each other's edges: each is pressed by its own click.
  const vertex = (v: number) => game.getByRole("button", { name: name(v), exact: true });
  await expect(async () => {
    await vertex(trail[0]).dispatchEvent("click");
    await expect(game.getByText(`Edges to go: ${g.edges.length}.`)).toBeVisible({ timeout: 1000 });
  }).toPass();
  for (const v of trail.slice(1)) await vertex(v).dispatchEvent("click");
  await expect(game.getByText(/Drawn in one stroke! ★★★/)).toBeVisible();
  await expect(game.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
});

test("one stroke in practice: the even vertices counted are named, then the odd ones", async ({ page, request }) => {
  const { r, ex, slip } = withTrap("oneStroke", 1, "countedEven");
  await practise(page, request, { tab: TAB, skill: "One stroke (Euler)", level: "easy", r, prompt: ex.prompt });
  await slipThenRight(page, ex, slip.input);
});

test("colour the graph: every vertex coloured right first time", async ({ page }) => {
  const game = await boardWith(page, "Colour the graph", ".live-colourMap");
  const t = colourTask(COLOUR_LADDER[0].level, rng(COLOUR_LADDER[0].seed));
  const col = colourWith(t.g, t.k)!;
  const vertex = (v: number) => game.getByRole("button", { name: name(v), exact: true });
  const pen = (c: number) => game.getByRole("radio", { name: `Colour ${c + 1}` });
  for (let c = 0; c < t.k; c++) {
    if (c === 0)
      await expect(async () => {
        await pen(0).click();
        await expect(pen(0)).toHaveAttribute("aria-checked", "true", { timeout: 1000 });
      }).toPass();
    else await pen(c).click();
    for (const [v, cv] of col.entries()) if (cv === c) await vertex(v).dispatchEvent("click");
  }
  await game.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(/Right! 2 colours, and no edge joins two alike\. ★★★/)).toBeVisible();
});

test("colouring graphs in practice: the busiest vertex's edges plus one are named, then the fewest colours", async ({ page, request }) => {
  const { r, ex, slip } = withTrap("colouring", 2, "degreeColours");
  await practise(page, request, { tab: TAB, skill: "Colouring graphs", level: "medium", r, prompt: ex.prompt });
  await slipThenRight(page, ex, slip.input);
});

test("shortest route: the route tapped place by place, right first time", async ({ page }) => {
  const game = await boardWith(page, "Shortest route", ".live-shortestPath");
  const t = pathTask(PATH_LADDER[0].level, rng(PATH_LADDER[0].seed));
  const route = shortestRoute(t.g, t.a, t.b);
  const place = (v: number) => game.getByRole("button", { name: name(v), exact: true });
  await expect(async () => {
    await place(route[1]).dispatchEvent("click");
    await expect(game.locator(".route-sum")).toContainText("=", { timeout: 1000 });
  }).toPass();
  for (const v of route.slice(2)) await place(v).dispatchEvent("click");
  await game.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(new RegExp(`Right! The shortest route is ${t.best}\\. ★★★`))).toBeVisible();
});

test("shortest route in practice: the route with the fewest roads is named, then the shortest length", async ({ page, request }) => {
  const { r, ex, slip } = withTrap("shortestPath", 2, "fewestRoads");
  await practise(page, request, { tab: TAB, skill: "Shortest route", level: "medium", r, prompt: ex.prompt });
  await slipThenRight(page, ex, slip.input);
});

test("connect the towns: the cheapest network built road by road, right first time", async ({ page }) => {
  const game = await boardWith(page, "Connect the towns", ".live-connectTowns");
  const t = townTask(TOWN_LADDER[0].level, rng(TOWN_LADDER[0].seed));
  const road = (e: number) => game.getByRole("button", { name: edgeName(t.g, e), exact: true });
  const [first, ...rest] = t.best.edges;
  await expect(async () => {
    await road(first).dispatchEvent("click");
    await expect(road(first)).toHaveAttribute("aria-pressed", "true", { timeout: 1000 });
  }).toPass();
  // One road only, checked: a town is left out, said in the status line, and a star is gone from those at stake.
  await game.getByRole("button", { name: "Check" }).click();
  await expect(game.getByRole("status").filter({ hasText: "Not every town is joined yet." })).toBeVisible();
  await expect(game.locator(".live-stake")).toContainText("★★☆");
  for (const e of rest) await road(e).dispatchEvent("click");
  await game.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(new RegExp(`Right! The cheapest network costs ${t.best.total}\\. ★★☆`))).toBeVisible();
});

test("connecting towns in practice: the cheapest roads taken loop or not are named, then the least total", async ({ page, request }) => {
  const { r, ex, slip } = withTrap("spanningTree", 2, "cheapestRoads");
  await practise(page, request, { tab: TAB, skill: "Connecting towns", level: "medium", r, prompt: ex.prompt });
  await slipThenRight(page, ex, slip.input);
});
