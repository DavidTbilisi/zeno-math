// Roles (#687): the admin makes an account a teacher's on the people page; that teacher, signed in, sees the classes
// they make and not the others, and a student's account is told it doesn't teach.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { signIn } from "./helpers.ts";

const w = en.teacher;

test("the admin makes a teacher, who sees only their own classes", async ({ browser, request }) => {
  const stamp = Date.now();
  const other = (await (await request.post("/api/classes", { data: { name: `Not hers ${stamp}` } })).json()).code as string;

  // A student's account: the teacher page says it doesn't teach.
  const ana = await browser.newPage({ extraHTTPHeaders: {} });
  const email = `ana-${stamp}@e2e.test`;
  await signIn(ana, email, "Ana");
  await ana.goto("/#/teacher");
  await expect(ana.getByText(w.notTeacher)).toBeVisible();

  // The admin makes her a teacher.
  const head = await browser.newPage({ extraHTTPHeaders: {} });
  await signIn(head);
  await head.goto("/#/teacher/people");
  await expect(head.getByRole("heading", { name: w.people.title })).toBeVisible();
  await head.getByRole("combobox", { name: `${w.people.role}: ${email}` }).selectOption({ label: w.people.roles.teacher });
  await expect(head.getByRole("combobox", { name: `${w.people.role}: ${email}` })).toHaveValue("teacher");

  // Now she makes a class, sees it, and doesn't see the one she wasn't given.
  await ana.reload();
  await ana.locator(".new-class").getByLabel("Name").fill(`Ana's ${stamp}`);
  await ana.getByRole("button", { name: "Create class" }).click();
  await expect(ana.locator(".class-head h2")).toHaveText(`Ana's ${stamp}`);
  await expect(ana.locator(".class-item")).toHaveCount(1);
  await expect(ana.getByRole("link", { name: new RegExp(w.people.link) })).toHaveCount(0);

  // The admin gives her the other class; it shows up on her page.
  await head.reload();
  await head.getByRole("combobox", { name: `${w.people.owner}: Not hers ${stamp}` }).selectOption({ label: `Ana · ${email}` });
  await expect(head.getByRole("combobox", { name: `${w.people.owner}: Not hers ${stamp}` })).not.toHaveValue("");
  await ana.reload();
  await expect(ana.locator(".class-item")).toHaveCount(2);
  await expect(ana.locator(".class-item", { hasText: other })).toBeVisible();
});
