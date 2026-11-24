// The rekenrek, worked by hand: a bead dragged left takes the beads on its left with it, a tap sends beads back, the
// rows answer to the arrow keys, the rack grows to a hundred beads, and a dealt sum is ticked off by the beads.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

async function drag(page: Page, from: Locator, dx: number) {
  const b = (await from.boundingBox())!;
  const [x, y] = [b.x + b.width / 2, b.y + b.height / 2];
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y, { steps: 8 });
  await page.mouse.up();
}

test("rekenrek by hand: slide, tap, keys, a hundred beads and a sum", async ({ page }) => {
  const piece = await boardWith(page, "Rekenrek: a counting rack", ".live-rekenrek");
  const pic = piece.locator("svg").first();
  const bead = (r: number, i: number) => pic.locator(`g[data-bead='${r}-${i}']`);
  const row = (r: number) => pic.getByRole("slider", { name: `Row ${r}: beads on the left` });
  await expect(piece).toContainText("10 + 5 = 15");
  await expect(piece).toContainText("15 + 5 = 20");

  // The eighth bead of the second row dragged left takes the sixth and seventh with it: 10 + 8.
  await drag(page, bead(1, 7), -260);
  await expect(row(2)).toHaveAttribute("aria-valuenow", "8");
  await expect(piece).toContainText("10 + 8 = 18");

  // A tap on the top row's fourth bead sends it back with every bead on its right: 3 + 8.
  await bead(0, 3).click();
  await expect(row(1)).toHaveAttribute("aria-valuenow", "3");
  await expect(piece).toContainText("3 + 8 = 11");

  // One row, by the keys: 9 is five and four, and one short of ten.
  await pic.getByRole("button", { name: "10 beads", exact: true }).click();
  await row(1).focus();
  for (let i = 0; i < 6; i++) await row(1).press("ArrowUp");
  await expect(piece).toContainText("5 + 4 = 9");
  await expect(piece).toContainText("9 + 1 = 10");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/rekenrek-10.png` });

  // The hundred rack: three full rows and seven more.
  await pic.getByRole("button", { name: "100 beads", exact: true }).click();
  await row(1).press("End");
  for (const r of [2, 3]) {
    await row(r).focus();
    await row(r).press("End");
  }
  await row(4).focus();
  await row(4).press("End");
  for (let i = 0; i < 3; i++) await row(4).press("ArrowDown");
  await expect(piece).toContainText("3 × 10 + 7 = 37");
  await expect(piece).toContainText("37 + 63 = 100");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/rekenrek-100.png` });

  // A sum from the die on twenty beads: its first number, then its answer, each ticked by the beads.
  await pic.getByRole("button", { name: "20 beads", exact: true }).click();
  await pic.getByRole("button", { name: "A sum to show on the rack" }).click();
  const sum = (await pic.locator("text").filter({ hasText: /^\d+ [+−] \d+ =$/ }).textContent())!;
  const [, a, op, b] = sum.match(/^(\d+) ([+−]) (\d+) =$/)!;
  const answer = op === "+" ? Number(a) + Number(b) : Number(a) - Number(b);
  const show = async (n: number) => {
    for (const [r, want] of [[1, Math.min(10, n)], [2, Math.max(0, n - 10)]] as const) {
      await row(r).focus();
      let now = Number(await row(r).getAttribute("aria-valuenow"));
      for (; now < want; now++) await row(r).press("ArrowUp");
      for (; now > want; now--) await row(r).press("ArrowDown");
    }
  };
  await expect(pic.locator("[data-answer]")).toHaveText("?");
  await show(Number(a));
  await expect(piece).toContainText(`✓ Show ${a}`);
  await show(answer);
  await expect(pic.locator("[data-answer]")).toHaveText(String(answer));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/rekenrek-sum.png` });
});
