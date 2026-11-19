// Logic and sets in practice: an intersection read off the Venn diagram, the union typed first (named as the swap),
// then the right set; a function drawn as arrows called bijective though something in B is missed (named), then its
// kind tapped right.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise, trapInputs } from "../src/math/practice.ts";
import { practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("sets: the union typed for an intersection is named, then the intersection is right", async ({ page, request }) => {
  const r = 0.04;
  const ex = exercise("sets", 1, seedOf(r), w);
  const swap = trapInputs(ex).find((t) => t.id === "unionIntersect")!;
  await practise(page, request, { tab: "Probability & statistics", skill: "Sets and counting", level: "easy", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(swap.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/You swapped them/)).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("functions: bijective picked when nothing goes to one element of B, then the right kind", async ({ page, request }) => {
  const r = 0.12;
  const ex = exercise("mappings", 1, seedOf(r), w);
  await practise(page, request, { tab: "Probability & statistics", skill: "Injective, surjective, bijective", level: "easy", r, prompt: ex.prompt });
  await page.getByRole("button", { name: "bijective", exact: true }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/^Nothing goes to [a-d], so f isn't surjective/)).toBeVisible();
  await page.getByRole("button", { name: ex.plain, exact: true }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
