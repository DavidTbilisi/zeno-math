// Long division, worked by hand: the next digit tapped from the tiles (a wrong one answered with why) and typed, the
// working tapped for the next step, the step track dragged and keyed, and the numbers turned on their digit wheels.
import { expect, test } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

test("long division by hand: digit tiles, tap the working, the step track, digit wheels", async ({ page }) => {
  const piece = await boardWith(page, "Long division, step by step", ".live-division");
  const working = piece.getByRole("button", { name: "Next step" });
  const track = piece.getByRole("slider", { name: /^Steps/ });

  // 624 ÷ 12, your turn: 6 is too big, 5 is right; the 2 is typed on the working.
  await expect(piece).toContainText("How many times does 12 go into 62?");
  await piece.getByRole("button", { name: "6", exact: true }).click();
  await expect(piece).toContainText("6 × 12 = 72, more than 62");
  await piece.getByRole("button", { name: "5", exact: true }).click();
  await expect(piece).toContainText("Yes: 5 × 12 = 60.");
  await expect(piece).toContainText("How many times does 12 go into 24?");
  await working.press("2");
  await expect(piece).toContainText("Yes: 2 × 12 = 24.");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/longDivision.png` });

  // Your turn off: back to the start from the keyboard, a tap on the working is one step, the track dragged to the end.
  await piece.getByRole("button", { name: "Your turn", exact: true }).click();
  await track.press("Home");
  await expect(track).toHaveAttribute("aria-valuenow", "0");
  await working.click();
  await expect(track).toHaveAttribute("aria-valuenow", "1");
  const n = await track.getAttribute("aria-valuemax");
  const t = (await track.boundingBox())!;
  await page.mouse.move(t.x + 40, t.y + t.height / 2);
  await page.mouse.down();
  await page.mouse.move(t.x + t.width + 20, t.y + t.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(track).toHaveAttribute("aria-valuenow", n!);

  // The hundreds wheel up: 724; the faded wheel on the left up: 1724, and another faded one appears.
  const hundreds = piece.getByRole("slider", { name: "Number to divide: the 100s digit" });
  await hundreds.press("ArrowUp");
  await expect(hundreds).toHaveAttribute("aria-valuenow", "7");
  await expect(track).toHaveAttribute("aria-valuenow", "0");
  await piece.getByRole("slider", { name: "Number to divide: the 1000s digit" }).press("ArrowUp");
  await expect(piece.getByRole("slider", { name: "Number to divide: the 10000s digit" })).toBeVisible();
  // 12 turned down to 0: dividing by zero has no working.
  await piece.getByRole("slider", { name: "Divide by: the 10s digit" }).press("ArrowDown");
  for (let i = 0; i < 2; i++) await piece.getByRole("slider", { name: "Divide by: the 1s digit" }).press("ArrowDown");
  await expect(piece).toContainText("1724 ÷ 0 is undefined.");
});
