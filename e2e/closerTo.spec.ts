// Closer to? by hand: the number dragged onto the benchmark it is closest to (and once a wrong one, which misses).
import { expect, test } from "@playwright/test";
import { NEAR_LADDER, nearRound } from "../src/math/benchmark.ts";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

test("closer to? by hand: the number dragged onto a benchmark", async ({ page }) => {
  const game = await boardWith(page, "Closer to? Benchmarks against the clock", ".live-closerTo");
  const round = nearRound(NEAR_LADDER[0].level, NEAR_LADDER[0].seed);
  const pic = game.locator("svg").first();
  for (const [i, t] of round.entries()) {
    const num = pic.getByText(t.text, { exact: true }).last();
    const a = (await num.boundingBox())!;
    // The first one dropped on a wrong benchmark: it counts as missed and the right one shows green.
    const k = i === 0 ? (t.right + 1) % t.options.length : t.right;
    const b = (await pic.getByRole("button", { name: t.options[k].text, exact: true }).boundingBox())!;
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
    await page.mouse.up();
    if (i === 0) await expect(game.getByText(/It's closer to/)).toBeVisible();
    else await expect(game.getByText(/Right!|Round done|notice|Lightning/).first()).toBeVisible();
    if (i === 0 && SHOTS) await page.screenshot({ path: `${SHOTS}/closerTo.png` });
    if (i < round.length - 1) await game.getByRole("button", { name: "Next →" }).click();
  }
  await expect(game.getByText(/Round done!/)).toBeVisible();
});
