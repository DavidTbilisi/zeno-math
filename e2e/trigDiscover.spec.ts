// Discover trig: the first puzzle grows a 3-4-5 triangle (θ = 37°) to three sizes, measures each, tries opp + hyp (it
// changes, a star) and then opp ÷ hyp, which stays and is named sin 37°; the first turned puzzle stops at 40° (too
// big) and then 30°; the first reached puzzle picks the same difference, then the right length.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers.ts";

const open = async (page: Page, stars: number[]) => {
  await page.addInitScript((s) => localStorage.setItem("zeno.trigdiscover.v1", JSON.stringify({ stars: s })), stars);
  return boardWith(page, "Discover trig", ".live-trigDiscover");
};
const press = async (handle: Locator, key: string, times: number) => {
  await handle.focus();
  for (let i = 0; i < times; i++) await handle.press(key);
};
const shot = (page: Page, name: string) => page.screenshot({ path: test.info().outputPath(name) });

test("trigDiscover: grow the triangle, measure it, and find the column that stays the same", async ({ page }) => {
  const game = await open(page, [0, 0, 0, 0, 0, 0, 0, 0, 0]);
  await expect(game.getByText(/^θ stays 37°; the size is yours\. Find a number made from two sides/)).toBeVisible();
  const handle = game.getByRole("slider", { name: "The triangle's size" });
  const measure = game.getByRole("button", { name: "📏 Measure" });
  await measure.click();
  await measure.click();
  await expect(game.getByText(/^That size is in the table already/)).toBeVisible();
  // Bigger by the keys, then bigger again by dragging the corner up the slant.
  await press(handle, "ArrowUp", 4);
  await expect(handle).toHaveAttribute("aria-valuetext", "hyp 6");
  await measure.click();
  const at = (await handle.locator("circle").last().boundingBox())!;
  await page.mouse.move(at.x + at.width / 2, at.y + at.height / 2);
  await page.mouse.down();
  await page.mouse.move(at.x + at.width / 2 + 48, at.y + at.height / 2 - 36, { steps: 6 });
  await page.mouse.up();
  await expect(handle).not.toHaveAttribute("aria-valuetext", "hyp 6");
  await measure.click();
  await expect(game.getByText(/^Make a new column from two sides/)).toBeVisible();
  // opp + hyp changes as the triangle grows: a star.
  const pickIn = (group: string, name: string) => game.getByRole("group", { name: group }).getByRole("button", { name, exact: true }).click();
  await pickIn("First side", "opp");
  await pickIn("Combine with", "+");
  await pickIn("Second side", "hyp");
  await game.getByRole("button", { name: "✓ Stays the same!" }).click();
  await expect(game.getByText(/^opp \+ hyp changes: 6\.4, 9\.6, /)).toBeVisible();
  // opp ÷ hyp stays: it is sin 37°.
  await pickIn("Combine with", "÷");
  await expect(game.getByText("Tried before:")).toBeVisible();
  await shot(page, "discover-grow.png");
  await game.getByRole("button", { name: "✓ Stays the same!" }).click();
  await expect(game.getByText("opp ÷ hyp = 0.6 in every row: the size doesn't matter, only θ. This number has a name: sin 37°. ★★☆")).toBeVisible();
  // The hint, a step at a time.
  await game.getByRole("button", { name: "💡 Why?" }).click();
  await expect(game.getByRole("note")).toContainText("1/4 Make a triangle twice as big");
  await game.getByRole("button", { name: "Next step" }).click();
  await expect(game.getByRole("note")).toContainText("2/4 Adding or taking away doesn't keep up");
});

