// Discover Pythagoras: the first puzzle measures three right triangles (a and b each changed, one by dragging), tries
// a + b = c (it fails, a star) and then a² + b² = c², named Pythagoras' theorem; the first corner puzzle stops at 70°
// (c² too small) and then 90°; a side out of reach is first taken as the sides subtracted, then unrooted, then right.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers.ts";

const open = async (page: Page, stars: number[]) => {
  await page.addInitScript((s) => localStorage.setItem("zeno.pythdiscover.v1", JSON.stringify({ stars: s })), stars);
  return boardWith(page, "Discover Pythagoras", ".live-pythDiscover");
};
const press = async (handle: Locator, key: string, times: number) => {
  await handle.focus();
  for (let i = 0; i < times; i++) await handle.press(key);
};
const shot = (page: Page, name: string) => page.screenshot({ path: test.info().outputPath(name) });

test("pythDiscover: measure right triangles and find the rule that holds in every row", async ({ page }) => {
  const game = await open(page, [0, 0, 0, 0, 0, 0, 0, 0, 0]);
  await expect(game.getByText(/^A right triangle with a square on each side\. .* find how c is made from a and b in every row\./)).toBeVisible();
  const measure = game.getByRole("button", { name: "📏 Measure" });
  await measure.click();
  await measure.click();
  await expect(game.getByText(/^That triangle is in the table already/)).toBeVisible();
  await press(game.getByRole("slider", { name: "Side a" }), "ArrowUp", 1);
  await measure.click();
  // b one square longer, by dragging its end up.
  const b = game.getByRole("slider", { name: "Side b" });
  const at = (await b.locator("circle").last().boundingBox())!;
  await page.mouse.move(at.x + at.width / 2, at.y + at.height / 2);
  await page.mouse.down();
  await page.mouse.move(at.x + at.width / 2, at.y + at.height / 2 - 22, { steps: 5 });
  await page.mouse.up();
  await expect(b).toHaveAttribute("aria-valuetext", "b 4");
  await measure.click();
  await expect(game.getByText(/^Make a rule:/)).toBeVisible();
  const pickIn = (group: string, name: string) => game.getByRole("group", { name: group }).getByRole("button", { name, exact: true }).click();
  await pickIn("First side", "a");
  await pickIn("Combine with", "+");
  await pickIn("Second side", "b");
  await pickIn("Equals", "c");
  await game.getByRole("button", { name: "✓ Holds in every row!" }).click();
  await expect(game.getByText(/^a \+ b = c fails: with a = 2 and b = 3 it gives 5, not 3\.61\./)).toBeVisible();
  await pickIn("First side", "a²");
  await pickIn("Second side", "b²");
  await pickIn("Equals", "c²");
  await expect(game.getByText("Tried before:")).toBeVisible();
  await shot(page, "pyth-grow.png");
  await game.getByRole("button", { name: "✓ Holds in every row!" }).click();
  await expect(game.getByText("a² + b² = c² in every row: the squares on the two shorter sides together make the square on the longest. That's Pythagoras' theorem. ★★☆")).toBeVisible();
  await game.getByRole("button", { name: "💡 Why?" }).click();
  await expect(game.getByRole("note")).toContainText("1/4 Pythagoras is about squares.");
});

test("pythDiscover: open the corner until the squares fit", async ({ page }) => {
  const game = await open(page, [2, 2, 2, 0, 0, 0, 0, 0, 0]);
  await game.getByRole("button", { name: /^Puzzle 4/ }).click();
  await expect(game.getByText("Now a = 3 and b = 4 stay, and the corner C between them opens and closes. Find the corner where c² = a² + b².")).toBeVisible();
  const corner = game.getByRole("slider", { name: "The corner C" });
  await press(corner, "ArrowRight", 15);
  await game.getByRole("button", { name: "📏 Measure" }).click();
  await game.getByRole("button", { name: "✓ This corner" }).click();
  await expect(game.getByText(/^At 70°, c² = 16\.79: less than a² \+ b² = 25\. Open the corner wider\./)).toBeVisible();
  await press(corner, "ArrowRight", 20);
  await game.getByRole("button", { name: "📏 Measure" }).click();
  await shot(page, "pyth-turn.png");
  await game.getByRole("button", { name: "✓ This corner" }).click();
  await expect(game.getByText("At 90°, c² = 25 = a² + b²: only a right angle makes the squares fit. ★★☆")).toBeVisible();
});

test("pythDiscover: a shorter side out of reach", async ({ page }) => {
  const game = await open(page, [2, 2, 2, 2, 2, 2, 2, 0, 0]);
  await game.getByRole("button", { name: /^Puzzle 8/ }).click();
  await expect(game.getByText("Two sides of a right triangle are measured: a = 5, c = 13. The third is out of reach. How long is b?")).toBeVisible();
  await game.getByRole("button", { name: "8", exact: true }).click();
  await expect(game.getByText(/^8 takes one side from the other\. Pythagoras takes the squares away: b² = 13² − 5²\./)).toBeVisible();
  await game.getByRole("button", { name: "144", exact: true }).click();
  await expect(game.getByText(/^144 is the square, not the side: take its square root\./)).toBeVisible();
  await shot(page, "pyth-reach.png");
  await game.getByRole("button", { name: "12", exact: true }).click();
  await expect(game.getByText(/^Right! b² = 13² − 5² = 144, so b = √144 = 12\. ★☆☆/)).toBeVisible();
});
