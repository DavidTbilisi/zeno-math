// The ruler and the scale, worked by hand: a wrong tile met with a question, the right one with its rule; the ruler
// moved by the keys and by a drag, the rule's marks following it; a weight dragged onto the pan and a fruit read off
// a dial whose small marks are worth 25 g.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

async function drag(page: Page, from: Locator, dx: number, dy = 0) {
  const b = (await from.boundingBox())!;
  const [x, y] = [b.x + b.width / 2, b.y + b.height / 2];
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 10 });
  await page.mouse.up();
}

test("ruler and scale by hand: the end mark is no length, the ruler moved, a small mark's worth found", async ({ page }) => {
  const piece = await boardWith(page, "Ruler and scale: measure by hand", ".live-measureHand");
  const pic = piece.locator("svg").first();
  const tile = (s: string) => pic.getByRole("button", { name: s, exact: true });
  const say = pic.locator("[data-say]");
  await expect(pic.locator("[data-ask]")).toHaveText("How long is the pencil?");

  // Round 1: the pencil starts at 0.
  await tile("9 cm").click();
  await expect(say).toHaveText("Look again at both ends of the pencil.");
  await tile("7 cm").click();
  await expect(say).toHaveText("The pencil starts at 0, so the mark at its point is its length: 7 cm.");

  // Round 2: the pencil lies from 3 to 11; the end mark is the slip.
  await pic.getByRole("button", { name: "Next" }).click();
  await tile("11 cm").click();
  await expect(say).toHaveText("That's the mark at the pencil's point. Where does the pencil start?");
  await tile("8 cm").click();
  await expect(say).toContainText("The pencil goes from 3 to 11: 11 − 3 = 8 cm.");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/measureHand-ruler.png` });
  // Two half-centimetre steps by the keys: the marks change, the difference doesn't.
  const ruler = pic.getByRole("slider");
  await ruler.focus();
  await ruler.press("ArrowRight");
  await ruler.press("ArrowRight");
  await expect(say).toContainText("The pencil goes from 2 to 10: 10 − 2 = 8 cm.");
  // Dragged 2 cm further right, the ruler's 0 is under the pencil's end.
  await drag(page, ruler, 64);
  await expect(say).toHaveText("The pencil starts at 0, so the mark at its point is its length: 8 cm.");

  // The scale: the 25 g weight dragged onto the pan moves the needle one small mark.
  await pic.getByRole("button", { name: "Scale", exact: true }).click();
  await expect(pic.locator("[data-ask]")).toHaveText("What is one small mark worth?");
  await tile("1 g").click();
  await expect(say).toHaveText("Put the 25 g weight on the pan and watch the needle.");
  const weight = pic.locator("g[data-tray='25']");
  const [wb, pb] = [(await weight.boundingBox())!, (await pic.locator("[data-panzone]").boundingBox())!];
  await drag(page, weight, pb.x + pb.width / 2 - (wb.x + wb.width / 2), pb.y - 10 - (wb.y + wb.height / 2));
  await expect(pic.locator("g[data-pan]")).toHaveCount(1);
  await tile("25 g").click();
  await expect(say).toHaveText("The 25 g weight moved the needle one small mark: each small mark is 25 g, and 4 of them make 100 g.");

  // A pear on a dial marked every 25 g: 203 g counts each mark as 1.
  await pic.getByRole("button", { name: "Next" }).click();
  await expect(pic.locator("[data-ask]")).toHaveText("How heavy is the pear?");
  await tile("203 g").click();
  await expect(say).toHaveText("Is each small mark really 1 g? Count the spaces from one number to the next.");
  await tile("275 g").click();
  await expect(say).toHaveText("From 200 to 300 there are 4 spaces, so each is 25 g: 200 + 3 × 25 = 275 g.");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/measureHand-scale.png` });
});
