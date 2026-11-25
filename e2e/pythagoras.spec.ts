// Pythagoras' theorem in practice: the sides added instead of their squares is named, then the hypotenuse is right;
// three lengths listed with the longest not last, "no" named, then "yes" is right.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { practise, seedOf } from "./helpers.ts";

const w = en.pracWords;
const find = (level: 1 | 2 | 3, ok: (prompt: string, plain: string) => boolean) => {
  for (let k = 1; k < 100; k++) {
    const ex = exercise("pythagoras", level, seedOf(k / 100), w);
    if (ok(ex.prompt, ex.plain)) return k / 100;
  }
  throw new Error("no such question");
};

test("pythagoras, easy: the sides added is named, then the hypotenuse is right", async ({ page, request }) => {
  const r = 0.4;
  const ex = exercise("pythagoras", 1, seedOf(r), w);
  await practise(page, request, { tab: "Geometry", skill: w.skills.pythagoras, level: "easy", r, prompt: ex.prompt });
  const [a, b] = (ex.steps ?? [])[0].match(/= (\d+)\^2 \+ (\d+)\^2/)!.slice(1).map(Number);
  await page.getByLabel("Your answer").fill(String(a + b));
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("their squares are")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("pythagoras, medium: a right triangle not listed in order, no named, then yes", async ({ page, request }) => {
  const r = find(2, (p, plain) => p.startsWith("A triangle has sides") && plain === w.pyth.yes);
  const ex = exercise("pythagoras", 2, seedOf(r), w);
  await practise(page, request, { tab: "Geometry", skill: w.skills.pythagoras, level: "medium", r, prompt: ex.prompt });
  await page.locator(".sign-picks").getByRole("button", { name: w.pyth.no, exact: true }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Put the longest side alone")).toBeVisible();
  await page.locator(".sign-picks").getByRole("button", { name: w.pyth.yes, exact: true }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
