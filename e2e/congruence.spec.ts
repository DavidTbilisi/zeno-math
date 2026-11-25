// Congruent triangles: in the piece the top corner fits two places with SSA, so SSA is not a test; in practice SSA
// taken for SAS is named, then "not necessarily congruent" is right.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { BUILD_START, spots } from "../src/math/congruence.ts";
import { exercise } from "../src/math/practice.ts";
import { boardWith, practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("build the triangle: SSA fits two places", async ({ page }) => {
  const g = await boardWith(page, en.shapes.names.liveBuildTriangle, ".live-buildTriangle");
  await expect(async () => {
    await g.getByRole("button", { name: "SSA", exact: true }).click();
    await expect(g.getByText(/an angle of 35°/)).toBeVisible({ timeout: 1000 });
  }).toPass();
  const svg = g.locator("svg").first();
  const box = (await svg.boundingBox())!;
  const k = box.width / 640;
  for (const p of spots({ ...BUILD_START, test: "SSA" })) {
    const cb = (await g.getByRole("slider", { name: en.live.buildTriangle.cornerName }).boundingBox())!;
    await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + p[0] * k, box.y + p[1] * k, { steps: 8 });
    await page.mouse.up();
  }
  await expect(g.getByText(/Two places fit/)).toBeVisible();
});

test("congruence in practice: SSA taken for SAS is named", async ({ page, request }) => {
  let r = 0.01;
  for (let k = 1; k < 100; k++)
    if (exercise("congruence", 1, seedOf(k / 100), w).steps?.[0].includes("not between")) {
      r = k / 100;
      break;
    }
  const ex = exercise("congruence", 1, seedOf(r), w);
  await practise(page, request, { tab: "Geometry", skill: w.skills.congruence, level: "easy", r, prompt: ex.prompt });
  await page.locator(".sign-picks").getByRole("button", { name: "SAS", exact: true }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("so SSA is not a test")).toBeVisible();
  await page.locator(".sign-picks").getByRole("button", { name: w.congr.notEnough, exact: true }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
