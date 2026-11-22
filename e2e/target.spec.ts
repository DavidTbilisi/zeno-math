// Make the target by hand: cards and signs dragged from the trays into the row (a sign dropped between two cards goes
// between them), a piece dragged back out and one into the bin, and the bulb for the hint.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { rng } from "../src/math/random.ts";
import { TARGET_LADDER, targetPuzzle, tokens } from "../src/math/target.ts";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

async function drag(page: Page, from: Locator, to: Locator | { x: number; y: number }) {
  const at = async (l: Locator | { x: number; y: number }) => {
    if (!("boundingBox" in l)) return l;
    const b = (await l.boundingBox())!;
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  const [a, b] = [await at(from), await at(to)];
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
}

test("make the target by hand: pieces dragged into the row, between, out and into the bin", async ({ page }) => {
  const game = await boardWith(page, "Make the target: cards and signs", ".live-target");
  const pic = game.locator("svg").first();
  const p = targetPuzzle(TARGET_LADDER[0].level, rng(TARGET_LADDER[0].seed));
  const box = (await pic.boundingBox())!;
  const k = box.width / 600;
  const row = (x: number) => ({ x: box.x + x * k, y: box.y + 112 * k });
  const card = (n: number) => pic.locator(`[role=button][aria-label="Card ${n}"]:not([aria-disabled])`).first();
  const inRow = pic.getByRole("button", { name: /^Take out / });
  const [a, op, b, ...rest] = tokens(p.sample)! as [number, string, number, ...(number | string)[]];
  const sign: Record<string, string> = { "+": "+", "-": "−", "*": "×", "/": "÷" };

  // Two cards dragged in, then the sign dropped between them.
  await expect(async () => {
    await drag(page, card(a), row(60));
    await expect(inRow).toHaveCount(1, { timeout: 1000 });
  }).toPass();
  await drag(page, card(b), row(400));
  await drag(page, pic.getByRole("button", { name: sign[op], exact: true }), row(78));
  await expect(inRow).toHaveCount(3);
  await expect(inRow.nth(1)).toHaveAttribute("aria-label", `Take out ${sign[op]}`);
  // The rest of the sample tapped on at the end: it makes the target.
  for (const t of rest) await (typeof t === "number" ? card(t) : pic.getByRole("button", { name: sign[t], exact: true })).click();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/target.png` });
  await expect(game.getByText(/Made it!/)).toBeVisible();
  await expect(inRow).toHaveCount(3 + rest.length);

  // The last piece dragged back down out of the row, the first into the bin; then the bin tapped clears the rest.
  const n = 3 + rest.length;
  await drag(page, inRow.nth(n - 1), { x: box.x + 300 * k, y: box.y + 200 * k });
  await expect(inRow).toHaveCount(n - 1);
  await drag(page, inRow.first(), pic.getByRole("button", { name: /^Tap to clear the sum/ }));
  await expect(inRow).toHaveCount(n - 2);
  await pic.getByRole("button", { name: /^Tap to clear the sum/ }).click();
  await expect(inRow).toHaveCount(0);
});
