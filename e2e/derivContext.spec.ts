// Derivatives in context: a cut of 1 leaves the box still growing, a cut of 2 is the largest box; in practice the
// position given for the velocity is named.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { boardWith, practise, seedOf } from "./helpers.ts";

const W = en.live.foldBox;
const w = en.pracWords;

test("fold the box: the volume grows until V′ = 0 at a cut of 2", async ({ page }) => {
  const g = await boardWith(page, en.shapes.names.liveFoldBox, ".live-foldBox");
  await expect(g.getByRole("group", { name: /^Cut 1 from each corner: the box is 10 × 10 × 1, volume 100\. V′\(1\) = 60: the volume still grows/ })).toBeVisible();
  const cut = g.getByRole("slider", { name: W.xLabel });
  // The first key may only bring the piece forward on the board.
  await expect(async () => {
    await cut.focus({ timeout: 1000 });
    await page.keyboard.press("ArrowRight");
    await expect(cut).toHaveAttribute("aria-valuenow", "5", { timeout: 1000 });
  }).toPass();
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
  await expect(g.getByRole("group", { name: /volume 128\. V′\(2\) = 0: the tangent is flat, and this is the largest box/ })).toBeVisible();
});

test("derivatives in context in practice: the position for the velocity is named", async ({ page, request }) => {
  let r = 0.01;
  for (let n = 1; n < 100; n++) {
    const ex = exercise("derivContext", 1, seedOf(n / 100), w);
    if (ex.answer.traps?.some((t) => t.id === "positionForVelocity")) {
      r = n / 100;
      break;
    }
  }
  const ex = exercise("derivContext", 1, seedOf(r), w);
  const slip = ex.answer.traps!.find((t) => t.id === "positionForVelocity")!;
  await practise(page, request, { tab: en.practiceCalculus, skill: w.skills.derivContext, level: "easy", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.a.k === "num" ? String(slip.a.v) : "");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/how fast s is changing/)).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
