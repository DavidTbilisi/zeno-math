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
