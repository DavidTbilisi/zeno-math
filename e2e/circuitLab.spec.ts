// The circuit lab (#841) by hand: a NAND gate dragged from the tray, wired from the switch into both its inputs and on
// to the lamp, wins the first puzzle; the switch and a row of the table light and dim the lamp; a cut wire breaks it and
// a gate dropped in the bin is gone.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

async function dragTo(page: Page, from: Locator, to: Locator | { x: number; y: number }) {
  const a = (await from.boundingBox())!;
  const b = "x" in to ? { x: to.x, y: to.y, width: 0, height: 0 } : (await to.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 });
  await page.mouse.up();
}

test("circuit lab by hand: NOT from NAND, switches, the table, a cut wire and the bin", async ({ page }) => {
  const piece = await boardWith(page, "Circuit lab: gates and wires", ".live-circuitLab");
  const pic = piece.locator("svg.hand-pic");
  await expect(piece).toContainText("Make NOT from one NAND gate");

  // A NAND gate from the tray to the middle of the board.
  const board = (await pic.boundingBox())!;
  await dragTo(page, pic.getByRole("button", { name: "Add a NAND gate" }), { x: board.x + board.width * 0.35, y: board.y + board.height * 0.5 });
  const gate = pic.locator("g[data-gate='g1']");
  await expect(gate).toHaveAttribute("data-kind", "nand");

  // The switch into both inputs, the gate on to the lamp.
  const out = (id: string) => pic.locator(`circle[data-out='${id}']`);
  const pin = (id: string) => pic.locator(`circle[data-in='${id}']`);
  await dragTo(page, out("i0"), pin("g1.0"));
  await expect(piece).toContainText("1 of 2 rows");
  await dragTo(page, out("i0"), pin("g1.1"));
  await dragTo(page, out("g1"), pin("o0.0"));
  await expect(piece).toContainText("Every row right! Gates used: 1.");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/circuit-not.png` });

  // The switch off: the lamp on; flipped, the lamp goes out; a row of the table sets the switch back.
  const lamp = pic.getByRole("img", { name: /^Y = / });
  await expect(lamp).toHaveAccessibleName("Y = 1");
  await pic.getByRole("switch", { name: "Switch A" }).click();
  await expect(pic.getByRole("switch", { name: "Switch A" })).toHaveAttribute("aria-checked", "true");
  await expect(lamp).toHaveAccessibleName("Y = 0");
  await pic.getByRole("button", { name: "Set the switches to 0" }).click();
  await expect(lamp).toHaveAccessibleName("Y = 1");

  // Free play: a gate in the bin is gone with its wires; a cut wire takes its value away.
  await piece.getByRole("button", { name: /Free play/ }).click();
  await expect(piece).toContainText("Free play: every gate");
  await dragTo(page, pic.getByRole("button", { name: "Add a NOT gate" }), { x: board.x + board.width * 0.3, y: board.y + board.height * 0.4 });
  await dragTo(page, out("i0"), pin("g1.0"));
  await dragTo(page, out("g1"), pin("o0.0"));
  await expect(pic.getByRole("img", { name: /^X = / })).toHaveAccessibleName("X = 1");
  await pic.locator("g[data-wire='g1>o0.0'] path").nth(1).click();
  await expect(pic.locator("g[data-wire='g1>o0.0']")).toHaveCount(0);
  await expect(pic.getByRole("img", { name: /^X = / })).toHaveAccessibleName("X = 0");
  await dragTo(page, gate.locator("path").first(), pic.getByRole("button", { name: /Drop a gate here/ }));
  await expect(pic.locator("g[data-gate]")).toHaveCount(0);
  await expect(pic.locator("g[data-wire]")).toHaveCount(0);
});

test("memory by hand: an S–R latch from two NOR gates keeps Q once both switches are off", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("zeno.circuitlab.v1", JSON.stringify({ stars: [3, 3, 3, 3, 3, 3, 3, 0, 0, 0, 0] })));
  const piece = await boardWith(page, "Circuit lab: gates and wires", ".live-circuitLab");
  await piece.getByRole("button", { name: /^Puzzle 8/ }).click();
  await expect(piece).toContainText("Make it remember");
  const pic = piece.locator("svg.hand-pic");
  const nor = pic.getByRole("button", { name: "Add a NOR gate" });
  await nor.focus();
  await nor.press("Enter");
  await nor.press("Enter");
  await expect(pic.locator("g[data-gate]")).toHaveCount(2);

  // Q = NOR(R, Q̄) and Q̄ = NOR(S, Q): each gate fed by the other.
  const out = (id: string) => pic.locator(`circle[data-out='${id}']`);
  const pin = (id: string) => pic.locator(`circle[data-in='${id}']`);
  for (const [a, b] of [["i1", "g1.0"], ["g2", "g1.1"], ["i0", "g2.0"], ["g1", "g2.1"]]) await dragTo(page, out(a), pin(b));
  await dragTo(page, out("g1"), pin("o0.0"));
  await expect(piece).toContainText("Every row right! Gates used: 2.");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/circuit-latch.png` });

  // By hand: S on and off again leaves Q at 1; R on and off leaves it at 0.
  const lamp = pic.getByRole("img", { name: /^Q = / });
  const s = pic.getByRole("switch", { name: "Switch S" });
  const r = pic.getByRole("switch", { name: "Switch R" });
  await s.click();
  await s.click();
  await expect(lamp).toHaveAccessibleName("Q = 1");
  await r.click();
  await r.click();
  await expect(lamp).toHaveAccessibleName("Q = 0");
  // A row of the strip replays the rows before it: step 4 is after a set, so Q is 1.
  await pic.getByRole("button", { name: /^Run the rows to step 4,/ }).click();
  await expect(lamp).toHaveAccessibleName("Q = 1");
});

test("chips by hand: a 3-bit counter from counter-bit chips counts up in decimal", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("zeno.circuitlab.v1", JSON.stringify({ stars: Array.from({ length: 17 }, (_, k) => (k < 16 ? 3 : 0)) })));
  const piece = await boardWith(page, "Circuit lab: gates and wires", ".live-circuitLab");
  const pic = piece.locator("svg.hand-pic");
  // The 4-bit ALU puzzle first, for its ten small switches and the decimal table.
  await piece.getByRole("button", { name: /^Puzzle 15/ }).click();
  await expect(pic.getByRole("switch")).toHaveCount(10);
  await pic.getByRole("button", { name: "Add a ALU gate" }).press("Enter");
  await expect(pic.locator("g[data-gate='g1'] circle[data-in]")).toHaveCount(5);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/circuit-alu.png` });

  await piece.getByRole("button", { name: /^Puzzle 17/ }).click();
  await expect(piece).toContainText("Count to seven");
  for (const name of ["T FF", "NOT", "T FF", "NOT", "T FF"]) await pic.getByRole("button", { name: `Add a ${name} gate` }).press("Enter");
  await expect(pic.locator("g[data-gate]")).toHaveCount(5);
  const out = (id: string) => pic.locator(`circle[data-out='${id}']`);
  const pin = (id: string) => pic.locator(`circle[data-in='${id}']`);
  for (const [a, b] of [["i0", "g1.0"], ["g1", "g2.0"], ["g2", "g3.0"], ["g3", "g4.0"], ["g4", "g5.0"], ["g1", "o2.0"], ["g3", "o1.0"], ["g5", "o0.0"]])
    await dragTo(page, out(a), pin(b));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/circuit-counter.png` });
  await expect(piece).toContainText("Every row right! Gates used: 5.");
});
