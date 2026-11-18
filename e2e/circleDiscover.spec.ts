// Discover the unit circle: the first puzzle measures three angles (one by dragging P), claims Q at 180° + θ (it
// fails, a star) and then 180° − θ, named sin(180° − θ) = sin θ; the first twin puzzle stops at 130° (sin too big)
// and then 140°; a value out of reach is first taken with the wrong sign, then from sin, then right.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers.ts";

const open = async (page: Page, stars: number[]) => {
  await page.addInitScript((s) => localStorage.setItem("zeno.circlediscover.v1", JSON.stringify({ stars: s })), stars);
  return boardWith(page, "Discover the unit circle", ".live-circleDiscover");
};
const press = async (handle: Locator, key: string, times: number) => {
  await handle.focus();
  for (let i = 0; i < times; i++) await handle.press(key);
};
const shot = (page: Page, name: string) => page.screenshot({ path: test.info().outputPath(name) });

test("circleDiscover: measure P and its mirror and find the rule that holds in every row", async ({ page }) => {
  const game = await open(page, [0, 0, 0, 0, 0, 0, 0, 0, 0]);
  await expect(game.getByText(/^P is on a circle of radius 1, and Q is its mirror across the up axis\./)).toBeVisible();
  const measure = game.getByRole("button", { name: "📏 Measure" });
  await measure.click();
  await measure.click();
  await expect(game.getByText(/^That angle is in the table already/)).toBeVisible();
  const p = game.getByRole("slider", { name: "Point P" });
  await press(p, "ArrowUp", 2);
  await measure.click();
  // P to 60° by dragging it round the circle.
  const box = (await game.locator("svg[role=img]").first().boundingBox())!;
  const k = box.width / 600;
  const from = (await p.locator("circle").last().boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + (150 + 118 * Math.cos(Math.PI / 3)) * k, box.y + (172 - 118 * Math.sin(Math.PI / 3)) * k, { steps: 6 });
  await page.mouse.up();
  await expect(p).toHaveAttribute("aria-valuetext", "60°");
  await measure.click();
  await expect(game.getByText(/^Make a rule for Q:/)).toBeVisible();
  const pickIn = (group: string, name: string) => game.getByRole("group", { name: group }).getByRole("button", { name, exact: true }).click();
  await pickIn("Q is at", "180° + θ");
  await pickIn("Q's across", "−x");
  await pickIn("Q's up", "y");
  await game.getByRole("button", { name: "✓ Holds in every row!" }).click();
  await expect(game.getByText(/^Q = \(−x, y\), 180° \+ θ fails: at θ = 30°, Q is at 150°, \(−0\.87, 0\.5\)\./)).toBeVisible();
  await pickIn("Q is at", "180° − θ");
  await expect(game.getByText("Tried before:")).toBeVisible();
  await shot(page, "circle-mirror.png");
  await game.getByRole("button", { name: "✓ Holds in every row!" }).click();
  await expect(game.getByText(/^Q = \(−x, y\), 180° − θ in every row\. So sin\(180° − θ\) = sin θ and cos\(180° − θ\) = −cos θ: .* ★★☆/)).toBeVisible();
  await game.getByRole("button", { name: "💡 Why?" }).click();
  await expect(game.getByRole("note")).toContainText("1/3 Q is P in a mirror");
  await shot(page, "circle-mirror-why.png");
});

test("circleDiscover: turn P round to the other angle with the same sin", async ({ page }) => {
  const game = await open(page, [2, 2, 2, 0, 0, 0, 0, 0, 0]);
  await game.getByRole("button", { name: /^Puzzle 4/ }).click();
  await expect(game.getByText("sin 40° = 0.64. Turn P all the way round and find the other angle where sin θ = 0.64.")).toBeVisible();
  const p = game.getByRole("slider", { name: "Point P" });
  await press(p, "ArrowUp", 26);
  await game.getByRole("button", { name: "📏 Measure" }).click();
  await game.getByRole("button", { name: "✓ This angle" }).click();
  await expect(game.getByText(/^At 130°, sin θ = 0\.77, not 0\.64\. sin is P's up: look for the point at the same height\./)).toBeVisible();
  await press(p, "ArrowUp", 2);
  await game.getByRole("button", { name: "📏 Measure" }).click();
  await shot(page, "circle-twin.png");
  await game.getByRole("button", { name: "✓ This angle" }).click();
  await expect(game.getByText("sin 140° = sin 40° = 0.64: the same height, mirrored across the up axis. ★★☆")).toBeVisible();
});

test("circleDiscover: a value past 90° out of reach", async ({ page }) => {
  const game = await open(page, [2, 2, 2, 2, 2, 2, 2, 0, 0]);
  await game.getByRole("button", { name: /^Puzzle 8/ }).click();
  await expect(game.getByText("Out of reach: what is cos 250°? From the first quarter you know sin 70° = 0.94 and cos 70° = 0.34.")).toBeVisible();
  await game.getByRole("button", { name: "0.34", exact: true }).click();
  await expect(game.getByText(/^0\.34 has the right size but the wrong sign: at 250° P is left of the up axis, so cos 250° is negative\./)).toBeVisible();
  await game.getByRole("button", { name: "−0.94", exact: true }).click();
  await expect(game.getByText(/^−0\.94 uses sin 70°, the up, but cos is the across\./)).toBeVisible();
  await shot(page, "circle-reach.png");
  await game.getByRole("button", { name: "−0.34", exact: true }).click();
  await expect(game.getByText(/^Right! 250° mirrors 70°, so cos 250° = −0\.34\. ★☆☆/)).toBeVisible();
  await game.getByRole("button", { name: "💡 Why?" }).click();
  await shot(page, "circle-reach-why.png");
});
