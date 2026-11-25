// Scale: in the piece a bigger scale makes the floor's area grow by k × k; in practice an area scaled by k is named.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise, trapInputs } from "../src/math/practice.ts";
import { boardWith, practise, seedOf } from "./helpers.ts";

const W = en.live.scalePlan;
const w = en.pracWords;

test("the plan and the floor: a scale of 1 cm : 3 m makes each square centimetre 9 m²", async ({ page }) => {
  const g = await boardWith(page, en.shapes.names.liveScalePlan, ".live-scalePlan");
  await expect(g.getByText("Floor: 6 m × 4 m = 24 m²")).toBeVisible();
  await g.getByRole("slider", { name: W.scaleName }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(g.getByText("Floor: 9 m × 6 m = 54 m²")).toBeVisible();
  await expect(g.getByText(/a 3 × 3 block, 9 m²/)).toBeVisible();
});

test("scale in practice: an area scaled by k is named", async ({ page, request }) => {
  let r = 0.01;
  for (let k = 1; k < 100; k++)
    if (/A room on it is/.test(exercise("scale", 3, seedOf(k / 100), w).prompt)) {
      r = k / 100;
      break;
    }
  const ex = exercise("scale", 3, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "areaScaledByK")!;
  await practise(page, request, { tab: "Number", skill: w.skills.scale, level: "hard", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/not by \d/)).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
