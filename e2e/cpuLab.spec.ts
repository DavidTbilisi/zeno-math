// The tiny computer (#844) by hand: the book's program stepped on the clock, then run to HALT and checked; a program
// typed into the cells; the keyboard and the display plugged into their ports for the book's problem 3.1.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;
const NAME = "A tiny computer: fetch, decode, execute";

async function dragTo(page: Page, from: Locator, to: Locator) {
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 });
  await page.mouse.up();
}

test("tiny computer: the book's program, one step of the cycle a tap, then run to HALT", async ({ page }) => {
  const piece = await boardWith(page, NAME, ".live-cpuLab");
  const pic = piece.locator("svg.hand-pic");
  const clock = pic.getByRole("button", { name: "One step: tap the clock" });
  await expect(piece).toContainText("The book's program");
  await clock.click();
  await expect(pic.locator("[data-move='f1']")).toContainText("MAR ← PC");
  await clock.click();
  await expect(pic.locator("[data-move='f2']")).toContainText("the word at 300");
  await clock.click();
  await clock.click();
  await expect(pic.locator("[data-move='d']")).toContainText("LOAD");
  await pic.getByRole("button", { name: "Run" }).click();
  await expect(piece).toContainText("Every test passes!", { timeout: 15000 });
  await expect(pic.locator("g[data-cell='941']")).toContainText("0005");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/cpu-book.png` });
});

test("tiny computer: a program typed into the cells adds 940 and 941 into 942", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("zeno.cpulab.v1", JSON.stringify({ stars: [3, 0, 0, 0, 0, 0] })));
  const piece = await boardWith(page, NAME, ".live-cpuLab");
  const puzzle = piece.getByRole("button", { name: /^Puzzle 2/ });
  await puzzle.focus();
  await puzzle.press("Enter");
  await expect(piece).toContainText("Write your own");
  const pic = piece.locator("svg.hand-pic");
  for (const [a, text] of [["300", "LOAD 940"], ["301", "ADD 941"], ["302", "STORE 942"]]) {
    await pic.locator(`g[data-cell='${a}']`).click();
    const field = piece.getByRole("textbox", { name: new RegExp(`cell ${a}`) });
    await field.fill(text);
    await field.press("Enter");
  }
  await expect(pic.locator("g[data-cell='302']")).toContainText("2942");
  await pic.getByRole("button", { name: "Run" }).click();
  await expect(piece).toContainText("Every test passes!", { timeout: 15000 });
});

test("tiny computer: nothing plugged in waits; keyboard on 5 and display on 6 run problem 3.1", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("zeno.cpulab.v1", JSON.stringify({ stars: [3, 3, 0, 0, 0, 0] })));
  const piece = await boardWith(page, NAME, ".live-cpuLab");
  const puzzle = piece.getByRole("button", { name: /^Puzzle 3/ });
  await puzzle.focus();
  await puzzle.press("Enter");
  await expect(piece).toContainText("problem 3.1");
  const pic = piece.locator("svg.hand-pic");
  await pic.getByRole("button", { name: "Run" }).click();
  await expect(pic.locator("[data-move='wait']")).toContainText("Waiting on port 5");

  await dragTo(page, pic.getByRole("button", { name: "The keyboard's plug: drag it to a port" }), pic.locator("g[data-port='5'] rect"));
  await expect(pic.locator("g[data-device='keyboard']")).toHaveAttribute("data-plugged", "5");
  await dragTo(page, pic.getByRole("button", { name: "The display's plug: drag it to a port" }), pic.locator("g[data-port='6'] rect"));
  await expect(pic.locator("g[data-device='display']")).toHaveAttribute("data-plugged", "6");
  await pic.getByRole("button", { name: "Run" }).click();
  await expect(piece).toContainText("Every test passes!", { timeout: 15000 });
  await expect(pic.locator("[data-shown]")).toHaveAttribute("data-shown", "5");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/cpu-ports.png` });
});
