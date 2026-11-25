// Shapes by their properties: a shape put in the wrong place goes back and counts a miss, then the board sorted into
// its two rings earns two stars; and in practice "a square is a rectangle: never" is named.
import { expect, test, type Locator } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { regionOf, sortNow, type Region } from "../src/math/shapeSort.ts";
import { boardWith, practise, seedOf } from "./helpers.ts";

const w = en.pracWords;
/** A point inside each place, in the piece's own 640 × 500 drawing. */
const AT: Record<Region, [number, number]> = { a: [150, 205], both: [320, 205], b: [490, 205], out: [40, 210] };
async function tapPlace(game: Locator, r: Region) {
  const svg = game.locator("svg").first();
  const box = (await svg.boundingBox())!;
  await svg.click({ position: { x: (AT[r][0] / 640) * box.width, y: (AT[r][1] / 500) * box.height } });
}

test("sort the shapes: a wrong place counts a miss, then every shape in its place sorts the board", async ({ page }) => {
  const game = await boardWith(page, en.shapes.names.liveShapeSort, ".live-shapeSort");
  const { shapes, rings } = sortNow({ mode: "puzzle", stage: 0, level: 1, seed: 0 });
  const shape = (i: number) => game.getByRole("button", { name: `Shape ${i + 1}`, exact: true });
  await expect(async () => {
    await shape(0).click();
    await expect(shape(0)).toHaveAttribute("aria-pressed", "true", { timeout: 1000 });
  }).toPass();
  // A wrong place first: the shape goes back and a miss is counted.
  const right = regionOf(shapes[0].pts, rings);
  await tapPlace(game, right === "out" ? "both" : "out");
  await expect(game.getByText("Not there")).toBeVisible();
  await expect(game.getByText("misses: 1")).toBeVisible();
  for (let i = 0; i < shapes.length; i++) {
    await shape(i).click();
    await tapPlace(game, regionOf(shapes[i].pts, rings));
  }
  await expect(game.getByText(/All sorted! ★★☆/)).toBeVisible();
});

test("shapes in practice: never for a square being a rectangle is named, then always is right", async ({ page, request }) => {
  let r = 0.01;
  for (let k = 1; k < 100; k++) {
    const e = exercise("shapeKinds", 3, seedOf(k / 100), w);
    if (e.prompt.endsWith(w.shapes.family.squareRect.s)) {
      r = k / 100;
      break;
    }
  }
  const ex = exercise("shapeKinds", 3, seedOf(r), w);
  await practise(page, request, { tab: "Geometry", skill: w.skills.shapeKinds, level: "hard", r, prompt: ex.prompt });
  await page.locator(".sign-picks").getByRole("button", { name: w.shapes.when.never, exact: true }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("do not shut each other out")).toBeVisible();
  await page.locator(".sign-picks").getByRole("button", { name: w.shapes.when.always, exact: true }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
