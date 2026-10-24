// Interview problems: the piece goes on the board from the Shapes panel on Two Number Sum, steps to its answer, says
// why a target that is not a whole number cannot be used, and comes back to the example; another category opens on
// its first problem, and the system design questions walk through Slack to its estimates.
import { expect, test } from "@playwright/test";
import { boardWith } from "./helpers.ts";

// The piece is tall: a taller window keeps its top clear of the board's toolbar.
test.use({ viewport: { width: 1280, height: 1000 } });

test("interview problems: step to an answer, a bad input says why, and system design walks through", async ({ page }) => {
  const piece = await boardWith(page, "Interview problems, step by step", ".live-problems");
  await expect(piece.getByRole("combobox", { name: "Problem" })).toHaveValue("twoNumberSum");

  await piece.getByRole("button", { name: "To the answer" }).click();
  await expect(piece.locator(".live-said.ok")).toHaveText("9 + 1 = 10");
  await piece.getByRole("button", { name: "Step back" }).click();
  await expect(piece.locator(".live-said.info").first()).toHaveText("1: is 10 − 1 = 9 in the set? Yes!");

  await piece.getByRole("textbox", { name: "Target sum" }).fill("ten");
  await piece.getByRole("textbox", { name: "Target sum" }).press("Enter");
  await expect(piece.locator(".live-said")).toHaveText(/whole number from −999 to 999/);
  await piece.getByRole("button", { name: "Example" }).click();
  await expect(piece.getByRole("textbox", { name: "Target sum" })).toHaveValue("10");

  await piece.getByRole("combobox", { name: "Category" }).selectOption("lists");
  await expect(piece.getByRole("combobox", { name: "Problem" })).not.toHaveValue("twoNumberSum");
  await expect(piece.locator("svg")).toBeVisible();

  await piece.getByRole("combobox", { name: "Category" }).selectOption("sysDesigns");
  await piece.getByRole("combobox", { name: "Problem" }).selectOption("designSlack");
  await piece.getByRole("button", { name: "To the answer" }).click();
  await expect(piece.locator(".live-said.ok")).toContainText("Plan for 13.9 K messages a second at the peak");
  await page.screenshot({ path: test.info().outputPath("slack.png") });
});
