// Complex numbers in practice: a product with i² taken as +1 (named), then right; a number asked for as re^{iθ} typed
// as a + bi (sent back, not wrong), then in polar form.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise, trapInputs } from "../src/math/practice.ts";
import { practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("product: i² taken as +1 is named, then the right product is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("complex", 1, seedOf(r), w);
  const plus = trapInputs(ex).find((t) => t.id === "iSquaredPlusOne")!;
  await practise(page, request, { tab: "Algebra", skill: w.skills.complex, level: "easy", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(plus.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/i² = −1, not \+1/)).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("polar form: a + bi is sent back, then re^(iθ) is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("polarForm", 3, seedOf(r), w);
  if (ex.answer.k !== "complex") throw new Error("a complex answer");
  const [z] = ex.answer.vs;
  await practise(page, request, { tab: "Algebra", skill: w.skills.polarForm, level: "hard", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(`${z.re} + (${z.im})*i`);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/now write it in the form/)).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
