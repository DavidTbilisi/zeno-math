// Cryptography (a degree elective) in practice: ElGamal decrypted by multiplying by the mask (named), then by its
// inverse; two points of an elliptic curve added without the reflection (named), then with it.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise, trapInputs } from "../src/math/practice.ts";
import { practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("ElGamal: multiplying by the mask is named, then dividing it out is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("elGamal", 3, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "elgNotInverted")!;
  await practise(page, request, { tab: "Number", skill: w.skills.elGamal, level: "hard", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("multiply by the inverse of s")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("elliptic curves: the unreflected third point is named, then P + Q is correct", async ({ page, request }) => {
  const r = 0.02;
  const ex = exercise("ellipticCurves", 2, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "ecNotReflected")!;
  await practise(page, request, { tab: "Number", skill: w.skills.ellipticCurves, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("the sum is its reflection")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
