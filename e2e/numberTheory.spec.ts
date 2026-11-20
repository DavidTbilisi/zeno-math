// Number theory (degree level) in practice: the CRT sum without the inverses (named), then the solution; the RSA
// private key taken mod n (named), then mod φ(n).
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise, trapInputs } from "../src/math/practice.ts";
import { practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("CRT: the sum without the inverses is named, then the solution is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("crt", 1, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "crtForgotInverse")!;
  await practise(page, request, { tab: "Number", skill: w.skills.crt, level: "easy", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("needs the factor Mᵢ⁻¹ mod mᵢ")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("RSA: d taken mod n is named, then d mod φ(n) is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("rsa", 2, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "inverseModN")!;
  await practise(page, request, { tab: "Number", skill: w.skills.rsa, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("d is the inverse of e modulo φ(n), not modulo n.")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
