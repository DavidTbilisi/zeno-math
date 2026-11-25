// Slicing solids: the leaning stack says the slices are equal once it leans; in practice an upright cut's slice taken
// for the base is named.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { boardWith, practise, seedOf } from "./helpers.ts";

const W = en.live.coinStack;
const w = en.pracWords;

test("lean the stack: pushed over, the same slices", async ({ page }) => {
  const g = await boardWith(page, en.shapes.names.liveCoinStack, ".live-coinStack");
  await expect(g.getByText(/^Drag the blue handle/)).toBeVisible();
  await g.getByRole("slider", { name: W.topName }).focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
  await expect(g.getByText(/^Each level slice cuts one coin/)).toBeVisible();
});

test("slicing in practice: an upright slice taken for the base is named", async ({ page, request }) => {
  let r = 0.01;
  for (let k = 1; k < 100; k++)
    if (exercise("crossSections", 1, seedOf(k / 100), w).answer.traps?.some((t) => t.id === "sliceAsBase")) {
      r = k / 100;
      break;
    }
  const ex = exercise("crossSections", 1, seedOf(r), w);
  const slip = ex.answer.traps!.find((t) => t.id === "sliceAsBase")!;
  const wrong = slip.a.k === "pick" ? slip.a.options[slip.a.right].text : "";
  await practise(page, request, { tab: "Geometry", skill: w.skills.crossSections, level: "easy", r, prompt: ex.prompt });
  await page.locator(".sign-picks").getByRole("button", { name: wrong, exact: true }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("not its base")).toBeVisible();
  await page.locator(".sign-picks").getByRole("button", { name: ex.plain, exact: true }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
