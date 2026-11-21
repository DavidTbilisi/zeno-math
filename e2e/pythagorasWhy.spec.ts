// Why Pythagoras: SOH CAH TOA's hard puzzle opens its hint at the squares on the third side's step, and the geometry
// dialog's Pythagoras tool steps through the same explanation, from the squares to a missing shorter side.
import { expect, test } from "@playwright/test";
import { boardWith, insertGroup, insertPanel } from "./helpers.ts";

test("sohcahtoa: on the third side the hint opens at why Pythagoras holds", async ({ page }) => {
  // Puzzles 1 to 6 passed, so the first hard one (tan θ = 6/8) is open.
  await page.addInitScript(() => localStorage.setItem("zeno.sohcahtoa.v1", JSON.stringify({ stars: [2, 2, 2, 2, 2, 2, 0, 0, 0] })));
  const game = await boardWith(page, "SOH CAH TOA", ".live-sohcahtoa");
  await game.getByRole("button", { name: /^Puzzle 7/ }).click();
  await expect(game.getByText(/^tan θ = 6\/8\. Put 6 and 8 on the triangle/)).toBeVisible();
  // Place 6, then 8, trying the unlabelled sides in turn (a wrong one is told and costs a star).
  for (const v of [6, 8]) {
    for (let n = 1; n <= 3; n++) {
      if (!(await game.getByText(new RegExp(`Where does the ${v} go\\?`)).count())) break;
      const side = game.getByRole("button", { name: `side ${n} from the left`, exact: true });
      if (!(await side.count())) continue;
      await side.focus();
      await side.press("Enter");
    }
  }
  await expect(game.getByText("Now the third side. Which length is it?")).toBeVisible();
  await game.getByRole("button", { name: "💡 Why Pythagoras?" }).click();
  await expect(game.getByRole("note")).toContainText("6/10 Pythagoras is about squares.");
  await game.getByRole("button", { name: "Next step" }).click();
  await expect(game.getByRole("note")).toContainText("7/10 The two smaller squares together make the biggest: 9 + 16 = 25.");
  await game.getByRole("button", { name: "Next step" }).click();
  await expect(game.getByRole("note")).toContainText("8/10 Why? Fit four copies of the triangle");
  await page.screenshot({ path: test.info().outputPath("soh-pyth.png") });
  await game.getByRole("button", { name: "10", exact: true }).click();
  await expect(game.getByText(/^Build (sin|cos) θ\.$/)).toBeVisible();
});

test("geometry dialog: the Pythagoras tool steps through why a² + b² = c²", async ({ page, request }) => {
  const made = await (await request.post("/api/boards", { data: { title: "Pythagoras" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await insertGroup(page, /Geometry/);
  await insertPanel(page).getByRole("button", { name: /^📐\s*Geometry$/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio", { name: "Pythagoras" }).click();
  await expect(dialog.getByRole("note")).toHaveCount(0);
  await dialog.getByRole("button", { name: "💡 Why?" }).click();
  await expect(dialog.getByRole("note")).toContainText("1/5 Pythagoras is about squares.");
  for (let i = 0; i < 4; i++) await dialog.getByRole("button", { name: "Next step" }).click();
  await expect(dialog.getByRole("note")).toContainText("5/5 A shorter side missing? Take the squares away instead: √(5² − 4²) = √9 = 3.");
  await expect(dialog.getByRole("button", { name: "Next step" })).toBeDisabled();
  await page.screenshot({ path: test.info().outputPath("geo-pyth.png") });
});
