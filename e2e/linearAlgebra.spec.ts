// Linear algebra in practice: the matrix of a map typed with the images as rows (named), then as columns; a row of A
// given as a vector of its null space (named), then a multiple of the right one.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise, trapInputs } from "../src/math/practice.ts";
import { practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("matrix of a map: the images as rows are named, then the images as columns are right", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("linearMaps", 2, seedOf(r), w);
  const rows = trapInputs(ex).find((t) => t.id === "imagesAsRows")!;
  await practise(page, request, { tab: "Algebra", skill: w.skills.linearMaps, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(rows.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/go in as columns, not rows/)).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("null space: a row of A is named, then any multiple of the null vector is right", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("rankNullity", 3, seedOf(r), w);
  if (ex.answer.k !== "dir") throw new Error("a null vector");
  const row = trapInputs(ex).find((t) => t.id === "rowNotNull")!;
  await practise(page, request, { tab: "Algebra", skill: w.skills.rankNullity, level: "hard", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(row.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/is not in the null space/)).toBeVisible();
  await page.getByLabel("Your answer").fill(`(${ex.answer.vs.map((x) => -2 * x).join("; ")})`);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
