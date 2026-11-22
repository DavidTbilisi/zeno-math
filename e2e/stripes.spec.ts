// Stripes by hand: multiplying (stripes cut by the numbers, shaded by a tap on the strip, a wrong answer then the
// right one for two stars), adding (both squares cut until their cells match, the sum poured below) and finding one
// between two neighbours (the square cut across, cells shaded up to the one tapped).
import { expect, test, type Locator, type Page } from "@playwright/test";
import { STRIPE_LADDER, stripeCols, stripesNow } from "../src/math/stripes.ts";
import { boardWith } from "./helpers.ts";

const SHOTS = process.env.SHOTS_DIR;
const open = async (page: Page, passed: number) => {
  const stars = STRIPE_LADDER.map((_, k) => (k < passed ? 3 : 0));
  await page.addInitScript((s) => localStorage.setItem("zeno.stripes.v1", JSON.stringify({ stars: s })), stars);
  const game = await boardWith(page, "Stripes: multiply, add, between", ".live-stripes");
  if (passed) await game.getByRole("button", { name: new RegExp(`^Puzzle ${passed + 1}`) }).click();
  return game;
};
const task = (stage: number) => stripesNow({ mode: "puzzle", stage, level: 1, seed: 1 })!;
/** A number moved to a value by its arrow keys. */
const setTo = async (box: Locator, v: number) => {
  await box.focus();
  const now = Number(await box.getAttribute("aria-valuenow"));
  for (let i = 0; i < Math.abs(v - now); i++) await box.press(v > now ? "ArrowUp" : "ArrowDown");
  await expect(box).toHaveAttribute("aria-valuenow", String(v));
};
/** A tap on part k of n of a strip running across (or down). */
const tapPart = async (page: Page, strip: Locator, k: number, n: number, across: boolean) => {
  const b = (await strip.boundingBox())!;
  await page.mouse.click(across ? b.x + ((k + 0.5) * b.width) / n : b.x + b.width / 2, across ? b.y + b.height / 2 : b.y + ((k + 0.5) * b.height) / n);
};

test("stripes: multiply by shading stripes both ways, a miss, then the right product", async ({ page }) => {
  const game = await open(page, 0);
  const pic = game.locator("svg").first();
  const t = task(0);
  await setTo(pic.getByRole("slider", { name: "Vertical stripes", exact: true }), t.a.d);
  const band = pic.getByRole("slider", { name: "Shade vertical stripes", exact: true });
  await tapPart(page, band, t.a.n - 1, t.a.d, true);
  await expect(band).toHaveAttribute("aria-valuenow", String(t.a.n));
  await setTo(pic.getByRole("slider", { name: "Horizontal stripes", exact: true }), t.b.d);
  const rows = pic.getByRole("slider", { name: "Shade horizontal stripes", exact: true });
  await tapPart(page, rows, t.b.n - 1, t.b.d, false);
  await expect(rows).toHaveAttribute("aria-valuenow", String(t.b.n));
  await setTo(pic.getByRole("slider", { name: "Answer bottom", exact: true }), t.a.d * t.b.d);
  await setTo(pic.getByRole("slider", { name: "Answer top", exact: true }), t.a.n * t.b.n + 1);
  await pic.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(/^Not that: count the cells shaded both ways/)).toBeVisible();
  await setTo(pic.getByRole("slider", { name: "Answer top", exact: true }), t.a.n * t.b.n);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/stripes-times.png` });
  await pic.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(new RegExp(`Right! ${t.a.n}/${t.a.d} × ${t.b.n}/${t.b.d} = `))).toBeVisible();
});

test("stripes: add by cutting both squares until the cells match", async ({ page }) => {
  const game = await open(page, 3);
  const pic = game.locator("svg").first();
  const t = task(3);
  await expect(game.getByText(new RegExp(`^Add ${t.a.n}/${t.a.d} \\+ ${t.b.n}/${t.b.d}`))).toBeVisible();
  await pic.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(/^The cells are not the same size yet/)).toBeVisible();
  await setTo(pic.getByRole("slider", { name: "Cuts across the first square", exact: true }), t.b.d);
  await setTo(pic.getByRole("slider", { name: "Cuts down the second square", exact: true }), t.a.d);
  await expect(game.getByText(new RegExp(`^Same-size cells, ${t.a.d * t.b.d} in each square`))).toBeVisible();
  const sum = t.a.add(t.b);
  await setTo(pic.getByRole("slider", { name: "Answer bottom", exact: true }), sum.d);
  await setTo(pic.getByRole("slider", { name: "Answer top", exact: true }), sum.n);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/stripes-plus.png` });
  await pic.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(new RegExp(`Right! ${t.a.n}/${t.a.d} \\+ ${t.b.n}/${t.b.d} = ${sum.n}/${sum.d} ★★`))).toBeVisible();
});

test("stripes: find one between by cutting across and shading cells", async ({ page }) => {
  const game = await open(page, 6);
  const pic = game.locator("svg").first();
  const t = task(6);
  const n = stripeCols(t);
  const cells = pic.getByRole("slider", { name: "Shade cells", exact: true });
  // Without cuts across, the next cell up lands on a neighbour.
  await cells.focus();
  for (let i = 0; i < n * t.a.toNumber(); i++) await cells.press("ArrowUp");
  await pic.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(/isn't between them/)).toBeVisible();
  await setTo(pic.getByRole("slider", { name: "Cuts across", exact: true }), 2);
  // Cut in two across, the cell under the first neighbour's column and one more lies between.
  await setTo(cells, 2 * n * t.a.toNumber() + 1);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/stripes-between.png` });
  await pic.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(/^Right! .* is between /)).toBeVisible();
});
