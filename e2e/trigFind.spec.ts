// Trig rules by hand (#716): the right tile tapped before P has moved is met with "move P first"; P pressed to a new
// place and moved by the keys keeps sin²θ + cos²θ at 1; the mirror P′ is just as high, sin(180° − θ) = sin θ; the three
// sine-rule ratios stay equal as C moves round the circle; and c² meets a² + b² only when the angle at C is 90°.
import { expect, test } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

test("trig rules by hand: the Pythagorean identity, the mirror, the sine rule, the cosine rule", async ({ page }) => {
  const piece = await boardWith(page, "Trig rules: find them by moving a point", ".live-trigFind");
  const pic = piece.locator("svg").first();
  const tile = (s: string) => pic.getByRole("button", { name: s, exact: true });
  const say = pic.locator("[data-say]");
  const point = pic.getByRole("slider");
  const turn = async (times: number, key = "ArrowLeft") => {
    await point.focus();
    for (let i = 0; i < times; i++) await point.press(key);
  };
  await expect(pic.locator("[data-ask]")).toContainText("P moves round a circle of radius 1");

  await tile("1, wherever P is").click();
  await expect(say).toHaveText("Move P to a few places first and watch the numbers.");
  // Pressed on the circle up and to the left of O (at 150°): the centre is (200, 270) and the radius 125.
  const b = (await pic.boundingBox())!;
  const k = b.width / 720;
  await page.mouse.click(b.x + (200 + 125 * Math.cos((5 * Math.PI) / 6)) * k, b.y + (270 - 125 * Math.sin((5 * Math.PI) / 6)) * k);
  await expect(pic).toContainText("θ = 150°");
  await turn(3);
  await tile("2").click();
  await expect(say).toContainText("is the total ever 2?");
  await tile("1, wherever P is").click();
  await expect(say).toContainText("Pythagoras gives the identity.");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/trigFind-pyth.png` });

  // The mirror: P′ is just as high as P.
  await tile("Next").click();
  await turn(3);
  await turn(3);
  await tile("the opposite, −sin θ").click();
  await expect(say).toContainText("Is P′ lower than P, or just as high?");
  await tile("the same").click();
  await expect(say).toContainText("sin(180° − θ) = sin θ");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/trigFind-mirror.png` });

  // The sine rule: the three ratios stay equal, and stay the circle's diameter.
  await tile("Next").click();
  await turn(3);
  await turn(3);
  await expect(pic).toContainText("a ÷ sin A = 8.00");
  await tile("they grow as C moves").click();
  await expect(say).toContainText("does it change?");
  await tile("equal, wherever C is").click();
  await expect(say).toContainText("That is the sine rule.");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/trigFind-sine.png` });

  // The cosine rule: c² = 25 only at 90°.
  await tile("Next").click();
  await turn(6, "ArrowUp");
  await expect(pic).toContainText("c² = 25.0");
  await tile("always: Pythagoras").click();
  await expect(say).toContainText("Pythagoras holds only in a right triangle.");
  await tile("only when C = 90°").click();
  await expect(say).toContainText("That is the cosine rule");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/trigFind-cosine.png` });
  await tile("Next").click();
  await expect(pic.locator("[data-ask]")).toHaveText("All rounds done: move the point as you like");
});
