// Moving shapes: in the piece a slide set by the keys lands the copy on the outline and names the translation; in
// practice the vector's numbers swapped is named, then the image is right.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { moveTask } from "../src/math/moveShape.ts";
import { exercise } from "../src/math/practice.ts";
import { boardWith, practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("move the shape: a slide set by the arrow keys lands on the outline", async ({ page }) => {
  const g = await boardWith(page, en.shapes.names.liveMoveShape, ".live-moveShape");
  let n = 1;
  while (moveTask(n).tool !== "slide") n++;
  const t = moveTask(n);
  const [dx, dy] = [t.target[0][0] - t.base[0][0], t.target[0][1] - t.base[0][1]];
  await expect(async () => {
    await g.getByRole("button", { name: "Slide", exact: true }).click();
    await expect(g.getByRole("slider", { name: en.live.moveShape.copyName })).toBeVisible({ timeout: 1000 });
  }).toPass();
  for (let i = 1; i < n; i++) await g.getByRole("button", { name: en.live.moveShape.again }).click();
  const copy = g.getByRole("slider", { name: en.live.moveShape.copyName });
  await copy.focus();
  for (let i = 0; i < Math.abs(dx); i++) await page.keyboard.press(dx > 0 ? "ArrowRight" : "ArrowLeft");
  for (let i = 0; i < Math.abs(dy); i++) await page.keyboard.press(dy > 0 ? "ArrowUp" : "ArrowDown");
  await expect(g.getByText(/Exactly: a translation by/)).toBeVisible();
});

test("moving shapes in practice: the vector's numbers swapped is named", async ({ page, request }) => {
  let r = 0.01;
  for (let k = 1; k < 100; k++)
    if (exercise("transformations", 1, seedOf(k / 100), w).prompt.startsWith("Translate")) {
      r = k / 100;
      break;
    }
  const ex = exercise("transformations", 1, seedOf(r), w);
  await practise(page, request, { tab: "Geometry", skill: w.skills.transformations, level: "easy", r, prompt: ex.prompt });
  const [, x, y, a, b] = ex.prompt.replace(/−/g, "-").match(/A\((-?\d+), (-?\d+)\) by the vector \((-?\d+), (-?\d+)\)/)!.map(Number);
  await page.getByLabel("Your answer").fill(`(${x + b}; ${y + a})`);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("in that order")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
