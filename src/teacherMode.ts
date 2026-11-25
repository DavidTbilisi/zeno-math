// Whether this browser's signed-in account teaches (#687): a teacher's or an admin's, as the server last said and
// account.ts keeps it (read here straight from that cache, so this file needs nothing of the account's code). The
// games read it to open what a teacher may want to show a class before playing their way to it, such as the endless
// run; the board calls (api.ts boardOwner) then send no student code, so the account's session says whose boards.
// The server decides what a teacher may do; this only says what to show.
const ACCOUNT_KEY = "zeno.account.v1";

export function isTeacher(): boolean {
  try {
    const role = (JSON.parse(localStorage.getItem(ACCOUNT_KEY) ?? "null") as { role?: unknown } | null)?.role;
    return role === "teacher" || role === "admin";
  } catch {
    return false;
  }
}
