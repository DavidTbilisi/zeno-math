// Rings and fields (degree level) in practice: the degrees of a tower added (named), then multiplied; the cubic's
// discriminant with the wrong sign (named), then −4p³ − 27q².
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise, trapInputs } from "../src/math/practice.ts";
import { practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("field degree: the degrees added is named, then their product is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("fieldExt", 1, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "degreesAdded")!;
  await practise(page, request, { tab: "Algebra", skill: w.skills.fieldExt, level: "easy", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Degrees multiply up a tower")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("cubic discriminant: the wrong sign is named, then the discriminant is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("galois", 3, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "discriminantSignSlip")!;
  await practise(page, request, { tab: "Algebra", skill: w.skills.galois, level: "hard", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("both terms take a minus")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
