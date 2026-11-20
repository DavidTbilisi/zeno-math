// Complex analysis (degree level) in practice: a pole outside the circle counted (named), then the integral typed with
// pi; the residue's factor taken the wrong way round (named), then the residue.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise, trapInputs } from "../src/math/practice.ts";
import { practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("contour integral: the pole outside counted is named, then 2πi times the inside is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("contour", 2, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "poleOutsideCounted")!;
  await practise(page, request, { tab: "Calculus", skill: w.skills.contour, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("A pole outside the circle adds nothing")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("residue: the factor taken the wrong way round is named, then the residue is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("residueCalc", 1, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "residueFactorFlipped")!;
  await practise(page, request, { tab: "Calculus", skill: w.skills.residueCalc, level: "easy", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Taking (z − a) away leaves 1/(z − b)")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
