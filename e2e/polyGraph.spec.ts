// Polynomial graphs: tapping the zero at 0 makes it cross instead of touch, and the leading sign turns the ends over;
// in practice an even power taken as crossing is named.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { boardWith, practise, seedOf } from "./helpers.ts";

const W = en.live.polyShape;
const w = en.pracWords;

test("zeros and ends: a power of 3 at 0 crosses, and a negative leading sign turns the right end down", async ({ page }) => {
  const g = await boardWith(page, en.shapes.names.livePolyShape, ".live-polyShape");
  await expect(g.getByRole("group", { name: /At 0 it touches and turns back \(power 2\)/ })).toBeVisible();
  // The first tap may only bring the piece forward on the board.
  await expect(async () => {
    await g.getByRole("button", { name: "The zero at 0, power 2" }).click({ timeout: 1000 });
    await expect(g.getByRole("group", { name: /At 0 it crosses, flattening \(power 3\)/ })).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(g.getByRole("group", { name: /Degree 5, leading sign \+: the right end goes up, the left end down/ })).toBeVisible();
  await g.getByRole("button", { name: W.lead }).click();
  await expect(g.getByRole("group", { name: /^y = −\(x \+ 3\)x³\(x − 2\)\. Degree 5, leading sign −: the right end goes down, the left end up/ })).toBeVisible();
});

test("polynomial graphs in practice: an even power taken as crossing is named", async ({ page, request }) => {
  let r = 0.01;
  for (let k = 1; k < 100; k++) {
    const ex = exercise("polyGraph", 2, seedOf(k / 100), w);
    if (ex.answer.traps?.some((t) => t.id === "touchAsCross")) {
      r = k / 100;
      break;
    }
  }
  const ex = exercise("polyGraph", 2, seedOf(r), w);
  await practise(page, request, { tab: en.practiceAlgebra, skill: w.skills.polyGraph, level: "medium", r, prompt: ex.prompt });
  await page.locator(".sign-picks").getByRole("button", { name: w.qpg.crosses, exact: true }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/is even, so y keeps its sign/)).toBeVisible();
  await page.locator(".sign-picks").getByRole("button", { name: w.qpg.touches, exact: true }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
