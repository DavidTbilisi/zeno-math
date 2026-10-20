// Problem solving: the Discrete menu opens the tactics, whose parity tab says why ±1 … ±10 cannot make 0 and finds the
// signs once n is 8, and whose chameleons refuse three counts that are all 0; the picture goes on the board and opens
// again for editing. The strategies tool opens on Pólya's empty card, takes a problem and a note for one phase, and
// goes on the board; the start-up strategies work the lockers for the n typed in, and refuse an n out of range.
// In practice, a parity question picked from its buttons: a total of the wrong parity is named, the right one is correct;
// and the swaps to sort a list, typed.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { practise, seedOf } from "./helpers.ts";

test("tactics: parity explains an impossible target, finds the signs for a possible one, and inserts", async ({ page, request }) => {
  const made = await (await request.post("/api/boards", { data: { title: "Tactics" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: /\bDiscrete\b/ }).click();
  await page.getByRole("menuitem", { name: /Problem-solving tactics/ }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Problem-solving tactics" })).toBeVisible();
  await dialog.getByRole("tab", { name: "Mod 3 invariant" }).click();
  await dialog.getByRole("textbox").fill("0 0 0");
  await expect(dialog.locator(".preview .error")).toHaveText(/not all 0/);
  await expect(dialog.getByRole("button", { name: "Insert" })).toBeDisabled();

  await dialog.getByRole("tab", { name: "Parity" }).click();
  await dialog.getByRole("button", { name: "±1 … ±10 = 0" }).click();
  await expect(dialog.locator(".preview img")).toBeVisible();
  await dialog.getByRole("textbox", { name: "n" }).fill("8");
  await expect(dialog.locator(".preview img")).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("parity.png") });
  await dialog.getByRole("button", { name: "Insert" }).click();

  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: /Edit tactics/ }).click();
  await expect(page.getByRole("dialog").getByRole("textbox", { name: "n" })).toHaveValue("8");
});

test("strategies: Pólya's card takes your problem, and the lockers follow n", async ({ page, request }) => {
  const made = await (await request.post("/api/boards", { data: { title: "Strategies" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: /\bDiscrete\b/ }).click();
  await page.getByRole("menuitem", { name: /Problem-solving strategies/ }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Problem-solving strategies" })).toBeVisible();
  await expect(dialog.locator(".preview img")).toBeVisible();
  await dialog.getByRole("textbox", { name: "Your problem" }).fill("How many diagonals has a 12-gon?");
  await dialog.getByRole("textbox", { name: "1. Understand" }).fill("Unknown: the diagonals. Data: 12 corners.");

  await dialog.getByRole("tab", { name: "Start-up strategies" }).click();
  await dialog.getByRole("radio", { name: "Lockers" }).click();
  await dialog.getByRole("textbox", { name: "n" }).fill("101");
  await expect(dialog.locator(".preview .error")).toHaveText(/from 1 to 100/);
  await dialog.getByRole("textbox", { name: "n" }).fill("50");
  await expect(dialog.locator(".preview img")).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("lockers.png") });

  // Back on Pólya's tab the card kept what was typed, and it goes on the board.
  await dialog.getByRole("tab", { name: "Pólya's four phases" }).click();
  await expect(dialog.getByRole("textbox", { name: "Your problem" })).toHaveValue("How many diagonals has a 12-gon?");
  await dialog.getByRole("button", { name: "Insert" }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: /Edit strategies/ }).click();
  await expect(page.getByRole("dialog").getByRole("textbox", { name: "1. Understand" })).toHaveValue("Unknown: the diagonals. Data: 12 corners.");
});

test("practice: a parity total picked from its buttons, after a slip, and the swaps to sort a list", async ({ page, request }) => {
  const r = 0.37;
  const ex = exercise("parity", 2, seedOf(r), en.pracWords);
  await practise(page, request, { tab: "Probability & statistics", skill: "Plus or minus (parity)", level: "medium", r, prompt: ex.prompt });
  const slip = (ex.answer as { traps?: { id: string; a: { options?: { text: string }[]; right?: number } }[] }).traps!.find((t) => t.id === "parityIgnored")!;
  await page.locator(".sign-picks").getByRole("button", { name: slip.a.options![slip.a.right!].text, exact: true }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/can't be made: with every sign \+ the total is/)).toBeVisible();
  await page.locator(".sign-picks").getByRole("button", { name: ex.plain, exact: true }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();

  const r2 = 0.52;
  const ex2 = exercise("inversions", 1, seedOf(r2), en.pracWords);
  await practise(page, request, { tab: "Probability & statistics", skill: "Swaps to sort", level: "easy", r: r2, prompt: ex2.prompt });
  await page.getByLabel("Your answer").fill(ex2.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
