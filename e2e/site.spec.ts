// The maths site around the boards (#448): a learner gets from the home page to a topic and works through its lesson
// without a board, a teacher on a board inserts anything from the library with one button, and every topic opens with
// an intro that counts as read on the roadmaps (#450).
import { expect, test } from "@playwright/test";
import { insertGroup, insertPanel } from "./helpers.ts";

test("a learner goes from the home page to a topic and works through its lesson on the page", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/#/");
  await page.getByRole("link", { name: "Browse topics" }).click();
  await page.locator('a[href="#/learn/geometry"]').first().click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Geometry");
  const lessons = page.locator("section", { has: page.getByRole("heading", { name: "Work through it here" }) });
  // The first lesson is open to start, drawn into the page; another chip swaps it.
  await expect(lessons.getByRole("button", { name: /Geometry/ }).first()).toHaveAttribute("aria-pressed", "true");
  await expect(lessons.locator(".site-tool svg").first()).toBeVisible();
  await lessons.getByRole("button", { name: /School geometry/ }).click();
  await expect(lessons.getByRole("button", { name: /School geometry/ })).toHaveAttribute("aria-pressed", "true");
  await expect(lessons.getByRole("link", { name: /On its own page/ })).toHaveAttribute("href", "#/library/tool/euclid");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
});

