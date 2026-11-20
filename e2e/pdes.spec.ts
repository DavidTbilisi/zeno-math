// PDEs and Fourier series (degree level) in practice: a square wave's sine coefficient with cos nπ taken as 1 (named),
// then 4/(3π); a plucked string read at t = 0 (named), then with each mode's cos(nt).
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise, trapInputs } from "../src/math/practice.ts";
import { practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("Fourier sine coefficient: cos nπ taken as 1 is named, then 4/(3π) is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("fourier", 2, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "cosNPiAsOne")!;
  await practise(page, request, { tab: "Calculus", skill: w.skills.fourier, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("cos nπ = (−1)ⁿ, which is −1 for odd n")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("wave equation: the time factor dropped is named, then u(x, t) with cos(nt) is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("separation", 2, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "timeFactorDropped")!;
  await practise(page, request, { tab: "Calculus", skill: w.skills.separation, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Each mode oscillates in time")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