test("trigDiscover: turn θ until opp ÷ hyp is 0.5", async ({ page }) => {
  const game = await open(page, [2, 2, 2, 0, 0, 0, 0, 0, 0]);
  await game.getByRole("button", { name: /^Puzzle 4/ }).click();
  await expect(game.getByText("Now the hypotenuse stays 10 and θ turns. Find the angle where opp ÷ hyp = 0.5.")).toBeVisible();
  const handle = game.getByRole("slider", { name: "The angle θ" });
  await press(handle, "ArrowDown", 25);
  await expect(handle).toHaveAttribute("aria-valuetext", "40°");
  await game.getByRole("button", { name: "📏 Measure" }).click();
  await game.getByRole("button", { name: "✓ This angle" }).click();
  await expect(game.getByText(/^At 40°, opp ÷ hyp = 0\.64, more than 0\.5\. Make θ smaller\./)).toBeVisible();
  await press(handle, "ArrowDown", 10);
  await game.getByRole("button", { name: "📏 Measure" }).click();
  await shot(page, "discover-turn.png");
  await game.getByRole("button", { name: "✓ This angle" }).click();
  await expect(game.getByText("At 30°, opp ÷ hyp = 0.5, and so it is in every right triangle with a 30° corner: sin 30° = 0.5. ★★☆")).toBeVisible();
});

test("trigDiscover: a side too far to measure, from a small triangle with the same angle", async ({ page }) => {
  const game = await open(page, [2, 2, 2, 2, 2, 2, 0, 0, 0]);
  await game.getByRole("button", { name: /^Puzzle 7/ }).click();
  await expect(game.getByText("A triangle too big to measure: θ = 37° and its hypotenuse is 20. How long is its opposite?")).toBeVisible();
  await expect(game.getByText("opp ÷ hyp = 0.6 = sin 37°")).toBeVisible();
  await game.getByRole("button", { name: "18", exact: true }).click();
  await expect(game.getByText(/^18 keeps the same difference as the small triangle, but growing multiplies: every side is 4 times as long/)).toBeVisible();
  await shot(page, "discover-reach.png");
  await game.getByRole("button", { name: "12", exact: true }).click();
  await expect(game.getByText("Right! opposite = 20 × 3/5 = 12. Measure one small triangle and every triangle with that angle follows: that's trigonometry. ★★☆")).toBeVisible();
});

test("trigDiscover by hand: the triangle dragged into the table, a side dragged into its slot, a swipe through Why?", async ({ page }) => {
  const game = await open(page, [0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const handle = game.getByRole("slider", { name: "The triangle's size" });
  const pic = game.locator("svg.hand-pic").first();
  const drag = async (from: Locator, to: Locator | [number, number], down = 0) => {
    const a = (await from.boundingBox())!;
    const b = Array.isArray(to) ? { x: to[0], y: to[1], width: 0, height: 0 } : (await to.boundingBox())!;
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2 + down);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
    await page.mouse.up();
  };
  const tri = pic.locator("polygon").first();
  const p = (await pic.boundingBox())!;
  const table: [number, number] = [p.x + 470, p.y + 120];
  for (const n of [0, 4, 4]) {
    await press(handle, "ArrowUp", n);
    await drag(tri, table, 20);
  }
  await expect(game.getByText(/^Make a new column from two sides/)).toBeVisible();
  // opp dragged into the first slot, ÷ and hyp tapped.
  await drag(pic.getByRole("group", { name: "First side" }).getByRole("button", { name: "opp", exact: true }), pic.getByRole("button", { name: "First side: ?" }));
  await expect(pic.getByRole("button", { name: "First side: opp" })).toBeVisible();
  await pic.getByRole("group", { name: "Combine with" }).getByRole("button", { name: "÷", exact: true }).click();
  await pic.getByRole("group", { name: "Second side" }).getByRole("button", { name: "hyp", exact: true }).click();
  await shot(page, "discover-hand.png");
  await pic.getByRole("button", { name: "✓ Stays the same!" }).click();
  await expect(game.getByText(/opp ÷ hyp = 0\.6 in every row/)).toBeVisible();
  // Why?: a tap goes on, a swipe to the right goes back.
  await pic.getByRole("button", { name: "💡 Why?" }).click();
  const note = game.getByRole("note");
  await note.getByRole("button", { name: "Next step" }).click();
  await expect(note).toContainText("2/4 ");
  const box = (await note.boundingBox())!;
  await page.mouse.move(box.x + 200, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(box.x + 320, box.y + 30, { steps: 5 });
  await page.mouse.up();
  await expect(note).toContainText("1/4 ");
  await note.getByRole("button", { name: "3/4" }).click();
  await expect(note).toContainText("3/4 ");
  await shot(page, "discover-why.png");
});
