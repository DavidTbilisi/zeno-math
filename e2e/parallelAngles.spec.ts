// Angles on parallel lines: in the piece a tapped angle names its partners and the transversal turns by the keys,
// the triangle view shows its angles filling the straight line; in practice the bend taken for a triangle's corner is
// named, then the right sum is accepted.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { boardWith, practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("parallel lines piece: partners named, the slope turned, the triangle's angles make 180°", async ({ page }) => {
  const lab = await boardWith(page, en.shapes.names.liveParallelLab, ".live-parallelLab");
  await expect(async () => {
    await lab.getByRole("button", { name: "60°" }).first().click();
    await expect(lab.getByText("corresponding", { exact: true })).toBeVisible({ timeout: 1000 });
  }).toPass();
  await lab.getByRole("slider").first().focus();
  await page.keyboard.press("PageUp");
  await expect(lab.getByRole("slider").first()).toHaveAttribute("aria-valuenow", "70");
  await lab.getByText("A triangle").click();
  await expect(lab.getByText(/= 180°, the triangle/)).toBeVisible();
});

test("parallel angles in practice: the bend taken for a triangle's corner is named", async ({ page, request }) => {
  let r = 0.01;
  for (let k = 1; k < 100; k++)
    if (exercise("parallelAngles", 3, seedOf(k / 100), w).prompt === w.parAngles.bend) {
      r = k / 100;
      break;
    }
  const ex = exercise("parallelAngles", 3, seedOf(r), w);
  await practise(page, request, { tab: "Geometry", skill: w.skills.parallelAngles, level: "hard", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(String(180 - Number(ex.plain)));
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("not a triangle's corner")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
