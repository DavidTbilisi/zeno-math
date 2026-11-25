// Payments for lessons (#757): a class has a lesson price, the teacher keeps a register of the lessons held and who
// came, and records the payments students make. A student owes the price of every lesson they attended; the price is
// kept on each lesson as it was when the lesson was entered, so a new price never rewrites past months. Amounts are
// whole minor units (tetri, cents), so sums are exact. Nothing here moves money: it only adds up the teacher's records.
//
// The same sums serve the server (what a student sees) and the teacher's page (a month and all months, per student
// and for the class).

/** A lesson in the register: its date (YYYY-MM-DD), its price, and the students who came ("s12", as the dashboard names them). */
export type RegisterLesson = { id: number; day: string; price: number; present: readonly string[] };
/** A payment the teacher recorded: who paid, how much (minor units), on what date, and an optional note. */
export type Payment = { id: number; student: string; amount: number; day: string; note: string };

/** Lessons attended, what they cost, what was paid, and what is still owed (negative: paid ahead). */
export type PayLine = { attended: number; due: number; paid: number; owed: number };

export const MAX_AMOUNT = 100_000_000; // a million in major units: far beyond any lesson or payment
export const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
export const CURRENCY = /^[A-Z]{3}$/;

/** A real calendar date in YYYY-MM-DD (not 2026-02-30). */
export const isDay = (v: unknown): v is string =>
  typeof v === "string" && DAY.test(v) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
export const isAmount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= MAX_AMOUNT;
export const monthOf = (day: string) => day.slice(0, 7);

const line = (attended: number, due: number, paid: number): PayLine => ({ attended, due, paid, owed: due - paid });
const add = (a: PayLine, b: PayLine): PayLine => line(a.attended + b.attended, a.due + b.due, a.paid + b.paid);
export const NO_LINE: PayLine = line(0, 0, 0);

/** One student's line over the lessons and payments given (filter them first for one month). */
export function payLine(student: string, lessons: readonly RegisterLesson[], payments: readonly Payment[]): PayLine {
  let attended = 0;
  let due = 0;
  for (const l of lessons)
    if (l.present.includes(student)) {
      attended++;
      due += l.price;
    }
  const paid = payments.reduce((sum, p) => (p.student === student ? sum + p.amount : sum), 0);
  return line(attended, due, paid);
}

export type PaySummary = {
  /** Each student's line for the month and over all months. */
  students: Record<string, { month: PayLine; all: PayLine }>;
  /** The class: the sum of its students' lines; lessons, how many the class held. */
  class: { month: PayLine & { lessons: number }; all: PayLine & { lessons: number } };
};

/** Every student's line and the class's, for one month (YYYY-MM) and over all months. */
export function paySummary(students: readonly string[], lessons: readonly RegisterLesson[], payments: readonly Payment[], month: string): PaySummary {
  const inMonth = lessons.filter((l) => monthOf(l.day) === month);
  const paidInMonth = payments.filter((p) => monthOf(p.day) === month);
  const out: PaySummary["students"] = {};
  let m = NO_LINE;
  let a = NO_LINE;
  for (const s of students) {
    const row = { month: payLine(s, inMonth, paidInMonth), all: payLine(s, lessons, payments) };
    out[s] = row;
    m = add(m, row.month);
    a = add(a, row.all);
  }
  return { students: out, class: { month: { ...m, lessons: inMonth.length }, all: { ...a, lessons: lessons.length } } };
}

/** An amount in minor units as the reader's money: 2 decimals, the currency's sign where the browser knows it. */
export function money(minor: number, currency: string, lang: string): string {
  try {
    return new Intl.NumberFormat(lang, { style: "currency", currency, minimumFractionDigits: minor % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(minor % 100 ? 2 : 0)} ${currency}`;
  }
}

/** What a teacher typed as money ("12", "12.5", "12,50") in minor units; null if it isn't an amount. */
export function parseMoney(text: string): number | null {
  const t = text.trim().replace(",", ".");
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(t)) return null;
  const minor = Math.round(Number(t) * 100);
  return isAmount(minor) ? minor : null;
}
