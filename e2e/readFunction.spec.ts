// Reading a function: on the piece, A and B moved to equal heights give a flat chord; in practice reading the graph
// backwards is named.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { boardWith, practise, seedOf } from "./helpers.ts";

const W = en.live.secantRate;
const w = en.pracWords;

test("chords on a curve: points at equal heights make a flat chord, rate 0", async ({ page }) => {
  const g = await boardWith(page, en.shapes.names.liveSecantRate, ".live-secantRate");
  await expect(g.getByText(/^Rise over run gives −0\.5/)).toBeVisible();
  const [a, b] = [g.getByRole("slider", { name: W.first }), g.getByRole("slider", { name: W.second })];
  // The first key may only bring the piece forward on the board.
  await expect(async () => {
    await a.focus({ timeout: 1000 });
    await page.keyboard.press("ArrowLeft");
    await expect(a).toHaveAttribute("aria-valuenow", "0", { timeout: 1000 });
  }).toPass();
  await b.focus();
  await page.keyboard.press("ArrowRight");
  await expect(b).toHaveAttribute("aria-valuenow", "3");
  await expect(g.getByText(/^A flat chord: f\(0\) = f\(3\) = 2/)).toBeVisible();
});

test("reading a function in practice: the graph read backwards is named", async ({ page, request }) => {
  let r = 0.01;
  for (let k = 1; k < 100; k++) {
    const ex = exercise("readFunction", 1, seedOf(k / 100), w);
    if (ex.answer.traps?.some((t) => t.id === "readXForY")) {
      r = k / 100;
      break;
    }
  }
  const ex = exercise("readFunction", 1, seedOf(r), w);
  const slip = ex.answer.traps!.find((t) => t.id === "readXForY")!;
  await practise(page, request, { tab: en.practiceAlgebra, skill: w.skills.readFunction, level: "easy", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.a.k === "num" ? String(slip.a.v) : "");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/You read it the other way/)).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
