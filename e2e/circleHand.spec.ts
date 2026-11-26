// Circle theorems by hand (#715): the right tile tapped before C has moved is met with "move C first"; C pressed to a
// new place and moved by the keys keeps ∠ACB at half of ∠AOB; the slip (equal) and then the rule; the angle at the
// centre from the one at the circle; the right angle in a semicircle; opposite angles making 180°; and PA = PB however
// far P is.
import { expect, test } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

test("circle theorems by hand: move first, half the angle at the centre, the semicircle, the quadrilateral, equal tangents", async ({ page }) => {
  const piece = await boardWith(page, "Circle theorems: move the point by hand", ".live-circleHand");
  const pic = piece.locator("svg").first();
  const tile = (s: string) => pic.getByRole("button", { name: s, exact: true });
  const say = pic.locator("[data-say]");
  const point = pic.getByRole("slider");
  const turn = async (times: number, key = "ArrowLeft") => {
    await point.focus();
    for (let i = 0; i < times; i++) await point.press(key);
  };
  await expect(pic.locator("[data-ask]")).toContainText("∠AOB = 120°. Move C round the circle");

  await tile("half of ∠AOB").click();
  await expect(say).toHaveText("Move C to a few places first and watch the angles.");
  // Pressed on the circle up and to the left of O (at 150°): the centre is (330, 285) and the radius 125.
  const b = (await pic.boundingBox())!;
  const k = b.width / 720;
  await page.mouse.click(b.x + (330 + 125 * Math.cos((5 * Math.PI) / 6)) * k, b.y + (285 - 125 * Math.sin((5 * Math.PI) / 6)) * k);
  await turn(4, "ArrowRight");
  await expect(pic).toContainText("60°");
  await tile("equal to ∠AOB").click();
  await expect(say).toHaveText("Read them again: ∠AOB is 120° but ∠ACB is 60°. Are they equal?");
  await tile("half of ∠AOB").click();
  await expect(say).toContainText("An angle at the circle is half the angle at the centre on the same arc.");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/circleHand-compare.png` });

  // The angle at the centre from the one at the circle.
  await tile("Next").click();
  await turn(6);
  await tile("70°").click();
  await expect(say).toContainText("70° is ∠ACB, at the circle.");
  await tile("140°").click();
  await expect(say).toContainText("∠AOB = 2 × ∠ACB = 2 × 70° = 140°");

  // A semicircle.
  await tile("Next").click();
  await turn(6);
  await tile("90°").click();
  await expect(say).toContainText("An angle in a semicircle is a right angle.");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/circleHand-semi.png` });

  // The quadrilateral: ∠A + ∠C is 180°, not the whole turn.
  await tile("Next").click();
  await turn(6);
  await tile("360°").click();
  await expect(say).toContainText("360° is the whole way round the circle.");
  await tile("180°").click();
  await expect(say).toContainText("∠A + ∠C = 80° + 100° = 180°");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/circleHand-cyclic.png` });

  // Two tangents from P: they change together as P moves out.
  await tile("Next").click();
  const len = pic.locator("[data-len]");
  const before = await len.textContent();
  await turn(2, "ArrowUp");
  await expect(len).not.toHaveText(before!);
  await tile("it depends on P").click();
  await expect(say).toContainText("is one ever longer?");
  await tile("PA = PB").click();
  await expect(say).toContainText("mirror images: PA = PB");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/circleHand-tangents.png` });
  await tile("Next").click();
  await expect(pic.locator("[data-ask]")).toHaveText("All rounds done: move the point as you like");
});
