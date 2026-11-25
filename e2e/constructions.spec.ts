// Constructions: in the piece, two compass circles and a line through their crossings build the perpendicular
// bisector, and the reason is written; in practice the perpendicular from a point taken for the bisector is named.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { boardWith, practise, seedOf } from "./helpers.ts";

const W = en.live.construct;
const w = en.pracWords;

async function pull(page: Page, g: Locator, a: number[], b: number[]) {
  const box = (await g.locator("svg").first().boundingBox())!;
  const k = box.width / 680;
  await page.mouse.move(box.x + a[0] * k, box.y + a[1] * k);
  await page.mouse.down();
  await page.mouse.move(box.x + b[0] * k, box.y + b[1] * k, { steps: 10 });
  await page.mouse.up();
}

test("construct: the perpendicular bisector by compass and straight edge", async ({ page }) => {
  const g = await boardWith(page, en.shapes.names.liveConstruct, ".live-construct");
  await expect(g.getByText(W.goal.bisect)).toBeVisible();
  // A drag adds a mark, so it is not retried: wait until the board has stopped moving the piece into place.
  await expect(async () => {
    const a = await g.boundingBox();
    await page.waitForTimeout(150);
    expect(await g.boundingBox()).toEqual(a);
  }).toPass();
  await pull(page, g, [240, 320], [440, 320]);
  await expect(g.locator("circle[r='200']")).toHaveCount(1);
  await pull(page, g, [440, 320], [240, 320]);
  await g.getByText(W.ruler, { exact: true }).click();
  await pull(page, g, [340, 147], [340, 493]);
  await expect(g.getByText(/^Why: each crossing/)).toBeVisible();
  await expect(g.getByText("✓ " + W.tasks.bisect)).toBeVisible();
});

test("constructions in practice: the perpendicular from a point taken for the bisector is named", async ({ page, request }) => {
  let r = 0.01;
  for (let k = 1; k < 100; k++)
    if (exercise("constructions", 1, seedOf(k / 100), w).plain === w.cons.names.perp) {
      r = k / 100;
      break;
    }
  const ex = exercise("constructions", 1, seedOf(r), w);
  await practise(page, request, { tab: "Geometry", skill: w.skills.constructions, level: "easy", r, prompt: ex.prompt });
  await page.locator(".sign-picks").getByRole("button", { name: w.cons.names.bisect, exact: true }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("this is the perpendicular through that point")).toBeVisible();
  await page.locator(".sign-picks").getByRole("button", { name: w.cons.names.perp, exact: true }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
