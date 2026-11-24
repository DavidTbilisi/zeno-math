// The codes classes and students go by: read off paper and typed in by children, so no 0/O and no 1/I/L. Here on
// their own because both the class study (research.ts) and accounts (accounts.ts) read them.
import { randomInt } from "node:crypto";

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const randomCode = (n: number) => Array.from({ length: n }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
export const STUDENT_LEN = 8;
export const CLASS_LEN = 6;
/** Upper case, without spaces and dashes; a student code is shown as XXXX-XXXX. */
export function normalizeCode(value: unknown): string {
  const raw = String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return raw.length === STUDENT_LEN ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw;
}