test("Insert puts a piece on the board, finds by search and links each section to its topic", async ({ page }) => {
  await page.goto("/#/boards");
  await page.getByRole("button", { name: /New board/ }).first().click();
  await page.locator(".excalidraw").waitFor();
  const panel = await insertGroup(page, "Geometry");
  await expect(panel.getByRole("link", { name: "Topic: Geometry →" }).first()).toHaveAttribute("href", "#/learn/geometry");
  await panel.getByRole("searchbox").fill("comparing fractions");
  await expect(panel.getByRole("tab")).toHaveCount(0);
  await panel.getByRole("button", { name: /Comparing fractions/ }).click();
  await expect(page.locator(".live-compareFractions")).toBeVisible();
  // Docked beside the board, it stays open, and the keyboard is the board's: Escape there leaves Insert alone. Escape in
  // Insert closes it, and the keyboard is back on its button.
  await expect(panel).toBeVisible();
  await expect(page.locator(".excalidraw-container")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(panel).toBeVisible();
  await panel.getByRole("searchbox").focus();
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(page.locator(".insert-btn")).toBeFocused();
  await expect(page.locator(".insert-btn")).toHaveAttribute("aria-expanded", "false");
  // It remembers the group it was last on; the button closes it again.
  await page.locator(".insert-btn").click();
  await expect(panel.getByRole("tab", { name: "Geometry" })).toHaveAttribute("aria-selected", "true");
  await page.locator(".insert-btn").click();
  await expect(panel).toHaveCount(0);
});

test("on a phone Insert is a sheet under the board that never scrolls sideways", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/boards");
  await page.getByRole("button", { name: /New board/ }).first().click();
  await page.locator(".excalidraw").waitFor();
  // A group far along the row: picking it scrolls the row, not the sheet.
  const panel = await insertGroup(page, "Games");
  const sheet = (await panel.boundingBox())!;
  const board = (await page.locator(".canvas-wrap").boundingBox())!;
  expect(sheet.width).toBeLessThanOrEqual(390);
  expect(board.y + board.height).toBeLessThanOrEqual(sheet.y + 1);
  expect(await panel.evaluate((el) => el.scrollLeft + el.querySelector(".insert-body")!.scrollLeft)).toBe(0);
  const search = (await panel.getByRole("searchbox").boundingBox())!;
  expect(search.x).toBeGreaterThanOrEqual(0);
  expect(search.x + search.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test("Insert stays docked beside the board: a tool and a live piece dragged from it land where they are dropped", async ({ page }) => {
  await page.goto("/#/boards");
  await page.getByRole("button", { name: /New board/ }).first().click();
  await page.locator(".excalidraw").waitFor();
  const panel = await insertGroup(page, /Algebra/);
  await expect(page.locator(".modal-backdrop, .insert-backdrop")).toHaveCount(0);
  const wrap = page.locator(".canvas-wrap");
  const board = (await wrap.boundingBox())!;
  // Docked: the board ends where the panel starts.
  expect(board.x + board.width).toBeLessThanOrEqual((await panel.boundingBox())!.x + 1);

  // A formula dropped near the top left: its picture is made there, its panel beside it.
  const spot = { x: 180, y: 140 };
  await panel.getByRole("button", { name: /Formula/ }).dragTo(wrap, { targetPosition: spot });
  const item = page.locator(".item-panel");
  await expect(item.getByRole("heading", { name: "Formula" })).toBeVisible();
  await page.waitForTimeout(500); // its first example goes on the board
  await page.keyboard.press("Escape");
  await expect(item).toHaveCount(0);
  await page.mouse.click(board.x + spot.x, board.y + spot.y, { button: "right" });
  await expect(item.getByRole("heading", { name: "Edit formula" })).toBeVisible();
  await page.keyboard.press("Escape");

  // A live piece dropped near the bottom: its middle is where it was let go.
  await insertGroup(page, "Arithmetic");
  const drop = { x: board.width / 2, y: board.height - 150 };
  await panel.getByRole("button", { name: /Number patterns as dots/ }).dragTo(wrap, { targetPosition: drop });
  const piece = page.locator(".live-numberShapes");
  await expect(piece).toHaveCount(1);
  const box = (await piece.boundingBox())!;
  expect(Math.abs(box.x + box.width / 2 - (board.x + drop.x))).toBeLessThan(30);
  expect(Math.abs(box.y + box.height / 2 - (board.y + drop.y))).toBeLessThan(30);
  await expect(panel).toBeVisible();
});

test("Insert by grade shows one grade's tools, pieces and games from every menu, and the library filters by grade", async ({ page }) => {
  await page.goto("/#/boards");
  await page.getByRole("button", { name: /New board/ }).first().click();
  await page.locator(".excalidraw").waitFor();
  await page.locator(".insert-btn").click();
  const panel = insertPanel(page);
  await panel.getByRole("button", { name: "By grade" }).click();
  await panel.getByRole("tab", { name: "Grade 6" }).click();
  // Fractions, algebra and charts side by side; nothing from grade 1 or university.
  await expect(panel.getByRole("button", { name: /How many fit\?/ })).toBeVisible();
  await expect(panel.getByRole("button", { name: /Algebra tiles/ })).toBeVisible();
  await expect(panel.getByRole("button", { name: /Make the diagram/ })).toBeVisible();
  await expect(panel.getByRole("button", { name: /Ten frame/ })).toHaveCount(0);
  await expect(panel.getByRole("button", { name: /Be the cache/ })).toHaveCount(0);
  // It remembers the grade view.
  await page.keyboard.press("Escape");
  await page.locator(".insert-btn").click();
  await expect(panel.getByRole("tab", { name: "Grade 6" })).toHaveAttribute("aria-selected", "true");
  await page.goto("/#/library");
  await page.getByRole("button", { name: "grade 6", exact: true }).click();
  await expect(page.getByRole("link", { name: /How many fit\?/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Ten frame/ })).toHaveCount(0);
});

test("a topic's intro counts as read after a few seconds in view and ticks its roadmap item (#450)", async ({ page }) => {
  await page.clock.install();
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/#/roadmaps/finance");
  // The list view (#584 draws the roadmap as rooms first); the choice is remembered.
  await page.getByRole("button", { name: "List", exact: true }).click();
  const item = page.locator(".road-item", { hasText: "What are fractions?" });
  await expect(item).toHaveAttribute("href", "#/learn/fractions");
  await expect(item).not.toHaveClass(/done/);
  await item.click();
  const intro = page.locator(".explainer");
  await expect(intro.getByRole("heading", { name: "What are fractions?" })).toBeVisible();
  await expect(intro.locator(".topic-pic")).toBeVisible();
  await expect(intro.locator(".explainer-uses li")).toHaveCount(4);
  // The intro's piece is the first one to try.
  await expect(page.locator(".site-try").first().locator(".live-fractionWall")).toBeVisible();
  await page.clock.runFor(5500);
  await expect(intro.locator(".explainer-read")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  await page.goto("/#/roadmaps/finance");
  await expect(page.locator(".road-item", { hasText: "What are fractions?" })).toHaveClass(/done/);
});

test("\"What is…?\" lists every topic's intro, fits a phone in every language, and Georgian is not capitalised", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  for (const lang of ["en", "ka", "ru"]) {
    await page.goto("/#/");
    await page.evaluate((l) => localStorage.setItem("lang", l), lang);
    for (const h of ["#/explain", "#/learn/numberTheory", "#/learn/ai"]) {
      await page.goto(`/${h}`);
      await page.locator(".topic-pic").first().waitFor();
      if (h === "#/explain") await expect(page.locator(".explain-card")).toHaveCount(20);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${lang} ${h}`).toBe(0);
      expect(await page.evaluate(() => /[Ა-Ჿ]/.test(document.body.innerText)), `${lang} ${h}`).toBe(false);
    }
  }
});

test("a symbol met in a question is a tap from its card, and #/symbols finds it by the sign pasted in (#451)", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/#/practice/quantifiers.1");
  const chip = page.locator(".q-symbols-row .sym-chip", { hasText: /for all|there exists/ }).first();
  await chip.click();
  const card = page.locator(".q-symbols-card .sym-card");
  await expect(card.locator(".sym-name")).toHaveText(/for all|there exists/);
  await expect(card).toContainText(/What follows is true for every value|At least one value makes/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);

  await page.goto("/#/symbols");
  await page.getByRole("searchbox", { name: "Search symbols" }).fill("∀");
  await expect(page.locator(".sym-tile")).toHaveCount(1);
  await page.locator(".sym-tile").click();
  await expect(page).toHaveURL(/#\/symbols\/forall$/);
  await expect(page.locator(".sym-open .sym-name")).toHaveText("for all");
  // Its look-alike is one tap away, and its topic links to the topic's page.
  await page.locator(".sym-open .sym-chip", { hasText: "there exists" }).click();
  await expect(page.locator(".sym-open .sym-name")).toHaveText("there exists");
  for (const lang of ["en", "ka", "ru"]) {
    await page.evaluate((l) => localStorage.setItem("lang", l), lang);
    await page.goto("/#/symbols/sigma");
    await page.reload();
    await page.locator(".sym-open .sym-card").waitFor();
    expect(await page.locator(".sym-tile").count(), lang).toBeGreaterThan(100);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), lang).toBe(0);
    expect(await page.evaluate(() => /[Ა-Ჿ]/.test(document.body.innerText)), lang).toBe(false);
  }
});

test("a teacher gives a class a goal: its student's site opens on that roadmap until they choose their own (#461)", async ({ browser, request }) => {
  const headers = { "X-Teacher-Password": "e2e-teacher" };
  const name = `Goal ${Date.now()}`;
  const { code } = await (await request.post("/api/classes", { data: { name, skills: ["percent", "interestRates"] }, headers })).json();
  const student = await (await request.post("/api/students", { data: { class: code, number: 4 } })).json();

  const teacher = await (await browser.newContext({ viewport: { width: 390, height: 800 } })).newPage();
  await teacher.addInitScript((pw) => sessionStorage.setItem("zeno.teacher", pw), headers["X-Teacher-Password"]);
  await teacher.goto("/#/teacher");
  await teacher.locator(".class-item", { hasText: name }).click();
  await teacher.getByRole("tab", { name: "Progress" }).click();
  const card = teacher.locator(".class-goal");
  await card.getByRole("combobox", { name: "Class goal" }).selectOption({ label: "Finance" });
  // Nothing practised yet: the student is on none of the roadmap's skills the class has.
  await expect(card.locator(".class-goal-list li", { hasText: "№ 4" })).toContainText(/^№ 4\s*0 of 2$/);
  expect(await teacher.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);

  const page = await (await browser.newContext({ viewport: { width: 390, height: 800 } })).newPage();
  await page.addInitScript((s) => localStorage.setItem("zeno.student.v1", s), JSON.stringify(student));
  await page.goto("/#/roadmaps");
  await expect(page.locator(".road-goal.mine")).toContainText("your class's goal");
  await expect(page.locator(".road-goal.mine")).toContainText("Finance");
  await page.locator(".road-goal.mine").click();
  await expect(page.locator(".road-class-note")).toBeVisible();
  // Following the class's goal isn't choosing it: another goal is the learner's own, and wins.
  // Opened by its address: a click right after the hash changes can race the page's scroll back to the top.
  await page.goto("/#/roadmaps/software");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Software");
  await page.goto("/#/roadmaps");
  await expect(page.locator(".road-goal.mine")).toContainText("Software");
  await expect(page.locator(".road-goal.mine")).toContainText("your goal");
});

test("a roadmap's lab is done once the learner has tried it (#461)", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/#/roadmaps/ml");
  // The list view (#584 draws the roadmap as rooms first); the choice is remembered.
  await page.getByRole("button", { name: "List", exact: true }).click();
  const item = page.locator(".road-item", { hasText: "Gradient descent lab" });
  await expect(item).toHaveAttribute("href", "#/library/live/descentLab");
  await expect(item).not.toHaveClass(/done/);
  await item.click();
  await page.locator(".inline-piece .live-descentLab").click({ position: { x: 40, y: 40 } });
  await page.goto("/#/roadmaps/ml");
  await expect(page.locator(".road-item", { hasText: "Gradient descent lab" })).toHaveClass(/done/);
});
