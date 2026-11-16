// Number patterns as dots: the piece draws as many dots as the number, "Why?" explains the rule, primes make one row,
// and the games menu has a Number patterns section that holds it.
import { expect, test } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

test("number patterns: dots, why, primes and Fibonacci", async ({ page }) => {
  const piece = await boardWith(page, "Number patterns as dots", ".live-numberShapes");
  const shot = async (name: string) => SHOTS && (await piece.screenshot({ path: `${SHOTS}/${name}.png` }));
  // Square number 4: 16 dots, and the odd L-shapes.
  await expect(piece.locator("svg circle")).toHaveCount(16);
  await expect(piece).toContainText("4 rows of 4: 16 dots");
  await piece.getByRole("button", { name: "Why?" }).click();
  await expect(piece).toContainText("1 + 3 + 5 + 7 = 16");
  await shot("square");
  // Tapping 49 in the row picks figure 7.
  await piece.locator("svg text", { hasText: /^49$/ }).click();
  await expect(piece.locator("svg circle")).toHaveCount(49);
  // Triangle 4 with its copy: 4 rows of 5.
  await piece.getByRole("combobox").selectOption("triangle");
  await expect(piece.locator("svg circle")).toHaveCount(20);
  await expect(piece).toContainText("20 ÷ 2 = 10");
  await shot("triangle");
  await piece.getByRole("combobox").selectOption("cube");
  await shot("cube");
  // 12 makes three rectangles; 13 only the one row.
  await piece.getByRole("combobox").selectOption("prime");
  await expect(piece).toContainText("12 isn't prime: 1 × 12, 2 × 6, 3 × 4");
  await shot("composite");
  await piece.getByRole("button", { name: "One more" }).click();
  await expect(piece).toContainText("13 is prime");
  await expect(piece).toContainText("3 × 4 + 1");
  await shot("prime");
  await piece.getByRole("combobox").selectOption("fibonacci");
  await expect(piece).toContainText("3 + 5 = 8");
  await expect(piece.locator("svg rect")).toHaveCount(6 + 9);
  await shot("fibonacci");
});

test("the games menu has a Number patterns section", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /New board/ }).first().click();
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: "Games" }).click();
  await expect(page.getByText("Number patterns", { exact: true })).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/menu.png` });
  await page.getByRole("menuitem", { name: /Number patterns as dots/ }).click();
  await expect(page.locator(".live-numberShapes")).toBeVisible();
});
