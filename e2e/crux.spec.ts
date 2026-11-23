// Find the crux: the equations ladder from its first puzzle to its first scrambled one. A step that is not the crux is
// told it is routine; the crux by its number reveals the steps worked, the crux tagged, and the line on why; a crux
// that is not the first step found first time is noticed; scrambled, the crux first and then the steps in order, a
// step tapped before the one it needs not taken.
import { expect, test, type Locator } from "@playwright/test";
import { cruxNow, eqText, type EqCruxStep } from "../src/math/crux.ts";
import { boardWith } from "./helpers.ts";

test("find the crux: a routine step is told so, the crux reveals the steps and why, scrambled the order after", async ({ page }) => {
  const game = await boardWith(page, "Find the crux: equations", ".live-cruxEq");
  const now = (stage: number) => cruxNow({ group: "eq", mode: "puzzle", stage, level: 1, seed: 1 });
  // Excalidraw's toolbar can cover the top of the piece: steps are pressed by focus and Enter.
  const step = (at: number) => game.getByRole("button", { name: new RegExp(`^${at + 1}: `) });
  const press = async (b: Locator) => {
    await b.focus();
    await b.press("Enter");
  };
  const next = async () => press(game.getByRole("button", { name: "Next →" }));

  // Puzzle 1, in order: x on both sides, its crux the first step.
  const t0 = now(0);
  expect(t0.problem.kind).toBe("both");
  await expect(game.getByText("Find the crux: which step does the whole problem hinge on? Don't work it out: tap that step.")).toBeVisible();
  await expect(game.getByRole("img", { name: `The problem: Solve: ${t0.problem.show}` })).toBeVisible();
  await press(step(1));
  await expect(game.getByText(/^Not that one: once the crux is seen, that step is routine\./)).toBeVisible();
  // The crux by its number: the steps shown worked, the crux tagged, the why.
  await step(0).focus();
  await page.keyboard.press("1");
  const crux0 = t0.problem.steps[0] as EqCruxStep;
  await expect(step(0)).toHaveAccessibleName(`1: Take ${crux0.n} from both sides. = ${eqText(crux0.eq)} (★ crux)`);
  await expect(game.getByText(new RegExp(`^Taking ${crux0.n} from both sides leaves x in one place only: .* Crux found! ★★☆`))).toBeVisible();
  await page.screenshot({ path: "test-results/crux-revealed.png" });

  // Puzzle 2: a bracket and another x, the crux the second step, found first time.
  await next();
  const t1 = now(1);
  expect(t1.problem.crux).toBe(1);
  await step(1).focus();
  await page.keyboard.press("2");
  await expect(game.getByText(/^The crux wasn't the first step, and you found it first time!/)).toBeVisible();
  // Puzzle 3, the same way.
  await next();
  await step(now(2).order.indexOf(now(2).problem.crux)).focus();
  await page.keyboard.press(String(now(2).order.indexOf(now(2).problem.crux) + 1));
  await expect(game.getByText(/Crux found! ★★★/)).toBeVisible();

  // Puzzle 4, scrambled: the crux first, then the order.
  await next();
  const t3 = now(3);
  expect(t3.scrambled).toBe(true);
  const at = (s: number) => t3.order.indexOf(s);
  await press(step(at(t3.problem.crux)));
  await expect(game.getByText("That's the crux! Now tap the steps in the order you would work them.")).toBeVisible();
  await expect(game.getByText("Now the order: tap the steps in the order you would work them.")).toBeVisible();
  // The division before the step it needs is not taken.
  await press(step(at(2)));
  await expect(game.getByText(/^Not yet: that step uses something found in a step that comes before it\./)).toBeVisible();
  for (const s of [0, 1, 2]) await press(step(at(s)));
  await expect(game.getByText(/Crux and order found! ★★☆/)).toBeVisible();
  await expect(step(at(2))).toHaveAccessibleName(new RegExp(`= x = `));
  await page.screenshot({ path: "test-results/crux-scrambled.png" });
});
