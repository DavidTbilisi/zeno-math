// The pipeline (#858): bubbles by hand, forwarding wires laid by drag, a load-use stall reordered away, and the jump's
// wrong path flushed.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;
const NAME = "The pipeline: five instructions at once";
const press = async (l: Locator) => {
  await l.focus();
  await l.press("Enter");
};
const open = async (page: Page, n: number) => {
  await page.addInitScript((k) => localStorage.setItem("zeno.pipelinelab.v1", JSON.stringify({ stars: [3, 3, 3, 3].map((s, i) => (i < k ? s : 0)) })), n - 1);
  const piece = await boardWith(page, NAME, ".live-pipelineLab");
  if (n > 1) await press(piece.getByRole("button", { name: new RegExp(`^Puzzle ${n}`) }));
  return { piece, pic: piece.locator("svg.hand-pic") };
};
const drag = async (page: Page, from: Locator, to: Locator) => {
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 });
  await page.mouse.up();
};

test("stalls by hand: a bubble added and taken out, two clear the hazard", async ({ page }) => {
  const { piece, pic } = await open(page, 1);
  await expect(pic.locator("[data-hazards]")).toHaveAttribute("data-hazards", "1");
  const sub = pic.getByRole("button", { name: "SUB R4, R1, R5: tap to add a bubble before it" });
  await sub.click();
  await expect(piece).toContainText("SUB R4, R1, R5 wants R1 at tick 4, but ADD R1, R2, R3 has it only from tick 5.");
  await pic.getByRole("button", { name: "A bubble before SUB R4, R1, R5: tap to take it out" }).click();
  await expect(pic.locator("g[data-bubble]")).toHaveCount(0);
  await sub.click();
  await sub.click();
  await expect(piece).toContainText("Done! ★★★");
  await expect(pic.locator("[data-ticks]")).toHaveAttribute("data-ticks", "9");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/pipe-stall.png` });
});

test("forwarding: wires laid by drag, then the bubbles come out", async ({ page }) => {
  const { piece, pic } = await open(page, 2);
  const row = (x: string) => pic.getByRole("button", { name: `${x}: tap to add a bubble before it` });
  await drag(page, row("OR R6, R4, R2"), row("SUB R4, R1, R5"));
  await drag(page, row("ADD R1, R2, R3"), row("OR R6, R4, R2"));
  await expect(piece).toContainText("doesn't read anything");
  await drag(page, row("ADD R1, R2, R3"), row("SUB R4, R1, R5"));
  await drag(page, row("SUB R4, R1, R5"), row("OR R6, R4, R2"));
  await expect(pic.locator("[data-link='0-1']")).toHaveAttribute("data-hazard", "0");
  for (let k = 0; k < 4; k++) await pic.locator("g[data-bubble]").first().click();
  await expect(piece).toContainText("Done! ★★");
  await expect(pic.locator("[data-ticks]")).toHaveAttribute("data-ticks", "7");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/pipe-forward.png` });
});

test("load-use: an illegal move is refused, SUB moved into the gap removes the bubble", async ({ page }) => {
  const { piece, pic } = await open(page, 3);
  const name = (x: string) => pic.getByRole("button", { name: `${x}: drag up or down to move it` });
  await drag(page, name("ADD R2, R1, R3"), name("LOAD R1, [A]"));
  await expect(piece).toContainText("share a register");
  await drag(page, name("SUB R4, R5, R6"), name("ADD R2, R1, R3"));
  await expect(pic.locator("g[data-instr='2']")).toHaveAttribute("data-row", "1");
  await pic.locator("g[data-bubble='1']").click();
  await expect(piece).toContainText("Done! ★★");
});

test("jump: what came before and the target run, the two behind it are flushed", async ({ page }) => {
  const { piece, pic } = await open(page, 4);
  const flushIt = (x: string) => pic.getByRole("button", { name: `${x}: tap to flush it` }).first();
  await flushIt("AND R1, R1, R2").click();
  await expect(piece).toContainText("is where the jump goes");
  await flushIt("SUB R4, R5, R6").click();
  await flushIt("OR R7, R8, R9").click();
  await expect(pic.locator("g[data-flushed='1']")).toHaveCount(2);
  await expect(piece).toContainText("Done! ★★");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/pipe-jump.png` });
});
