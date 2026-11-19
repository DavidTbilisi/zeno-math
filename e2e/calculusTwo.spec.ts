// Single-variable calculus in practice: a volume of revolution typed without its π (named), then with it; an
// improper integral of 1/xᵖ with p < 1 called convergent (named as the p-test backwards), then the right choice.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise, trapInputs } from "../src/math/practice.ts";
import { practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("volume of revolution: the volume without π is named, then the volume is right", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("intApplications", 2, seedOf(r), w);
  const noPi = trapInputs(ex).find((t) => t.id === "forgotPi")!;
  await practise(page, request, { tab: "Calculus", skill: w.skills.intApplications, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(noPi.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/the π is missing/)).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("improper integrals: converges picked for p < 1 is named, then diverges is right", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("improper", 1, seedOf(r), w);
  await practise(page, request, { tab: "Calculus", skill: w.skills.improper, level: "easy", r, prompt: ex.prompt });
  await page.getByRole("button", { name: "converges", exact: true }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/^It is the other way round/)).toBeVisible();
  await page.getByRole("button", { name: ex.plain, exact: true }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
