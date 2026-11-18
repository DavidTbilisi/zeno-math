// Hand trick, from the Geometry menu: the tab draws the hand, an example fills the angle, the user's own peg replaces
// the default in the picture, and it opens again with the peg kept. (Angles off the hand: tests/trigHand.test.ts.)
import { expect, test } from "@playwright/test";

test("hand trick: an example fills the angle, a peg of your own is drawn and kept", async ({ page, request }) => {
  const made = await (await request.post("/api/boards", { data: { title: "Hand trick" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: /Geometry/ }).click();
  await page.getByRole("menuitem", { name: /Trigonometry/ }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByRole("tab", { name: "Hand trick" }).click();
  await expect(dialog.locator(".preview img")).toBeVisible();

  await dialog.getByRole("button", { name: "7π/6" }).click();
  const peg = dialog.getByRole("textbox", { name: "/6" });
  await expect(peg).toHaveAttribute("placeholder", "a clock hand, one hour");
  await peg.fill("Big Ben's minute hand");
  const src = await dialog.locator(".preview img").getAttribute("src");
  expect(Buffer.from((src ?? "").split(",")[1], "base64").toString("utf8")).toContain("Big Ben");
  await page.screenshot({ path: test.info().outputPath("trig-hand.png") });
  await dialog.getByRole("button", { name: "Insert" }).click();

  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: /Edit trigonometry/ }).click();
  await expect(page.getByRole("dialog").getByRole("textbox", { name: "/6" })).toHaveValue("Big Ben's minute hand");
});
