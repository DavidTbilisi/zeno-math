// Proof answers in practice: a proof's lines tapped into order with the look-alike line named first, then the right
// order; a claim decided false without a counterexample (sent back), then with one.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("proofs: the lines of a proof tapped into order", async ({ page, request }) => {
  const r = 0.4;
  const ex = exercise("proofs", 1, seedOf(r), w);
  if (ex.answer.k !== "lines") throw new Error(ex.answer.k);
  await practise(page, request, { tab: "Probability & statistics", skill: "Proofs", level: "easy", r, prompt: ex.prompt });
  const tap = async (letters: string[]) => {
    for (const l of letters) await page.getByRole("button", { name: l, exact: true }).click();
  };
  // The look-alike line in place of the one it imitates.
  const slip = ex.answer.traps![0].a;
  if (slip.k !== "lines") throw new Error(slip.k);
  await tap(slip.seq.map((i) => "ABCDE"[i]));
  await expect(page.getByLabel("Your answer")).toHaveValue(slip.seq.map((i) => "ABCDE"[i]).join(", "));
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/looks like line .* but doesn't follow from the lines before/)).toBeVisible();
  await page.getByLabel("Your answer").fill("");
  await tap(ex.answer.seq.map((i) => "ABCDE"[i]));
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("proofs: a claim decided false needs its counterexample", async ({ page, request }) => {
  const r = 0.2;
  const ex = exercise("proofs", 3, seedOf(r), w);
  if (ex.answer.k !== "decide") throw new Error(ex.answer.k);
  await practise(page, request, { tab: "Probability & statistics", skill: "Proofs", level: "hard", r, prompt: ex.prompt });
  await page.getByRole("button", { name: "true", exact: true }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/^It is false: one counterexample is enough/)).toBeVisible();
  await page.getByRole("button", { name: "false", exact: true }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/^False\? Then show it with a counterexample/)).toBeVisible();
  await page.getByLabel("Your answer").fill("false: 40");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
