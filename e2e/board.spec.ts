// A teacher's board: make it, put a shape and a live piece on it, use the piece, and find everything again after a
// reload (and on the server).
import { expect, test } from "@playwright/test";

test("a board keeps a shape and a live piece's state across a reload", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /New board/ }).first().click();
  await page.waitForURL(/#\/b\/[0-9a-f-]+$/);
  const id = page.url().split("/").pop()!;
  await page.locator(".excalidraw").waitFor();

  // The panel closes after each insert (unless it is docked on a wide screen), so open it for each shape.
  for (const name of ["Right triangle", "Dice to roll"]) {
    await page.getByRole("button", { name: "Shapes" }).click();
    await page.getByRole("button", { name, exact: true }).click();
  }

  // A live piece starts working after a click in its middle (Excalidraw's "click to interact").
  const dice = page.locator(".live-dice");
  await dice.waitFor();
  const box = (await dice.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await dice.getByRole("button", { name: "Roll" }).click();

  // The board saves itself: the server soon has the triangle and the dice with one roll in their history.
  const saved = async () => {
    const board = await (await request.get(`/api/boards/${id}`)).json();
    const elements = board.scene?.elements ?? [];
    const live = elements.find((e: { customData?: { live?: string } }) => e.customData?.live === "dice");
    return { elements: elements.length, rolls: live?.customData.state.history.length ?? 0 };
  };
  await expect.poll(saved).toMatchObject({ rolls: 1 });
  const before = await saved();
  expect(before.elements).toBeGreaterThan(2);

  await page.reload();
  await page.locator(".live-dice").waitFor();
  // The roll is still there: one total in the piece's history.
  await expect(page.locator(".live-dice .live-history .live-chip")).toHaveCount(1);
  expect(await saved()).toEqual(before);
  expect(errors).toEqual([]);
});
