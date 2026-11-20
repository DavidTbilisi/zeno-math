// Geometry of a degree in practice: the speed of a plane curve left unrooted (named), then |r′(t)|; the Gaussian
// curvature of a quadric with the denominator not squared (named), then (f_xx f_yy − f_xy²)/(1 + f_x² + f_y²)².
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise, trapInputs } from "../src/math/practice.ts";
import { practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("speed of a curve: the sum of squares left unrooted is named, then |r′(t)| is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("curves", 1, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "speedNoRoot")!;
  await practise(page, request, { tab: "Geometry", skill: w.skills.curves, level: "easy", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("The speed is the length of r′")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("Gaussian curvature: the denominator not squared is named, then K is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("surfaces", 3, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "gaussianNotSquared")!;
  await practise(page, request, { tab: "Geometry", skill: w.skills.surfaces, level: "hard", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("the denominator is squared")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
