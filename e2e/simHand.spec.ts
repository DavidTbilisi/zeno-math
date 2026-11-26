// Similar triangles by hand (#714): even the right tile, tapped before stretching, is met with "stretch it first"; the
// copy pressed at A′B′ = 6 shows each side grew × 2; the slip (what A′B′ gained added) and then the rule; the keys
// stretch it after that; the angle stays; DEF cannot be covered when one side sticks out, and can when it fits; and the
// stick's shadow stretched to the tree's.
import { expect, test } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

test("similar triangles by hand: stretch first, every side × k, the angle kept, DEF covered or not, a tree's shadow", async ({ page }) => {
  const piece = await boardWith(page, "Similar triangles: stretch the copy by hand", ".live-simHand");
  const pic = piece.locator("svg").first();
  const tile = (s: string) => pic.getByRole("button", { name: s, exact: true });
  const say = pic.locator("[data-say]");
  await expect(pic.locator("[data-ask]")).toHaveText("Stretch the copy until A′B′ = 6. How long is B′C′?");

  await tile("8").click();
  await expect(say).toHaveText("Stretch the copy until A′B′ is 6 first, and watch its sides.");
  // Pressed where the copy's corner goes for A′B′ = 6: the unit is 310 / 16 = 19.375, A′ at 40 + 3 × 19.375 + 60.
  const b = (await pic.boundingBox())!;
  const k = b.width / 720;
  await page.mouse.click(b.x + (158.125 + 6 * 19.375) * k, b.y + 370 * k);
  await expect(pic.locator("[data-grew]")).toBeVisible();
  await tile("7").click();
  await expect(say).toHaveText("7 adds to that side what A′B′ gained. A′B′ is 2 times AB: what happened to the other sides?");
  await tile("8").click();
  await expect(say).toHaveText("Every side grew 2 times, so B′C′ = 2 × 4 = 8. Similar shapes multiply every length by one number.");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/simHand-side.png` });

  // Round 2 by the keys: half a step makes × 1.5.
  await tile("Next").click();
  const copy = pic.getByRole("slider");
  await copy.focus();
  await copy.press("ArrowRight");
  await tile("7.5").click();
  await expect(say).toContainText("A′C′ = 1.5 × 5 = 7.5");

  // The angle: three times as big, the corner just as wide.
  await tile("Next").click();
  await copy.focus();
  for (let i = 0; i < 4; i++) await copy.press("ArrowRight");
  await tile("111°").click();
  await expect(say).toHaveText("The sides grew 3 times. Did the corner at A′ open any wider?");
  await tile("37°").click();
  await expect(say).toContainText("∠A′ = ∠A = 37°");

  // DEF 6 by 9: at A′B′ = 6 the copy's B′C′ is 8, not 9.
  await tile("Next").click();
  await copy.focus();
  await tile("similar").click();
  await expect(say).toHaveText("Stretch the copy until A′B′ lies along DE first, then look at the top corner.");
  for (let i = 0; i < 2; i++) await copy.press("ArrowRight");
  await tile("similar").click();
  await expect(say).toHaveText("Look at the top corner: B′C′ is 8 but EF is 9. Stretch further and A′B′ passes DE. No stretch fits both.");
  await tile("not similar").click();
  await expect(say).toContainText("6 ÷ 3 = 2 but 9 ÷ 4 = 2.25");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/simHand-test.png` });

  // DEF 10 by 7.5 is the copy × 2.5.
  await tile("Next").click();
  await copy.focus();
  for (let i = 0; i < 3; i++) await copy.press("ArrowRight");
  await tile("similar").click();
  await expect(say).toContainText("10 ÷ 4 = 7.5 ÷ 3 = 2.5");

  // The stick's shadow stretched to the tree's: the height four times, not 9 more.
  await tile("Next").click();
  await copy.focus();
  for (let i = 0; i < 6; i++) await copy.press("ArrowRight");
  await tile("11").click();
  await expect(say).toContainText("11 adds to the height what the shadow gained");
  await tile("8").click();
  await expect(say).toContainText("the tree is 4 × 2 = 8 m");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/simHand-shadow.png` });
  await tile("Next").click();
  await expect(pic.locator("[data-ask]")).toHaveText("All rounds done: stretch the copy as you like");
});
