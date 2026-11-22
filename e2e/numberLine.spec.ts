// The number line, worked by hand: a tap marks a number and the pin dragged onto the line marks another, a mark is
// dragged along (the jump and the sum follow) and dropped in the bin, the line is slid and stretched by its end, the
// step wheel is turned, and "move together" keeps the gap: 63 − 28 = 65 − 30.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

async function drag(page: Page, from: Locator | { x: number; y: number }, to: Locator | { x: number; y: number }) {
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

test("number line by hand: tap, pin, drag a mark, slide, stretch, step, together", async ({ page }) => {
  const piece = await boardWith(page, "Number line, any range", ".live-numberLine");
  const pic = piece.locator("svg").first();
  const line = pic.getByRole("slider", { name: /^The line:/ });
  const start = pic.getByRole("slider", { name: /^Start:/ });
  const end = pic.getByRole("slider", { name: /^End:/ });
  const box = (await line.boundingBox())!;
  // 0 to 10 over the line (the band reaches 12 past each end of the 688 − 24 wide line): the screen x of a number.
  const k = box.width / 688;
  const [x0, x1] = [box.x + 12 * k, box.x + 676 * k];
  const at = (v: number) => ({ x: x0 + (v / 10) * (x1 - x0), y: box.y + 30 * k });

  // A tap on 3, then the pin dragged onto 8: the jump + 5.
  await page.mouse.click(at(3).x, at(3).y);
  await expect(pic.getByRole("button", { name: "Mark 3" })).toBeVisible();
  await drag(page, pic.getByRole("button", { name: /^Drag me onto the line/ }), at(8));
  await expect(piece).toContainText("3 + 5 = 8");
  // The 8 dragged to 6: 3 + 3 = 6; then dropped in the bin.
  await drag(page, pic.getByRole("button", { name: "Mark 8" }), at(6));
  await expect(piece).toContainText("3 + 3 = 6");
  await drag(page, pic.getByRole("button", { name: "Mark 6" }), pic.getByRole("button", { name: /^Drop a mark here/ }));
  await expect(pic.getByRole("button", { name: /^Mark / })).toHaveCount(1);

  // The line dragged two steps right: it starts at −2 and the 3 stays on 3.
  await drag(page, at(5), { x: at(7).x, y: at(5).y });
  await expect(start).toHaveAttribute("aria-valuenow", "-2");
  await expect(end).toHaveAttribute("aria-valuenow", "8");
  await expect(pic.getByRole("button", { name: "Mark 3" })).toBeVisible();
  // The right end dragged out two steps: up to 10 again; the keyboard takes the start back to 0.
  const e1 = (await end.boundingBox())!;
  const one = (x1 - x0) / 10;
  await drag(page, end, { x: e1.x + e1.width / 2 + 2 * one + 4, y: e1.y + e1.height / 2 });
  await expect(end).toHaveAttribute("aria-valuenow", "10");
  await start.press("ArrowRight");
  await start.press("ArrowRight");
  await expect(start).toHaveAttribute("aria-valuenow", "0");

  // The step wheel up to 10: the ten steps reach 100.
  const wheel = pic.getByRole("slider", { name: "Step" });
  for (let i = 0; i < 3; i++) await wheel.press("ArrowUp");
  await expect(wheel).toHaveAttribute("aria-valuetext", "10");
  await expect(end).toHaveAttribute("aria-valuenow", "100");
  await pic.getByRole("button", { name: "0…10", exact: true }).click();
  await expect(end).toHaveAttribute("aria-valuenow", "10");

  // Move together: 2 and 7 moved as one, the gap of 5 stays: 4 + 5 = 9.
  await pic.getByRole("button", { name: "Mark 3" }).click();
  await page.mouse.click(at(2).x, at(2).y);
  await page.mouse.click(at(7).x, at(7).y);
  await expect(piece).toContainText("2 + 5 = 7");
  await pic.getByRole("button", { name: /Move together/ }).click();
  await drag(page, pic.getByRole("button", { name: "Mark 2" }), at(4));
  await expect(piece).toContainText("4 + 5 = 9");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/numberLine.png` });
});
