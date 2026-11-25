// Conic sections: the two strings always add to 10, and with the pins together the pencil draws a circle; in practice
// a radius not square-rooted is named.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { boardWith, practise, seedOf } from "./helpers.ts";

const W = en.live.pinString;
const w = en.pracWords;

test("pins and a string: the lengths add to 10, and pins together make a circle", async ({ page }) => {
  const g = await boardWith(page, en.shapes.names.livePinString, ".live-pinString");
  await expect(g.getByRole("group", { name: /they always add to 10, the string's length\. Pins 3 from the centre make the ellipse 10 wide and 8 tall/ })).toBeVisible();
  const pins = g.getByRole("slider", { name: W.pinsLabel });
  // The first key may only bring the piece forward on the board.
  await expect(async () => {
    await pins.focus({ timeout: 1000 });
    await page.keyboard.press("ArrowLeft");
    await expect(pins).toHaveAttribute("aria-valuenow", "2", { timeout: 1000 });
  }).toPass();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(g.getByRole("group", { name: /^The pins meet, .* the pencil draws a circle of radius 5/ })).toBeVisible();
  await g.getByRole("button", { name: W.parabolaTab }).click();
  await expect(g.getByRole("group", { name: /^The pencil is 4 from the focus and 4 from the line/ })).toBeVisible();
});

test("conics in practice: a radius not square-rooted is named", async ({ page, request }) => {
  let r = 0.01;
  for (let k = 1; k < 100; k++) {
    const ex = exercise("conics", 1, seedOf(k / 100), w);
    if (ex.answer.traps?.some((t) => t.id === "radiusNotRooted")) {
      r = k / 100;
      break;
    }
  }
  const ex = exercise("conics", 1, seedOf(r), w);
  const slip = ex.answer.traps!.find((t) => t.id === "radiusNotRooted")!;
  await practise(page, request, { tab: en.practiceGeometry, skill: w.skills.conics, level: "easy", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.a.k === "num" ? String(slip.a.v) : "");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/the radius is its square root/)).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
