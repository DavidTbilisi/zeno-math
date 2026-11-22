// Guess my rule by hand: number balls dragged into the machine, the answer made by dragging digits into the slot (a
// wrong last digit dragged back out), and the check pill beside it.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { rng } from "../src/math/random.ts";
import { MACHINE_LADDER, machineAnswer, machineTask } from "../src/math/machine.ts";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

async function drag(page: Page, from: Locator, to: Locator | { x: number; y: number }) {
  const at = async (l: Locator | { x: number; y: number }) => {
    if (!("boundingBox" in l)) return l;
    const b = (await l.boundingBox())!;
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  const [a, b] = [await at(from), await at(to)];
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
}

test("guess my rule by hand: balls dragged into the machine, digits into the answer", async ({ page }) => {
  const game = await boardWith(page, "Guess my rule: the function machine", ".live-machine");
  const pic = game.locator("svg").first();
  const t = machineTask(MACHINE_LADDER[0].level, rng(MACHINE_LADDER[0].seed));
  const box = (await pic.boundingBox())!;
  const k = box.width / 520;
  const machine = { x: box.x + 265 * k, y: box.y + 45 * k };
  const ball = (n: number) => pic.getByRole("group", { name: "Put in:" }).getByRole("button", { name: String(n), exact: true });
  const ask = `What comes out when ${t.ask.dir === "out" ? t.ask.n : ""} goes in?`;
  const slot = pic.getByRole("textbox", { name: ask });
  const digit = (c: string) => pic.getByRole("group", { name: ask }).getByRole("button", { name: c, exact: true });

  await expect(async () => {
    await drag(page, ball(2), machine);
    await expect(ball(2)).toHaveAttribute("aria-pressed", "true", { timeout: 1000 });
  }).toPass();
  // A ball let go short of the machine stays out.
  await drag(page, ball(5), { x: box.x + 300 * k, y: box.y + 180 * k });
  await expect(ball(5)).toHaveAttribute("aria-pressed", "false");
  await drag(page, ball(3), machine);
  await expect(ball(3)).toHaveAttribute("aria-pressed", "true");

  // The answer's digits dragged into the slot, a stray 9 too, which is dragged back out.
  const answer = String(machineAnswer(t));
  for (const c of answer) await drag(page, digit(c), slot);
  await drag(page, digit("9"), slot);
  await expect(slot).toHaveText(`${answer}9`);
  await drag(page, pic.getByRole("button", { name: "Rub out the last digit" }), { x: box.x + 300 * k, y: box.y + 180 * k });
  await expect(slot).toHaveText(answer);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/machine.png` });
  await pic.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(/^Right! The rule is/)).toBeVisible();
});
